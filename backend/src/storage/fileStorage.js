import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const storageMode = process.env.STORAGE_MODE || 'local';

async function storeLocally(file) {
  const uploadDir = process.env.UPLOAD_DIR || 'uploads';
  const absoluteDir = path.resolve(process.cwd(), 'backend', uploadDir);
  await mkdir(absoluteDir, { recursive: true });

  const fileId = randomUUID();
  const extension = path.extname(file.originalname);
  const fileName = `${fileId}${extension}`;
  const absolutePath = path.join(absoluteDir, fileName);

  // Persist raw file bytes to local storage (Replit-friendly fallback).
  await writeFile(absolutePath, file.buffer);

  return {
    fileId,
    provider: 'local',
    path: absolutePath,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size
  };
}

async function storeInS3(file) {
  const bucket = process.env.S3_BUCKET;
  const region = process.env.AWS_REGION || 'us-east-1';

  if (!bucket) {
    throw new Error('Missing S3_BUCKET for STORAGE_MODE=s3');
  }

  const fileId = randomUUID();
  const key = `96ply/${fileId}-${file.originalname}`;

  const client = new S3Client({ region });
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
    })
  );

  return {
    fileId,
    provider: 's3',
    bucket,
    key,
    region,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size
  };
}

export async function saveUploadedFile(file) {
  // Use S3 for cloud storage when configured; otherwise fallback to local disk.
  if (storageMode === 's3') {
    return storeInS3(file);
  }

  return storeLocally(file);
}
