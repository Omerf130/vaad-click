import type { Metadata } from "next";
import { PublicFooter } from "@/components/public/PublicFooter/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader/PublicHeader";
import { HomeAudience } from "@/components/public/home/HomeAudience/HomeAudience";
import { HomeFinalCta } from "@/components/public/home/HomeFinalCta/HomeFinalCta";
import { HomeHero } from "@/components/public/home/HomeHero/HomeHero";
import { HomeProcess } from "@/components/public/home/HomeProcess/HomeProcess";
import { HomeTransparency } from "@/components/public/home/HomeTransparency/HomeTransparency";
import { homepageMeta } from "@/content/homepage";
import { buildPublicPageMetadata } from "@/shared/seo/build-public-page-metadata";
import styles from "./page.module.scss";

export const metadata: Metadata = buildPublicPageMetadata({
  title: homepageMeta.title,
  description: homepageMeta.description,
  path: "/",
});

export default function HomePage() {
  return (
    <div className={styles.page}>
      <a href="#main-content" className="skipLink">
        דלג לתוכן הראשי
      </a>
      <PublicHeader />
      <main id="main-content" className={styles.main}>
        <HomeHero />
        <HomeAudience />
        <HomeProcess />
        <HomeTransparency />
        <HomeFinalCta />
      </main>
      <PublicFooter />
    </div>
  );
}
