import sharp from "sharp";

const MAX_FILE_BYTES = 40 * 1024 * 1024;

const formatToMimeType: Record<string, string> = {
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function isUsableUploadFile(value: unknown): value is File {
  return (
    value instanceof File &&
    value.size > 0 &&
    value.name.trim().length > 0
  );
}

export async function parseUploadedImage(file: File) {
  if (file.size <= 0) {
    throw new Error("The uploaded file is empty.");
  }

  if (file.size > MAX_FILE_BYTES) {
    throw new Error("File exceeds the 40 MB limit.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (buffer.length === 0) {
    throw new Error("The uploaded file is empty.");
  }

  const metadata = await sharp(buffer).metadata();
  const format = metadata.format?.toLowerCase();

  if (!format || !(format in formatToMimeType)) {
    throw new Error("Unsupported file format. Allowed formats: PNG, JPG/JPEG, WebP.");
  }

  return {
    buffer,
    contentType: formatToMimeType[format],
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    originalFilename: file.name || "upload",
    sizeBytes: BigInt(file.size),
  };
}

export function assertChapterUploadLimit(files: File[]) {
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

  if (totalBytes > 2 * 1024 * 1024 * 1024) {
    throw new Error("Chapter upload exceeds the 2 GB limit.");
  }
}
