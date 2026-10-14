import { ImageResponse } from "next/og";

export const alt = "DS Hidráulica — Especialistas em direção hidráulica";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "radial-gradient(circle at 75% 40%, #3a1a06 0%, #0a0a0a 60%)", color: "#f4f4f2", fontFamily: "sans-serif" }}>
        <div style={{ fontSize: 120, fontWeight: 900, fontStyle: "italic", letterSpacing: -4, color: "#d9dbde" }}>DS</div>
        <div style={{ fontSize: 44, fontWeight: 800, fontStyle: "italic", color: "#c5c7c9", marginTop: -10 }}>HIDRÁULICA</div>
        <div style={{ width: 220, height: 4, background: "#f47712", margin: "28px 0" }} />
        <div style={{ fontSize: 54, fontWeight: 800, lineHeight: 1.1 }}>Especialistas em</div>
        <div style={{ fontSize: 54, fontWeight: 800, lineHeight: 1.1, color: "#f47712" }}>direção hidráulica</div>
        <div style={{ fontSize: 28, color: "#c5c7c9", marginTop: 24 }}>Caminhões · Ônibus · Veículos pesados — agende online</div>
      </div>
    ),
    size,
  );
}
