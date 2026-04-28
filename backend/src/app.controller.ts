import { Controller, Post, UseInterceptors, UploadedFile, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { spawn } from 'child_process';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as multer from 'multer';
import { createClient } from '@supabase/supabase-js';

// Local Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'your-local-service-key';
const supabase = createClient(supabaseUrl, supabaseKey);

@Controller()
export class AppController {

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }

    const fileId = uuidv4();
    const filename = file.originalname;
    const totalSize = file.size;
    const chunkSize = 5 * 1024 * 1024; // 5 MB chunks

    // 1. Register the file in Supabase
    const { error: fileErr } = await supabase
      .from('files')
      .insert({ id: fileId, filename, total_size: totalSize });

    if (fileErr) {
      throw new HttpException(`Failed to register file: ${fileErr.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // 2. Fetch available nodes
    const { data: nodes, error: nodeErr } = await supabase
      .from('nodes')
      .select('*');

    if (nodeErr || !nodes) {
      throw new HttpException(`Failed to fetch nodes: ${nodeErr?.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // Format nodes for C++ binary: "id|path|max_capacity|current_usage"
    const nodeArgs = nodes.map(n => `${n.id}|${n.folder_path}|${n.max_capacity}|${n.current_usage}`);

    // Path to the compiled C++ binary
    const coreBinaryPath = join(__dirname, '..', '..', 'core', 'dcfs_core');

    return new Promise((resolve, reject) => {
      const child = spawn(coreBinaryPath, [
        fileId,
        filename,
        totalSize.toString(),
        chunkSize.toString(),
        ...nodeArgs
      ]);

      child.stdin.write(file.buffer);
      child.stdin.end();

      let coreOutput = '';
      
      child.stdout.on('data', async (data) => {
        const outputStr = data.toString();
        coreOutput += outputStr;
        
        // Parse line by line to handle chunk JSON outputs
        const lines = outputStr.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          
          if (line.includes('{"event":"chunk_written"')) {
            try {
              const event = JSON.parse(line);
              
              // 3. Insert chunk record into Supabase
              await supabase.from('chunks').insert({
                file_id: event.file_id,
                node_id: event.node_id,
                chunk_index: event.chunk_index,
                size: event.size
              });

              // 4. Update the node usage directly in Supabase
              // We read first and add (for production you'd use a postgres function/rpc to avoid race conditions, but this is fine for now)
              const { data: nData } = await supabase.from('nodes').select('current_usage').eq('id', event.node_id).single();
              if (nData) {
                await supabase.from('nodes')
                  .update({ current_usage: nData.current_usage + event.size })
                  .eq('id', event.node_id);
              }
              
            } catch (err) {
              console.error('Error parsing core output or updating DB:', err);
            }
          }
        }
      });

      let errorOutput = '';
      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error(`Core Error: ${data}`);
      });

      child.on('close', (code) => {
        if (code === 0 || coreOutput.includes('SUCCESS')) {
          resolve({ 
            message: 'File processed successfully by C++ Core Engine & metadata synced to Supabase!', 
            fileId, 
            filename, 
            totalSize,
            coreOutput
          });
        } else {
          reject(new HttpException(`Processing failed with code ${code}. Error: ${errorOutput}`, HttpStatus.INTERNAL_SERVER_ERROR));
        }
      });
    });
  }
}
