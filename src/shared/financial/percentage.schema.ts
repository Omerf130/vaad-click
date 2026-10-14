import { z } from "zod";

/** Basis points: 10000 = 100.00% */
export const MAX_BASIS_POINTS = 10_000;

export const basisPointsSchema = z
  .number()
  .int("אחוז חייב להיות שלם ב-basis points")
  .min(0)
  .max(MAX_BASIS_POINTS);

export type BasisPoints = z.infer<typeof basisPointsSchema>;
