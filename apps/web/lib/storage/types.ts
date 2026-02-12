export interface StorageObject {
  /** Storage key / path */
  key: string;
  /** Public URL to access the file */
  url: string;
  /** MIME type */
  contentType: string;
  /** Size in bytes */
  size: number;
}

export interface StorageProvider {
  put(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<StorageObject>;

  delete(key: string): Promise<void>;

  deleteMany(keys: string[]): Promise<void>;

  getUrl(key: string): string;
}
