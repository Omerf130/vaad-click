import {
  jerusalemIsoDateFromInstant,
  startOfDayJerusalem,
} from "@/shared/time/jerusalem-calendar";

/** Letter date + 10 Jerusalem calendar days (operative policy CP20B). */
export function computePrintedDeadlineDateIso(letterDateIso: string): string {
  const base = startOfDayJerusalem(letterDateIso);
  const deadline = new Date(base.getTime() + 10 * 24 * 60 * 60 * 1000);
  return jerusalemIsoDateFromInstant(deadline);
}

export function formatLetterDateDisplayHe(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) {
    return isoDate;
  }
  const yy = year.slice(-2);
  return `${Number(day)}.${Number(month)}.${yy}`;
}
