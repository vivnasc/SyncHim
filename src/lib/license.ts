/**
 * Licença de uso pessoal, no formato VS-XXXX-XXXX.
 * Derivada do order_id de forma determinística: a mesma compra dá sempre
 * a mesma licença, sem precisar de coluna nova na base de dados.
 */
export function licenseFor(orderId: string): string {
  const block = (seed: number) => {
    let h = seed >>> 0;
    for (let i = 0; i < orderId.length; i++) {
      h = (Math.imul(h, 31) + orderId.charCodeAt(i)) >>> 0;
    }
    return h.toString(36).toUpperCase().padStart(4, '0').slice(-4);
  };
  return `VS-${block(7)}-${block(131)}`;
}
