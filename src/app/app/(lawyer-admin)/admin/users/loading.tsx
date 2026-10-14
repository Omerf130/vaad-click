import { AdminPageFrame } from "@/modules/admin/components/AdminPageFrame";
import styles from "@/modules/users/ui/AdminUsers.module.scss";

export default function AdminUsersLoading() {
  return (
    <AdminPageFrame title="משתמשים" subtitle="טוען רשימת משתמשים…">
      <div className={styles.skeleton} aria-busy="true" aria-label="טוען" />
    </AdminPageFrame>
  );
}
