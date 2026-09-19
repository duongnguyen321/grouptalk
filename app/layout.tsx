import type { Metadata } from "next";
import { Baloo_2 } from "next/font/google";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import "./globals.css";

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "700", "800"],
});

export const metadata: Metadata = {
  title: "GroupTalk",
  description: "Quay. Rút thẻ. Nói thật với nhau.",
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
