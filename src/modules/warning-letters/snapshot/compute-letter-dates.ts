/** Letter date + 10 calendar days — lawyer answer Q17 (printed deadline only; receipt wording unchanged). */
export function computePrintedDeadlineDateIso(letterDateIso: string): string {
  const base = new Date(letterDateIso);
  if (Number.isNaN(base.getTime())) {
    throw new RangeError("Invalid letterDateIso");
  }
  const deadline = new Date(base);
  deadline.setUTCDate(deadline.getUTCDate() + 10);
  return deadline.toISOString().slice(0, 10);
}

export function formatLetterDateDisplayHe(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) {
    return isoDate;
  }
  const yy = year.slice(-2);
  return `${Number(day)}.${Number(month)}.${yy}`;
}
