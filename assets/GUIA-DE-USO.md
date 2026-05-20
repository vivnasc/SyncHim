# GUIA DE USO DOS ELEMENTOS VISUAIS

> Como aplicar cada um dos 5 elementos decorativos e o sistema de tokens. Para o Claude Code seguir literalmente.

---

## INSTALAÇÃO

1. Copia toda a pasta `assets/` para `src/app/assets/` (ou `public/assets/`, conforme o setup Next.js que escolheres).

2. Importa `tokens.css` em `globals.css`:

```css
@import "./assets/tokens.css";
```

3. As fontes serifadas devem ser carregadas via `next/font` em `layout.tsx`:

```tsx
import { EB_Garamond, Inter } from "next/font/google";

const garamond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--serif"
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--sans"
});
```

E aplicar nas variáveis CSS do `<html>`:

```tsx
<html lang={locale} className={`${garamond.variable} ${inter.variable}`}>
```

---

## ELEMENTO 1 — ROSÁCEO DE CANTO

**Ficheiro:** `assets/01-rosaceo-canto.svg`
**Cor:** herda de `currentColor`. Por defeito ouro `#B8843D`. Cor controlada via classe ou estilo do contentor.

### Onde usar

- Cantos superiores esquerdo/direito do hero da landing
- Antes do CTA principal de cada secção paga
- No fim de cada email (acima da assinatura)
- Nos cantos de cada slide do Instagram
- Entre Sessão 6 (carta a ti mesma) e Sessão 7 (devolução final)

### Onde NÃO usar

- Em CTAs secundários
- Em corpos de texto longos (cria ruído)
- Mais de duas vezes por página

### Exemplo JSX

```tsx
import Rosaceo from "@/assets/01-rosaceo-canto.svg";

<div className="hero">
  <Rosaceo className="rosaceo" />
  <h1>O teu marido afastou-se.</h1>
</div>
```

Para usar inline com tamanho customizado:

```tsx
<Rosaceo className="rosaceo rosaceo-grande" />
```

---

## ELEMENTO 2 — VESICA PISCIS

**Ficheiro:** `assets/02-vesica-piscis.svg`
**Função:** separador entre secções principais (não entre parágrafos).

### Onde usar

- Entre Bloco A e Bloco B dentro de uma sessão
- Entre secções principais da landing (Hero → Reconhecimento → Método → Tiers)
- Entre o resultado do diagnóstico e o banner de upgrade

### Onde NÃO usar

- Entre cada parágrafo
- Em emails (demasiado decorativo para inbox)
- Como elemento isolado sem função estrutural

### Exemplo JSX

```tsx
import Vesica from "@/assets/02-vesica-piscis.svg";

<section>{/* ... bloco anterior */}</section>
<Vesica className="vesica" />
<section>{/* ... bloco seguinte */}</section>
```

---

## ELEMENTO 3 — LETRINA ILUMINADA

**Ficheiros:** classe CSS `.letrina` em `tokens.css` (não usa SVG — é puro CSS para que a tipografia herde a fonte serifada carregada).

### Onde usar

- Primeira letra de cada **sessão** (1 a 7)
- Primeira letra de uma **carta** (ex: Email 8 — Carta final)
- Primeira letra da página de **resultado do diagnóstico**

### Onde NÃO usar

- Primeira letra de parágrafos comuns dentro da sessão
- Em textos curtos (CTAs, etiquetas, navegação)
- Mais de uma vez por página

### Exemplo JSX

```tsx
<p>
  <span className="letrina">T</span>u não estás aqui por acaso.
  Provavelmente foi de noite que clicaste. Provavelmente o teu
  marido estava ao lado, a dormir...
</p>
```

### Notas de comportamento

- A letrina usa `float: left` — o texto flui ao lado naturalmente
- Os 4 pontos dourados nos cantos são gerados via `background-image` com `radial-gradient` (sem SVG, sem imagem externa)
- Em mobile o tamanho reduz automaticamente via media query

---

## ELEMENTO 4 — SEPARADOR-VERSO

**Ficheiro:** `assets/04-separador-verso.svg` + classe CSS `.verso`

### Onde usar

- Entre Bloco C e Bloco D de qualquer sessão (entre a reflexão e a prática)
- No fim da Sessão 5 (antes da revelação SyncMe)
- Como ponto contemplativo dentro da Sessão 6
- No slide 6 ou 7 de um carrossel longo do Instagram

### Onde NÃO usar

- Mais do que uma vez por sessão
- Em emails
- Como ornamento isolado sem verso por baixo

### Exemplo JSX

```tsx
import Separador from "@/assets/04-separador-verso.svg";

<blockquote className="verso">
  <Separador className="sep" />
  Não procures por onde foste partida.
  <br />
  Procura por onde foste cosida.
  <Separador className="sep" />
</blockquote>
```

### Notas

- O verso pode ser do produto, de poetas (Rumi, Hafiz, Adélia Prado) ou da própria Marina Vale
- Deve ser sempre breve — 2 a 4 linhas no máximo
- Quando o conteúdo for original e atribuível, pode incluir `<cite>` discreto por baixo

---

## ELEMENTO 5 — SÍMBOLO DA MARCA (ESTRELA PERSA)

**Ficheiro:** `assets/05-estrela-persa.svg`
**Função:** assinatura visual de SyncHim.

### Onde usar — SEMPRE

- Logo no topo da landing (ao lado do wordmark "SyncHim.")
- Favicon do site
- Foto de perfil do Instagram @marinavale.sync
- Fim de cada sessão, antes da assinatura "— Marina Vale"
- Fim de cada email, antes de "— Marina"
- Símbolo de carregamento (loading state) das sessões
- Rodapé da landing

### Onde NÃO usar

- Como ornamento decorativo em meio a parágrafos
- Espalhado pela página (perde poder)
- Com cor diferente do ouro folha `#D4A857`

### Exemplo JSX

```tsx
import Marca from "@/assets/05-estrela-persa.svg";

// Logo no header
<header>
  <Link href="/">
    <Marca className="marca-pequena" />
    <span>SyncHim.</span>
  </Link>
</header>

// Fim de sessão
<footer>
  <Marca className="marca" />
  <p>—<br/>Marina Vale</p>
</footer>

// Loading state
<div className="loading">
  <Marca className="marca-grande" style={{ animation: "fadeIn 2s infinite alternate" }} />
</div>
```

---

## TEXTURA DE PERGAMINHO (GLOBAL)

Já está aplicada via `body::before` no `tokens.css`. Não fazer nada — funciona automaticamente em toda a aplicação.

### Para desactivar em ecrãs específicos

(Raro. Só se houver problema de performance em mobile antigo):

```css
.sem-textura body::before { display: none; }
```

---

## PALETA DE COR — USO

### Sempre usar via variáveis CSS

```css
color: var(--texto);
background: var(--bg);
border: 1px solid var(--linha);
```

### Frequência de uso por cor

| Cor | Frequência | Uso |
|-----|------------|-----|
| `--bg` | Constante | Fundo de tudo |
| `--texto` | Constante | Texto principal |
| `--texto-suave` | Frequente | Notas, captions, etiquetas |
| `--ouro` | Frequente | CTAs, links, ornamentos pequenos |
| `--ouro-folha` | Raro | Letrina, símbolo da marca, ênfase |
| `--bordeaux` | Raríssimo | 1 vez por página, em momentos altos |
| `--linha` | Estrutural | Separadores discretos |

### Acessibilidade

- `--texto` (`#F2E8DC`) sobre `--bg` (`#1A1410`) → contraste **15.8:1** (AAA)
- `--texto-suave` (`#A39B8E`) sobre `--bg` → contraste **7.4:1** (AAA)
- `--ouro` (`#B8843D`) sobre `--bg` → contraste **6.1:1** (AA grande, AAA pequeno)

Todos os pares acima do mínimo WCAG. Não baixar o contraste de `--texto-suave` mais do que isto.

---

## TIPOGRAFIA — REGRAS DURAS

- **Letrina** (`var(--t-letrina)`) — apenas no início de sessão ou carta
- **H1** (`var(--t-titulo)`) — apenas uma vez por página
- **H2** (`var(--t-h2)`) — secções principais
- **H3** (`var(--t-h3)`) — sub-secções dentro de blocos
- **Corpo** (`var(--t-corpo)`) — toda a leitura
- **Mini** (`.mini` classe) — etiquetas, "secção 03", numeração de tier

**Nunca** misturar Garamond com outras serifadas. Nunca usar Inter para texto longo (só UI: botões, etiquetas, números).

**Itálico** — apenas para:
- Versos entre secções
- Frases interiores ("o sistema dele responde")
- Pensamentos da fome ("se eu não perguntar, ele não me diz nada")

Itálico nunca é decorativo.

---

## RESPONSIVO

Tudo já está calibrado para mobile no `tokens.css`. Verificar:

- Letrina reduz de 64px para 48px abaixo de 768px
- H1 reduz de 40px para 32px
- Padding de secção reduz de 6rem para 3rem
- Largura de leitura mantém 38rem (recolhe naturalmente em mobile)

### Pontos de quebra

- Desktop: > 1024px
- Tablet: 768px – 1024px
- Mobile: < 768px

---

## ANTI-PADRÕES (NUNCA FAZER)

❌ Adicionar gradientes ao fundo
❌ Mudar a cor de fundo para preto puro `#000`
❌ Pôr os elementos decorativos em rosa, lilás, pastel
❌ Animar a estrela persa em rotação contínua
❌ Pôr a textura de pergaminho a mais de 5% de opacidade
❌ Usar fontes script, handwritten, cursivas
❌ Pôr sombras nos botões ou nos elementos decorativos
❌ Usar `box-shadow` em qualquer lado
❌ Adicionar emojis a títulos ou CTAs
❌ Usar mais de uma letrina por página
❌ Aplicar bordas arredondadas grandes (raio máximo: 0 ou 2px)

---

## QUANDO TIVER DÚVIDA

Pergunta-te: *isto soa a editora antiga de manuscritos sagrados, ou a coach do Instagram?*

Se for o segundo, é não.

FIM.
