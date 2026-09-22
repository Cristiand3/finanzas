import { render } from 'preact';
import './styles.css';
import * as store from './lib/store';
import * as uiState from './ui/state';
import { App } from './ui/App';
import { iniciarActualizaciones } from './lib/actualizar';
import { capturarInvitacion } from './ui/invite';
import { closeSheet } from './ui/state';

try {
  const t = localStorage.getItem('finanzas.theme');
  if (t && t !== 'auto') document.documentElement.dataset.theme = t;
} catch { /* sin almacenamiento */ }

capturarInvitacion();
iniciarActualizaciones();
addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

// Limpia la caché de la versión 1 de la app.
caches?.keys().then(ks => ks.filter(k => /^finanzas-v\d$/.test(k)).forEach(k => caches.delete(k))).catch(() => {});

// Solo en desarrollo: permite inspeccionar y simular estado desde la consola del navegador.
if (import.meta.env.DEV) Object.assign(window, { store, uiState });

render(<App />, document.getElementById('app')!);
