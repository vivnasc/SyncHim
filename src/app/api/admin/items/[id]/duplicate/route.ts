import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { softenForSingle } from '@/lib/admin/soften-for-single';

export const runtime = 'nodejs';

/**
 * Duplica um content_item (carrossel ou vídeo) para outro público.
 *
 * Body: { target: 'casada' | 'solteira' | 'ambos' }
 *
 * - Cria novo item com mesmo type/categoria/subtype, novo code (sufixo
 *   -S para solteira, -C para casada na duplicação inversa).
 * - Se o target destino for 'solteira' e o original for 'casada',
 *   aplica `softenForSingle` aos bodies como ponto de partida.
 * - Status do novo item fica sempre 'draft' (precisa de revisão).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminEmailFromRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null) as { target?: 'casada' | 'solteira' | 'ambos' } | null;
  if (!body?.target) return NextResponse.json({ error: 'target em falta' }, { status: 400 });

  const supabase = createSupabaseAdmin();
  const { data: original } = await supabase
    .from('content_items')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();
  if (!original) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const suffix = body.target === 'solteira' ? '-S' : body.target === 'casada' ? '-C' : '-A';
  const baseCode = (original.code as string | null)?.replace(/-[SCA]$/, '') ?? null;
  const newCode = baseCode ? `${baseCode}${suffix}` : null;

  // Garantir code único (se já existir, anexa timestamp curto)
  let finalCode = newCode;
  if (finalCode) {
    const { data: clash } = await supabase.from('content_items').select('id').eq('code', finalCode).maybeSingle();
    if (clash) finalCode = `${finalCode}-${Date.now().toString(36).slice(-4)}`;
  }

  const { data: created, error } = await supabase
    .from('content_items')
    .insert({
      type: original.type,
      subtype: original.subtype,
      categoria: original.categoria,
      title: `${original.title} (${body.target})`,
      slug: `${original.slug}-${body.target}`,
      locale: original.locale,
      target: body.target,
      status: 'draft',
      caption: original.caption ? (body.target === 'solteira' ? softenForSingle(original.caption) : original.caption) : null,
      hashtags: original.hashtags,
      platforms: original.platforms,
      metadata: original.metadata ?? {},
      code: finalCode
    })
    .select()
    .single();
  if (error || !created) return NextResponse.json({ error: error?.message || 'insert failed' }, { status: 500 });

  const { data: slides } = await supabase
    .from('content_slides')
    .select('idx, layout, body, design, voice_url, duration_sec')
    .eq('item_id', original.id)
    .order('idx', { ascending: true });

  if (slides && slides.length > 0) {
    const rows = slides.map((s) => ({
      item_id: created.id,
      idx: s.idx,
      layout: s.layout,
      body: body.target === 'solteira' ? softenForSingle(s.body || '') : (s.body || ''),
      design: s.design ?? {},
      // não copiamos voice_url nem outputs — precisam de re-render
      voice_url: null,
      duration_sec: s.duration_sec
    }));
    await supabase.from('content_slides').insert(rows);
  }

  return NextResponse.json({ id: created.id });
}
