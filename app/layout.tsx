import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { OfflineBanner } from "@/app/components/OfflineBanner";

// §7: "Thai font: Noto Sans Thai or Sarabun. Do not rely on the system font."
const notoSansThai = Noto_Sans_Thai({
  variable: "--font-thai",
  subsets: ["thai", "latin"],
});

export const metadata: Metadata = {
  title: "ระบบใบสั่งงานซ่อมบำรุง",
  description: "Work order tracking",
};

// Phone-first (§3) — explicit rather than relying on Next's default, and
// zoom stays enabled (no maximum-scale/user-scalable=no) for accessibility.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${notoSansThai.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <OfflineBanner />
        {children}
      </body>
    </html>
  );
}
