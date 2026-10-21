import type { ReactNode } from "react";

import { ButtonLink } from "@/components/ui/Button/ButtonLink";
import { Button } from "@/components/ui/Button/Button";
import styles from "@/components/ui/DataList/DataList.module.scss";

type Props = {
  page: number;
  totalPages: number;
  summary?: ReactNode;
  prevHref?: string | null;
  nextHref?: string | null;
  onPrev?: () => void;
  onNext?: () => void;
};

export function ListPagination({
  page,
  totalPages,
  summary,
  prevHref,
  nextHref,
  onPrev,
  onNext,
}: Props) {
  const showPrev = Boolean(prevHref || onPrev) && page > 1;
  const showNext = Boolean(nextHref || onNext) && page < totalPages;

  return (
    <nav className={styles.paginationBar} aria-label="דפדוף ברשימה">
      <span>{summary ?? `עמוד ${page} מתוך ${totalPages || 1}`}</span>
      <div className={styles.paginationActions}>
        {showPrev ? (
          prevHref ? (
            <ButtonLink href={prevHref} variant="secondary" size="sm">
              הקודם
            </ButtonLink>
          ) : (
            <Button type="button" variant="secondary" size="sm" onClick={onPrev}>
              הקודם
            </Button>
          )
        ) : null}
        {showNext ? (
          nextHref ? (
            <ButtonLink href={nextHref} variant="secondary" size="sm">
              הבא
            </ButtonLink>
          ) : (
            <Button type="button" variant="secondary" size="sm" onClick={onNext}>
              הבא
            </Button>
          )
        ) : null}
      </div>
    </nav>
  );
}
