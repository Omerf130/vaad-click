import { HomeIcon } from "@/components/navigation/HomeIcon";
import { ButtonLink } from "@/components/ui/Button/ButtonLink";
import styles from "@/components/navigation/BackToPublicHomeLink.module.scss";

export function BackToPublicHomeLink() {
  return (
    <ButtonLink
      href="/"
      variant="ghost"
      size="sm"
      className={styles.link}
      aria-label="חזרה לדף הבית"
    >
      <HomeIcon />
      <span className={styles.labelFull}>חזרה לדף הבית</span>
      <span className={styles.labelShort} aria-hidden="true">
        בית
      </span>
    </ButtonLink>
  );
}
