import type { StorageProvider } from "./types";

export type { StorageProvider, StorageObject } from "./types";

let _instance: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (_instance) return _instance;

  const provider = process.env.STORAGE_PROVIDER || "vercel-blob";

  switch (provider) {
    case "vercel-blob": {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { VercelBlobAdapter } = require("./adapters/vercel-blob");
      _instance = new VercelBlobAdapter() as StorageProvider;
      break;
    }
    case "s3": {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { S3Adapter } = require("./adapters/s3");
      _instance = new S3Adapter({
        endpoint: process.env.S3_ENDPOINT!,
        region: process.env.S3_REGION || "us-east-1",
        bucket: process.env.S3_BUCKET!,
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
        publicUrlBase: process.env.S3_PUBLIC_URL_BASE,
        forcePathStyle: true,
      }) as StorageProvider;
      break;
    }
    default:
      throw new Error(
        `Unknown STORAGE_PROVIDER: "${provider}". Supported values: "vercel-blob", "s3"`,
      );
  }

  return _instance;
}
