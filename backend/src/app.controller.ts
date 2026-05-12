import { Controller, Post, Body, UseInterceptors, UploadedFile, HttpException, HttpStatus, Delete, Param, Get, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { spawn } from 'child_process';
import { join } from 'path';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import type { Response } from 'express';

// Local Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const supabase = createClient(supabaseUrl, supabaseKey);

@Controller()
export class AppController {

  @Post('session')
  async createSession(@Body('nodesCount') nodesCount: number) {
    if (!nodesCount || nodesCount < 1 || nodesCount > 10) {
      throw new HttpException('Invalid nodesCount (must be 1-10)', HttpStatus.BAD_REQUEST);
    }

    try {
      // Generate a 4-digit PIN
      const pin = Math.floor(1000 + Math.random() * 9000).toString();

      // Create session in Supabase
      const { error: sessionErr } = await supabase.from('sessions').insert({ pin, nodes_count: nodesCount });
      if (sessionErr) throw sessionErr;

      // Create nodes for this session
      const totalCapacityBytes = 50 * 1024 * 1024; // 50 MB total for the cluster
      const capacityPerNode = Math.floor(totalCapacityBytes / nodesCount);
      const newNodes = [];
      for (let i = 1; i <= nodesCount; i++) {
        newNodes.push({
          name: `Disk ${i}`,
          folder_path: `nodes/${pin}/disk${i}`, // Scoped to session pin
          max_capacity: capacityPerNode,
          session_pin: pin
        });
      }

      const { error: errInsert } = await supabase.from('nodes').insert(newNodes);
      if (errInsert) throw errInsert;

      return { message: `Session created successfully`, pin };
    } catch (err: any) {
      throw new HttpException(`Failed to create session: ${err.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete('session/:pin')
  async endSession(@Param('pin') pin: string) {
    try {
      // Clean up storage bucket for this session first
      // List all files in the session folder (Supabase Storage doesn't have a recursive delete yet, but we can list and remove)
      // Actually, list() on a folder only returns files/folders directly inside it.
      // Since our path is `${sessionPin}/${node_id}/${file_id}_part${index}`, we need to fetch the nodes first.
      
      const { data: nodes } = await supabase.from('nodes').select('id').eq('session_pin', pin);
      
      if (nodes && nodes.length > 0) {
        for (const node of nodes) {
          const folderPath = `${pin}/${node.id}`;
          const { data: filesInFolder } = await supabase.storage.from('dcfs-chunks').list(folderPath, { limit: 1000 });
          
          if (filesInFolder && filesInFolder.length > 0) {
            const pathsToRemove = filesInFolder.map(f => `${folderPath}/${f.name}`);
            await supabase.storage.from('dcfs-chunks').remove(pathsToRemove);
          }
        }
      }

      // Delete session from DB (cascades files, nodes, participants, chunks)
      const { error } = await supabase.from('sessions').delete().eq('pin', pin);
      if (error) throw error;

      return { message: 'Session ended and Storage cleaned successfully' };
    } catch (err: any) {
      throw new HttpException(`Failed to end session: ${err.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('participant')
  async registerParticipant(@Body('session_pin') sessionPin: string, @Body('nickname') nickname: string) {
    if (!sessionPin || !nickname) throw new HttpException('Missing session_pin or nickname', HttpStatus.BAD_REQUEST);
    
    // UPSERT basically (insert or ignore if exists because of unique constraint)
    const { error } = await supabase.from('participants').insert({ session_pin: sessionPin, nickname });
    if (error && error.code !== '23505') { // 23505 is unique violation, which is fine
      throw new HttpException(`Failed to register participant: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return { message: 'Participant registered' };
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('session_pin') sessionPin: string,
    @Body('nickname') nickname: string
  ) {
    if (!file) throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    if (!sessionPin || !nickname) throw new HttpException('Missing session_pin or nickname', HttpStatus.BAD_REQUEST);

    const fileId = uuidv4();
    const filename = file.originalname;
    const totalSize = file.size;
    // REDUCED TO 50KB SO VERY SMALL IMAGES GET FRAGMENTED INTO MULTIPLE DISKS
    const chunkSize = 50 * 1024; 

    // 1. Register the file in Supabase with session info
    const { error: fileErr } = await supabase
      .from('files')
      .insert({ id: fileId, filename, total_size: totalSize, session_pin: sessionPin, nickname });

    if (fileErr) {
      throw new HttpException(`Failed to register file: ${fileErr.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // 2. Fetch available nodes for this session
    const { data: nodes, error: nodeErr } = await supabase
      .from('nodes')
      .select('*')
      .eq('session_pin', sessionPin);

    if (nodeErr || !nodes || nodes.length === 0) {
      throw new HttpException(`Failed to fetch nodes or invalid session: ${nodeErr?.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
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
              
              // --- Upload to Supabase Storage ---
              try {
                const nodeData = nodes.find(n => n.id === event.node_id);
                if (nodeData) {
                  const localChunkPath = join(process.cwd(), nodeData.folder_path, `${event.file_id}_part${event.chunk_index}`);
                  const chunkBuffer = await fs.readFile(localChunkPath);
                  
                  // Store under session_pin to make cleanup easier later if needed
                  const storagePath = `${sessionPin}/${event.node_id}/${event.file_id}_part${event.chunk_index}`;
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
            message: 'File processed successfully', 
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

  @Delete('file/:id')
  async deleteFile(@Param('id') fileId: string) {
    const { error } = await supabase.from('files').delete().eq('id', fileId);
    if (error) {
      throw new HttpException(`Failed to delete file: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return { message: 'File deleted successfully' };
  }

  @Get('file/:id/download')
  async downloadFile(@Param('id') fileId: string, @Res() res: Response) {
    try {
      // 1. Get file metadata
      const { data: fileData, error: fileErr } = await supabase.from('files').select('*').eq('id', fileId).single();
      if (fileErr || !fileData) throw new HttpException('File not found', HttpStatus.NOT_FOUND);

      // 2. Get chunks ordered
      const { data: chunks, error: chunksErr } = await supabase
        .from('chunks')
        .select('*')
        .eq('file_id', fileId)
        .order('chunk_index', { ascending: true });
        
      if (chunksErr || !chunks || chunks.length === 0) throw new HttpException('Chunks not found', HttpStatus.NOT_FOUND);

      res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileData.filename}"`,
        'Content-Length': fileData.total_size,
      });

      // 3. Download and pipe chunks sequentially to the response
      for (const chunk of chunks) {
        const storagePath = `${fileData.session_pin}/${chunk.node_id}/${chunk.file_id}_part${chunk.chunk_index}`;
        const { data: chunkBlob, error: downloadErr } = await supabase.storage.from('dcfs-chunks').download(storagePath);
        
        if (downloadErr || !chunkBlob) {
          console.error(`Failed to download chunk ${chunk.chunk_index}`, downloadErr);
          throw new HttpException('Failed to retrieve chunk from storage', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        const buffer = Buffer.from(await chunkBlob.arrayBuffer());
        res.write(buffer);
      }

      res.end();
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(err.status || 500).send(err.message);
      } else {
        res.end();
      }
    }
  }

  @Post('reset-topology')
  async resetTopology(@Body('nodesCount') nodesCount: number) {
    // Kept for backward compatibility with simulator
    if (!nodesCount || nodesCount < 1 || nodesCount > 10) {
      throw new HttpException('Invalid nodesCount (must be 1-10)', HttpStatus.BAD_REQUEST);
    }

    try {
      const { error: errFiles } = await supabase.from('files').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (errFiles) throw errFiles;

      const { error: errNodes } = await supabase.from('nodes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (errNodes) throw errNodes;

      const totalCapacityBytes = 50 * 1024 * 1024;
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

      return { message: `Topology reset to ${nodesCount} nodes successfully.` };
    } catch (err: any) {
      throw new HttpException(`Reset failed: ${err.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
