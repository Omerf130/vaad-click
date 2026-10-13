import type { Metadata } from "next";
import { Noto_Sans_Hebrew } from "next/font/google";
import { SITE_NAME, SITE_URL } from "@/shared/seo/site";
import "@/styles/globals.scss";

const notoSansHebrew = Noto_Sans_Hebrew({
  subsets: ["hebrew"],
  weight: ["400", "600", "700"],
  variable: "--font-hebrew",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: "פלטפורמה לניהול גביית חובות ועד בית באמצעות משרד עורכי דין",
  robots: {
    index: true,
    follow: true,
  },
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
