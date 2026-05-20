#!/usr/bin/env node
/**
 * SyncHim · gerador de PNGs de carrossel via Puppeteer.
 *
 * Lê o manifest em MANIFEST_URL (ou primeiro argumento), descarrega o
 * conteúdo, abre template.html para cada slide injectando window.SLIDE_DATA,
 * tira um screenshot 1080x1350 @ 2x e upload para Supabase Storage.
 *
 * Variáveis de ambiente requeridas:
 *   MANIFEST_URL                URL público do manifest JSON
 *   SUPABASE_URL                ex: https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY   service-role (upload + result.json)
 */

import { promises as fs, createWriteStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';
import archiver from 'archiver';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MANIFEST_URL = process.env.MANIFEST_URL || process.argv[2];
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!MANIFEST_URL) { console.error('MANIFEST_URL em falta'); process.exit(2); }
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY em falta'); process.exit(2); }

async function main() {
  console.log('manifest:', MANIFEST_URL);
  const manifest = await fetchJson(MANIFEST_URL);
  const { jobId, slides, width, height, deviceScaleFactor, storage, brand } = manifest;
  const bucket = storage.bucket;
  const outputPrefix = storage.outputPrefix;

  await writeResult(bucket, storage.resultPath, { status: 'running', progress: 5, message: 'a iniciar Puppeteer', updatedAt: new Date().toISOString(), jobId });

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
    headless: 'new'
  });
  const templateUrl = pathToFileURL(path.join(__dirname, 'template.html')).href;

  const tmp = await fs.mkdtemp('/tmp/synchim-render-');
  const pngPaths = [];
  const uploadedUrls = [];

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const slideData = { ...slide, brand };
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor });
    await page.evaluateOnNewDocument((d) => { window.SLIDE_DATA = d; }, slideData);
    await page.goto(templateUrl, { waitUntil: 'networkidle0' });
    await page.waitForFunction("document.body.dataset.ready === '1'", { timeout: 20000 });
    await new Promise(r => setTimeout(r, 200));
    const file = path.join(tmp, `slide-${String(i + 1).padStart(2, '0')}.png`);
    await page.screenshot({ path: file, type: 'png', omitBackground: false });
    pngPaths.push(file);
    await page.close();
    console.log('slide', i + 1, '/', slides.length, 'gerado');

    const remote = `${outputPrefix}/slide-${String(i + 1).padStart(2, '0')}.png`;
    const buf = await fs.readFile(file);
    const url = await upload(bucket, remote, buf, 'image/png');
    uploadedUrls.push(url);

    const pct = 10 + Math.round(80 * ((i + 1) / slides.length));
    await writeResult(bucket, storage.resultPath, {
      status: 'running', progress: pct,
      message: `slide ${i + 1} / ${slides.length}`,
      updatedAt: new Date().toISOString(), jobId
    });
  }

  await browser.close();

  // ZIP
  const zipPath = path.join(tmp, `${jobId}.zip`);
  await zipFiles(pngPaths, zipPath);
  const zipBuf = await fs.readFile(zipPath);
  const zipUrl = await upload(bucket, `${outputPrefix}/${jobId}.zip`, zipBuf, 'application/zip');

  await writeResult(bucket, storage.resultPath, {
    status: 'done', progress: 100, message: 'concluído',
    updatedAt: new Date().toISOString(), jobId,
    output: { pngs: uploadedUrls, zip: zipUrl }
  });
  console.log('OK · zip:', zipUrl);
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
  return res.json();
}

async function upload(bucket, path, body, contentType) {
  const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': contentType,
      'x-upsert': 'true',
      'Cache-Control': '3600'
    },
    body
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`upload ${path} -> ${res.status}: ${t}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

async function writeResult(bucket, resultPath, data) {
  const body = Buffer.from(JSON.stringify(data, null, 2));
  await upload(bucket, resultPath, body, 'application/json');
}

function zipFiles(files, outPath) {
  return new Promise((resolve, reject) => {
    const out = createWriteStream(outPath);
    const zip = archiver('zip', { zlib: { level: 9 } });
    out.on('close', resolve);
    zip.on('error', reject);
    zip.pipe(out);
    files.forEach((f) => zip.file(f, { name: path.basename(f) }));
    zip.finalize();
  });
}

main().catch(async (e) => {
  console.error(e);
  // Best-effort: report failure to result.json se conseguirmos
  try {
    const manifest = await fetchJson(MANIFEST_URL);
    await writeResult(manifest.storage.bucket, manifest.storage.resultPath, {
      status: 'failed', progress: 0, message: String(e?.message || e),
      updatedAt: new Date().toISOString(), jobId: manifest.jobId
    });
  } catch {}
  process.exit(1);
});
