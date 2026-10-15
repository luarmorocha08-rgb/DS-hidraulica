import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Armazenamento de anexos. O driver local grava fora de /public; os arquivos
 * só são servidos pelo painel (/api/files/[id]). Para hospedagem serverless,
 * implemente outro driver (S3, R2, Supabase Storage) com a mesma interface.
 */
export interface StorageDriver {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

class LocalStorage implements StorageDriver {
  constructor(private root: string) {}
  private resolve(key: string) {
    const full = path.resolve(this.root, key);
    if (!full.startsWith(path.resolve(this.root) + path.sep)) throw new Error("Chave inválida");
    return full;
  }
  async put(key: string, data: Buffer) {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
  }
  get(key: string) {
    return readFile(this.resolve(key));
  }
  async delete(key: string) {
    await unlink(this.resolve(key)).catch(() => undefined);
  }
}

/**
 * Armazenamento compatível com S3 (Supabase Storage, Cloudflare R2, AWS S3…).
 * O bucket deve ser PRIVADO: os arquivos só saem pelas rotas do site.
 */
class S3Storage implements StorageDriver {
  private clientPromise: Promise<import("@aws-sdk/client-s3").S3Client> | null = null;
  constructor(private bucket: string) {}
  private client() {
    this.clientPromise ??= import("@aws-sdk/client-s3").then(
      ({ S3Client }) =>
        new S3Client({
          region: process.env.S3_REGION || "auto",
          endpoint: process.env.S3_ENDPOINT || undefined,
          forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
          },
        }),
    );
    return this.clientPromise;
  }
  async put(key: string, data: Buffer, contentType: string) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    await (await this.client()).send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: data, ContentType: contentType }));
  }
  async get(key: string) {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const res = await (await this.client()).send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return Buffer.from(await res.Body!.transformToByteArray());
  }
  async delete(key: string) {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    await (await this.client()).send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key })).catch(() => undefined);
  }
}

/** Vercel Blob em modo PRIVADO (store criada com access: "private"). */
class VercelBlobStorage implements StorageDriver {
  async put(key: string, data: Buffer, contentType: string) {
    const { put } = await import("@vercel/blob");
    await put(key, data, { access: "private", contentType, addRandomSuffix: false, allowOverwrite: false });
  }
  async get(key: string) {
    const { get } = await import("@vercel/blob");
    const res = await get(key, { access: "private" });
    if (!res || res.statusCode !== 200 || !res.stream) throw new Error("Arquivo não encontrado");
    return Buffer.from(await new Response(res.stream).arrayBuffer());
  }
  async delete(key: string) {
    const { del } = await import("@vercel/blob");
    await del(key).catch(() => undefined);
  }
}

let driver: StorageDriver | null = null;

export function storage(): StorageDriver {
  if (!driver) {
    const kind = process.env.STORAGE_DRIVER ?? "local";
    if (kind === "vercel-blob") {
      driver = new VercelBlobStorage();
    } else if (kind === "s3") {
      const bucket = process.env.S3_BUCKET;
      if (!bucket) throw new Error("S3_BUCKET não configurado. Veja docs/DEPLOY.md.");
      driver = new S3Storage(bucket);
    } else if (kind === "local") {
      driver = new LocalStorage(path.resolve(/* turbopackIgnore: true */ process.env.STORAGE_DIR ?? "./storage/uploads"));
    } else {
      throw new Error(`STORAGE_DRIVER "${kind}" inválido (use "local", "s3" ou "vercel-blob").`);
    }
  }
  return driver;
}

/* --------------------------- validação --------------------------- */

export const ALLOWED_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
} as const;

export type AllowedMime = keyof typeof ALLOWED_TYPES;

export const MAX_FILES = 6;
export const maxUploadBytes = () => Number(process.env.UPLOAD_MAX_MB ?? 25) * 1024 * 1024;

/** Detecta o tipo real pelo conteúdo (assinatura), não pela extensão. */
export function sniffMime(buf: Buffer): AllowedMime | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return "image/png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP")
    return "image/webp";
  if (buf.toString("ascii", 4, 8) === "ftyp") {
    const brand = buf.toString("ascii", 8, 12);
    if (["heic", "heix", "hevc", "heim", "heis", "mif1", "msf1"].includes(brand)) return "image/heic";
    if (brand === "qt  ") return "video/quicktime";
    return "video/mp4";
  }
  return null;
}

export interface StoredFile {
  originalName: string;
  mimeType: AllowedMime;
  sizeBytes: number;
  storageKey: string;
}

export class UploadError extends Error {}

export async function validateFiles(files: File[]): Promise<Array<{ file: File; buffer: Buffer; mime: AllowedMime }>> {
  const real = files.filter((f) => f && typeof f === "object" && f.size > 0);
  if (real.length > MAX_FILES) throw new UploadError(`Envie no máximo ${MAX_FILES} arquivos.`);
  const max = maxUploadBytes();
  const out = [];
  for (const file of real) {
    if (file.size > max) {
      throw new UploadError(`"${file.name}" excede ${Math.round(max / 1024 / 1024)} MB.`);
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const mime = sniffMime(buffer);
    if (!mime) throw new UploadError(`"${file.name}" não é uma foto (JPG, PNG, WEBP, HEIC) ou vídeo (MP4, MOV).`);
    out.push({ file, buffer, mime });
  }
  return out;
}

export async function storeFiles(
  validated: Array<{ file: File; buffer: Buffer; mime: AllowedMime }>,
  folder: string,
): Promise<StoredFile[]> {
  const now = new Date();
  const prefix = `${folder}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const stored: StoredFile[] = [];
  for (const { file, buffer, mime } of validated) {
    const key = `${prefix}/${randomUUID()}.${ALLOWED_TYPES[mime]}`;
    await storage().put(key, buffer, mime);
    stored.push({
      originalName: file.name.slice(0, 200) || "arquivo",
      mimeType: mime,
      sizeBytes: buffer.length,
      storageKey: key,
    });
  }
  return stored;
}
