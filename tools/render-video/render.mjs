#!/usr/bin/env node
/**
 * SyncHim · render de vídeo via FFmpeg (1080x1920, 30fps).
 *
 * Suporta dois subtipos nesta primeira versão:
 *   - kinetic-text:  cada cena é uma linha de texto que aparece sobre
 *                    fundo escuro com a marca SyncHim; narração ducka música.
 *   - hands-writing: variante kinetic-text mas com letra-a-letra tipo máquina
 *                    de escrever (typewriter via drawtext + animação).
 *
 * Para 'talking-head' a primeira versão usa a mesma base que kinetic-text
 * (Marina é "sem rosto", não há frame de cara). Pode ser estendido depois.
 *
 * O texto da cena é renderizado primeiro num PNG (Puppeteer) e depois
 * o vídeo é montado em FFmpeg num único filter graph: clips PNG estáticos
 * com fade + narração (atempo opcional) + música duckada.
 */

import { promises as fs, createWriteStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MANIFEST_URL = process.env.MANIFEST_URL || process.argv[2];
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!MANIFEST_URL || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('MANIFEST_URL / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY em falta');
  process.exit(2);
}

async function main() {
  const manifest = await fetchJson(MANIFEST_URL);
  const { jobId, scenes, width, height, fps, storage, brand, subtype } = manifest;
  const bucket = storage.bucket;
  const outputPrefix = storage.outputPrefix;

  await writeResult(bucket, storage.resultPath, { status: 'running', progress: 5, message: 'a preparar', jobId });

  const tmp = await fs.mkdtemp('/tmp/synchim-video-');

  // 1. Renderiza um PNG por cena (template kinetic).
  await writeResult(bucket, storage.resultPath, { status: 'running', progress: 10, message: 'a gerar frames', jobId });
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
    headless: 'new'
  });
  const templateUrl = pathToFileURL(path.join(__dirname, 'kinetic.html')).href;
  const pngs = [];
  for (let i = 0; i < scenes.length; i++) {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.evaluateOnNewDocument((d) => { window.SCENE_DATA = d; }, { ...scenes[i], brand, subtype });
    await page.goto(templateUrl, { waitUntil: 'networkidle0' });
    await page.waitForFunction("document.body.dataset.ready === '1'", { timeout: 20000 });
    const f = path.join(tmp, `scene-${String(i + 1).padStart(2, '0')}.png`);
    await page.screenshot({ path: f, type: 'png' });
    await page.close();
    pngs.push(f);
  }
  await browser.close();

  // 2. Descarrega narrações.
  await writeResult(bucket, storage.resultPath, { status: 'running', progress: 35, message: 'a descarregar narração', jobId });
  const voices = [];
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    let voicePath = null;
    if (s.voiceUrl) {
      voicePath = path.join(tmp, `voice-${String(i + 1).padStart(2, '0')}.mp3`);
      const r = await fetch(s.voiceUrl);
      if (!r.ok) throw new Error(`voice fetch ${s.voiceUrl} -> ${r.status}`);
      await fs.writeFile(voicePath, Buffer.from(await r.arrayBuffer()));
    }
    voices.push(voicePath);
  }

  // 3. Durações por cena: voice + 0.8s respiração, ou override, ou 3.5s.
  const durations = [];
  for (let i = 0; i < scenes.length; i++) {
    const override = scenes[i].durationSec;
    if (override) { durations.push(override); continue; }
    if (voices[i]) {
      const d = await ffprobeDuration(voices[i]);
      durations.push(d + 0.8);
    } else {
      durations.push(3.5);
    }
  }

  // 4. Concatena PNGs em segmentos individuais (cada um 1 mp4 sem som).
  await writeResult(bucket, storage.resultPath, { status: 'running', progress: 55, message: 'a montar segmentos', jobId });
  const segs = [];
  for (let i = 0; i < scenes.length; i++) {
    const seg = path.join(tmp, `seg-${String(i + 1).padStart(2, '0')}.mp4`);
    await runFfmpeg([
      '-y', '-loop', '1', '-framerate', String(fps), '-i', pngs[i],
      '-t', String(durations[i]),
      '-vf', `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},format=yuv420p,fade=t=in:st=0:d=0.4,fade=t=out:st=${(durations[i] - 0.4).toFixed(2)}:d=0.4,fps=${fps}`,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
      seg
    ]);
    segs.push(seg);
  }

  // 5. Concat demuxer (corte seco).
  const listPath = path.join(tmp, 'concat.txt');
  await fs.writeFile(listPath, segs.map(s => `file '${s.replace(/'/g, "'\\''")}'`).join('\n'));
  const merged = path.join(tmp, 'merged.mp4');
  await runFfmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', merged]);

  // 6. Pista de áudio: concat das narrações (com adelay por cena offset)
  //    mais música ambiente em loop com ducking quando há voz.
  await writeResult(bucket, storage.resultPath, { status: 'running', progress: 75, message: 'a montar áudio', jobId });
  const hasAnyVoice = voices.some(Boolean);
  const musicUrl = manifest.musicUrl || manifest.metadata?.musicUrl || null;

  // Descarrega música se fornecida
  let musicPath = null;
  if (musicUrl) {
    musicPath = path.join(tmp, 'music.mp3');
    const r = await fetch(musicUrl);
    if (r.ok) {
      await fs.writeFile(musicPath, Buffer.from(await r.arrayBuffer()));
    } else {
      console.warn('música indisponível:', musicUrl, r.status);
      musicPath = null;
    }
  }

  let final = merged;
  if (hasAnyVoice || musicPath) {
    let cumulative = 0;
    const inputs = [];
    const filters = [];
    const voiceLabels = [];

    // Vozes por cena com adelay cumulativo
    voices.forEach((v, i) => {
      if (v) {
        inputs.push('-i', v);
        const idx = inputs.filter(x => x === '-i').length;
        const delayMs = Math.round(cumulative * 1000);
        const lab = `v${i}`;
        filters.push(`[${idx}:a]adelay=${delayMs}|${delayMs},volume=1.1[${lab}]`);
        voiceLabels.push(`[${lab}]`);
      }
      cumulative += durations[i];
    });

    const totalDur = cumulative;

    // Música ambiente em loop, com volume reduzido e fade
    let musicChain = '';
    if (musicPath) {
      inputs.push('-stream_loop', '-1', '-i', musicPath);
      const idx = inputs.filter(x => x === '-i').length;
      musicChain = `[${idx}:a]atrim=0:${totalDur.toFixed(2)},volume=0.18,afade=t=in:st=0:d=2,afade=t=out:st=${(totalDur - 2).toFixed(2)}:d=2[musraw]`;
      filters.push(musicChain);
    }

    let outLabel = '[aout]';
    if (voiceLabels.length > 0 && musicPath) {
      // Sidechain ducking: música baixa quando voz toca
      const voiceMix = voiceLabels.length > 1
        ? `${voiceLabels.join('')}amix=inputs=${voiceLabels.length}:duration=longest:normalize=0[narr]`
        : `${voiceLabels[0]}anull[narr]`;
      filters.push(voiceMix);
      filters.push(`[narr]asplit=2[narr1][narr2]`);
      filters.push(`[musraw][narr1]sidechaincompress=threshold=0.04:ratio=8:attack=20:release=400[musduck]`);
      filters.push(`[narr2][musduck]amix=inputs=2:duration=first:normalize=0[aout]`);
    } else if (voiceLabels.length > 0) {
      const voiceMix = voiceLabels.length > 1
        ? `${voiceLabels.join('')}amix=inputs=${voiceLabels.length}:duration=longest:normalize=0[aout]`
        : `${voiceLabels[0]}anull[aout]`;
      filters.push(voiceMix);
    } else if (musicPath) {
      filters.push(`[musraw]anull[aout]`);
    }

    final = path.join(tmp, 'final.mp4');
    await runFfmpeg([
      '-y', '-i', merged, ...inputs,
      '-filter_complex', filters.join(';'),
      '-map', '0:v', '-map', outLabel,
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
      '-movflags', '+faststart', '-shortest', final
    ]);
  }

  // 7. Remux defensivo para fixar moov.
  const out = path.join(tmp, `${jobId}.mp4`);
  await runFfmpeg(['-y', '-i', final, '-c', 'copy', '-movflags', '+faststart', out]);

  // 8. Upload.
  await writeResult(bucket, storage.resultPath, { status: 'running', progress: 92, message: 'a fazer upload', jobId });
  const buf = await fs.readFile(out);
  const remoteVideo = `${outputPrefix}/${jobId}.mp4`;
  const videoUrl = await upload(bucket, remoteVideo, buf, 'video/mp4');

  await writeResult(bucket, storage.resultPath, {
    status: 'done', progress: 100, message: 'concluído',
    jobId, output: { video: videoUrl }
  });
  console.log('OK · video:', videoUrl);
}

// ---------- utils ----------

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${url} -> ${r.status}`);
  return r.json();
}

async function upload(bucket, p, body, contentType) {
  const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${p}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': contentType,
      'x-upsert': 'true',
      'Cache-Control': '3600'
    },
    body
  });
  if (!r.ok) throw new Error(`upload ${p} -> ${r.status}: ${await r.text().catch(() => '')}`);
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${p}`;
}

async function writeResult(bucket, resultPath, data) {
  const body = Buffer.from(JSON.stringify({ ...data, updatedAt: new Date().toISOString() }, null, 2));
  await upload(bucket, resultPath, body, 'application/json');
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', args, { stdio: ['ignore', 'inherit', 'inherit'] });
    p.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`)));
    p.on('error', reject);
  });
}

function ffprobeDuration(file) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file]);
    let out = '';
    p.stdout.on('data', (b) => out += b.toString());
    p.on('exit', (code) => code === 0 ? resolve(parseFloat(out.trim()) || 3.5) : reject(new Error(`ffprobe exit ${code}`)));
  });
}

main().catch(async (e) => {
  console.error(e);
  try {
    const manifest = await fetchJson(MANIFEST_URL);
    await writeResult(manifest.storage.bucket, manifest.storage.resultPath, {
      status: 'failed', progress: 0, message: String(e?.message || e), jobId: manifest.jobId
    });
  } catch {}
  process.exit(1);
});
