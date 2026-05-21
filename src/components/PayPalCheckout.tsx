'use client';

import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

type Tipo = 'tier1' | 'extra' | 'biblioteca';

export function PayPalCheckout({
  no,
  email,
  locale,
  tipo = 'tier1'
}: { no: string; email: string; locale: 'pt' | 'en'; tipo?: Tipo }) {
  const router = useRouter();
  const t = useTranslations('checkout');
  const [error, setError] = useState<string | null>(null);
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  if (!clientId) {
    return <p className="text-bordeaux">PayPal client id missing.</p>;
  }

  // Mapeia o tipo de UI para o tier no payload do PayPal:
  //   tier1     → tier=1, no=<dominante>
  //   extra     → tier='upgrade', no=<próximo>
  //   biblioteca → tier=2, no omitido
  const tierPayload = tipo === 'extra' ? 'upgrade' : tipo === 'biblioteca' ? 2 : 1;

  return (
    <div>
      {error && <p className="text-bordeaux mb-3">{error}</p>}
      <PayPalScriptProvider options={{
        clientId,
        currency: 'USD',
        intent: 'capture'
      }}>
        <PayPalButtons
          style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' }}
          createOrder={async () => {
            setError(null);
            const res = await fetch('/api/paypal/create-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tier: tierPayload, no: no || undefined, email, locale })
            });
            if (!res.ok) {
              setError(t('errorGeneric'));
              throw new Error('create_order_failed');
            }
            const data = await res.json() as { id: string };
            return data.id;
          }}
          onApprove={async (data) => {
            const res = await fetch('/api/paypal/capture-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId: data.orderID })
            });
            if (!res.ok) {
              setError(t('errorGeneric'));
              return;
            }
            router.push(`/${locale}/sucesso`);
          }}
          onError={() => setError(t('errorGeneric'))}
        />
      </PayPalScriptProvider>
    </div>
  );
}
