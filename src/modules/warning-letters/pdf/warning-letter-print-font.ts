import "server-only";

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { accessSync, constants } from "node:fs";

import {
  WarningLetterPdfError,
  WarningLetterPdfErrorCode,
} from "@/modules/warning-letters/pdf/warning-letter-pdf.errors";

const EXPO_PACKAGE = "@expo-google-fonts/noto-sans-hebrew";
const REGULAR_FILE = "NotoSansHebrew_400Regular.ttf";

let cachedFontCss: string | null = null;

function resolveRegularFontPath(): string {
  const requireFromProject = createRequire(path.join(process.cwd(), "package.json"));
  let packageJsonPath: string;
  try {
    packageJsonPath = requireFromProject.resolve(`${EXPO_PACKAGE}/package.json`);
  } catch {
    throw new WarningLetterPdfError(
      WarningLetterPdfErrorCode.FONT_UNAVAILABLE,
      "Hebrew print font package is not installed.",
    );
  }

  const fontPath = path.join(path.dirname(packageJsonPath), "400Regular", REGULAR_FILE);
  try {
    accessSync(fontPath, constants.R_OK);
  } catch {
    throw new WarningLetterPdfError(
      WarningLetterPdfErrorCode.FONT_UNAVAILABLE,
      "Hebrew print font file is missing.",
    );
  }

  return fontPath;
}

export function buildNotoSansHebrewPrintFontFaceCss(): string {
  if (cachedFontCss) {
    return cachedFontCss;
  }

  const fontPath = resolveRegularFontPath();
  const base64 = readFileSync(fontPath).toString("base64");
  cachedFontCss = `@font-face {
  font-family: "NotoSansHebrew";
  font-style: normal;
  font-weight: 400;
  src: url(data:font/ttf;base64,${base64}) format("truetype");
}`;
  return cachedFontCss;
}