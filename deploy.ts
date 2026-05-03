import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import * as mime from "mime-types";

dotenv.config();

// ─── Config ──────────────────────────────────────────────────────────────────

const CONFIG = {
  region: process.env.AWS_REGION || "us-east-1",
  bucket: "https://snake-animation-kdone-2026.s3.us-east-1.amazonaws.com/index.html"
};

// ─── S3 Client ───────────────────────────────────────────────────────────────

const s3 = new S3Client({
  region: CONFIG.region,
  credentials: process.env.AWS_ACCESS_KEY_ID ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  } : undefined, // falls back to IAM role / AWS profile if not set
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAllFiles(dir: string, base = dir): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? getAllFiles(fullPath, base) : [fullPath];
  });
}

function getS3Key(filePath: string): string {
  return path.relative(CONFIG.bucket, filePath).replace(/\\/g, "/");
}

function getCacheControl(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  // HTML: no cache (always fresh)
  if (ext === ".html") return "no-cache, no-store, must-revalidate";
  // JS/CSS with hashes: long cache
  if ([".js", ".css", ".woff", ".woff2"].includes(ext)) return "public, max-age=31536000, immutable";
  // Everything else: 1 day
  return "public, max-age=86400";
}

// ─── Upload ──────────────────────────────────────────────────────────────────

async function uploadFiles(files: string[]): Promise<void> {
  console.log(`\n📦 Uploading ${files.length} file(s) to s3://${CONFIG.bucket}...\n`);

  for (const filePath of files) {
    const key = getS3Key(filePath);
    const contentType = mime.lookup(filePath) || "application/octet-stream";
    const body = fs.readFileSync(filePath);

    await s3.send(new PutObjectCommand({
      Bucket: CONFIG.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: getCacheControl(filePath),
    }));

    console.log(`  ✅ ${key}  (${contentType})`);
  }
}

// ─── Purge stale files ───────────────────────────────────────────────────────

async function purgeStaleFiles(localKeys: Set<string>): Promise<void> {
  const list = await s3.send(new ListObjectsV2Command({ Bucket: CONFIG.bucket }));
  const remoteKeys = (list.Contents || []).map((o) => o.Key!);
  const stale = remoteKeys.filter((k) => !localKeys.has(k));

  if (stale.length === 0) {
    console.log("\n🧹 No stale files to remove.");
    return;
  }

  console.log(`\n🗑  Removing ${stale.length} stale file(s)...`);
  await s3.send(new DeleteObjectsCommand({
    Bucket: CONFIG.bucket,
    Delete: { Objects: stale.map((Key) => ({ Key })) },
  }));
  stale.forEach((k) => console.log(`  ❌ removed: ${k}`));
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function deploy(): Promise<void> {
  console.log(`\n🚀 Deploying to [${CONFIG.bucket}] → s3://${CONFIG.bucket}`);
  console.log(`   Region : ${CONFIG.region}`);

  const files = getAllFiles(CONFIG.bucket);
  const localKeys = new Set(files.map(getS3Key));

  await uploadFiles(files);
  await purgeStaleFiles(localKeys);

  console.log(`\n✨ Deploy complete!`);
  console.log(`   https://${CONFIG.bucket}.s3-website-${CONFIG.region}.amazonaws.com\n`);
}

deploy().catch((err) => {
  console.error("❌ Deploy failed:", err);
  process.exit(1);
});
