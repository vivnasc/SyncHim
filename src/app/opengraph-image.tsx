import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SyncHim — método silencioso de 21 dias';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#1A1410',
          color: '#F2E8DC',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px 96px',
          fontFamily: 'Georgia, serif'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            color: '#D4A857',
            fontSize: '20px',
            letterSpacing: '0.22em',
            textTransform: 'uppercase'
          }}
        >
          <svg width="36" height="36" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
            <g transform="translate(30, 30)">
              <polygon
                points="0,-26 6,-9 23,-13 13,1 25,11 9,11 0,26 -6,9 -23,13 -13,-1 -25,-11 -9,-11"
                fill="#D4A857"
              />
              <circle r="8" fill="#1A1410" />
              <circle r="4" fill="#D4A857" />
            </g>
          </svg>
          <span>SyncHim</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ fontSize: '76px', color: '#F2E8DC', lineHeight: 1.1 }}>
            Não é frieza dele.
          </div>
          <div style={{ fontSize: '76px', color: '#F2E8DC', lineHeight: 1.1 }}>
            É outra coisa.
          </div>
          <div
            style={{
              fontSize: '60px',
              color: '#F2E8DC',
              fontStyle: 'italic',
              opacity: 0.85,
              lineHeight: 1.1
            }}
          >
            E tu já sentes há meses.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: '#A39B8E',
            fontSize: '22px'
          }}
        >
          <span style={{ fontStyle: 'italic' }}>
            Método silencioso de 21 dias. Vivianne dos Santos.
          </span>
          <span style={{ color: '#D4A857' }}>synchim.vercel.app</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
