import { useEffect } from 'preact/hooks';
import { monedasUsadas, shiftMonth } from '../lib/calc';
import { monthName } from '../lib/format';
import { MONEDAS } from '../lib/model';
import { hogar, movs, online, perfil, toastMsg, unirse, user, toast } from '../lib/store';
import { ICONS } from './common';
import { MovForm } from './forms/MovForm';
import { MetaForm, PrestamoForm, QuienSos } from './forms/Otros';
import { clearInvite, getInvite } from './invite';
import { Login } from './Login';
import { Onboarding } from './Onboarding';
import { closeSheet, filtroPersona, mes, monedaVista, openSheet, persistUI, sheet, tab, type Tab } from './state';
import { Ajustes } from './views/Ajustes';
import { Deudas } from './views/Deudas';
import { Inicio } from './views/Inicio';
import { Metas } from './views/Metas';
import { Movimientos } from './views/Movimientos';

const TABS: [Tab, string][] = [['inicio', 'Inicio'], ['movs', 'Movimientos'], ['metas', 'Metas'], ['deudas', 'Deudas'], ['ajustes', 'Cuenta']];
const TITLES: Partial<Record<Tab, string>> = { metas: 'Metas de ahorro', deudas: 'Cuotas y deudas', ajustes: 'Cuenta y ajustes' };

export function App() {
  if (user.value === undefined) return <div class="spinner" />;
  if (!user.value) return <Login invitado={!!getInvite()} />;
  if (perfil.value === undefined || (perfil.value?.hogarId && hogar.value === undefined)) return <div class="spinner" />;
  if (!hogar.value) return <Onboarding />;
  return <Main />;
}

function Main() {
  const h = hogar.value!;
  const t = tab.value;
  useEffect(persistUI, [t, mes.value, filtroPersona.value]);
  // quien se acaba de unir elige cuál de las personas es
  useEffect(() => { if (!perfil.value?.persona && h.personas.length > 1) openSheet(<QuienSos />); }, [h.id]);
  useEffect(() => { if (filtroPersona.value !== 'Todos' && !h.personas.includes(filtroPersona.value)) filtroPersona.value = 'Todos'; }, [h.personas.join()]);

  const monedas = monedasUsadas(movs.value);
  const inv = getInvite();
  const monthly = t === 'inicio' || t === 'movs';
  const fab = () => (t === 'metas' ? openSheet(<MetaForm />) : t === 'deudas' ? openSheet(<PrestamoForm />) : openSheet(<MovForm />));

  return (
    <div class="app">
      <header class="top"><div class="wrap">
        {monthly ? (
          <div class="monthbar">
            <button class="iconbtn" aria-label="Mes anterior" onClick={() => (mes.value = shiftMonth(mes.value, -1))}>‹</button>
            <h1>{monthName(mes.value)}</h1>
            <button class="iconbtn" aria-label="Mes siguiente" onClick={() => (mes.value = shiftMonth(mes.value, 1))}>›</button>
          </div>
        ) : <h1 class="pagetitle">{TITLES[t]}</h1>}
        {monthly && h.personas.length > 1 && (
          <div class="chips">
            {['Todos', ...h.personas].map(p => (
              <button class={`chip ${p === filtroPersona.value ? 'on' : ''}`} onClick={() => (filtroPersona.value = p)}>{p}</button>
            ))}
          </div>
        )}
        {/* El selector de moneda aparece solo si hay movimientos en más de una. */}
        {monedas.length > 1 && (t === 'inicio' || t === 'deudas') && (
          <div class="chips">
            {monedas.map(c => (
              <button class={`chip ${c === monedaVista.value ? 'on' : ''}`} onClick={() => (monedaVista.value = c)}>{MONEDAS[c].simbolo} {MONEDAS[c].nombre}</button>
            ))}
          </div>
        )}
        {!online.value && <div class="offline">Sin conexión · los cambios se sincronizan al volver</div>}
      </div></header>

      <main class="wrap">
        {inv && inv.hid !== h.id && (
          <div class="card note">
            <b>Te invitaron a otro hogar.</b> Para unirte tenés que dejar el actual.
            <div class="btns">
              <button class="btn sm" onClick={async () => {
                if (!confirm('Vas a dejar de ver este hogar y pasar al nuevo. ¿Continuar?')) return;
                try { await unirse(inv); clearInvite(); toast('Te uniste al hogar ✓'); } catch { toast('La invitación no es válida'); }
              }}>Unirme</button>
              <button class="btn ghost sm" onClick={clearInvite}>Ignorar</button>
            </div>
          </div>
        )}
        {t === 'inicio' && <Inicio />}
        {t === 'movs' && <Movimientos />}
        {t === 'metas' && <Metas />}
        {t === 'deudas' && <Deudas />}
        {t === 'ajustes' && <Ajustes />}
      </main>

      {t !== 'ajustes' && <button class="fab" aria-label="Agregar" onClick={fab}>+</button>}

      <nav class="tabs"><div class="in2">
        {TABS.map(([k, l]) => (
          <button class={k === t ? 'on' : ''} onClick={() => { tab.value = k; scrollTo(0, 0); }}>{ICONS[k]}{l}</button>
        ))}
      </div></nav>

      {sheet.value && (
        <>
          <div class="scrim" onClick={closeSheet} />
          <div class="sheet" role="dialog" aria-modal="true"><div class="grab" /><div class="wrap">{sheet.value}</div></div>
        </>
      )}
      {toastMsg.value && <div class="toast" role="status">{toastMsg.value}</div>}
    </div>
  );
}
