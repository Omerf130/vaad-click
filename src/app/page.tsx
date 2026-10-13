import styles from "./page.module.scss";
import { APP_DISPLAY_NAME } from "@/shared/constants/app";
import { Button, Card, PageHeading, StatusBadge } from "@/components/ui";

export default function Home() {
  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <aside className={styles.sidebar} aria-label="תצוגת סרגל צד — עיצוב בלבד">
          <div className={styles.sidebarBrand}>{APP_DISPLAY_NAME}</div>
          <p className={styles.sidebarNote}>מערכת עיצוב CP1B</p>
          <nav className={styles.sidebarNav} aria-label="דוגמת ניווט">
            <span className={styles.navItemActive}>תצוגת רכיבים</span>
            <span className={styles.navItem}>לוח בקרה (עתידי)</span>
            <span className={styles.navItem}>תיקים (עתידי)</span>
          </nav>
        </aside>

        <div className={styles.mainColumn}>
          <header className={styles.topBar}>
            <span className={styles.topBarLabel}>תצוגת שולחן עבודה — יסוד ויזואלי</span>
            <StatusBadge label="CP1B" variant="info" />
          </header>

          <main className={styles.main} id="main-content">
            <PageHeading
              eyebrow="VaadClick Design System"
              title="יסוד ויזואלי מאושר"
              subtitle="בדיקת צבעים, טיפוגרפיה, רכיבים ופריסת SaaS בעברית RTL. ללא תהליכים עסקיים."
              actions={
                <>
                  <Button variant="primary">פעולה ראשית</Button>
                  <Button variant="secondary">פעולה משנית</Button>
                </>
              }
            />

            <section className={styles.section} aria-labelledby="tokens-heading">
              <h2 id="tokens-heading" className={styles.sectionTitle}>
                דוגמאות רכיבים
              </h2>

              <div className={styles.grid}>
                <Card
                  title="כפתורים"
                  description="ראשי (נייבי), משני, הדגשה ורוחב רוח."
                >
                  <div className={styles.buttonRow}>
                    <Button variant="primary">ראשי</Button>
                    <Button variant="accent">הדגשה</Button>
                    <Button variant="secondary">משני</Button>
                    <Button variant="ghost">טקסטי</Button>
                    <Button variant="primary" size="sm">
                      קטן
                    </Button>
                  </div>
                </Card>

                <Card title="תגיות סטטוס" description="לשימוש בלוחות מעקב ותורים.">
                  <div className={styles.badgeRow}>
                    <StatusBadge label="מאושר" variant="success" />
                    <StatusBadge label="ממתין" variant="warning" />
                    <StatusBadge label="נדחה" variant="error" />
                    <StatusBadge label="בבדיקה" variant="info" />
                    <StatusBadge label="טיוטה" variant="neutral" />
                  </div>
                </Card>

                <Card
                  title="משטח וטקסט"
                  description="כרטיסים על רקע אפור-כחלחל עם גבול עדין."
                  padding="lg"
                >
                  <p className={styles.sampleText}>
                    זהו טקסט גוף לדוגמה. ההיררכיה נשענת על משקלים, גוונים וריווח — לא על
                    אפקטים דקורטיביים.
                  </p>
                  <p className={styles.sampleMuted}>
                    טקסט משני בגוון מ-muted לפרטים ומטא-דאטה.
                  </p>
                </Card>
              </div>
            </section>

            <p className={styles.footnote}>
              דף זה מציג את יסוד העיצוב בלבד. דף הבית הציבורי, כולל מקטע שלושת השלבים,
              ייושם ב-CP2.
            </p>
          </main>
        </div>
      </div>
    </div>
  );
}
