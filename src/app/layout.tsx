import type { Metadata } from "next";
import { Noto_Sans_Hebrew } from "next/font/google";
import "@/styles/globals.scss";

const notoSansHebrew = Noto_Sans_Hebrew({
  subsets: ["hebrew"],
  weight: ["400", "600", "700"],
  variable: "--font-hebrew",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ועד בקליק",
  description: "פלטפורמה לניהול גביית חובות ועד בית באמצעות משרד עורכי דין",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={notoSansHebrew.variable}>
      <body>{children}</body>
    </html>
  );
}
