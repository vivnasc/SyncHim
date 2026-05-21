import { redirect } from 'next/navigation';
import { getAdminEmailFromCookies } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { MetricoolExporter } from './MetricoolExporter';

export const dynamic = 'force-dynamic';

export default async function MetricoolPage() {
  if (!getAdminEmailFromCookies()) redirect('/admin/login');
  const supabase = createSupabaseAdmin();

  // Mostra apenas items prontos a exportar: rendered, published ou ready com output.
  const { data } = await supabase
    .from('content_items')
    .select('id, code, title, type, target, status, scheduled_at, platforms, output_urls, caption, hashtags')
    .in('status', ['rendered', 'published', 'ready'])
    .order('scheduled_at', { ascending: true, nullsFirst: false })
    .limit(200);

  const ready = (data ?? []).filter((it) => {
    if (it.type === 'carousel') return Array.isArray(it.output_urls?.pngs) && it.output_urls.pngs.length > 0;
    if (it.type === 'video')    return !!it.output_urls?.video;
    return false;
  });

  return (
    <>
      <h1>Exportar para Metricool</h1>
      <p className="muted">
        Gera um CSV pronto para <em>Planning → Calendar → Import CSV</em>. Inclui
        apenas peças com render concluído. Caption, hashtags e agendamento vêm do editor;
        ajusta lá antes de exportar.
      </p>

      {ready.length === 0 ? (
        <div className="card"><p className="muted">Sem items prontos. Renderiza um carrossel ou vídeo primeiro.</p></div>
      ) : (
        <MetricoolExporter items={ready as any} />
      )}

      <section style={{ marginTop: 32 }}>
        <h2>Como importar no Metricool</h2>
        <ol className="muted" style={{ lineHeight: 1.8 }}>
          <li>Abrir <strong>Planning → Calendar → Import CSV</strong> no painel Metricool.</li>
          <li>Arrastar o ficheiro <code>synchim-metricool-YYYY-MM-DD.csv</code> descarregado aqui.</li>
          <li>Confirmar pré-visualização: 1 linha por (post × plataforma). Carrosséis aparecem só no IG (CAROUSEL).</li>
          <li>Aprovar. O Metricool publica nas datas/horas exactas indicadas, no fuso da conta.</li>
        </ol>
        <p className="muted" style={{ fontSize: 12 }}>
          Header oficial (93 colunas) baseado em <code>csv_data.csv</code> descarregado do
          painel Metricool. Para alterar, edita <code>src/lib/admin/metricool/csv.ts</code>
          e mantém a ordem exacta.
        </p>
      </section>
    </>
  );
}
