import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "GroupTalk - Vòng quay & Rút thẻ bài kết nối nhóm";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
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
          backgroundColor: "#F6F1EA",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        {/* Ambient background glows matching PRD palette */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            left: "-80px",
            width: "480px",
            height: "480px",
            borderRadius: "50%",
            backgroundColor: "rgba(253, 203, 110, 0.4)",
            filter: "blur(90px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            right: "-80px",
            width: "520px",
            height: "520px",
            borderRadius: "50%",
            backgroundColor: "rgba(255, 107, 129, 0.35)",
            filter: "blur(90px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "120px",
            right: "100px",
            width: "360px",
            height: "360px",
            borderRadius: "50%",
            backgroundColor: "rgba(162, 155, 254, 0.3)",
            filter: "blur(90px)",
          }}
        />

        {/* Content Box */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "40px",
          }}
        >
          {/* Eyebrow badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 24px",
              borderRadius: "9999px",
              backgroundColor: "#1C1917",
              color: "#F6F1EA",
              fontSize: "20px",
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginBottom: "28px",
            }}
          >
            TRÒ CHƠI NHÓM • DEEPTALKING
          </div>

          {/* Main Title */}
          <div
            style={{
              fontSize: "96px",
              fontWeight: 900,
              color: "#1C1917",
              letterSpacing: "-0.03em",
              lineHeight: 1,
              marginBottom: "20px",
            }}
          >
            GroupTalk
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: "36px",
              fontWeight: 600,
              color: "#57534E",
              marginBottom: "40px",
            }}
          >
            Quay. Rút thẻ. Nói thật với nhau.
          </div>

          {/* Category Chips */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                padding: "12px 24px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, #FF6B81, #C44569)",
                color: "#FFFFFF",
                fontSize: "22px",
                fontWeight: 700,
              }}
            >
              Cặp đôi
            </div>
            <div
              style={{
                display: "flex",
                padding: "12px 24px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, #FDCB6E, #E17055)",
                color: "#FFFFFF",
                fontSize: "22px",
                fontWeight: 700,
              }}
            >
              Nhóm bạn
            </div>
            <div
              style={{
                display: "flex",
                padding: "12px 24px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, #A29BFE, #FD79A8)",
                color: "#FFFFFF",
                fontSize: "22px",
                fontWeight: 700,
              }}
            >
              Nhóm nữ
            </div>
            <div
              style={{
                display: "flex",
                padding: "12px 24px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, #4834D4, #0984E3)",
                color: "#FFFFFF",
                fontSize: "22px",
                fontWeight: 700,
              }}
            >
              Nhóm nam
            </div>
          </div>
        </div>

        {/* Domain footer */}
        <div
          style={{
            position: "absolute",
            bottom: "32px",
            display: "flex",
            alignItems: "center",
            fontSize: "20px",
            fontWeight: 600,
            color: "#8A8178",
            letterSpacing: "0.05em",
          }}
        >
          grouptalk.t5edu.site
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
