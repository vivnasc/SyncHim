/**
 * Vendas abertas? Seguro por defeito: FECHADO, a não ser que esteja
 * explicitamente `NEXT_PUBLIC_SALES_OPEN=true` no ambiente.
 *
 * Enquanto fechado, o checkout não mostra PayPal — mostra a lista de
 * espera. Para abrir vendas: pôr NEXT_PUBLIC_SALES_OPEN=true no Vercel
 * e fazer redeploy.
 */
export const SALES_OPEN = process.env.NEXT_PUBLIC_SALES_OPEN === 'true';
