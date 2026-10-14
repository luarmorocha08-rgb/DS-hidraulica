/**
 * Pré-renderiza a intro 3D para dispositivos simples e movimento reduzido:
 *   public/hero/poster.jpg            – quadro inicial (placeholder enquanto o 3D carrega)
 *   public/hero/poster-exploded.jpg   – vista explodida (modo estático)
 *   public/hero/sequence/frame-NNN.jpg + manifest.json – sequência vertical sincronizada ao scroll
 *
 * Uso (com o servidor de desenvolvimento rodando):
 *   npm run dev            # em outro terminal
 *   npm run hero:render -- --url http://localhost:3000 --frames 72
 * Requer Chromium (variável CHROMIUM_PATH ou o navegador do Playwright).
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright-core";

async function main() {
  const { values } = parseArgs({
    options: {
      url: { type: "string", default: "http://localhost:3000" },
      frames: { type: "string", default: "72" },
    },
  });
  const frames = Number(values.frames);
  const out = path.resolve("public/hero");
  await mkdir(path.join(out, "sequence"), { recursive: true });

  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });

  async function stage(width: number, height: number) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.goto(`${values.url}/render/hero`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__heroReady === true, null, { timeout: 120_000 });
    await page.waitForTimeout(2500); // iluminação de entrada
    return page;
  }

  async function shot(page: Awaited<ReturnType<typeof stage>>, p: number, file: string) {
    await page.evaluate((v) => window.__heroSetProgress?.(v), p);
    await page.waitForTimeout(350);
    await page.screenshot({ path: file, type: "jpeg", quality: 78 });
  }

  // pôsteres (paisagem)
  const wide = await stage(1600, 900);
  await shot(wide, 0, path.join(out, "poster.jpg"));
  await shot(wide, 0.7, path.join(out, "poster-exploded.jpg"));
  await wide.close();

  // sequência (retrato, para celulares)
  const tall = await stage(540, 960);
  for (let i = 0; i < frames; i++) {
    const p = i / (frames - 1);
    await shot(tall, p, path.join(out, "sequence", `frame-${String(i).padStart(3, "0")}.jpg`));
    process.stdout.write(`\rquadro ${i + 1}/${frames}`);
  }
  await tall.close();
  await writeFile(path.join(out, "sequence", "manifest.json"), JSON.stringify({ count: frames, pattern: "frame-{i}.jpg", width: 540, height: 960 }, null, 2));
  await browser.close();
  console.log("\nPronto: public/hero/");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
