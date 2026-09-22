import { useRef, useState } from 'preact/hooks';
import { buscando, buscarActualizacion } from '../../lib/actualizar';
import { lineasDelMes, todayISO } from '../../lib/calc';

import {
  cerrarSesion, eliminarCuenta, hogar, importar, linkInvitacion, metas, miPersona, movs, nuevoEnlace,
  pmovs, prestamos, salirDelHogar, setPersona, toast, user,
} from '../../lib/store';
import { Seg } from '../common';
import { ListEditor } from '../forms/Otros';
import { mes, openSheet } from '../state';

const BASE = import.meta.env.BASE_URL;
type Tema = 'auto' | 'light' | 'dark';

export function setTema(t: Tema) {
  if (t === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
  try { localStorage.setItem('finanzas.theme', t); } catch { /* ignore */ }
}

export function Ajustes() {
  const h = hogar.value!;
  const u = user.value!;
  const [tema, setTemaState] = useState<Tema>((document.documentElement.dataset.theme as Tema) || 'auto');
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const invitar = async () => {
    const url = linkInvitacion(h);
    const text = 'Sumate a nuestras finanzas en la app Finanzas:';
    try { if (navigator.share) { await navigator.share({ title: 'Finanzas', text, url }); return; } } catch { return; }
    try { await navigator.clipboard.writeText(url); toast('Enlace copiado'); } catch { prompt('Copiá este enlace:', url); }
  };

  const onImport = async (e: Event) => {
    const f = (e.currentTarget as HTMLInputElement).files?.[0];
    (e.currentTarget as HTMLInputElement).value = '';
    if (!f) return;
    try {
      const obj = JSON.parse(await f.text());
      if (!confirm('Se van a agregar los datos del archivo a este hogar. ¿Continuar?')) return;
      setBusy(true);
      const n = await importar(obj);
      toast(`Listo: ${n} registros importados`);
    } catch (err) { console.error(err); toast('No se pudo leer el archivo'); } finally { setBusy(false); }
  };

  const exportJSON = () => download(`finanzas-respaldo-${todayISO()}.json`,
    JSON.stringify({ version: 2, personas: h.personas, metas: metas.value, prestamos: prestamos.value, pmovs: pmovs.value, movs: movs.value }, null, 1), 'application/json');

  const exportCSV = () => {
    const q = (v: unknown) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const rows = [['Fecha', 'Tipo', 'Persona', 'Descripción', 'Categoría / Meta', 'Moneda', 'Monto del mes', 'Monto total', 'Cuota', 'Medio de pago', 'Notas']];
    for (const l of lineasDelMes(movs.value, mes.value).sort((a, b) => a.mov.fecha.localeCompare(b.mov.fecha))) {
      const m = l.mov;
      rows.push([m.fecha, m.tipo, m.persona, m.desc, m.tipo === 'ahorro' ? metas.value.find(x => x.id === m.meta)?.nombre || '' : m.cat,
        m.moneda, String(l.monto).replace('.', ','), String(m.monto).replace('.', ','), l.cuota ? `${l.cuota.k}/${l.cuota.n}` : '', m.medio || '', m.notas || '']);
    }
    download(`finanzas-${mes.value}.csv`, String.fromCharCode(0xfeff) + rows.map(r => r.map(q).join(';')).join('\r\n'), 'text/csv');
  };

  const salir = async () => {
    const ultimo = h.miembros.length <= 1;
    if (!confirm(ultimo ? 'Sos la única persona en este hogar: al salir se BORRAN todos sus datos. Descargá un respaldo antes. ¿Continuar?' : 'Vas a dejar de ver los datos de este hogar. ¿Continuar?')) return;
    setBusy(true);
    try { await salirDelHogar(); } catch (e) { console.error(e); toast('No se pudo salir. Revisá tu conexión.'); setBusy(false); }
  };

  const borrarCuenta = async () => {
    if (!confirm('Se elimina tu cuenta' + (h.miembros.length <= 1 ? ' y TODOS los datos del hogar' : '') + '. No se puede deshacer. ¿Continuar?')) return;
    setBusy(true);
    try { await eliminarCuenta(); toast('Cuenta eliminada'); } catch (e: any) {
      setBusy(false);
      if (e?.code === 'auth/requires-recent-login') {
        alert('Por seguridad, cerrá sesión, volvé a entrar y repetí este paso en los próximos minutos.');
      } else { console.error(e); toast('No se pudo eliminar. Revisá tu conexión.'); }
    }
  };

  return (
    <>
      <div class="card"><h2>Tu cuenta</h2>
        <div class="row"><div><div class="t">{u.displayName || 'Sin nombre'}</div><div class="s">{u.email}</div></div>
          <button class="btn ghost sm" onClick={() => cerrarSesion()}>Cerrar sesión</button></div>
        <div class="row"><span>En este hogar sos</span>
          <select class="inp" style={{ width: 'auto' }} value={miPersona.value} onChange={e => setPersona(e.currentTarget.value)}>
            {h.personas.map(p => <option>{p}</option>)}
          </select></div>
      </div>

      <div class="card"><h2>Hogar compartido</h2>
        <div class="row"><span>Personas con acceso</span><span class="num">{h.miembros.length}</span></div>
        <button class="btn" onClick={invitar}>Invitar a mi pareja</button>
        <p class="hint">El enlace da acceso a todos los datos del hogar: mandalo solo a quien quieras sumar. Si lo compartiste por error, generá uno nuevo y el anterior deja de funcionar.</p>
        <div class="btns">
          <button class="btn ghost" onClick={() => { if (confirm('El enlace anterior deja de funcionar. ¿Generar uno nuevo?')) { nuevoEnlace(); toast('Enlace nuevo generado'); } }}>Nuevo enlace</button>
          <button class="btn danger" disabled={busy} onClick={salir}>Salir del hogar</button>
        </div>
      </div>

      <div class="card"><h2>Listas</h2>
        {([['personas', 'Personas'], ['categorias', 'Categorías'], ['medios', 'Medios de pago'], ['fuentesIngreso', 'Tipos de ingreso']] as const).map(([k, l]) => (
          <div class="row tap" onClick={() => openSheet(<ListEditor k={k} />)}>
            <div><div class="t">{l}</div><div class="s">{h[k].slice(0, 4).join(', ')}{h[k].length > 4 ? '…' : ''}</div></div><span>›</span>
          </div>
        ))}
      </div>

      <div class="card"><h2>Apariencia</h2>
        <Seg<Tema> value={tema} onChange={t => { setTema(t); setTemaState(t); }} options={[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']]} />
      </div>

      <div class="card"><h2>Tus datos</h2>
        <p class="hint" style={{ marginTop: 0 }}>Todo se guarda en la nube y en este celular. Igual podés descargar una copia cuando quieras.</p>
        <button class="btn" onClick={exportCSV}>Exportar el mes a Excel (.csv)</button>
        <div class="btns">
          <button class="btn ghost" onClick={exportJSON}>Descargar respaldo</button>
          <button class="btn ghost" disabled={busy} onClick={() => file.current?.click()}>Importar respaldo</button>
        </div>
        <input ref={file} type="file" accept="application/json,.json" class="hidden" onChange={onImport} />
      </div>

      <div class="card"><h2>Legal</h2>
        <a class="row" style={{ color: 'inherit', textDecoration: 'none' }} href={`${BASE}privacidad.html`} target="_blank"><span>Política de privacidad</span><span>↗</span></a>
        <a class="row" style={{ color: 'inherit', textDecoration: 'none' }} href={`${BASE}terminos.html`} target="_blank"><span>Términos y condiciones</span><span>↗</span></a>
        <button class="btn danger" style={{ marginTop: 10 }} disabled={busy} onClick={borrarCuenta}>Eliminar mi cuenta</button>
      </div>
      <p class="hint" style={{ textAlign: 'center', marginBottom: 4 }}>Finanzas v{__APP_VERSION__} · {movs.value.length} movimientos</p>
      <div style={{ textAlign: 'center' }}>
        <button class="link" disabled={buscando.value} onClick={async () => {
          const hay = await buscarActualizacion();
          toast(hay ? 'Actualizando…' : 'Ya tenés la última versión');
        }}>{buscando.value ? 'Buscando…' : 'Buscar actualización'}</button>
      </div>
    </>
  );
}

function download(name: string, text: string, type: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

