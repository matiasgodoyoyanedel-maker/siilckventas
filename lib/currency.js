// Tasas fijas hasta conectar una API. 1 USD = 950 CLP.
export const TASA_USD_CLP = 950;
export const CLP_POR_UNIDAD = {
  CLP: 1,
  USD: 950,
  EUR: 1030,
  BRL: 175
};

export function convertPrice(precioCLP, currency) {
  const cur = String(currency || 'CLP').toUpperCase();
  const porUnidad = CLP_POR_UNIDAD[cur] || 1;
  const base = Number(precioCLP) || 0;
  if (cur === 'CLP') return Math.round(base);
  return Math.round((base / porUnidad) * 100) / 100;
}

function miles(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatPrice(precioCLP, currency) {
  const cur = String(currency || 'CLP').toUpperCase();
  const value = convertPrice(precioCLP, cur);
  if (cur === 'USD') return '$' + value.toFixed(2) + ' USD';
  if (cur === 'EUR') return '€' + value.toFixed(2);
  if (cur === 'BRL') return 'R$' + value.toFixed(2);
  return '$' + miles(value);
}
