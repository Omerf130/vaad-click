declare module "pdfmake" {
  type PdfOutputDocument = {
    getBuffer(): Promise<Buffer>;
  };

  type PdfMakeInstance = {
    createPdf(docDefinition: unknown, options?: unknown): PdfOutputDocument;
    setFonts(fonts: Record<string, Record<string, string>>): void;
    setUrlAccessPolicy(callback: ((url: string) => boolean) | undefined): void;
    setLocalAccessPolicy(callback: ((path: string) => boolean) | undefined): void;
  };

  const pdfMake: PdfMakeInstance;
  export default pdfMake;
}
