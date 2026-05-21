import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { softenForSingle } from '@/lib/admin/soften-for-single';

export const runtime = 'nodejs';

/**
 * Duplica em massa todos os carrosséis de um target para outro,
 * aplicando softenForSingle quando o destino é 'solteira'.
 *
 * Body:
 *   { fromTarget: 'casada' | 'solteira' | 'ambos'
 *     toTarget:   'casada' | 'solteira' | 'ambos' }
 *
 * Skip rule: não duplica se já existir um item com code = `${baseCode}-${suffix}`
 * para o destino (idempotente).
 */
export async function POST(req: NextRequest) {
  if (!getAdminEmailFromRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null) as {
    fromTarget?: 'casada' | 'solteira' | 'ambos';
    toTarget?: 'casada' | 'solteira' | 'ambos';
  } | null;
  if (!body?.fromTarget || !body?.toTarget) {
    return NextResponse.json({ error: 'fromTarget/toTarget em falta' }, { status: 400 });
  }
  if (body.fromTarget === body.toTarget) {
    return NextResponse.json({ error: 'fromTarget == toTarget' }, { status: 400 });
  }
  const supabase = createSupabaseAdmin();

  const { data: originals } = await supabase
    .from('content_items')
    .select('*')
    .eq('type', 'carousel')
    .eq('target', body.fromTarget);

  if (!originals || originals.length === 0) {
    return NextResponse.json({ ok: true, created: 0, skipped: 0, reason: 'nada para duplicar' });
  }

  const suffix = body.toTarget === 'solteira' ? '-S' : body.toTarget === 'casada' ? '-C' : '-A';
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];
  const shouldSoften = body.toTarget === 'solteira';

  for (const original of originals) {
    const baseCode = (original.code as string | null)?.replace(/-[SCA]$/, '') ?? null;
    const newCode = baseCode ? `${baseCode}${suffix}` : null;
    if (newCode) {
      const { data: clash } = await supabase
        .from('content_items').select('id').eq('code', newCode).maybeSingle();
      if (clash) { skipped++; continue; }
    }

    const { data: createdItem, error } = await supabase
      .from('content_items')
      .insert({
        type: 'carousel',
        subtype: original.subtype,
        categoria: original.categoria,
        title: shouldSoften ? softenForSingle(original.title) : original.title,
        slug: `${original.slug}-${body.toTarget}`,
        locale: original.locale,
        target: body.toTarget,
        status: 'draft',
        caption: original.caption ? (shouldSoften ? softenForSingle(original.caption) : original.caption) : null,
        hashtags: original.hashtags,
        platforms: original.platforms,
        metadata: original.metadata ?? {},
        code: newCode
      })
      .select()
      .single();
    if (error || !createdItem) { errors.push(`${original.code}: ${error?.message}`); continue; }

    const { data: slides } = await supabase
      .from('content_slides')
      .select('idx, layout, body, design')
      .eq('item_id', original.id)
      .order('idx', { ascending: true });

    if (slides && slides.length > 0) {
      const rows = slides.map((s) => ({
        item_id: createdItem.id,
        idx: s.idx,
        layout: s.layout,
        body: shouldSoften ? softenForSingle(s.body || '') : (s.body || ''),
        design: s.design ?? {},
        voice_url: null,
        duration_sec: null
      }));
      await supabase.from('content_slides').insert(rows);
    }

    created++;
  }

  return NextResponse.json({ ok: true, created, skipped, errors: errors.slice(0, 10) });
}
