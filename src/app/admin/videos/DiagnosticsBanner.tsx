'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

/**
 * Banner que aparece no topo de /admin/videos se alguma env essencial
 * estiver em falta. Evita disparar pipelines que vão falhar a meio por
 * configuração ausente — força ver /admin/diagnostics primeiro.
 */
export function DiagnosticsBanner() {
  const [missing, setMissing] = useState<string[] | null>(null);

  useEffect(() => {
    fetch('/api/admin/diagnostics')
      .then((r) => r.json())
      .then((j) => { if (!j.ok) setMissing(j.missingRequired ?? []); })
      .catch(() => {});
  }, []);

  if (!missing || missing.length === 0) return null;

  return (
    <div style={{
      background: 'rgba(194, 85, 85, 0.15)',
      border: '1px solid #C25555',
      borderRadius: 4,
      padding: '10px 14px',
      marginTop: 12,
      marginBottom: 12,
      color: '#FFE4D6',
      fontSize: 13,
    }}>
      <strong>❌ {missing.length} env var(s) essencial(is) em falta — o pipeline vai falhar.</strong>
      <div style={{ fontSize: 12, marginTop: 4, opacity: 0.85 }}>
        {missing.join(', ')}
      </div>
      <Link
        href="/admin/diagnostics"
        style={{ display: 'inline-block', marginTop: 8, color: '#FFD78A', fontWeight: 600 }}
      >
        → Ver Diagnóstico com instruções
      </Link>
    </div>
  );
}
