import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminEmailFromCookies } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { CopyUrlButton } from './CopyUrlButton';

export const dynamic = 'force-dynamic';

/**
 * Galeria de TODAS as imagens geradas (Replicate ou upload manual).
 * Le content_slides em vez de Supabase Storage directo porque mantem o
 * link slide<->imageUrl e mostra qual carrossel/slide a usa.
 */
export default async function BibliotecaPage() {
  if (!getAdminEmailFromCookies()) redirect('/admin/login');
  const supabase = createSupabaseAdmin();

  const { data: slides } = await supabase
    .from('content_slides')
    .select('id, idx, design, item_id, content_items!inner(code, title, status, scheduled_at, metadata)')
    .order('idx', { ascending: true })
    .limit(2000);

  type Row = {
    id: string;
    idx: number;
    design: { imageUrl?: string; imagePrompt?: string };
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
  const archived = rows.filter((s) => (s.content_items.metadata as any)?.archived);
  const active = rows.filter((s) => !(s.content_items.metadata as any)?.archived);

  return (
    <>
      <h1>Biblioteca de imagens</h1>
      <p className="muted">
        Todas as imagens já geradas — activas e arquivadas. Clica para copiar
        o URL e colar num slide novo. Total: {rows.length} imagens
        ({active.length} activas · {archived.length} arquivadas).
      </p>

      {active.length > 0 && <Section title="Activas" items={active} />}
      {archived.length > 0 && <Section title="Arquivadas (de testes ou planos antigos)" items={archived} />}
      {rows.length === 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <p className="muted">Ainda nao ha imagens geradas. Gera carrosseis em /admin/planear com autoImages ligado.</p>
        </div>
      )}
    </>
  );
}

function Section({ title, items }: { title: string; items: any[] }) {
  return (
    <section style={{ marginTop: 24 }}>
      <h2>{title} <span className="muted" style={{ fontSize: 13 }}>· {items.length}</span></h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 12,
        marginTop: 12,
      }}>
        {items.map((s) => (
          <div key={s.id} className="card" style={{ padding: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.design.imageUrl}
              alt=""
              loading="lazy"
              style={{
                width: '100%', aspectRatio: '4 / 5', objectFit: 'cover',
                borderRadius: 4, display: 'block', background: '#0A0A0A',
              }}
            />
            <div className="mini" style={{ marginTop: 6, fontSize: 10 }}>
              <Link href={`/admin/carrosseis/${s.item_id}`} style={{ color: 'inherit' }}>
                {s.content_items.code} · slide {String(s.idx + 1).padStart(2, '0')}
              </Link>
            </div>
            <div style={{ marginTop: 4 }}>
              <CopyUrlButton url={s.design.imageUrl} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
