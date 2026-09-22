import { signal } from '@preact/signals';
import { registerSW } from 'virtual:pwa-register';

// Una app instalada se queda con la versión que descargó: acá se busca una nueva
// al abrirla, al volver a ella y una vez por hora, y se aplica sola.
export const buscando = signal(false);
let actualizar: ((recargar?: boolean) => Promise<void>) | null = null;
let registro: ServiceWorkerRegistration | undefined;

export function iniciarActualizaciones() {
  if (!('serviceWorker' in navigator)) return;
  actualizar = registerSW({
    immediate: true,
    onRegisteredSW(_url, r) {
      registro = r;
      if (!r) return;
      setInterval(() => r.update().catch(() => {}), 60 * 60_000);
      addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') r.update().catch(() => {});
      });
    },
    onNeedRefresh() { actualizar?.(true); },
  });
}

/** Busca una versión nueva a pedido (botón en Ajustes). Devuelve true si encontró una. */
export async function buscarActualizacion(): Promise<boolean> {
  if (!registro) return false;
  buscando.value = true;
  try {
    await registro.update();
    return !!(registro.installing || registro.waiting);
  } catch {
    return false;
  } finally {
    buscando.value = false;
  }
}
