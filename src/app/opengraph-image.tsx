import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Design Feedback — Real designer feedback, AI handles the fix.";
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
          justifyContent: "space-between",
          padding: "80px",
          backgroundColor: "#fafaf9",
          backgroundImage:
            "radial-gradient(circle at 85% 15%, rgba(0,117,222,0.14), transparent 55%), radial-gradient(circle at 10% 90%, rgba(221,91,0,0.08), transparent 50%)",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        {/* Top: brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 14,
              backgroundColor: "rgba(0,0,0,0.95)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            DF
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 600,
              color: "#615d59",
              letterSpacing: "-0.01em",
            }}
          >
            Design Feedback
          </div>
        </div>

        {/* Middle: headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 90,
              fontWeight: 800,
              color: "rgba(0,0,0,0.95)",
              letterSpacing: "-0.04em",
              lineHeight: 1.02,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div>Real designer feedback.</div>
            <div style={{ color: "#0075de" }}>AI handles the fix.</div>
          </div>
          <div
            style={{
              fontSize: 30,
              color: "#615d59",
              fontWeight: 500,
              letterSpacing: "-0.01em",
              lineHeight: 1.3,
            }}
          >
            Drop your work. Get reviewed. Ship the fix.
          </div>
        </div>

        {/* Bottom: pill */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 22px",
              borderRadius: 9999,
              backgroundColor: "#ffffff",
              border: "1px solid rgba(0,0,0,0.1)",
              fontSize: 22,
              fontWeight: 600,
              color: "#0075de",
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 9999,
                backgroundColor: "#0075de",
              }}
            />
            design-feedback-nine.vercel.app
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
