import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GroupTalk - Vòng quay & Rút thẻ bài kết nối nhóm",
    short_name: "GroupTalk",
    description:
      "Web game vòng quay và rút thẻ bài kết nối nhóm bạn, cặp đôi. Quay để chọn người, rút 1 trong 3 thẻ câu hỏi để chia sẻ thật lòng và deeptalk.",
    start_url: "/",
    display: "standalone",
    background_color: "#F6F1EA",
    theme_color: "#F6F1EA",
    icons: [
      {
        src: "/icon.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
