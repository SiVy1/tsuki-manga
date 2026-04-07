const MAX_FILE_BYTES = 40 * 1024 * 1024;
const MAX_RELEASE_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;

const allowedMimeTypes = new Set([
  "application/x-subrip",
  "text/plain",
  "text/vtt",
  "application/octet-stream",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/vnd.rar",
  "application/x-7z-compressed",
]);

const allowedExtensions = new Set([
  "ass",
  "idx",
  "rar",
  "srt",
  "ssa",
  "sub",
  "sup",
  "vtt",
  "zip",
  "7z",
]);

function getFileExtension(name: string) {
  const normalized = name.trim().toLowerCase();
  const lastDot = normalized.lastIndexOf(".");

  if (lastDot < 0 || lastDot === normalized.length - 1) {
    return "";
  }

  return normalized.slice(lastDot + 1);
}

export function isUsableUploadFile(value: unknown): value is File {
  return value instanceof File && value.size > 0 && value.name.trim().length > 0;
}

export async function parseUploadedBinary(file: File) {
  if (file.size <= 0) {
    throw new Error("The uploaded file is empty.");
  }

  if (file.size > MAX_FILE_BYTES) {
    throw new Error("File exceeds the 40 MB limit.");
  }

  const extension = getFileExtension(file.name);

  if (!allowedExtensions.has(extension)) {
    throw new Error("Unsupported file format. Allowed formats: ASS, IDX, RAR, SRT, SSA, SUB, SUP, VTT, ZIP, 7Z.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (buffer.length === 0) {
    throw new Error("The uploaded file is empty.");
  }

  const contentType =
    file.type && allowedMimeTypes.has(file.type) ? file.type : "application/octet-stream";

  return {
    buffer,
    contentType,
    originalFilename: file.name || "upload",
    sizeBytes: BigInt(file.size),
  };
}

export function assertReleaseUploadLimit(files: File[]) {
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

  if (totalBytes > MAX_RELEASE_UPLOAD_BYTES) {
    throw new Error("Subtitle upload exceeds the 2 GB limit.");
  }
}
