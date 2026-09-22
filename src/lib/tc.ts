// Cotización del dólar: la escribe la persona, no se consulta a ningún servicio externo.
const KEY = 'finanzas.tc';

/** Último valor usado en este celular, para no tener que escribirlo cada vez. */
export function ultimoTC(): string {
  try { return localStorage.getItem(KEY) || ''; } catch { return ''; }
}
export function recordarTC(v: number) {
  try { if (v > 0) localStorage.setItem(KEY, String(v)); } catch { /* sin almacenamiento */ }
}
