import { chromium } from 'playwright-core';
import path from 'path';
import fs from 'fs';

const SCREENS = [
  {
    name: 'landing-hero',
    html: `
      <div style="background:#1A1410;color:#F2E8DC;font-family:Georgia,serif;min-height:100vh;padding:0;margin:0;">
        <header style="display:flex;align-items:center;justify-content:space-between;padding:24px 24px;border-bottom:1px solid rgba(163,155,142,0.2);">
          <div style="display:flex;align-items:center;gap:12px;">
            <svg viewBox="0 0 60 60" width="36" height="36"><g transform="translate(30,30)"><polygon points="0,-26 6,-9 23,-13 13,1 25,11 9,11 0,26 -6,9 -23,13 -13,-1 -25,-11 -9,-11" fill="none" stroke="#D4A857" stroke-width="1.2"/><circle cx="0" cy="0" r="8" fill="none" stroke="#D4A857" stroke-width="1.2"/><circle cx="0" cy="0" r="3" fill="#D4A857"/></g></svg>
            <span style="font-size:22px;letter-spacing:2px;color:#F2E8DC;">SyncHim<span style="color:#B8843D;">.</span></span>
          </div>
          <div style="font-size:13px;color:#A39B8E;display:flex;gap:16px;">
            <span style="color:#F2E8DC;">PT</span>
            <span>·</span>
            <span>EN</span>
          </div>
        </header>
        <div style="padding:48px 24px 32px;">
          <div style="font-size:11px;letter-spacing:3px;color:#D4A857;text-transform:uppercase;margin-bottom:8px;">Vivianne dos Santos</div>
          <div style="font-size:12px;color:#A39B8E;font-style:italic;margin-bottom:32px;">Para casadas e solteiras em relações sérias</div>
          <h1 style="font-size:38px;line-height:1.12;margin:0 0 8px;color:#F2E8DC;">Não é frieza dele.</h1>
          <h1 style="font-size:38px;line-height:1.12;margin:0 0 8px;color:#F2E8DC;">É outra coisa.</h1>
          <h1 style="font-size:34px;line-height:1.12;margin:0 0 28px;color:#D4A857;font-style:italic;">E tu já sentes há meses.</h1>
          <p style="font-size:15px;line-height:1.6;color:rgba(242,232,220,0.85);margin-bottom:32px;max-width:340px;">Em 8 minutos, sabes o nome do padrão antigo que está a sabotar a tua relação.</p>
          <a style="display:inline-flex;align-items:center;gap:10px;background:#B8843D;color:#1A1410;padding:16px 32px;font-family:Georgia,serif;font-size:16px;text-decoration:none;letter-spacing:0.5px;">Quero saber o nome <span>→</span></a>
          <p style="font-size:12px;color:#A39B8E;font-style:italic;margin-top:16px;">Sem cartão. Sem email a perseguir-te depois.</p>
          <p style="font-size:11px;color:rgba(163,155,142,0.6);margin-top:10px;">Vive no teu telefone. Discreto. Sem notificações. Sem ninguém a ver.</p>
        </div>
      </div>
    `
  },
  {
    name: 'diagnostic-question',
    html: `
      <div style="background:#1A1410;color:#F2E8DC;font-family:Georgia,serif;min-height:100vh;padding:0;margin:0;">
        <div style="height:3px;background:linear-gradient(90deg,#B8843D 45%,rgba(58,46,34,0.5) 45%);"></div>
        <div style="padding:60px 24px;">
          <div style="font-size:11px;letter-spacing:3px;color:#D4A857;text-transform:uppercase;margin-bottom:8px;">Pergunta 10 de 21</div>
          <p style="font-size:20px;line-height:1.5;color:#F2E8DC;margin:24px 0 40px;font-style:italic;">"Já vi o telemóvel dele às escondidas mais de uma vez."</p>
          <div style="display:flex;flex-direction:column;gap:12px;">
            ${[['Nunca','0'],['Raramente','1'],['Frequentemente','2'],['Sempre','3']].map(([l,v],i) =>
              `<button style="background:${i===2?'#B8843D':'transparent'};color:${i===2?'#1A1410':'#F2E8DC'};border:1px solid ${i===2?'#B8843D':'rgba(163,155,142,0.3)'};padding:16px 20px;font-family:Georgia,serif;font-size:15px;text-align:left;cursor:pointer;transition:all 0.2s;">${l}</button>`
            ).join('')}
          </div>
        </div>
      </div>
    `
  },
  {
    name: 'resultado-reveal',
    html: `
      <div style="background:#1A1410;color:#F2E8DC;font-family:Georgia,serif;min-height:100vh;padding:0;margin:0;text-align:center;">
        <div style="padding:60px 24px;">
          <svg viewBox="0 0 120 60" width="80" height="40" style="margin:0 auto 32px;display:block;"><ellipse cx="60" cy="30" rx="55" ry="25" fill="none" stroke="#B8843D" stroke-width="0.8"/><ellipse cx="60" cy="30" rx="25" ry="25" fill="none" stroke="#B8843D" stroke-width="0.8"/></svg>
          <div style="font-size:11px;letter-spacing:3px;color:#D4A857;text-transform:uppercase;margin-bottom:32px;">O teu nó é</div>
          <h1 style="font-size:56px;color:#D4A857;margin:0 0 24px;line-height:1;">Fome</h1>
          <p style="font-size:17px;line-height:1.6;color:rgba(242,232,220,0.85);font-style:italic;max-width:320px;margin:0 auto 40px;">Precisas tanto da presença dele que, quando falta, interpretas como rejeição.</p>
          <div style="border-top:1px solid rgba(163,155,142,0.3);margin:32px auto;max-width:200px;"></div>
          <p style="font-size:14px;color:rgba(163,155,142,0.8);font-style:italic;max-width:280px;margin:0 auto 32px;">"O meu humor do dia depende muito de como ele acordou."</p>
          <a style="display:inline-flex;align-items:center;gap:10px;background:#B8843D;color:#1A1410;padding:16px 32px;font-family:Georgia,serif;font-size:15px;text-decoration:none;">Quero dissolver a Fome <span>→</span></a>
        </div>
      </div>
    `
  },
  {
    name: 'dashboard',
    html: `
      <div style="background:#1A1410;color:#F2E8DC;font-family:Georgia,serif;min-height:100vh;padding:0;margin:0;">
        <header style="display:flex;align-items:center;justify-content:space-between;padding:24px 24px;border-bottom:1px solid rgba(163,155,142,0.2);">
          <div style="display:flex;align-items:center;gap:12px;">
            <svg viewBox="0 0 60 60" width="32" height="32"><g transform="translate(30,30)"><polygon points="0,-26 6,-9 23,-13 13,1 25,11 9,11 0,26 -6,9 -23,13 -13,-1 -25,-11 -9,-11" fill="none" stroke="#D4A857" stroke-width="1.2"/><circle cx="0" cy="0" r="8" fill="none" stroke="#D4A857" stroke-width="1.2"/><circle cx="0" cy="0" r="3" fill="#D4A857"/></g></svg>
            <span style="font-size:20px;letter-spacing:2px;color:#F2E8DC;">SyncHim<span style="color:#B8843D;">.</span></span>
          </div>
        </header>
        <div style="text-align:center;padding:48px 24px 24px;">
          <div style="font-size:11px;letter-spacing:3px;color:#D4A857;text-transform:uppercase;margin-bottom:16px;">A tua travessia</div>
          <h2 style="font-size:28px;color:#F2E8DC;margin:0;">Fome</h2>
        </div>
        <div style="padding:0 24px;">
          ${[
            {n:3,label:'Sessão 3',status:'done'},
            {n:4,label:'Sessão 4',status:'done'},
            {n:5,label:'Sessão 5',status:'open'},
            {n:6,label:'Sessão 6',status:'locked',date:'29 mai'},
            {n:7,label:'Sessão 7',status:'locked',date:'01 jun'}
          ].map(s => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 0;border-bottom:1px solid rgba(58,46,34,0.6);">
              <span style="font-size:15px;color:${s.status==='locked'?'rgba(242,232,220,0.4)':'#F2E8DC'};">${s.label}</span>
              <span style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${s.status==='done'?'#D4A857':s.status==='open'?'#B8843D':'#A39B8E'};">
                ${s.status==='done'?'Completada':s.status==='open'?'Aberta →':'Abre a '+s.date}
              </span>
            </div>
          `).join('')}
        </div>
        <div style="padding:24px;margin-top:16px;">
          <div style="border:1px solid rgba(58,46,34,0.6);background:rgba(32,25,20,0.4);padding:16px;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <span style="font-size:15px;color:#F2E8DC;">Instalar a SyncHim no telemóvel</span>
              <span style="color:#D4A857;">▾</span>
            </div>
          </div>
        </div>
      </div>
    `
  }
];

(async () => {
  const outDir = path.join(process.cwd(), 'mockups');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3
  });

  for (const screen of SCREENS) {
    const page = await context.newPage();
    await page.setContent(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=390,initial-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box;}body{-webkit-font-smoothing:antialiased;}</style></head><body>${screen.html}</body></html>`);
    await page.waitForTimeout(200);
    const outPath = path.join(outDir, `${screen.name}.png`);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`✓ ${outPath}`);
    await page.close();
  }

  await browser.close();

  // Create phone-framed versions
  for (const screen of SCREENS) {
    const src = path.join(outDir, `${screen.name}.png`);
    const dst = path.join(outDir, `${screen.name}-framed.png`);
    const frameBrowser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
    const framePage = await frameBrowser.newPage();
    await framePage.setViewportSize({ width: 500, height: 1000 });
    await framePage.setContent(`<!DOCTYPE html><html><head><style>
      body{margin:0;padding:40px;background:#f5f5f0;display:flex;justify-content:center;align-items:center;min-height:100vh;}
      .phone{width:410px;height:870px;background:#111;border-radius:44px;padding:10px;box-shadow:0 20px 60px rgba(0,0,0,0.3),0 0 0 2px #333;}
      .screen{width:390px;height:850px;border-radius:36px;overflow:hidden;position:relative;}
      .screen img{width:100%;height:100%;object-fit:cover;object-position:top;}
      .notch{position:absolute;top:0;left:50%;transform:translateX(-50%);width:120px;height:30px;background:#111;border-radius:0 0 16px 16px;z-index:10;}
    </style></head><body>
      <div class="phone"><div class="screen"><div class="notch"></div><img src="file://${src}"/></div></div>
    </body></html>`);
    await framePage.waitForTimeout(300);
    await framePage.screenshot({ path: dst, fullPage: false });
    console.log(`✓ ${dst} (framed)`);
    await framePage.context().browser()?.close();
  }
})();
