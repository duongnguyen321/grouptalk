import type { Metadata } from "next";
import { Baloo_2 } from "next/font/google";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import "./globals.css";

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "700", "800"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://grouptalk.t5edu.site";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "GroupTalk - Vòng quay & Rút thẻ bài kết nối nhóm",
    template: "%s | GroupTalk",
  },
  description:
    "Web game vòng quay và rút thẻ bài kết nối nhóm bạn, cặp đôi tụ tập. Quay ngẫu nhiên, rút 1 trong 3 thẻ câu hỏi bí mật để chia sẻ thật lòng và deeptalk.",
  keywords: [
    "grouptalk",
    "trò chơi nhóm",
    "game vòng quay",
    "rút thẻ bài",
    "deeptalk",
    "board game việt",
    "trò chơi kết nối",
    "game cặp đôi",
    "icebreaker game",
    "truth or dare",
    "nói thật hay thử thách",
    "trò chơi tụ tập bạn bè",
    "vòng quay rút thẻ",
    "câu hỏi deeptalk",
    "game bạn bè",
  ],
  authors: [{ name: "GroupTalk Team", url: APP_URL }],
  creator: "GroupTalk",
  publisher: "GroupTalk",
  applicationName: "GroupTalk",
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  alternates: {
    canonical: APP_URL,
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: APP_URL,
    siteName: "GroupTalk",
    title: "GroupTalk - Vòng quay & Rút thẻ bài kết nối nhóm",
    description:
      "Web game vòng quay và rút thẻ bài kết nối nhóm bạn, cặp đôi tụ tập. Quay để chọn người, rút 1 trong 3 thẻ câu hỏi để chia sẻ thật lòng.",
  },
  twitter: {
    card: "summary_large_image",
    title: "GroupTalk - Vòng quay & Rút thẻ bài kết nối nhóm",
    description:
      "Web game vòng quay và rút thẻ bài kết nối nhóm bạn, cặp đôi. Deeptalking và gắn kết không cần cài đặt.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${baloo.variable} h-full antialiased`}>
      <body
        className={`${baloo.className} flex min-h-full flex-col bg-canvas text-ink`}
      >
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
