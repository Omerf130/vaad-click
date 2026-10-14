"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { StatusBadge } from "@/components/ui/StatusBadge/StatusBadge";
import {
  createFinancialSettingsDraftFormAction,
  createFinancialSettingsDraftFromPublishedAction,
  type FinancialSettingsActionState,
} from "@/modules/financial-settings/actions/financial-settings.actions";
import { FINANCIAL_SETTINGS_UI_COPY } from "@/modules/financial-settings/presentation/financial-settings-messages.he";
import type {
  DraftViewModel,
  PublishedVersionSummary,
} from "@/modules/financial-settings/presentation/financial-settings-view-model";
import { FinancialSettingsDraftWorkspace } from "@/modules/financial-settings/ui/FinancialSettingsDraftWorkspace";
import styles from "@/modules/financial-settings/ui/FinancialSettingsAdmin.module.scss";

export type FinancialSettingsAdminProps = {
  applicable: PublishedVersionSummary | null;
  futureVersions: PublishedVersionSummary[];
  historicalVersions: PublishedVersionSummary[];
  draft: DraftViewModel | null;
  minEffectiveDateIso: string;
};

const initialActionState: FinancialSettingsActionState = { ok: true };

export function FinancialSettingsAdmin(props: FinancialSettingsAdminProps) {
  const [, cloneAction, clonePending] = useActionState(
    createFinancialSettingsDraftFromPublishedAction,
    initialActionState,
  );
  const [, createDraftAction, createDraftPending] = useActionState(
    createFinancialSettingsDraftFormAction,
    initialActionState,
  );

  return (
    <div className={styles.page} dir="rtl">
      <div className={styles.statusStrip} aria-label="סיכום מצב הגדרות כספיות">
        <StatusBadge
          label={
            props.applicable
              ? `גרסה ${props.applicable.versionNumber} בתוקף`
              : "אין גרסה בתוקף"
          }
          variant={props.applicable ? "success" : "neutral"}
        />
        <StatusBadge
          label={props.draft ? "טיוטה פתוחה" : "אין טיוטה"}
          variant={props.draft ? "info" : "neutral"}
        />
        {props.futureVersions.length > 0 ? (
          <StatusBadge
            label={`${props.futureVersions.length} גרסאות עתידיות`}
            variant="info"
          />
        ) : null}
        <StatusBadge
          label={`${props.historicalVersions.length + (props.applicable ? 1 : 0) + props.futureVersions.length} גרסאות שפורסמו`}
          variant="neutral"
        />
      </div>

      {props.draft ? (
        <FinancialSettingsDraftWorkspace
          key={`${props.draft.settingsVersionId}-${props.draft.revision}`}
          draft={props.draft}
          minEffectiveDateIso={props.minEffectiveDateIso}
          applicable={props.applicable}
          futureVersions={props.futureVersions}
          historicalVersions={props.historicalVersions}
        />
      ) : (
        <Card title="טיוטה לעריכה">
          <p className={styles.hint}>
            {props.historicalVersions.length === 0
              ? "ניתן ליצור טיוטה ראשונה או לשכפל מגרסה שפורסמה."
              : "יש ליצור טיוטה חדשה או לשכפל מגרסה מהיסטוריה לפני עריכה."}
          </p>
          <div className={styles.actions}>
            <form action={createDraftAction}>
              <Button type="submit" variant="primary" disabled={createDraftPending}>
                {FINANCIAL_SETTINGS_UI_COPY.createDraft}
              </Button>
            </form>
          </div>
          {props.historicalVersions.length > 0 ? (
            <ul className={styles.cloneList}>
              {props.historicalVersions.map((version) => (
                <li key={version.settingsVersionId} className={styles.cloneItem}>
                  <span>
                    גרסה {version.versionNumber} · {version.effectiveFromIso}
                  </span>
                  <form action={cloneAction}>
                    <input
                      type="hidden"
                      name="sourceSettingsVersionId"
                      value={version.settingsVersionId}
                    />
                    <Button type="submit" variant="secondary" size="sm" disabled={clonePending}>
                      {FINANCIAL_SETTINGS_UI_COPY.cloneDraft}
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      )}
    </div>
  );
}
