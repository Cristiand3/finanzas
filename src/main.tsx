import { render } from 'preact';
import './styles.css';
import { actualizarDolar } from './lib/dolar';
import { App } from './ui/App';
import { capturarInvitacion } from './ui/invite';
import { closeSheet } from './ui/state';

try {
  const t = localStorage.getItem('finanzas.theme');
  if (t && t !== 'auto') document.documentElement.dataset.theme = t;
} catch { /* sin almacenamiento */ }

capturarInvitacion();
actualizarDolar();
setInterval(actualizarDolar, 30 * 60_000);
addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

// Limpia la caché de la versión 1 de la app.
caches?.keys().then(ks => ks.filter(k => /^finanzas-v\d$/.test(k)).forEach(k => caches.delete(k))).catch(() => {});

render(<App />, document.getElementById('app')!);
