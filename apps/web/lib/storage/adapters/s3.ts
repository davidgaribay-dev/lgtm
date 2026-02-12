import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import type { StorageProvider, StorageObject } from "../types";

export interface S3AdapterConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrlBase?: string;
  forcePathStyle?: boolean;
}

export class S3Adapter implements StorageProvider {
  private client: S3Client;
  private bucket: string;
  private publicUrlBase: string;

  constructor(config: S3AdapterConfig) {
    this.bucket = config.bucket;
    this.publicUrlBase =
      config.publicUrlBase || `${config.endpoint}/${config.bucket}`;
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle ?? true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async put(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<StorageObject> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );

    return {
      key,
      url: `${this.publicUrlBase}/${key}`,
      contentType,
      size: body.length,
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async deleteMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.client.send(
      new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: { Objects: keys.map((k) => ({ Key: k })) },
      }),
    );
  }

  getUrl(key: string): string {
    return `${this.publicUrlBase}/${key}`;
  }
}
