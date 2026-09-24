import { signal } from '@preact/signals';
import { registerSW } from 'virtual:pwa-register';

// Una app instalada se queda con la versión que descargó. Acá se busca una nueva
// cada vez que la persona vuelve a la app, cada 15 minutos y al recuperar internet.
export const buscando = signal(false);
let actualizar: ((recargar?: boolean) => Promise<void>) | null = null;
let registro: ServiceWorkerRegistration | undefined;

const revisar = () => registro?.update().catch(() => {});

export function iniciarActualizaciones() {
  if (!('serviceWorker' in navigator)) return;
  actualizar = registerSW({
    immediate: true,
    onRegisteredSW(_url, r) {
      registro = r;
      if (!r) return;
      setInterval(revisar, 15 * 60_000);
      addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') revisar(); });
      addEventListener('focus', revisar);
      addEventListener('pageshow', revisar); // al volver de otra app, con la página guardada
      addEventListener('online', revisar);
    },
    onNeedRefresh() { actualizar?.(true); },
  });
}

/** Busca una versión nueva y la aplica al toque (botón en Cuenta). */
export async function buscarActualizacion(): Promise<boolean> {
  buscando.value = true;
  try {
    if (!registro) { location.reload(); return true; }
    await registro.update();
    const nuevo = registro.installing || registro.waiting;
    if (!nuevo) return false;
    // Esperamos a que termine de instalarse y recargamos con la versión nueva.
    await new Promise<void>(listo => {
      const fin = () => { if (nuevo.state === 'activated' || nuevo.state === 'redundant') { nuevo.removeEventListener('statechange', fin); listo(); } };
      nuevo.addEventListener('statechange', fin);
      setTimeout(listo, 8000);
    });
    registro.waiting?.postMessage({ type: 'SKIP_WAITING' });
    setTimeout(() => location.reload(), 300);
    return true;
  } catch {
    return false;
  } finally {
    buscando.value = false;
  }
}
