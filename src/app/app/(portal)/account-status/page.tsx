import { Container } from "@/components/ui";
import { Card } from "@/components/ui/Card/Card";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { requireAccountStatusPageAccess } from "@/shared/auth/require-access";
import styles from "../../portal.module.scss";

export default async function AccountStatusPage() {
  const { user } = await requireAccountStatusPageAccess();

  let title = "סטטוס חשבון";
  let body =
    "החשבון מאושר. אין עדיין שיוך לבניין — מנהל המשרד ישייך את החשבון כאשר יהיה מוכן.";

  if (user.accountStatus === AccountStatus.PENDING_APPROVAL) {
    title = "ממתין לאישור מנהל המשרד";
    body =
      "ההרשמה התקבלה. לא ניתן לגשת לנתונים תפעוליים עד שעורך הדין יאשר את החשבון.";
  } else if (user.accountStatus === AccountStatus.REJECTED) {
    title = "החשבון נדחה";
    body =
      "מנהל המשרד דחה את בקשת ההרשמה. לבירורים, פנו למשרד. ניתן לבקש שקילה מחדש רק דרך מנהל המשרד.";
  }

  return (
    <Container>
      <Card className={styles.card}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.meta}>
          {user.fullName} · {user.email}
        </p>
        <p className={styles.body}>{body}</p>
      </Card>
    </Container>
  );
}
