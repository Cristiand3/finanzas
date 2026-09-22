import { signal } from '@preact/signals';
import type { ComponentChildren } from 'preact';
import { todayISO, ym } from '../lib/calc';
import type { Moneda } from '../lib/model';

export type Tab = 'inicio' | 'movs' | 'metas' | 'deudas' | 'ajustes';
const saved = (() => { try { return JSON.parse(sessionStorage.getItem('ui') || '{}'); } catch { return {}; } })();

export const tab = signal<Tab>(saved.tab || 'inicio');
export const mes = signal<string>(saved.mes || ym(todayISO()));
export const filtroPersona = signal<string>(saved.persona || 'Todos');
export const monedaVista = signal<Moneda>(saved.moneda || 'ARS');
export const sheet = signal<ComponentChildren | null>(null);

export const openSheet = (c: ComponentChildren) => (sheet.value = c);
export const closeSheet = () => (sheet.value = null);

export function persistUI() {
  try { sessionStorage.setItem('ui', JSON.stringify({ tab: tab.value, mes: mes.value, persona: filtroPersona.value, moneda: monedaVista.value })); } catch { /* ignore */ }
}
