import { MONEDAS, type Moneda } from './model';

export const fmt = (n: number, moneda: Moneda = 'ARS') => {
  const simbolo = MONEDAS[moneda]?.simbolo || '$';
  // Los pesos se muestran redondeados; el resto admite centavos.
  const valor = moneda === 'ARS'
    ? Math.round(n || 0).toLocaleString('es-AR')
    : (n || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 });
  return `${simbolo} ${valor}`;
};

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

/** Va poniendo los puntos de miles mientras se escribe: "45300" → "45.300". */
export function formatMiles(raw: string): string {
  const negativo = /^\s*-/.test(raw);
  const limpio = raw.replace(/[^\d,]/g, '');
  const partes = limpio.split(',');
  const entero = partes[0].replace(/^0+(?=\d)/, '');
  const conPuntos = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimales = partes.length > 1 ? ',' + partes.slice(1).join('').slice(0, 2) : '';
  return (negativo ? '-' : '') + conPuntos + decimales;
}

/** Cuenta los caracteres que el cursor "ve" (dígitos y coma), para no moverlo al reformatear. */
export const contarDigitos = (s: string) => (s.match(/[\d,]/g) || []).length;

export function posicionDelCursor(texto: string, digitos: number): number {
  if (digitos <= 0) return /^-/.test(texto) ? 1 : 0;
  let vistos = 0;
  for (let i = 0; i < texto.length; i++) {
    if (/[\d,]/.test(texto[i]) && ++vistos === digitos) return i + 1;
  }
  return texto.length;
}
