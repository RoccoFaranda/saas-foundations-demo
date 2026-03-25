import { chromium } from "@playwright/test";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type MasterKey = "circle" | "square";

type CopyIcon = {
  kind: "copy";
  master: MasterKey;
  output: string;
};

type ResizeIcon = {
  kind: "resize";
  master: MasterKey;
  output: string;
  size: number;
};

type IconSpec = CopyIcon | ResizeIcon;

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const repoRoot = path.resolve(currentDir, "..", "..");

const masters = {
  circle: path.join(repoRoot, "scripts", "seo", "masters", "circle-master.png"),
  square: path.join(repoRoot, "scripts", "seo", "masters", "square-master.png"),
} as const;

const icons: readonly IconSpec[] = [
  {
    kind: "copy",
    master: "circle",
    output: "app/icon.png",
  },
  {
    kind: "copy",
    master: "square",
    output: "public/icons/icon-512.png",
  },
  {
    kind: "copy",
    master: "square",
    output: "public/icons/icon-512-maskable.png",
  },
  {
    kind: "resize",
    master: "square",
    output: "app/apple-icon.png",
    size: 180,
  },
  {
    kind: "resize",
    master: "square",
    output: "public/icons/icon-192.png",
    size: 192,
  },
] as const;

async function ensureParentDir(filePath: string) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

function toDataUrl(bytes: Buffer) {
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

function createIcoFromPng(pngBytes: Buffer, width: number, height: number) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt8(width === 256 ? 0 : width, 6);
  header.writeUInt8(height === 256 ? 0 : height, 7);
  header.writeUInt8(0, 8);
  header.writeUInt8(0, 9);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(pngBytes.length, 14);
  header.writeUInt32LE(22, 18);
  return Buffer.concat([header, pngBytes]);
}

async function renderResizedPng(masterPath: string, size: number) {
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1,
    });

    try {
      const source = await readFile(masterPath);
      await page.setContent(
        `<!doctype html>
<html>
  <head>
    <style>
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        background: transparent;
      }
      body {
        overflow: hidden;
      }
      img {
        width: 100%;
        height: 100%;
        display: block;
      }
    </style>
  </head>
  <body>
    <img src="${toDataUrl(source)}" alt="" />
  </body>
</html>`
      );

      return await page.screenshot({
        type: "png",
        omitBackground: true,
      });
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

async function main() {
  for (const icon of icons) {
    const outputPath = path.join(repoRoot, icon.output);
    await ensureParentDir(outputPath);

    if (icon.kind === "copy") {
      await copyFile(masters[icon.master], outputPath);
      console.log(`Copied ${icon.output}`);
      continue;
    }

    const pngBytes = await renderResizedPng(masters[icon.master], icon.size);
    await writeFile(outputPath, pngBytes);
    console.log(`Rendered ${icon.output}`);
  }

  const faviconPng = await renderResizedPng(masters.circle, 64);
  const faviconPath = path.join(repoRoot, "app", "favicon.ico");
  await ensureParentDir(faviconPath);
  await writeFile(faviconPath, createIcoFromPng(faviconPng, 64, 64));
  console.log("Rendered app/favicon.ico");
}

main().catch((error) => {
  console.error("[icons:generate] Failed.");
  console.error(error instanceof Error ? (error.stack ?? error.message) : error);
  process.exit(1);
});
