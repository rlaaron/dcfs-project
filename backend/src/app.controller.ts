import { Controller, Post, UseInterceptors, UploadedFile, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { spawn } from 'child_process';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as multer from 'multer'; // Just for types

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

    // Path to the compiled C++ binary
    // Assuming we run NestJS from `backend` directory, the binary is in `../core/dcfs_core`
    const coreBinaryPath = join(__dirname, '..', '..', 'core', 'dcfs_core');

    return new Promise((resolve, reject) => {
      const child = spawn(coreBinaryPath, [
        fileId,
        filename,
        totalSize.toString(),
        chunkSize.toString()
      ]);

      child.stdin.write(file.buffer);
      child.stdin.end();

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      let errorOutput = '';
      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error(`Core Error: ${data}`);
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ 
            message: 'File processed successfully by C++ Core Engine', 
            fileId, 
            filename, 
            totalSize,
            coreOutput: output
          });
        } else {
          reject(new HttpException(`Processing failed with code ${code}. Error: ${errorOutput}`, HttpStatus.INTERNAL_SERVER_ERROR));
        }
      });
    });
  }
}
