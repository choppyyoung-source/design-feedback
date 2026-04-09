import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Design Feedback — AI-powered design review tool";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: "#0075de",
          }}
        />

        {/* Icon row */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: "#f2f9ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
            }}
          >
            📤
          </div>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: "#f6f5f4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
            }}
          >
            💬
          </div>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: "#f2f9ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
            }}
          >
            ✨
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: "rgba(0,0,0,0.95)",
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
            textAlign: "center",
          }}
        >
          Design Feedback
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 24,
            color: "#615d59",
            marginTop: 16,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          Get feedback from designers, apply it directly with AI.
        </div>

        {/* Bottom domain */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            fontSize: 16,
            color: "#a39e98",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          design-feedback.pages.dev
        </div>
      </div>
    ),
    { ...size }
  );
}
