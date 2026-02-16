function stripQuotes(value: string): string {
  return value.replace(/^["']|["']$/g, "");
}

export function resolveFilenameFromContentDisposition(
  contentDisposition: string | null,
  fallbackFilename: string
): string {
  if (!contentDisposition) {
    return fallbackFilename;
  }

  const utf8Match = contentDisposition.match(/filename\*\s*=\s*([^;]+)/i);
  if (utf8Match) {
    const rawValue = stripQuotes(utf8Match[1].trim());
    const encodedValue = rawValue.includes("''")
      ? rawValue.split("''").slice(1).join("''")
      : rawValue;
    if (encodedValue) {
      try {
        return decodeURIComponent(encodedValue);
      } catch {
        return encodedValue;
      }
    }
  }

  const filenameMatch = contentDisposition.match(/filename\s*=\s*([^;]+)/i);
  if (filenameMatch) {
    const rawValue = stripQuotes(filenameMatch[1].trim());
    if (rawValue) {
      return rawValue;
    }
  }

  return fallbackFilename;
}

export function downloadBlobFile(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(objectUrl);
}
