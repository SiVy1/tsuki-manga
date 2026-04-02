import sharp from "sharp";

export async function createPngFile(
  filename: string,
  options?: {
    width?: number;
    height?: number;
    rgb?: { r: number; g: number; b: number };
  },
) {
  const width = options?.width ?? 32;
  const height = options?.height ?? 48;
  const rgb = options?.rgb ?? { r: 80, g: 110, b: 140 };

  const buffer = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: rgb,
    },
  })
    .png()
    .toBuffer();

  return new File([Uint8Array.from(buffer)], filename, {
    type: "image/png",
  });
}
