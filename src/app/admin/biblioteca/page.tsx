import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminEmailFromCookies } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { CopyUrlButton } from './CopyUrlButton';

export const dynamic = 'force-dynamic';

/**
 * Galeria de imagens unicas geradas (Replicate ou upload manual).
 * Le content_slides + dedupe por imageUrl — se uma imagem foi reusada
 * por N slides, aparece 1 vez com counter "usada por N". Isso garante
 * que o pool de reuso e a galeria visual reflectem o mesmo conjunto.
 */
export default async function BibliotecaPage() {
  if (!getAdminEmailFromCookies()) redirect('/admin/login');
  const supabase = createSupabaseAdmin();

  const { data: slides } = await supabase
    .from('content_slides')
    .select('id, idx, design, item_id, content_items!inner(code, title, status, scheduled_at, metadata)')
    .order('idx', { ascending: true })
    .limit(5000);

  type Row = {
    id: string;
    idx: number;
    design: { imageUrl?: string; imagePrompt?: string; reused?: boolean };
    item_id: string;
    content_items: {
      code: string;
      title: string;
      status: string;
      scheduled_at: string | null;
      metadata: Record<string, unknown> | null;
    };
  };
  const rows = ((slides ?? []) as unknown as Row[]).filter((s) => s.design?.imageUrl);

  // Dedupe por URL — agrupa slides que partilham a mesma imageUrl
  type Bucket = {
    url: string;
    usedCount: number;          // total de slides a usar
    archivedCount: number;      // dos quais quantos sao em arquivados
    firstCode: string;          // codigo do primeiro carrossel (origem)
    firstItemId: string;
    firstIdx: number;
    originalGenerated: boolean; // foi gerada para este slide (nao reused)
    sampleCodes: string[];      // ate 3 codes para mostrar
  };
  const byUrl = new Map<string, Bucket>();
  rows.forEach((s) => {
    const url = s.design.imageUrl!;
    const isArchived = (s.content_items.metadata as any)?.archived === true;
    if (!byUrl.has(url)) {
      byUrl.set(url, {
        url,
        usedCount: 0,
        archivedCount: 0,
        firstCode: s.content_items.code,
        firstItemId: s.item_id,
        firstIdx: s.idx,
        originalGenerated: !s.design.reused,
        sampleCodes: [],
      });
    }
    const b = byUrl.get(url)!;
    b.usedCount++;
    if (isArchived) b.archivedCount++;
    if (b.sampleCodes.length < 3 && !b.sampleCodes.includes(s.content_items.code)) {
      b.sampleCodes.push(s.content_items.code);
    }
  });

  const unique = Array.from(byUrl.values()).sort((a, b) => {
    // ordena por mais reusadas primeiro
    if (b.usedCount !== a.usedCount) return b.usedCount - a.usedCount;
    return a.firstCode.localeCompare(b.firstCode);
  });

  const totalSlides = rows.length;
  const popular = unique.filter((b) => b.usedCount > 1);
  const orphan = unique.filter((b) => b.usedCount === 1);

  return (
    <>
      <h1>Biblioteca de imagens</h1>
      <p className="muted">
        Imagens únicas no pool · {unique.length} no total
        ({totalSlides} slides apontam para elas).
        Reusadas mais que uma vez: {popular.length}. Usadas só uma: {orphan.length}.
      </p>

      {popular.length > 0 && (
        <Section title="Mais reusadas" items={popular} highlight />
      )}
      {orphan.length > 0 && (
        <Section title="Únicas (1 slide)" items={orphan} />
      )}
      {unique.length === 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <p className="muted">Ainda nao ha imagens geradas. Gera carrosseis em /admin/planear com autoImages ligado.</p>
        </div>
      )}
    </>
  );
}

function Section({ title, items, highlight }: { title: string; items: any[]; highlight?: boolean }) {
  return (
    <section style={{ marginTop: 24 }}>
      <h2>{title} <span className="muted" style={{ fontSize: 13 }}>· {items.length}</span></h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 12,
        marginTop: 12,
      }}>
        {items.map((b) => (
          <div key={b.url} className="card" style={{
            padding: 8,
            borderColor: highlight ? 'var(--ouro)' : undefined,
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={b.url}
              alt=""
              loading="lazy"
              style={{
                width: '100%', aspectRatio: '4 / 5', objectFit: 'cover',
                borderRadius: 4, display: 'block', background: '#0A0A0A',
              }}
            />
            <div className="mini" style={{ marginTop: 6, fontSize: 10 }}>
              <Link href={`/admin/carrosseis/${b.firstItemId}`} style={{ color: 'inherit' }}>
                {b.firstCode} · slide {String(b.firstIdx + 1).padStart(2, '0')}
              </Link>
            </div>
            <div className="muted" style={{ fontSize: 10, marginTop: 2 }}>
              Usada por {b.usedCount} slide{b.usedCount !== 1 ? 's' : ''}
              {b.archivedCount > 0 && ` · ${b.archivedCount} arq.`}
            </div>
            <div style={{ marginTop: 4 }}>
              <CopyUrlButton url={b.url} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
