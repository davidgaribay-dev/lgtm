import { put, del } from "@vercel/blob";
import type { StorageProvider, StorageObject } from "../types";

export class VercelBlobAdapter implements StorageProvider {
  async put(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<StorageObject> {
    const blob = await put(key, body, {
      access: "public",
      addRandomSuffix: true,
      contentType,
    });

    return {
      key: blob.pathname,
      url: blob.url,
      contentType: blob.contentType,
      size: body.length,
    };
  }

  async delete(key: string): Promise<void> {
    await del(key);
  }

  async deleteMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await del(keys);
  }

  getUrl(key: string): string {
    return key;
  }
}
