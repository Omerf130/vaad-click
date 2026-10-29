import { createRequire } from "node:module";
import path from "node:path";
import { accessSync, constants } from "node:fs";

import {
  BuildingLegalDocumentPdfError,
  BuildingLegalDocumentPdfErrorCode,
} from "@/modules/building-legal-documents/pdf/building-legal-document-pdf.errors";

const FONT_FAMILY = "NotoSansHebrew";
const EXPO_PACKAGE = "@expo-google-fonts/noto-sans-hebrew";
const REGULAR_FILE = "NotoSansHebrew_400Regular.ttf";

let cachedRegularPath: string | null = null;

function resolveRegularFontPath(): string {
  if (cachedRegularPath) {
    return cachedRegularPath;
  }

  const requireFromProject = createRequire(path.join(process.cwd(), "package.json"));
  let packageJsonPath: string;
  try {
    packageJsonPath = requireFromProject.resolve(`${EXPO_PACKAGE}/package.json`);
  } catch {
    throw new BuildingLegalDocumentPdfError(
      BuildingLegalDocumentPdfErrorCode.FONT_UNAVAILABLE,
      "Hebrew PDF font package is not installed.",
    );
  }

  const fontPath = path.join(path.dirname(packageJsonPath), "400Regular", REGULAR_FILE);
  try {
    accessSync(fontPath, constants.R_OK);
  } catch {
    throw new BuildingLegalDocumentPdfError(
      BuildingLegalDocumentPdfErrorCode.FONT_UNAVAILABLE,
      "Hebrew PDF font file is missing.",
    );
  }

  cachedRegularPath = fontPath;
  return fontPath;
}

export function getNotoSansHebrewPdfFontFamily(): string {
  return FONT_FAMILY;
}

export function getNotoSansHebrewPdfFontDescriptors(): Record<
  string,
  { normal: string; bold: string; italics: string; bolditalics: string }
> {
  const regular = resolveRegularFontPath();
  return {
    [FONT_FAMILY]: {
      normal: regular,
      bold: regular,
      italics: regular,
      bolditalics: regular,
    },
  };
}

export function isAllowedHebrewPdfFontPath(filePath: string): boolean {
  const regular = resolveRegularFontPath();
  return path.resolve(filePath) === path.resolve(regular);
}
