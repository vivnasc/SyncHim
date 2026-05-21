export const metadata = {
  title: 'SyncHim · offline',
  robots: { index: false, follow: false }
};

export default function OfflinePage() {
  return (
    <div style={{
      background: '#1A1410',
      color: '#F2E8DC',
      fontFamily: '"EB Garamond", Georgia, serif',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      textAlign: 'center'
    }}>
      <div style={{ maxWidth: 480 }}>
        <div style={{ color: '#D4A857', fontSize: 32, marginBottom: 32 }}>✦</div>
        <h1 style={{ fontFamily: '"EB Garamond", serif', fontWeight: 500, fontSize: 32, margin: '0 0 16px' }}>
          Estás sem ligação.
        </h1>
        <p style={{ color: '#A39B8E', fontStyle: 'italic', margin: '0 0 32px', lineHeight: 1.6 }}>
          Algumas páginas que já visitaste continuam disponíveis.<br />
          O diagnóstico precisa de rede para guardar respostas.
        </p>
        <a
          href="/"
          style={{
            display: 'inline-block',
            padding: '14px 28px',
            background: '#B8843D',
            color: '#1A1410',
            textDecoration: 'none',
            fontFamily: '"EB Garamond", serif',
            fontSize: 16,
            letterSpacing: '0.04em'
          }}
        >
          tentar de novo →
        </a>
      </div>
    </div>
  );
}
