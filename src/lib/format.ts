import type { Moneda } from './model';

export const fmt = (n: number, moneda: Moneda = 'ARS') =>
  moneda === 'USD'
    ? 'US$ ' + (n || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })
    : '$ ' + Math.round(n || 0).toLocaleString('es-AR');

export const pct = (n: number) => (isFinite(n) ? Math.round(n * 100) + '%' : '—');

/** Lee montos escritos a la argentina: "1.234,50" → 1234.5 */
export const parseAmt = (s: string | number) => {
  let t = String(s ?? '').replace(/[^\d,.-]/g, '');
  t = t.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(t);
  return isFinite(n) ? n : 0;
};

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
export const monthName = (k: string) => {
  const [y, m] = k.split('-').map(Number);
  return cap(new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }));
};
export const monthShort = (k: string) => {
  const [y, m] = k.split('-').map(Number);
  return cap(new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'short' }).replace('.', ''));
};
export const dayName = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return cap(new Date(y, m - 1, d).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' }));
};
