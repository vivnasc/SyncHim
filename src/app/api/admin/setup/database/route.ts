import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { getAdminEmailFromRequest } from '@/lib/admin/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Lê todos os .sql em /supabase/ e devolve concatenado. Também testa quais
 * tabelas conhecidas existem na BD — assim a UI mostra logo o que falta
 * antes de copiares o SQL.
 */
const SQL_FILES = [
  'admin-schema.sql',
  'settings.sql',
  'campaign-jobs.sql',
  'target-migration.sql',
  'subperfil-migration.sql',
  'content-target-migration.sql',
];

const KNOWN_TABLES = [
  'content_items',
  'content_slides',
  'campaign_jobs',
  'settings',
  'render_jobs',
];

export async function GET(req: NextRequest) {
  if (!getAdminEmailFromRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const baseDir = path.join(process.cwd(), 'supabase');
  const sections: Array<{ file: string; sql: string }> = [];
  for (const f of SQL_FILES) {
    try {
      const sql = await fs.readFile(path.join(baseDir, f), 'utf-8');
      sections.push({ file: f, sql });
    } catch {
      // ficheiro pode nao existir nalguns deploys
    }
  }

  // Testa tabelas existentes via service_role
  const supabase = createSupabaseAdmin();
  const tableStatus: Record<string, 'present' | 'missing'> = {};
  for (const t of KNOWN_TABLES) {
    const { error } = await supabase.from(t).select('*').limit(0);
    tableStatus[t] = error ? 'missing' : 'present';
  }

  const combined = sections
    .map((s) => `-- ============================================\n-- ${s.file}\n-- ============================================\n\n${s.sql.trim()}`)
    .join('\n\n');

  const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/^https?:\/\//, '')
    .split('.')[0];

  return NextResponse.json({
    sections: sections.map((s) => ({ file: s.file, bytes: s.sql.length })),
    combined,
    tableStatus,
    sqlEditorUrl: projectRef ? `https://supabase.com/dashboard/project/${projectRef}/sql/new` : null,
  });
}
