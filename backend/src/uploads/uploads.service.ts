import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

@Injectable()
export class UploadsService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('BUCKET') ?? '';
    this.s3 = new S3Client({
      region: this.config.get<string>('S3_REGION') ?? 'auto',
      endpoint: this.config.get<string>('S3_ENDPOINT'),
      credentials: {
        accessKeyId: this.config.get<string>('ACCESS_KEY_ID') ?? '',
        secretAccessKey: this.config.get<string>('SECRET_ACCESS_KEY') ?? '',
      },
    });
  }

  async upload(buffer: Buffer, mimetype: string, keyPrefix: string): Promise<string> {
    const extension = mimetype.split('/')[1] ?? 'bin';
    const key = `${keyPrefix}/${randomUUID()}.${extension}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
      }),
    );

    return key;
  }

  async getObject(key: string): Promise<{ body: NodeJS.ReadableStream; contentType?: string }> {
    const result = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    return {
      body: result.Body as NodeJS.ReadableStream,
      contentType: result.ContentType,
    };
  }
}
