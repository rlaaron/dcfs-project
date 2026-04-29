// CI/CD Test - Triggering Railway Deployment
import { Controller, Post, Body, UseInterceptors, UploadedFile, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { spawn } from 'child_process';
import { join } from 'path';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import * as multer from 'multer';
import { createClient } from '@supabase/supabase-js';

// Local Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const supabase = createClient(supabaseUrl, supabaseKey);

@Controller()
export class AppController {

  @Post('reset-topology')
  async resetTopology(@Body('nodesCount') nodesCount: number) {
    if (!nodesCount || nodesCount < 1 || nodesCount > 10) {
      throw new HttpException('Invalid nodesCount (must be 1-10)', HttpStatus.BAD_REQUEST);
    }

    try {
      // 1. Delete all files (cascades to chunks)
      const { error: errFiles } = await supabase.from('files').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (errFiles) throw errFiles;

      // 2. Delete all nodes
      const { error: errNodes } = await supabase.from('nodes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (errNodes) throw errNodes;

      // 3. Recreate nodes
      const totalCapacityBytes = 50 * 1024 * 1024; // 50 MB total for the cluster
      const capacityPerNode = Math.floor(totalCapacityBytes / nodesCount);
      const newNodes = [];
      for (let i = 1; i <= nodesCount; i++) {
        newNodes.push({
          name: `Disk ${i}`,
          folder_path: `nodes/disk${i}`,
          max_capacity: capacityPerNode
        });
      }

      const { error: errInsert } = await supabase.from('nodes').insert(newNodes);
      if (errInsert) throw errInsert;

      // Optionally, clean up the storage bucket
      const { data: bucketFiles } = await supabase.storage.from('dcfs-chunks').list();
      if (bucketFiles && bucketFiles.length > 0) {
        // Warning: this lists root files. In the new architecture they are under folders per node_id
        // but let's do a simple empty bucket approach if there are folders
        const { data: folders } = await supabase.storage.from('dcfs-chunks').list('', { limit: 100 });
        if (folders) {
          for (const folder of folders) {
             const { data: filesInFolder } = await supabase.storage.from('dcfs-chunks').list(folder.name, { limit: 100 });
             if (filesInFolder && filesInFolder.length > 0) {
                const pathsToRemove = filesInFolder.map(f => `${folder.name}/${f.name}`);
                await supabase.storage.from('dcfs-chunks').remove(pathsToRemove);
             }
          }
        }
      }

      return { message: `Topology reset to ${nodesCount} nodes successfully.` };
    } catch (err: any) {
      throw new HttpException(`Reset failed: ${err.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

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

    // 3. DYNAMIC FOLDERS: Ensure all physical directories exist before giving them to C++
    for (const node of nodes) {
      try {
        const fullPath = join(process.cwd(), node.folder_path);
        await fs.mkdir(fullPath, { recursive: true });
      } catch (err) {
        console.error(`Failed to ensure directory exists for node ${node.name}:`, err);
      }
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
              
              // Insert chunk record into Supabase
              await supabase.from('chunks').insert({
                file_id: event.file_id,
                node_id: event.node_id,
                chunk_index: event.chunk_index,
                size: event.size
              });

              // FIX CONCURRENCY: Atomic Update via SQL RPC
              const { error: rpcErr } = await supabase.rpc('increment_node_usage', {
                p_node_id: event.node_id,
                p_size: event.size
              });

              if (rpcErr) {
                console.error(`Failed to atomically update node ${event.node_id}:`, rpcErr);
              }
              
              // --- NEW: Upload to Supabase Storage ---
              try {
                const nodeData = nodes.find(n => n.id === event.node_id);
                if (nodeData) {
                  const localChunkPath = join(process.cwd(), nodeData.folder_path, `${event.file_id}_part${event.chunk_index}`);
                  const chunkBuffer = await fs.readFile(localChunkPath);
                  
                  const storagePath = `${event.node_id}/${event.file_id}_part${event.chunk_index}`;
                  const { error: uploadErr } = await supabase.storage
                    .from('dcfs-chunks')
                    .upload(storagePath, chunkBuffer, {
                      contentType: 'application/octet-stream',
                      upsert: true
                    });

                  if (uploadErr) {
                    console.error('Supabase Storage upload error:', uploadErr);
                  } else {
                    // Clean up local file after successful upload to save space on Railway
                    await fs.unlink(localChunkPath).catch(e => console.error('Failed to delete local chunk:', e));
                  }
                }
              } catch (storageErr) {
                console.error('Failed to process chunk for storage:', storageErr);
              }
              // ---------------------------------------
              
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
