export function substituteTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) => {
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      return values[key] ?? "";
    }
    return match;
  });
}
