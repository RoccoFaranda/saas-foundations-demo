import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const globalsCssPath = path.join(projectRoot, "app", "globals.css");
const sourceRoots = [path.join(projectRoot, "app"), path.join(projectRoot, "src")];

const requiredThemeVars = [
  "background",
  "foreground",
  "surface",
  "surface-elevated",
  "muted",
  "muted-foreground",
  "border",
  "border-strong",
  "input",
  "focus-ring",
  "primary",
  "primary-hover",
  "primary-foreground",
  "secondary",
  "secondary-hover",
  "secondary-foreground",
  "link",
  "disabled",
  "disabled-border",
  "disabled-foreground",
  "info",
  "info-soft",
  "success",
  "success-soft",
  "warning",
  "warning-soft",
  "danger",
  "danger-soft",
  "danger-solid",
  "danger-on-solid",
];

const requiredThemeExports = [
  "focus-ring",
  "primary",
  "primary-hover",
  "primary-foreground",
  "secondary",
  "secondary-hover",
  "secondary-foreground",
  "link",
  "disabled",
  "disabled-border",
  "disabled-foreground",
];

const contrastRules = [
  { foreground: "foreground", background: "background", min: 7.0, label: "Body text" },
  { foreground: "muted-foreground", background: "muted", min: 4.5, label: "Muted text" },
  { foreground: "primary-foreground", background: "primary", min: 4.5, label: "Primary button" },
  {
    foreground: "secondary-foreground",
    background: "secondary",
    min: 4.5,
    label: "Secondary button",
  },
  { foreground: "link", background: "background", min: 4.5, label: "Links" },
  { foreground: "info", background: "info-soft", min: 4.5, label: "Info badge" },
  { foreground: "success", background: "success-soft", min: 4.5, label: "Success badge" },
  { foreground: "warning", background: "warning-soft", min: 4.5, label: "Warning badge" },
  { foreground: "danger", background: "danger-soft", min: 4.5, label: "Danger badge" },
  {
    foreground: "danger-on-solid",
    background: "danger-solid",
    min: 4.5,
    label: "Danger solid button",
  },
  {
    foreground: "disabled-foreground",
    background: "disabled",
    min: 3.0,
    label: "Disabled controls",
  },
  { foreground: "feature", background: "feature-soft", min: 4.5, label: "Feature chip" },
  { foreground: "bugfix", background: "bugfix-soft", min: 4.5, label: "Bugfix chip" },
  { foreground: "docs", background: "docs-soft", min: 4.5, label: "Docs chip" },
  { foreground: "infra", background: "infra-soft", min: 4.5, label: "Infra chip" },
  { foreground: "design", background: "design-soft", min: 4.5, label: "Design chip" },
];

const bannedClassRules = [
  {
    pattern: /\bbg-foreground\b/,
    message: "Found legacy `bg-foreground` class. Use semantic action tokens like `bg-primary`.",
  },
  {
    pattern: /\btext-background\b/,
    message:
      "Found legacy `text-background` class. Use semantic action tokens like `text-primary-foreground`.",
  },
  {
    pattern: /focus:ring-info-border\//,
    message: "Found `focus:ring-info-border/*`. Use `focus:ring-focus-ring/*` for focus states.",
  },
  {
    pattern: /focus-visible:ring-info-border\//,
    message:
      "Found `focus-visible:ring-info-border/*`. Use `focus-visible:ring-focus-ring/*` for focus states.",
  },
  {
    pattern:
      /\b(?:bg|text|border|ring|fill|stroke|from|to|via)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950)(?:\/\d+)?\b/,
    message:
      "Found raw Tailwind palette utility. Use semantic tokens/recipes instead (or add a documented theme exception).",
  },
  {
    pattern:
      /\b(?:bg|text|border|ring|fill|stroke|from|to|via)-(?:black|white|transparent|current)(?:\/\d+)?\b/,
    message:
      "Found raw named color utility. Use semantic tokens/recipes instead (or add a documented theme exception).",
  },
  {
    pattern: /\b(?:bg|text|border|ring|fill|stroke|from|to|via|shadow)-\[[^\]]+\]/,
    message:
      "Found arbitrary color/shadow utility. Use semantic tokens/recipes instead (or add a documented theme exception).",
  },
];

const themeExceptionPattern =
  /theme-exception\s+reason:"(?<reason>[^"]+)"\s+ticket:"(?<ticket>[^"]+)"\s+expires:"(?<expires>\d{4}-\d{2}-\d{2})"/;

const today = new Date();
today.setHours(0, 0, 0, 0);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function extractBlock(source, selector) {
  const selectorStart = source.indexOf(selector);
  if (selectorStart === -1) return null;

  const braceStart = source.indexOf("{", selectorStart);
  if (braceStart === -1) return null;

  let depth = 0;
  for (let index = braceStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(braceStart + 1, index);
      }
    }
  }

  return null;
}

function parseCssVars(block) {
  const vars = new Map();
  const regex = /--([a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let match = regex.exec(block);

  while (match) {
    vars.set(match[1], match[2].trim());
    match = regex.exec(block);
  }

  return vars;
}

function parseRgbComponent(value) {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) return null;
  return Math.max(0, Math.min(255, parsed));
}

function parseColor(value) {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();

  if (normalized.startsWith("#")) {
    const hex = normalized.slice(1);
    if (hex.length === 3) {
      const r = Number.parseInt(hex[0] + hex[0], 16);
      const g = Number.parseInt(hex[1] + hex[1], 16);
      const b = Number.parseInt(hex[2] + hex[2], 16);
      return [r, g, b];
    }
    if (hex.length === 6) {
      const r = Number.parseInt(hex.slice(0, 2), 16);
      const g = Number.parseInt(hex.slice(2, 4), 16);
      const b = Number.parseInt(hex.slice(4, 6), 16);
      return [r, g, b];
    }
    return null;
  }

  const rgbMatch = normalized.match(/rgba?\(([^)]+)\)/);
  if (rgbMatch) {
    const [rRaw, gRaw, bRaw] = rgbMatch[1].split(",").map((part) => part.trim());
    const r = parseRgbComponent(rRaw);
    const g = parseRgbComponent(gRaw);
    const b = parseRgbComponent(bRaw);
    if (r === null || g === null || b === null) return null;
    return [r, g, b];
  }

  return null;
}

function luminanceChannel(channel) {
  const normalized = channel / 255;
  if (normalized <= 0.03928) return normalized / 12.92;
  return ((normalized + 0.055) / 1.055) ** 2.4;
}

function getLuminance(rgb) {
  const [r, g, b] = rgb;
  return 0.2126 * luminanceChannel(r) + 0.7152 * luminanceChannel(g) + 0.0722 * luminanceChannel(b);
}

function contrastRatio(foreground, background) {
  const foregroundLuminance = getLuminance(foreground);
  const backgroundLuminance = getLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function listSourceFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
      continue;
    }

    if (!/\.(ts|tsx|js|jsx|mdx)$/.test(entry.name)) continue;
    if (entry.name.endsWith(".test.ts") || entry.name.endsWith(".test.tsx")) continue;
    files.push(fullPath);
  }

  return files;
}

function getLineNumber(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function getLineStartIndex(text, lineNumber) {
  if (lineNumber <= 1) return 0;

  let currentLine = 1;
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "\n") {
      currentLine += 1;
      if (currentLine === lineNumber) return index + 1;
    }
  }

  return 0;
}

function parseThemeException(lineText) {
  const match = lineText.match(themeExceptionPattern);
  if (!match?.groups) {
    return { valid: false, error: "Invalid theme-exception format." };
  }

  const expires = new Date(`${match.groups.expires}T00:00:00`);
  if (Number.isNaN(expires.getTime())) {
    return { valid: false, error: `Invalid expires date "${match.groups.expires}".` };
  }

  if (expires < today) {
    return {
      valid: false,
      error: `Expired theme-exception "${match.groups.expires}". Extend or remove the exception.`,
    };
  }

  return {
    valid: true,
    reason: match.groups.reason,
    ticket: match.groups.ticket,
    expires: match.groups.expires,
  };
}

function findNearestThemeExceptionLine(lines, lineIndex) {
  if (lineIndex < 0 || lineIndex >= lines.length) return null;

  const maxLookbackLines = 8;

  for (let cursor = lineIndex; cursor >= 0 && lineIndex - cursor <= maxLookbackLines; cursor -= 1) {
    const trimmed = lines[cursor].trim();
    if (!trimmed) break;
    if (trimmed.includes("theme-exception")) return cursor;
  }

  return null;
}

function getAllMatches(text, pattern) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const regex = new RegExp(pattern.source, flags);
  const matches = [];

  let match = regex.exec(text);
  while (match) {
    matches.push(match);
    if (match.index === regex.lastIndex) {
      regex.lastIndex += 1;
    }
    match = regex.exec(text);
  }

  return matches;
}

if (!fs.existsSync(globalsCssPath)) {
  fail(`Theme check failed: Missing ${path.relative(projectRoot, globalsCssPath)}.`);
}

const cssSource = fs.readFileSync(globalsCssPath, "utf8");
const rootBlock = extractBlock(cssSource, ":root");
const darkBlock = extractBlock(cssSource, ".dark");

if (!rootBlock || !darkBlock) {
  fail("Theme check failed: `:root` or `.dark` block is missing in app/globals.css.");
}

const lightVars = parseCssVars(rootBlock);
const darkVars = parseCssVars(darkBlock);
const errors = [];

for (const token of requiredThemeVars) {
  if (!lightVars.has(token)) {
    errors.push(`Missing token in :root: --${token}`);
  }
  if (!darkVars.has(token)) {
    errors.push(`Missing token in .dark: --${token}`);
  }
}

for (const token of requiredThemeExports) {
  const exportRegex = new RegExp(`--color-${token}\\s*:\\s*var\\(--${token}\\)\\s*;`);
  if (!exportRegex.test(cssSource)) {
    errors.push(`Missing Tailwind export in @theme inline: --color-${token}: var(--${token});`);
  }
}

for (const [mode, vars] of [
  ["light", lightVars],
  ["dark", darkVars],
]) {
  for (const rule of contrastRules) {
    const foregroundValue = vars.get(rule.foreground);
    const backgroundValue = vars.get(rule.background);
    const foregroundColor = parseColor(foregroundValue);
    const backgroundColor = parseColor(backgroundValue);

    if (!foregroundColor || !backgroundColor) {
      errors.push(
        `[${mode}] Could not parse colors for ${rule.label}: --${rule.foreground} on --${rule.background}`
      );
      continue;
    }

    const ratio = contrastRatio(foregroundColor, backgroundColor);
    if (ratio < rule.min) {
      errors.push(
        `[${mode}] Contrast too low for ${rule.label}: ${ratio.toFixed(2)} (min ${rule.min}) using --${rule.foreground} on --${rule.background}`
      );
    }
  }
}

const sourceFiles = sourceRoots.flatMap((root) =>
  fs.existsSync(root) ? listSourceFiles(root) : []
);

for (const file of sourceFiles) {
  const contents = fs.readFileSync(file, "utf8");
  const lines = contents.split(/\r?\n/);
  const exceptionValidationCache = new Map();

  for (const [lineIndex, lineText] of lines.entries()) {
    if (!lineText.includes("theme-exception")) continue;
    const parsedException = parseThemeException(lineText);
    exceptionValidationCache.set(lineIndex, parsedException);
    if (!parsedException.valid) {
      errors.push(`${path.relative(projectRoot, file)}:${lineIndex + 1} ${parsedException.error}`);
    }
  }

  for (const { pattern, message } of bannedClassRules) {
    const matches = getAllMatches(contents, pattern);
    for (const match of matches) {
      const line = getLineNumber(contents, match.index);
      const lineIndex = line - 1;
      const exceptionLineIndex = findNearestThemeExceptionLine(lines, lineIndex);

      if (exceptionLineIndex !== null) {
        const parsedException =
          exceptionValidationCache.get(exceptionLineIndex) ??
          parseThemeException(lines[exceptionLineIndex]);
        exceptionValidationCache.set(exceptionLineIndex, parsedException);

        if (parsedException.valid) {
          continue;
        }
      }

      const lineStart = getLineStartIndex(contents, line);
      const lineEndIndex = contents.indexOf("\n", lineStart);
      const lineText =
        lineEndIndex === -1
          ? contents.slice(lineStart).trim()
          : contents.slice(lineStart, lineEndIndex).trim();

      errors.push(
        `${path.relative(projectRoot, file)}:${line} ${message} Matched: \`${lineText}\``
      );
    }
  }
}

if (errors.length > 0) {
  console.error("Theme check failed:\n");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  `Theme check passed: ${contrastRules.length * 2} contrast checks, ${requiredThemeExports.length} token exports, ${sourceFiles.length} source files scanned.`
);
