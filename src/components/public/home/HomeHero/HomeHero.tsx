import Image from "next/image";
import heroImage from "../../../../../public/pics/hero-img.png";
import { Container } from "@/components/ui";
import { ButtonLink } from "@/components/ui/Button/ButtonLink";
import { PlannedAction } from "@/components/public/PlannedAction/PlannedAction";
import { homepageHero } from "@/content/homepage";
import { lawFirmDeliveryScopeClarification } from "@/content/law-firm";
import styles from "./HomeHero.module.scss";

export function HomeHero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-heading">
      <Container className={styles.inner}>
        <div className={styles.content}>
          <p className={styles.eyebrow}>{homepageHero.eyebrow}</p>
          <h1 id="hero-heading" className={styles.headline}>
            {homepageHero.headline}
          </h1>
          <p className={styles.supporting}>{homepageHero.supporting}</p>
          <p className={styles.scopeNote}>{lawFirmDeliveryScopeClarification}</p>
          <div className={styles.ctas}>
            <PlannedAction
              label={homepageHero.primaryCta}
              hint={homepageHero.primaryCtaHint}
              variant="primary"
            />
            <ButtonLink href="#how-it-works" variant="secondary">
              {homepageHero.secondaryCta}
            </ButtonLink>
          </div>
        </div>

        <div className={styles.visualColumn}>
          <div className={styles.imageWrap}>
            <Image
              src={heroImage}
              alt={homepageHero.imageAlt}
              fill
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 55vw, 620px"
              className={styles.heroImage}
            />
          </div>
        </div>
      </Container>
    </section>
  );
}
