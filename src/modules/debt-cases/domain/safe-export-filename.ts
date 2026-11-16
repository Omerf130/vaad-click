const UNSAFE = /[/\\:\0<>"|?*\x00-\x1f]/g;

export function safeExportZipEntryName(input: {
  exhibitLabel: string;
  suggestedBase: string;
  extension?: string;
}): string {
  const ext =
    input.extension?.replace(/^\./, "").replace(UNSAFE, "").slice(0, 8) || "bin";
  const base = input.suggestedBase
    .replace(UNSAFE, "_")
    .replace(/\.\./g, "_")
    .replace(/\s+/g, "_")
    .trim()
    .slice(0, 80);
  const labelPart = input.exhibitLabel
    .replace(UNSAFE, "_")
    .replace(/\s+/g, "_")
    .slice(0, 24);
  const name = `${labelPart}__${base || "file"}.${ext}`;
  if (name.includes("..") || name.startsWith("/") || name.includes("\\")) {
    return `exhibit.${ext}`;
  }
  return name;
}