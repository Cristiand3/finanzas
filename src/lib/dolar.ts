import { signal } from '@preact/signals';
import type { Casa } from './model';

export interface Cotizacion { compra: number; venta: number; fecha: string }
export const CASAS: Record<Casa, string> = { oficial: 'Oficial', blue: 'Blue', bolsa: 'MEP', tarjeta: 'Tarjeta' };

const KEY = 'finanzas.dolar';
const leer = (): Partial<Record<Casa, Cotizacion>> => {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
};
export const cotizaciones = signal(leer());

/** Pesos por dólar (precio de venta) de la casa elegida; 0 si todavía no hay dato. */
export const tcDe = (casa: Casa) => cotizaciones.value[casa]?.venta || 0;

export async function actualizarDolar() {
  try {
    const r = await fetch('https://dolarapi.com/v1/dolares');
    if (!r.ok) return;
    const arr: { casa: string; compra: number; venta: number; fechaActualizacion: string }[] = await r.json();
    const out: Partial<Record<Casa, Cotizacion>> = {};
    for (const x of arr) if (x.casa in CASAS) out[x.casa as Casa] = { compra: x.compra, venta: x.venta, fecha: x.fechaActualizacion };
    cotizaciones.value = out;
    try { localStorage.setItem(KEY, JSON.stringify(out)); } catch { /* sin almacenamiento */ }
  } catch { /* sin conexión: queda la última cotización guardada */ }
}
