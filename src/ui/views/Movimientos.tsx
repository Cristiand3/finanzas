import { useState } from 'preact/hooks';
import { lineasDelMes, ym, type Linea } from '../../lib/calc';
import { dayName, fmt } from '../../lib/format';
import { CAT_ICON, cuentasDe, TIPOS_CUENTA } from '../../lib/model';
import { hogar, metas, movs } from '../../lib/store';
import { Seg } from '../common';
import { MovForm } from '../forms/MovForm';
import { filtroPersona, mes, openSheet } from '../state';

type Filtro = 'todos' | 'gasto' | 'ingreso' | 'ahorro' | 'transferencia';

export function Movimientos() {
  const [f, setF] = useState<Filtro>('todos');
  const [q, setQ] = useState('');
  const texto = q.trim().toLowerCase();
  const ls = lineasDelMes(movs.value, mes.value, filtroPersona.value)
    .filter(l => f === 'todos' || l.mov.tipo === f)
    .filter(l => !texto || [l.mov.desc, l.mov.cat, l.mov.notas, l.mov.medio].some(s => s?.toLowerCase().includes(texto)))
    // las cuotas de compras hechas en otro mes se agrupan al principio del mes
    .map(l => ({ ...l, dia: l.cuota && ym(l.mov.fecha) !== mes.value ? `${mes.value}-00` : l.mov.fecha }))
    .sort((a, b) => b.dia.localeCompare(a.dia) || b.mov.id.localeCompare(a.mov.id));

  let last = '';
  return (
    <>
      <div style={{ marginTop: 12 }}>
        <Seg value={f} onChange={setF} options={[['todos', 'Todos'], ['gasto', 'Gastos'], ['ingreso', 'Ingresos'], ['ahorro', 'Ahorro'], ['transferencia', 'Cuentas']]} />
      </div>
      <input class="inp" style={{ marginTop: 8 }} type="search" placeholder="Buscar…" value={q} onInput={e => setQ(e.currentTarget.value)} />
      {!ls.length && <p class="empty" style={{ padding: '40px 0' }}>No hay movimientos{texto ? ' que coincidan' : ' en este mes'}.</p>}
      {ls.map(l => {
        const head = l.dia !== last ? <div class="day">{l.dia.endsWith('-00') ? 'Cuotas de compras anteriores' : dayName(l.dia)}</div> : null;
        last = l.dia;
        return <>{head}<Fila l={l} /></>;
      })}
    </>
  );
}

function Fila({ l }: { l: Linea }) {
  const m = l.mov;
  const cuentas = cuentasDe(hogar.value!);
  const nombreCuenta = (id?: string) => cuentas.find(c => c.id === id)?.nombre;
  const icon = m.tipo === 'gasto' ? CAT_ICON[m.cat] || '📦'
    : m.tipo === 'ingreso' ? '💰' : m.tipo === 'transferencia' ? '🔁' : '🎯';
  const meta = metas.value.find(x => x.id === m.meta)?.nombre;
  const title = m.desc || (
    m.tipo === 'ahorro' ? (m.monto < 0 ? `Retiro de ${meta || 'la meta'}` : meta || 'Ahorro')
      : m.tipo === 'transferencia' ? 'Movimiento entre cuentas' : m.cat);
  const sub = m.tipo === 'transferencia'
    ? `${nombreCuenta(m.cuenta) || '?'} → ${nombreCuenta(m.cuentaDestino) || '?'}`
    : [m.persona, m.tipo === 'gasto' && m.desc ? m.cat : null, m.medio,
      m.tipo !== 'gasto' ? nombreCuenta(m.cuenta) : null].filter(Boolean).join(' · ');
  const cls = m.tipo === 'gasto' ? 'out' : m.tipo === 'ingreso' ? 'in' : m.tipo === 'transferencia' ? '' : 'save';
  const signo = m.tipo === 'transferencia' ? '' : m.tipo === 'gasto' || l.monto < 0 ? '−' : '+';
  return (
    <button class="mov" onClick={() => openSheet(<MovForm mov={m} />)}>
      <div class="dot">{icon}</div>
      <div class="m"><div class="t">{title}</div><div class="s">{sub}</div></div>
      <div class="r">
        <div class={`num ${cls}`}>{signo}{fmt(Math.abs(l.monto), m.moneda)}</div>
        {l.cuota && <span class="pill">Cuota {l.cuota.k}/{l.cuota.n}</span>}
        {m.tipo === 'gasto' && m.cuenta && <span class="s">{TIPOS_CUENTA[cuentas.find(c => c.id === m.cuenta)?.tipo || 'banco'].icono}</span>}
      </div>
    </button>
  );
}
