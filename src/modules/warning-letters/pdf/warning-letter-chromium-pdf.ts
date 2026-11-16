import "server-only";

import { accessSync, constants } from "node:fs";
import path from "node:path";

import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser, type Page } from "puppeteer-core";

import { WarningLetterPdfRenderMode } from "@/modules/warning-letters/pdf/warning-letter-pdf-mode";
import {
  WarningLetterPdfError,
  WarningLetterPdfErrorCode,
} from "@/modules/warning-letters/pdf/warning-letter-pdf.errors";

const PDF_RENDER_TIMEOUT_MS = 45_000;
const MAX_HTML_BYTES = 6 * 1024 * 1024;

function localChromeCandidates(): string[] {
  const candidates: string[] = [];
  const explicit = process.env.CHROMIUM_EXECUTABLE_PATH?.trim();
  if (explicit) {
    candidates.push(explicit);
  }

  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData) {
      candidates.push(path.join(localAppData, "Google", "Chrome", "Application", "chrome.exe"));
    }
    candidates.push(
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    );
  } else if (process.platform === "darwin") {
    candidates.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    );
  } else {
    candidates.push("/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser");
  }

  return candidates;
}

export async function resolveChromiumExecutablePath(): Promise<string> {
  const explicit = process.env.CHROMIUM_EXECUTABLE_PATH?.trim();
  if (explicit) {
    try {
      accessSync(explicit, constants.R_OK);
      return explicit;
    } catch {
      throw new WarningLetterPdfError(
        WarningLetterPdfErrorCode.CHROMIUM_UNAVAILABLE,
        "CHROMIUM_EXECUTABLE_PATH is not readable.",
      );
    }
  }

  const onServerless = process.env.VERCEL === "1" || Boolean(process.env.AWS_EXECUTION_ENV);
  if (onServerless) {
    try {
      return await chromium.executablePath();
    } catch {
      throw new WarningLetterPdfError(
        WarningLetterPdfErrorCode.CHROMIUM_UNAVAILABLE,
        "Serverless Chromium binary is unavailable.",
      );
    }
  }

  for (const candidate of localChromeCandidates()) {
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      try {
        accessSync(candidate, constants.R_OK);
        return candidate;
      } catch {
        // try next
      }
    }
  }

  try {
    const bundled = await chromium.executablePath();
    accessSync(bundled, constants.R_OK);
    return bundled;
  } catch {
    throw new WarningLetterPdfError(
      WarningLetterPdfErrorCode.CHROMIUM_UNAVAILABLE,
      "No Chromium executable found. Set CHROMIUM_EXECUTABLE_PATH for local PDF generation.",
    );
  }
}

export async function launchWarningLetterChromiumBrowser(): Promise<Browser> {
  const executablePath = await resolveChromiumExecutablePath();
  const onServerless = process.env.VERCEL === "1" || Boolean(process.env.AWS_EXECUTION_ENV);

  try {
    return await puppeteer.launch({
      args: onServerless ? chromium.args : ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 1 },
      executablePath,
      headless: true,
    });
  } catch (error) {
    throw new WarningLetterPdfError(
      WarningLetterPdfErrorCode.CHROMIUM_UNAVAILABLE,
      error instanceof Error ? error.message : "Failed to launch Chromium.",
    );
  }
}

async function configureSecurePrintPage(page: Page): Promise<void> {
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const url = request.url();
    if (url === "about:blank" || url.startsWith("data:")) {
      void request.continue();
      return;
    }
    void request.abort();
  });
}

export type ChromiumPdfChromeLabels = {
  headerHtml: string;
  footerHtml: string;
};

export async function printHtmlToPdfBuffer(input: {
  html: string;
  draftRevision: number;
  mode: WarningLetterPdfRenderMode;
  chromeLabels?: ChromiumPdfChromeLabels;
}): Promise<Buffer> {
  if (Buffer.byteLength(input.html, "utf8") > MAX_HTML_BYTES) {
    throw new WarningLetterPdfError(
      WarningLetterPdfErrorCode.VALIDATION,
      "Print HTML exceeds size limit.",
    );
  }

  let browser: Browser | undefined;
  try {
    browser = await launchWarningLetterChromiumBrowser();
    const page = await browser.newPage();
    await configureSecurePrintPage(page);

    await page.setContent(input.html, {
      waitUntil: "domcontentloaded",
      timeout: PDF_RENDER_TIMEOUT_MS,
    });

    await page.emulateMediaType("print");

    const isReview = input.mode === WarningLetterPdfRenderMode.REVIEW;

    const headerTemplate =
      input.chromeLabels?.headerHtml ??
      (isReview
        ? `<div style="font-size:8px;width:100%;padding:0 16px;color:#9a3412;text-align:center;direction:rtl;">
      לבדיקה בלבד · גרסה ${input.draftRevision}
    </div>`
        : `<div style="font-size:8px;width:100%;padding:0 16px;color:#444;text-align:center;direction:rtl;">
      עמוד <span class="pageNumber"></span> / <span class="totalPages"></span>
    </div>`);

    const footerTemplate =
      input.chromeLabels?.footerHtml ??
      (isReview
        ? `<div style="font-size:9px;width:100%;padding:0 16px;color:#6b7280;text-align:center;direction:rtl;">
      <span>לבדיקה בלבד</span>
      &nbsp;·&nbsp;
      <span class="pageNumber"></span>
      /
      <span class="totalPages"></span>
    </div>`
        : `<div style="font-size:9px;width:100%;padding:0 16px;color:#6b7280;text-align:center;direction:rtl;">
      מכתב התראה · ${input.draftRevision}
    </div>`);

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate,
      footerTemplate,
      margin: {
        top: "22mm",
        right: "14mm",
        bottom: "20mm",
        left: "14mm",
      },
      timeout: PDF_RENDER_TIMEOUT_MS,
    });

    await page.close();

    if (!pdf || pdf.length === 0) {
      throw new WarningLetterPdfError(
        WarningLetterPdfErrorCode.GENERATION_FAILED,
        "Chromium produced an empty PDF.",
      );
    }

    return Buffer.from(pdf);
  } catch (error) {
    if (error instanceof WarningLetterPdfError) {
      throw error;
    }
    throw new WarningLetterPdfError(
      WarningLetterPdfErrorCode.GENERATION_FAILED,
      error instanceof Error ? error.message : "Chromium PDF generation failed.",
    );
  } finally {
    await browser?.close();
  }
}