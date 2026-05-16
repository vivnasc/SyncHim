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
  | 'carta_final';

interface Rendered {
  subject: string;
  html: string;
  text: string;
}

const layout = (body: string) => `<!doctype html>
<html><body style="background:#0A0A0A;color:#F5F1EA;font-family:Georgia,serif;line-height:1.55;padding:32px;">
<div style="max-width:520px;margin:0 auto;">
${body}
<p style="margin-top:40px;color:#888880;font-size:14px;">—<br/>Marina</p>
</div>
</body></html>`;

function build(subject: string, body: string): Rendered {
  const text = body.replace(/<[^>]+>/g, '').replace(/\n\s*\n/g, '\n\n').trim() + '\n\n—\nMarina';
  return { subject, html: layout(body), text };
}

type Tpl = (vars: Record<string, string>) => Rendered;

const PT: Record<EmailKind, Tpl> = {
  boas_vindas_t0: ({ nome }) => build(
    'O teu diagnóstico ficou guardado.',
    `<p>${nome || 'Olá'},</p>
<p>O teu diagnóstico está guardado. Podes voltar a ele sempre que precisares.</p>
<p>Não te vou prometer que o teu marido volta. Vou-te ensinar a voltar tu.</p>
<p>Quando estiveres pronta para descer ao que está debaixo do teu nó, há um caminho. Entra na tua conta para o veres.</p>`
  ),
  boas_vindas_paga: ({ nome, link }) => build(
    'A tua travessia começa.',
    `<p>${nome || 'Olá'},</p>
<p>Recebi o teu pagamento. As sessões 3 a 7 estão à tua espera.</p>
<p>Sem urgência. Faz a sessão 3 quando puderes estar sozinha durante 30 minutos.</p>
<p><a href="${link}" style="color:#B8956A;">Entrar na minha conta</a></p>`
  ),
  magic_link: ({ nome, link }) => build(
    'O teu link de entrada.',
    `<p>${nome || 'Olá'},</p>
<p>Carrega no link abaixo para entrar. Expira em uma hora.</p>
<p><a href="${link}" style="color:#B8956A;">Entrar</a></p>
<p>Se não foste tu, ignora este email.</p>`
  ),
  sessao_3: () => build('A sessão 3 abriu.', `<p>A sessão 3 está aberta. Sem pressa, faz quando puderes ficar contigo.</p>`),
  sessao_4: () => build('A sessão 4 abriu.', `<p>A sessão 4 está aberta. Vai com calma — esta desce.</p>`),
  sessao_5: () => build('A sessão 5 abriu.', `<p>A sessão 5 está aberta. Hoje vês o que isto está a fazer ao teu casamento.</p>`),
  sessao_6: () => build('A sessão 6 abriu.', `<p>A sessão 6 está aberta. A prática que se mantém.</p>`),
  sessao_7: () => build('Sessão final.', `<p>A última sessão está aberta. Volta quando estiveres pronta.</p>`),
  carta_final: ({ nome }) => build(
    'O que ficou.',
    `<p>${nome || 'Olá'},</p>
<p>Atravessaste. Não é o fim — é o início da prática que se faz para sempre. Volta ao processo sempre que precisares. Refaz o diagnóstico daqui a meses; o nó pode ter mudado.</p>
<p>Bem-vinda de volta a ti.</p>`
  )
};

const EN: Record<EmailKind, Tpl> = {
  boas_vindas_t0: ({ nome }) => build(
    'Your diagnostic is saved.',
    `<p>${nome || 'Hello'},</p>
<p>Your diagnostic is saved. You can return to it whenever you need.</p>
<p>I won't promise you that your husband returns. I'll teach you how to return to yourself.</p>
<p>When you are ready to descend beneath your knot, there is a path. Sign in to see it.</p>`
  ),
  boas_vindas_paga: ({ nome, link }) => build(
    'Your crossing begins.',
    `<p>${nome || 'Hello'},</p>
<p>I received your payment. Sessions 3 to 7 are waiting.</p>
<p>No urgency. Do session 3 when you can be alone for half an hour.</p>
<p><a href="${link}" style="color:#B8956A;">Enter your account</a></p>`
  ),
  magic_link: ({ nome, link }) => build(
    'Your sign-in link.',
    `<p>${nome || 'Hello'},</p>
<p>Tap the link below to sign in. It expires in one hour.</p>
<p><a href="${link}" style="color:#B8956A;">Sign in</a></p>
<p>If this wasn't you, ignore this email.</p>`
  ),
  sessao_3: () => build('Session 3 is open.', `<p>Session 3 is open. No rush — do it when you can be with yourself.</p>`),
  sessao_4: () => build('Session 4 is open.', `<p>Session 4 is open. Take your time — this one goes deep.</p>`),
  sessao_5: () => build('Session 5 is open.', `<p>Session 5 is open. Today you see what this is doing to your marriage.</p>`),
  sessao_6: () => build('Session 6 is open.', `<p>Session 6 is open. The practice that holds.</p>`),
  sessao_7: () => build('Final session.', `<p>The last session is open. Come back when you're ready.</p>`),
  carta_final: ({ nome }) => build(
    'What remains.',
    `<p>${nome || 'Hello'},</p>
<p>You crossed. Not the end — the beginning of the practice that holds for life. Return to the process whenever you need. Redo the diagnostic months from now; the knot may have shifted.</p>
<p>Welcome back to yourself.</p>`
  )
};

export function renderEmail(kind: EmailKind, locale: Locale, vars: Record<string, string>): Rendered {
  const map = locale === 'pt' ? PT : EN;
  return map[kind](vars);
}
