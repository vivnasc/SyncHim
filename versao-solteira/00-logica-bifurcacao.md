# LÓGICA DE BIFURCAÇÃO, CASADA / SOLTEIRA

Spec para o Claude Code implementar.

---

## PRINCÍPIO

O mesmo diagnóstico dos 7 nós serve dois contextos de vida. O motor de cálculo do nó é **idêntico**. O que muda é a **linguagem dos resultados e das sessões**, adaptada ao contexto da utilizadora.

Um produto. Dois caminhos. Mesma autora, mesma marca, mesmo preço.

---

## A PERGUNTA DE BIFURCAÇÃO

Aparece **antes** das 21 perguntas do diagnóstico, logo após a Sessão 1 (reconhecimento). É a primeira coisa que a utilizadora responde.

### Texto da pergunta:

```
Antes de começarmos, uma pergunta.

Onde estás, agora, na tua vida amorosa?

Não há resposta certa.
Só preciso de saber para te falar a ti,
e não a uma mulher genérica.
```

### Opções (single select):

```
[ A ]  Estou num casamento ou relação séria.
       (E algo nele já não funciona como antes.)

[ B ]  Estou sozinha.
       (E quero entender porque é que ainda não tenho
        a relação que quero, ou porque as que tenho
        nunca duram.)

[ C ]  Estou no início de algo.
       (Conheci alguém, ou estou a namorar há pouco,
        e não quero estragar mais este.)
```

### Mapeamento de contexto:

```javascript
const contextMap = {
  A: "casada",      // usa conteúdo já existente (03-conteudo-pt)
  B: "solteira",    // usa conteúdo novo, sub-perfil "sozinha"
  C: "solteira"     // usa conteúdo novo, sub-perfil "inicio"
};
```

**Nota:** B e C usam ambos a versão "solteira" do conteúdo, porque o conteúdo solteira foi escrito para cobrir ambos os sub-perfis dentro de cada nó. A distinção B/C serve para:
1. Personalizar a saudação e alguns parágrafos condicionais
2. Analytics (saber qual sub-perfil converte melhor)
3. Futuro: se um sub-perfil crescer muito, pode justificar conteúdo próprio

---

## ESTRUTURA DE DADOS

### Tabela `utilizadoras`, adicionar campo:

```sql
ALTER TABLE utilizadoras 
ADD COLUMN contexto_amoroso TEXT CHECK (contexto_amoroso IN ('casada', 'sozinha', 'inicio'));
```

### Tabela `conteudo`, estrutura proposta:

```sql
-- Cada peça de conteúdo tem variante por contexto
CREATE TABLE conteudo (
  id TEXT PRIMARY KEY,
  no TEXT NOT NULL,              -- fome, controlo, etc
  tipo TEXT NOT NULL,           -- resultado, sessao_3, sessao_4, sessao_5, pratica
  contexto TEXT NOT NULL,       -- casada, solteira
  titulo TEXT,
  corpo_md TEXT NOT NULL,
  ordem INTEGER
);
```

### Lógica de seleção de conteúdo:

```javascript
function getConteudo(no, tipo, contextoUtilizadora) {
  // contextoUtilizadora: 'casada' | 'sozinha' | 'inicio'
  // mapeia 'sozinha' e 'inicio' para 'solteira' na BD
  const contexto = contextoUtilizadora === 'casada' ? 'casada' : 'solteira';
  
  return db.conteudo.findOne({
    no: no,
    tipo: tipo,
    contexto: contexto
  });
}
```

---

## ADAPTAÇÃO DA SAUDAÇÃO POR SUB-PERFIL

Para B e C (ambos "solteira" no conteúdo), a saudação de abertura difere:

### Sub-perfil B (sozinha):

```
Tu não estás aqui por causa de um homem específico.

Estás aqui porque há um padrão.

As relações que começam e morrem na mesma fase.
Os homens que parecem diferentes e afinal são iguais.
A sensação de que há algo em ti que afasta o que tu queres.

Vamos ver o que é.
```

### Sub-perfil C (início):

```
Conheceste alguém.

E em vez de alegria pura, há também medo.

Medo de estragar.
Medo de repetir.
Medo de que desta vez também não dure.

Esse medo tem nome. Vamos vê-lo antes que ele aja por ti.
```

Estas saudações aparecem no topo do **primeiro resultado de diagnóstico** que a utilizadora vê.

---

## O QUE NÃO MUDA

- O motor de cálculo do nó (as 21 perguntas, os pesos, a ordem de desempate)
- A marca Marina Vale
- A revelação SyncHim → SyncMe (mantém-se: o trabalho é sempre interior)
- A estrutura de 3 sessões + 5 práticas por nó
- A paleta visual, tipografia, tom de voz
- O preço (Tier 0/1/2 iguais)

---

## O QUE MUDA

- A linguagem dos resultados (o "ele" passa de marido a parceiro hipotético ou recente)
- Os exemplos concretos nas sessões (em vez de "quando ele chega a casa", é "quando ele demora a responder à mensagem" ou "no terceiro encontro")
- As práticas (adaptadas a quem não tem um homem em casa todos os dias)
- A saudação inicial (por sub-perfil)

---

## FLUXO COMPLETO

```
1. Landing → utilizadora entra
2. Sessão 1 (reconhecimento) → IGUAL para todas
3. PERGUNTA DE BIFURCAÇÃO → A / B / C
4. Sessão 2 (diagnóstico, 21 perguntas) → IGUAL para todas
5. Cálculo do nó → IGUAL para todas
6. RESULTADO → variante por contexto (casada / solteira)
   + saudação por sub-perfil (B ou C)
7. Banner de upgrade → IGUAL (mesmos preços)
8. Se compra → sessões 3-7 na variante do seu contexto
```

---

## BIO E POSICIONAMENTO ATUALIZADO

A bio da Marina evolui para cobrir ambas sem diluir:

### Versão nova (PT):

```
Marina Vale
Sobre os 7 padrões que sabotam
o amor das mulheres.

Casada ou à procura, o nó é o mesmo.

▾ diagnóstico (8 min · grátis)
syncehim.com
```

A frase "casada ou à procura" abre o mercado sem perder a faca dos "7 padrões que sabotam".
