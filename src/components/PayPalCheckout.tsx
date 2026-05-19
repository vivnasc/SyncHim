'use client';

import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export function PayPalCheckout({
  no,
  email,
  locale
}: { no: string; email: string; locale: 'pt' | 'en' }) {
  const router = useRouter();
  const t = useTranslations('checkout');
  const [error, setError] = useState<string | null>(null);
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  if (!clientId) {
    return <p className="text-bordeaux">PayPal client id missing.</p>;
  }

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
              body: JSON.stringify({ tier: 1, no, email, locale })
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
