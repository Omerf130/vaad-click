"use client";

import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button/Button";
import type { DebtCaseEvidenceInventoryView } from "@/modules/debt-cases/domain/debt-case-evidence-inventory.types";
import { DebtCaseEvidenceAvailabilityStatus } from "@/modules/debt-cases/domain/debt-case-evidence-inventory.types";
import styles from "@/modules/debt-cases/ui/lawyer/DebtCaseEvidenceExportPanel.module.scss";

type Props = {
  debtCaseId: string;
  inventory: DebtCaseEvidenceInventoryView;
};

export function DebtCaseEvidenceExportPanel({ debtCaseId, inventory }: Props) {
  const [selectedOrder, setSelectedOrder] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const selectedSet = useMemo(() => new Set(selectedOrder), [selectedOrder]);

  const toggleItem = (inventoryItemId: string) => {
    setSelectedOrder((prev) => {
      if (prev.includes(inventoryItemId)) {
        return prev.filter((id) => id !== inventoryItemId);
      }
      return [...prev, inventoryItemId];
    });
  };

  const moveItem = (inventoryItemId: string, direction: -1 | 1) => {
    setSelectedOrder((prev) => {
      const index = prev.indexOf(inventoryItemId);
      if (index < 0) {
        return prev;
      }
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) {
        return prev;
      }
      const copy = [...prev];
      const [row] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, row!);
      return copy;
    });
  };

  const downloadZip = useCallback(async () => {
    if (selectedOrder.length === 0) {
      setStatusMessage("יש לבחור לפחות מסמך אחד.");
      return;
    }
    setPending(true);
    setStatusMessage(null);
    try {
      const response = await fetch(`/app/admin/debt-cases/${debtCaseId}/evidence-export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedInventoryItemIds: selectedOrder }),
      });
      if (!response.ok) {
        const text = await response.text();
        setStatusMessage(text || "יצירת החבילה נכשלה.");
        return;
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `evidence-export-${debtCaseId.slice(0, 8)}.zip`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      setStatusMessage("חבילת הנספחים הורדה — להכנה ולבדיקה בלבד.");
    } catch {
      setStatusMessage("שגיאת רשת ביצירת החבילה.");
    } finally {
      setPending(false);
    }
  }, [debtCaseId, selectedOrder]);

  return (
    <section id="case-evidence-export" className={styles.root} tabIndex={-1}>
      <p className={styles.disclaimer} role="status">
        {inventory.disclaimerHe}
      </p>
      <h2 className={styles.title}>מסמכים ונספחים — ייצוא ZIP</h2>

      <ul className={styles.inventoryList}>
        {inventory.items.map((item) => {
          const checked = selectedSet.has(item.inventoryItemId);
          const unavailable = item.availability !== DebtCaseEvidenceAvailabilityStatus.AVAILABLE;
          return (
            <li key={item.inventoryItemId} className={styles.inventoryRow}>
              <label>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleItem(item.inventoryItemId)}
                />
                <span className={styles.itemTitle}>{item.displayNameHe}</span>
                <span className={styles.itemMeta}>
                  {item.categoryHe}
                  {unavailable ? ` · ${item.availabilityDetailHe ?? "לא זמין"}` : ""}
                </span>
              </label>
              {item.descriptionHe ? (
                <p className={styles.itemDesc}>{item.descriptionHe}</p>
              ) : null}
            </li>
          );
        })}
      </ul>

      {selectedOrder.length > 0 ? (
        <ExportOrderPanel
          selectedOrder={selectedOrder}
          inventory={inventory}
          onMove={moveItem}
        />
      ) : null}

      <Button type="button" variant="primary" disabled={pending} onClick={() => void downloadZip()}>
        הורדת חבילת ZIP
      </Button>

      {statusMessage ? <p className={styles.status}>{statusMessage}</p> : null}
    </section>
  );
}

function ExportOrderPanel({
  selectedOrder,
  inventory,
  onMove,
}: {
  selectedOrder: string[];
  inventory: DebtCaseEvidenceInventoryView;
  onMove: (id: string, dir: -1 | 1) => void;
}) {
  const byId = new Map(inventory.items.map((i) => [i.inventoryItemId, i]));
  return (
    <div className={styles.orderPanel}>
      <h3 className={styles.orderTitle}>סדר נספחים לייצוא</h3>
      <ol className={styles.orderList}>
        {selectedOrder.map((id, index) => {
          const item = byId.get(id);
          if (!item) {
            return null;
          }
          return (
            <li key={id} className={styles.orderRow}>
              <span>
                {index + 1}. {item.displayNameHe}
              </span>
              <span className={styles.orderActions}>
                <button type="button" onClick={() => onMove(id, -1)}>
                  למעלה
                </button>
                <button type="button" onClick={() => onMove(id, 1)}>
                  למטה
                </button>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}