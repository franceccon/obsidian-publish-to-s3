import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { App, normalizePath, TFile, TFolder, type CachedMetadata } from "obsidian";
import type { PublishToS3Settings } from "./settings";

export type Dictionary<T> = Record<string, T>;

export type Metadata = {
  files: FileMetadata[];
};

export type FileMetadata = {
  path: string;
  title: string;
  createdAt: string;
  metadata: Dictionary<string>;
};

export type PublishProgress = {
  completed: number;
  total: number;
  currentPath: string | null;
};

export async function publishToS3(
  app: App,
  settings: PublishToS3Settings,
  onProgress?: (progress: PublishProgress) => void,
): Promise<number> {
  const sourceFolder = getSourceFolder(app, settings.folder);
  const files = getFiles(app, sourceFolder);
  const s3 = createS3Client(app, settings);
  const bucket = requireSetting(settings.s3.bucket, "S3 bucket");
  const prefix = normalizePrefix(settings.s3.prefix);
  const total = files.length + 1;
  let completed = 0;

  try {
    reportProgress(onProgress, completed, total, files[0]?.path ?? "index.json");

    for (const [index, file] of files.entries()) {
      const relativePath = sourceFolder ? file.path.slice(sourceFolder.path.length + 1) : file.path;

      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: objectKey(prefix, relativePath),
          Body: new Uint8Array(await app.vault.readBinary(file)),
        }),
      );

      completed += 1;
      reportProgress(onProgress, completed, total, files[index + 1]?.path ?? "index.json");
    }

    const metadata: Metadata = {
      files: files.map((file) => fileMetadata(app, file)),
    };

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey(prefix, "index.json"),
        Body: JSON.stringify(metadata, null, 2),
        ContentType: "application/json",
      }),
    );
    reportProgress(onProgress, total, total, null);
  } finally {
    s3.destroy();
  }

  return files.length;
}

function reportProgress(
  onProgress: ((progress: PublishProgress) => void) | undefined,
  completed: number,
  total: number,
  currentPath: string | null,
): void {
  onProgress?.({ completed, total, currentPath });
}

function getSourceFolder(app: App, configuredFolder: string): TFolder | null {
  const trimmed = configuredFolder.trim().replace(/^\/+|\/+$/g, "");
  if (!trimmed) {
    return null;
  }

  const path = normalizePath(trimmed);
  const folder = app.vault.getAbstractFileByPath(path);
  if (!(folder instanceof TFolder)) {
    throw new Error(`Folder not found: ${path}`);
  }

  return folder;
}

function getFiles(app: App, sourceFolder: TFolder | null): TFile[] {
  const pathPrefix = sourceFolder ? `${sourceFolder.path}/` : "";

  return app.vault
    .getFiles()
    .filter((file) => file.path.startsWith(pathPrefix))
    .sort((left, right) => left.path.localeCompare(right.path));
}

function createS3Client(app: App, settings: PublishToS3Settings): S3Client {
  const accessKeyId = requireSetting(settings.s3.accessKeyId, "S3 access key ID");
  const secretId = requireSetting(settings.s3.secretAccessKeySecretId, "S3 secret access key");
  const secretAccessKey = app.secretStorage.getSecret(secretId);
  if (!secretAccessKey) {
    throw new Error("The selected S3 secret access key was not found");
  }

  return new S3Client({
    credentials: { accessKeyId, secretAccessKey },
    endpoint: optionalSetting(settings.s3.endpoint),
    region: optionalSetting(settings.s3.region) ?? "us-east-1",
  });
}

function fileMetadata(app: App, file: TFile): FileMetadata {
  const cache = app.metadataCache.getFileCache(file);

  return {
    path: file.path,
    title: documentTitle(file, cache),
    createdAt: new Date(file.stat.ctime).toISOString(),
    metadata: frontmatterMetadata(cache),
  };
}

function documentTitle(file: TFile, cache: CachedMetadata | null): string {
  const frontmatterTitle = cache?.frontmatter?.title;
  if (typeof frontmatterTitle === "string" && frontmatterTitle.trim()) {
    return frontmatterTitle;
  }

  return cache?.headings?.[0]?.heading || file.basename;
}

function frontmatterMetadata(cache: CachedMetadata | null): Dictionary<string> {
  const entries = Object.entries(cache?.frontmatter ?? {}).filter(([key]) => key !== "position");

  return Object.fromEntries(entries.map(([key, value]) => [key, metadataValue(value)]));
}

function metadataValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value) ?? String(value);
}

function requireSetting(value: string, name: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${name} is not configured`);
  }

  return trimmed;
}

function optionalSetting(value: string): string | undefined {
  return value.trim() || undefined;
}

function normalizePrefix(prefix: string): string {
  return prefix.trim().replace(/^\/+|\/+$/g, "");
}

function objectKey(prefix: string, path: string): string {
  return prefix ? `${prefix}/${path}` : path;
}
