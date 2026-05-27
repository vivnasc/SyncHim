import type { Locale } from './diagnostic';

export type EmailKind =
  | 'boas_vindas_t0'
  | 'boas_vindas_paga'
  | 'magic_link'
  | 'sessao_3'
  | 'sessao_4'
  | 'sessao_5'
  | 'sessao_6'
  | 'sessao_7'
  | 'carta_final'
  | 'compra_admin';

interface Rendered {
  subject: string;
  html: string;
  text: string;
}

const layout = (body: string) => `<!doctype html>
<html><body style="background:#1A1410;color:#F2E8DC;font-family:'EB Garamond',Georgia,serif;line-height:1.6;padding:40px 24px;">
<div style="max-width:520px;margin:0 auto;">
<p style="color:#E08496;font-size:24px;margin:0 0 32px;">✦ <em>SyncHim</em></p>
${body}
<p style="margin-top:48px;color:#A39B8E;font-size:13px;">Vivianne dos Santos<br/>synchim.com</p>
</div>
</body></html>`;

function build(subject: string, body: string): Rendered {
  const text = body.replace(/<[^>]+>/g, '').replace(/\n\s*\n/g, '\n\n').trim() + '\n\nVivianne dos Santos\nsynchim.com';
  return { subject, html: layout(body), text };
}

type Tpl = (vars: Record<string, string>) => Rendered;

const LINK_STYLE = 'color:#E08496;text-decoration:none;border-bottom:1px solid #E08496;';

const PT: Record<EmailKind, Tpl> = {
  boas_vindas_t0: ({ nome }) => build(
    'O teu diagnóstico ficou guardado.',
    `<p style="font-size:18px;">${nome || 'Olá'},</p>
<p>O teu diagnóstico está guardado. Podes voltar a ele sempre que precisares.</p>
<p>Quando estiveres pronta para descer ao que está debaixo do teu nó, há um caminho. Entra na tua conta para o veres.</p>`
  ),
  boas_vindas_paga: ({ nome, link }) => build(
    'A tua travessia começa.',
    `<p style="font-size:18px;">${nome || 'Olá'},</p>
<p>Recebi o teu pagamento. As sessões 3 a 7 estão à tua espera.</p>
<p>Sem urgência. Faz a sessão 3 quando puderes estar sozinha durante 30 minutos.</p>
<p style="margin-top:24px;"><a href="${link}" style="${LINK_STYLE}">Entrar na minha conta →</a></p>`
  ),
  magic_link: ({ nome, link }) => build(
    'O teu link de entrada.',
    `<p style="font-size:18px;">${nome || 'Olá'},</p>
<p>Carrega no link abaixo para entrar. Expira em uma hora.</p>
<p style="margin-top:24px;"><a href="${link}" style="${LINK_STYLE}">Entrar →</a></p>
<p style="color:#A39B8E;font-size:13px;">Se não foste tu, ignora este email.</p>`
  ),
  sessao_3: ({ nome }) => build(
    'A sessão 3 abriu.',
    `<p style="font-size:18px;">${nome || 'Olá'},</p>
<p>A sessão 3 está aberta.</p>
<p>Sem pressa. Faz quando puderes ficar contigo.</p>`
  ),
  sessao_4: ({ nome }) => build(
    'A sessão 4 abriu.',
    `<p style="font-size:18px;">${nome || 'Olá'},</p>
<p>A sessão 4 está aberta.</p>
<p>Vai com calma. Esta desce.</p>`
  ),
  sessao_5: ({ nome }) => build(
    'A sessão 5 abriu.',
    `<p style="font-size:18px;">${nome || 'Olá'},</p>
<p>A sessão 5 está aberta.</p>
<p>Hoje vês o que o nó está a fazer à tua relação.</p>`
  ),
  sessao_6: ({ nome }) => build(
    'A sessão 6 abriu.',
    `<p style="font-size:18px;">${nome || 'Olá'},</p>
<p>A sessão 6 está aberta.</p>
<p>A prática que se mantém.</p>`
  ),
  sessao_7: ({ nome }) => build(
    'Sessão final.',
    `<p style="font-size:18px;">${nome || 'Olá'},</p>
<p>A última sessão está aberta.</p>
<p>Volta quando estiveres pronta.</p>`
  ),
  carta_final: ({ nome }) => build(
    'O que ficou.',
    `<p style="font-size:18px;">${nome || 'Olá'},</p>
<p>Atravessaste. Não é o fim. É o início da prática que se faz para sempre.</p>
<p>Volta ao processo sempre que precisares. Refaz o diagnóstico daqui a meses; o nó pode ter mudado.</p>
<p style="color:#E08496;font-style:italic;margin-top:24px;">Bem-vinda de volta a ti.</p>`
  ),
  compra_admin: ({ email, tier, no, amount }) => build(
    `Nova compra: ${email}`,
    `<p><strong>Nova compra SyncHim</strong></p>
<p>Email: ${email}<br/>
Tier: ${tier}<br/>
Nó: ${no || 'biblioteca completa'}<br/>
Valor: US$ ${amount}</p>
<p style="color:#A39B8E;font-size:13px;">Este email é gerado automaticamente.</p>`
  )
};

const EN: Record<EmailKind, Tpl> = {
  boas_vindas_t0: ({ nome }) => build(
    'Your diagnostic is saved.',
    `<p style="font-size:18px;">${nome || 'Hello'},</p>
<p>Your diagnostic is saved. You can return to it whenever you need.</p>
<p>When you are ready to descend beneath your knot, there is a path. Sign in to see it.</p>`
  ),
  boas_vindas_paga: ({ nome, link }) => build(
    'Your crossing begins.',
    `<p style="font-size:18px;">${nome || 'Hello'},</p>
<p>I received your payment. Sessions 3 to 7 are waiting.</p>
<p>No urgency. Do session 3 when you can be alone for half an hour.</p>
<p style="margin-top:24px;"><a href="${link}" style="${LINK_STYLE}">Enter your account →</a></p>`
  ),
  magic_link: ({ nome, link }) => build(
    'Your sign-in link.',
    `<p style="font-size:18px;">${nome || 'Hello'},</p>
<p>Tap the link below to sign in. It expires in one hour.</p>
<p style="margin-top:24px;"><a href="${link}" style="${LINK_STYLE}">Sign in →</a></p>
<p style="color:#A39B8E;font-size:13px;">If this was not you, ignore this email.</p>`
  ),
  sessao_3: ({ nome }) => build('Session 3 is open.', `<p style="font-size:18px;">${nome || 'Hello'},</p><p>Session 3 is open. No rush, do it when you can be with yourself.</p>`),
  sessao_4: ({ nome }) => build('Session 4 is open.', `<p style="font-size:18px;">${nome || 'Hello'},</p><p>Session 4 is open. Take your time. This one goes deep.</p>`),
  sessao_5: ({ nome }) => build('Session 5 is open.', `<p style="font-size:18px;">${nome || 'Hello'},</p><p>Session 5 is open. Today you see what the knot is doing to your relationship.</p>`),
  sessao_6: ({ nome }) => build('Session 6 is open.', `<p style="font-size:18px;">${nome || 'Hello'},</p><p>Session 6 is open. The practice that holds.</p>`),
  sessao_7: ({ nome }) => build('Final session.', `<p style="font-size:18px;">${nome || 'Hello'},</p><p>The last session is open. Come back when you are ready.</p>`),
  carta_final: ({ nome }) => build(
    'What remains.',
    `<p style="font-size:18px;">${nome || 'Hello'},</p>
<p>You crossed. Not the end. The beginning of the practice that holds for life.</p>
<p>Return to the process whenever you need. Redo the diagnostic months from now; the knot may have shifted.</p>
<p style="color:#E08496;font-style:italic;margin-top:24px;">Welcome back to yourself.</p>`
  ),
  compra_admin: ({ email, tier, no, amount }) => build(
    `New purchase: ${email}`,
    `<p><strong>New SyncHim purchase</strong></p>
<p>Email: ${email}<br/>Tier: ${tier}<br/>Knot: ${no || 'full library'}<br/>Amount: US$ ${amount}</p>
<p style="color:#A39B8E;font-size:13px;">This email is generated automatically.</p>`
  )
};

export function renderEmail(kind: EmailKind, locale: Locale, vars: Record<string, string>): Rendered {
  const map = locale === 'pt' ? PT : EN;
  return map[kind](vars);
}
