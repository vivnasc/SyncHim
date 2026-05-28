'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Job = {
  job_id: string;
  status: 'queued' | 'running' | 'done' | 'failed' | 'cancelled';
  progress: number;
  current_slot: number;
  total_slots: number;
  settings: any;
  items_created: Array<{ code: string; id: string; slotIndex: number }>;
  message: string | null;
  error: string | null;
  created_at: string;
  finished_at: string | null;
};

export function CampaignJobLive({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<Job | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    async function poll() {
      try {
        const res = await fetch(`/api/admin/campaigns/${jobId}`, { cache: 'no-store' });
        const j = await res.json();
        if (!active) return;
        if (!res.ok) { setErr(j.error || `HTTP ${res.status}`); return; }
        setJob(j);
        if (j.status === 'done' || j.status === 'failed' || j.status === 'cancelled') {
          if (interval) clearInterval(interval);
        }
      } catch (e: any) {
        if (active) setErr(e.message);
      }
    }

    poll();
    interval = setInterval(poll, 4000);
    return () => { active = false; if (interval) clearInterval(interval); };
  }, [jobId]);

  if (err) return <p style={{ color: 'var(--bordeaux)' }}>{err}</p>;
  if (!job) return <p className="muted">A carregar…</p>;

  const barColor = job.status === 'failed' ? 'var(--bordeaux)' : 'var(--ouro)';

  return (
    <div style={{ marginTop: 16 }}>
      <div className="card">
        <div className="row between" style={{ marginBottom: 12 }}>
          <div>
            <span className={`pill ${job.status}`}>{job.status}</span>
            <code style={{ fontSize: 11, marginLeft: 8 }}>{job.job_id}</code>
          </div>
          <span className="muted" style={{ fontSize: 12 }}>
            {job.progress}% · slot {job.current_slot}/{job.total_slots}
          </span>
        </div>

        <div style={{ height: 8, background: 'var(--linha)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            width: `${job.progress}%`, height: '100%',
            background: barColor, transition: 'width 0.4s ease',
          }} />
        </div>

        {job.message && (
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            {job.message}
          </p>
        )}
        {job.error && (
          <p style={{ fontSize: 12, marginTop: 8, color: 'var(--bordeaux)' }}>
            {job.error}
          </p>
        )}

        <div className="row" style={{ gap: 12, marginTop: 12, fontSize: 12 }}>
          <span className="muted">
            Settings: {JSON.stringify(job.settings)}
          </span>
        </div>
      </div>

      {Array.isArray(job.items_created) && job.items_created.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="mini" style={{ marginBottom: 8 }}>
            {job.items_created.length} carrosseis criados
          </div>
          <table className="t">
            <thead><tr><th>código</th><th>slot</th><th>link</th></tr></thead>
            <tbody>
              {job.items_created.map((it) => (
                <tr key={it.id}>
                  <td><code style={{ fontSize: 11 }}>{it.code}</code></td>
                  <td className="muted">{it.slotIndex + 1}</td>
                  <td><Link href={`/admin/carrosseis/${it.id}`}>abrir editor →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {job.status === 'done' && (
        <div className="row" style={{ marginTop: 16, gap: 8 }}>
          <Link href="/admin/calendario" className="btn primary">Ver calendário</Link>
          <Link href="/admin/carrosseis" className="btn">Render bulk</Link>
        </div>
      )}
    </div>
  );
}
