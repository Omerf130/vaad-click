import Image from "next/image";
import { Container } from "@/components/ui";
import { ButtonLink } from "@/components/ui/Button/ButtonLink";
import { PlannedAction } from "@/components/public/PlannedAction/PlannedAction";
import { HeroIllustrativePreview } from "@/components/public/home/HeroIllustrativePreview/HeroIllustrativePreview";
import { homepageHero } from "@/content/homepage";
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
          <div className={styles.visualFrame}>
            <div className={styles.imageWrap}>
              <Image
                src="/pics/hero-img.png"
                alt={homepageHero.imageAlt}
                fill
                priority
                sizes="(max-width: 1024px) 92vw, 540px"
                className={styles.heroImage}
              />
            </div>
            <HeroIllustrativePreview />
          </div>
        </div>
      </Container>
    </section>
  );
}
