import { Client } from 'minio';
import { randomUUID } from 'crypto';
import path from 'path';

export class StorageService {
  private client: Client;
  private bucketName = 'uploads';

  constructor() {
    this.client = new Client({
      endPoint: 'localhost',
      port: 9000,
      useSSL: false,
      accessKey: 'minioadmin',
      secretKey: 'minioadmin',
    });
    this.ensureBucket();
  }

  private async ensureBucket() {
    const exists = await this.client.bucketExists(this.bucketName);
    if (!exists) {
      await this.client.makeBucket(this.bucketName);
      // Set policy to public read (optional, depending on requirements)
    }
  }

  async uploadFile(file: any): Promise<string> {
    const fileExtension = path.extname(file.filename);
    const key = `${randomUUID()}${fileExtension}`;
    
    // Convert file buffer to stream or upload directly
    // Fastify multipart gives us a stream
    const buffer = await file.toBuffer();

    await this.client.putObject(this.bucketName, key, buffer, buffer.length, {
      'Content-Type': file.mimetype,
    });

    return key;
  }

  async getFileUrl(key: string): Promise<string> {
    return await this.client.presignedGetObject(this.bucketName, key);
  }
}
