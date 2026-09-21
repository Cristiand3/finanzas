import { signal } from '@preact/signals';
import { parseInvitacion } from '../lib/store';

// La invitación llega en la URL (#unirse=hogar.codigo) y se guarda hasta que la persona inicia sesión.
const KEY = 'finanzas.invite';
const leer = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
const invite = signal<{ hid: string; code: string } | null>(leer());

export function capturarInvitacion() {
  const i = parseInvitacion(location.hash);
  if (!i) return;
  invite.value = i;
  try { localStorage.setItem(KEY, JSON.stringify(i)); } catch { /* sin almacenamiento */ }
  history.replaceState(null, '', location.pathname);
}
export const getInvite = () => invite.value;
export function clearInvite() {
  invite.value = null;
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
