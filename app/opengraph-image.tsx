import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Tsuki Manga";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f4f4f5", // Light calm surface
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 100,
            fontFamily: "serif",
            fontWeight: "normal",
            color: "#09090b",
            letterSpacing: "-0.02em",
          }}
        >
          Tsuki Manga
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 24,
            textTransform: "uppercase",
            letterSpacing: "0.24em",
            color: "#71717a", // Muted text
            marginTop: 24,
          }}
        >
          Scanlation Platform
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
