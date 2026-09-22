import { useState } from 'preact/hooks';
import { prestamoCalc, todayISO } from '../../lib/calc';
import { fmt, parseAmt } from '../../lib/format';
import { MONEDAS, MONEDA_IDS, type Hogar, type Meta, type Moneda, type Pmov, type Prestamo, type TipoPmov } from '../../lib/model';
import { actualizarHogar, borrar, guardar, hogar, miPersona, movs, newId, pmovs, prestamos, setPersona, toast } from '../../lib/store';
import { Field, Seg, SheetFooter } from '../common';
import { closeSheet, mes, openSheet } from '../state';
import { MovForm } from './MovForm';

// ---------- metas ----------
export function MetaForm({ meta }: { meta?: Meta }) {
  const [nombre, setNombre] = useState(meta?.nombre || '');
  // Una meta puede tener objetivo en varias monedas a la vez (ej: juntar $ y US$ para el mismo viaje).
  const [objs, setObjs] = useState<Partial<Record<Moneda, string>>>(() => {
    const o = meta?.objetivos || {};
    const out: Partial<Record<Moneda, string>> = {};
    for (const c of MONEDA_IDS) if (o[c]) out[c] = String(o[c]);
    return Object.keys(out).length ? out : { ARS: '' };
  });
  const usadas = MONEDA_IDS.filter(c => objs[c] !== undefined);
  const libres = MONEDA_IDS.filter(c => objs[c] === undefined);
  const setObj = (c: Moneda, v: string) => setObjs(o => ({ ...o, [c]: v }));
  const quitar = (c: Moneda) => setObjs(o => { const n = { ...o }; delete n[c]; return n; });
  const tieneAportes = !!meta && movs.value.some(m => m.meta === meta.id);

  const save = (e: Event) => {
    e.preventDefault();
    if (!nombre.trim()) return toast('Poné un nombre');
    const objetivos: Partial<Record<Moneda, number>> = {};
    for (const c of usadas) { const v = parseAmt(objs[c] || ''); if (v > 0) objetivos[c] = v; }
    guardar('metas', { id: meta?.id || newId(), nombre: nombre.trim(), objetivos, orden: meta?.orden ?? Date.now() });
    closeSheet();
  };
  return (
    <form onSubmit={save}>
      <h3>{meta ? 'Editar meta' : 'Nueva meta'}</h3>
      <Field label="Nombre"><input class="inp" value={nombre} onInput={e => setNombre(e.currentTarget.value)} placeholder="Ej: Vacaciones en Brasil" /></Field>
      <div class="f-label">Objetivo (opcional)</div>
      {usadas.map(c => (
        <div class="row" style={{ borderBottom: 0, paddingTop: 4 }}>
          <span class="pill" style={{ minWidth: 58, textAlign: 'center' }}>{MONEDAS[c].simbolo}</span>
          <input class="inp" inputmode="decimal" style={{ flex: 1 }} value={objs[c]} placeholder={`Cuánto querés juntar en ${MONEDAS[c].nombre.toLowerCase()}`} onInput={e => setObj(c, e.currentTarget.value)} />
          {usadas.length > 1 && <button type="button" class="iconbtn" aria-label="Quitar" onClick={() => quitar(c)}>✕</button>}
        </div>
      ))}
      {libres.length > 0 && (
        <div class="btns" style={{ flexWrap: 'wrap' }}>
          {libres.map(c => <button type="button" class="btn ghost sm" onClick={() => setObj(c, '')}>+ {MONEDAS[c].nombre}</button>)}
        </div>
      )}
      <p class="hint">Podés juntar en más de una moneda para la misma meta: cada una lleva su propio avance.</p>
      <button class="btn">Guardar</button>
      {meta && (
        <div class="btns">
          <button type="button" class="btn ghost" onClick={() => openSheet(<MovForm preset={{ tipo: 'ahorro', meta: meta.id, cat: '' }} />)}>+ Aportar</button>
          <button type="button" class="btn danger" onClick={() => {
            if (!confirm(tieneAportes ? 'Esta meta tiene aportes: se eliminan también. ¿Seguro?' : '¿Eliminar la meta?')) return;
            movs.value.filter(m => m.meta === meta.id).forEach(m => borrar('movs', m.id));
            borrar('metas', meta.id); closeSheet();
          }}>Eliminar</button>
        </div>
      )}
      <SheetFooter />
    </form>
  );
}

// ---------- préstamos ----------
export function PrestamoForm({ p }: { p?: Prestamo }) {
  const h = hogar.value!;
  const [f, setF] = useState({
    nombre: p?.nombre || '', persona: p?.persona || 'Ambos', original: p?.original ? String(p.original) : '',
    moneda: (p?.moneda || 'ARS') as Moneda, cuotasTotales: p?.cuotasTotales ? String(p.cuotasTotales) : '',
    cuota: p?.cuota ? String(p.cuota) : '', fin: p?.fin || '',
  });
  const set = (x: Partial<typeof f>) => setF(v => ({ ...v, ...x }));
  const save = (e: Event) => {
    e.preventDefault();
    if (!f.nombre.trim()) return toast('Poné un nombre');
    const out: Prestamo = {
      id: p?.id || newId(), nombre: f.nombre.trim(), persona: f.persona, original: parseAmt(f.original), moneda: f.moneda,
      cuotasTotales: parseInt(f.cuotasTotales) || 0, cuota: parseAmt(f.cuota), fin: f.fin || undefined,
    };
    guardar('prestamos', out);
    p ? openSheet(<PrestamoDetalle id={out.id} />) : closeSheet();
  };
  return (
    <form onSubmit={save}>
      <h3>{p ? 'Editar deuda' : 'Nuevo préstamo o deuda'}</h3>
      <Field label="Nombre"><input class="inp" value={f.nombre} onInput={e => set({ nombre: e.currentTarget.value })} placeholder="Ej: Préstamo del banco, tío, Mercado Pago" /></Field>
      <div class="grid2">
        <Field label="De quién">
          <select class="inp" value={f.persona} onChange={e => set({ persona: e.currentTarget.value })}>
            {['Ambos', ...h.personas].map(x => <option>{x}</option>)}
          </select>
        </Field>
        <Field label="Moneda">
          <select class="inp" value={f.moneda} onChange={e => set({ moneda: e.currentTarget.value as Moneda })}>
            {MONEDA_IDS.map(c => <option value={c}>{MONEDAS[c].simbolo} {MONEDAS[c].nombre}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Monto total a devolver"><input class="inp" inputmode="decimal" value={f.original} onInput={e => set({ original: e.currentTarget.value })} /></Field>
      <div class="grid2">
        <Field label="Cantidad de cuotas"><input class="inp" inputmode="numeric" value={f.cuotasTotales} onInput={e => set({ cuotasTotales: e.currentTarget.value })} placeholder="Vacío = variable" /></Field>
        <Field label="Valor de la cuota"><input class="inp" inputmode="decimal" value={f.cuota} onInput={e => set({ cuota: e.currentTarget.value })} /></Field>
      </div>
      <Field label="Terminar de pagar en (mes)"><input type="month" class="inp" value={f.fin} onInput={e => set({ fin: e.currentTarget.value })} /></Field>
      <p class="hint">Si pagás montos variables, dejá las cuotas vacías y poné la fecha objetivo: te calculamos cuánto pagar por mes.</p>
      <button class="btn">Guardar</button>
      {p && (
        <div class="btns"><button type="button" class="btn danger" onClick={() => {
          if (!confirm('¿Eliminar la deuda y todos sus pagos?')) return;
          pmovs.value.filter(x => x.prestamoId === p.id).forEach(x => borrar('pmovs', x.id));
          borrar('prestamos', p.id); closeSheet();
        }}>Eliminar deuda</button></div>
      )}
      <SheetFooter />
    </form>
  );
}

export function PrestamoDetalle({ id }: { id: string }) {
  const p = prestamos.value.find(x => x.id === id);
  if (!p) return <SheetFooter><p class="empty">La deuda ya no existe.</p></SheetFooter>;
  const c = prestamoCalc(p, pmovs.value, mes.value);
  const mv = [...c.mv].sort((a, b) => b.fecha.localeCompare(a.fecha));
  return (
    <div>
      <h3>{p.nombre}</h3>
      <div class="hero">
        <div class="stat"><div class="l">Saldo</div><div class="v out">{fmt(c.saldo, p.moneda)}</div></div>
        <div class="stat"><div class="l">{p.cuotasTotales ? `Cuotas restantes` : 'Sugerido por mes'}</div><div class="v">{p.cuotasTotales ? c.restantes : c.sugerido != null ? fmt(c.sugerido, p.moneda) : '—'}</div></div>
      </div>
      <div class="btns">
        <button class="btn" onClick={() => openSheet(<PmovForm prestamoId={p.id} />)}>+ Registrar pago</button>
        <button class="btn ghost sm" onClick={() => openSheet(<PrestamoForm p={p} />)}>Editar</button>
      </div>
      <div class="card" style={{ boxShadow: 'none' }}>
        <h2>Movimientos</h2>
        {mv.length ? mv.map(x => (
          <div class="row tap" onClick={() => openSheet(<PmovForm prestamoId={p.id} x={x} />)}>
            <div><div class="t">{x.tipo}{x.cuotas ? ` · ${x.cuotas} cuota${x.cuotas > 1 ? 's' : ''}` : ''}</div><div class="s">{x.fecha}{x.nota ? ' · ' + x.nota : ''}</div></div>
            <div class={`num ${x.tipo === 'Interés' || (x.tipo === 'Ajuste' && x.monto > 0) ? 'out' : 'in'}`}>{fmt(x.monto, p.moneda)}</div>
          </div>
        )) : <p class="empty">Todavía no hay pagos.</p>}
      </div>
      <div class="btns"><button class="btn ghost" onClick={closeSheet}>Cerrar</button></div>
    </div>
  );
}

const TIPOS: TipoPmov[] = ['Pago', 'Interés', 'Ajuste', 'Pago previo'];
export function PmovForm({ prestamoId, x }: { prestamoId: string; x?: Pmov }) {
  const h = hogar.value!;
  const p = prestamos.value.find(q => q.id === prestamoId)!;
  const c = prestamoCalc(p, pmovs.value, mes.value);
  const [tipo, setTipo] = useState<TipoPmov>(x?.tipo || 'Pago');
  const [monto, setMonto] = useState(String(x?.monto ?? (p.cuotasTotales ? p.cuota : Math.round(c.sugerido || 0)) ?? ''));
  const [fecha, setFecha] = useState(x?.fecha || todayISO());
  const [cuotas, setCuotas] = useState(String(x ? x.cuotas || '' : p.cuotasTotales ? 1 : ''));
  const [nota, setNota] = useState(x?.nota || '');
  const [comoGasto, setComoGasto] = useState(true);
  const [persona, setPersonaSel] = useState(p.persona !== 'Ambos' && h.personas.includes(p.persona) ? p.persona : miPersona.value);

  const save = (e: Event) => {
    e.preventDefault();
    const n = parseAmt(monto);
    if (!n) return toast('Ingresá un monto');
    const out: Pmov = { id: x?.id || newId(), prestamoId, fecha, tipo, monto: n, cuotas: parseInt(cuotas) || 0, nota: nota.trim() };
    guardar('pmovs', out);
    if (!x && tipo === 'Pago' && comoGasto) {
      guardar('movs', {
        id: newId(), tipo: 'gasto', fecha, persona, desc: `Pago ${p.nombre}`,
        cat: h.categorias.includes('Deudas/Cuotas') ? 'Deudas/Cuotas' : h.categorias[0],
        monto: n, moneda: p.moneda, medio: 'Transferencia', notas: nota.trim() || undefined,
      });
    }
    openSheet(<PrestamoDetalle id={prestamoId} />);
    toast('Guardado ✓');
  };
  return (
    <form onSubmit={save}>
      <h3>{x ? 'Editar' : 'Registrar'} · {p.nombre}</h3>
      <Seg value={tipo} onChange={v => { setTipo(v); }} options={TIPOS.map(t => [t, t])} />
      <Field label={`Monto (${MONEDAS[p.moneda].simbolo})`}><input class="inp amount" inputmode="decimal" value={monto} onInput={e => setMonto(e.currentTarget.value)} /></Field>
      <div class="grid2">
        <Field label="Fecha"><input type="date" class="inp" value={fecha} onInput={e => setFecha(e.currentTarget.value)} /></Field>
        <Field label="Cuotas que cubre"><input class="inp" inputmode="numeric" value={cuotas} onInput={e => setCuotas(e.currentTarget.value)} /></Field>
      </div>
      <Field label="Nota"><input class="inp" value={nota} onInput={e => setNota(e.currentTarget.value)} /></Field>
      {!x && tipo === 'Pago' && (
        <label class="check">
          <input type="checkbox" checked={comoGasto} onChange={e => setComoGasto(e.currentTarget.checked)} />
          <span>Contarlo también como gasto de&nbsp;
            <select class="inp" style={{ width: 'auto', minHeight: 0, padding: '4px 8px', display: 'inline' }} value={persona} onChange={e => setPersonaSel(e.currentTarget.value)}>
              {h.personas.map(q => <option>{q}</option>)}
            </select>
          </span>
        </label>
      )}
      <p class="hint">Pago: baja el saldo. Interés: lo sube. Ajuste: + suma / − resta. Pago previo: lo que ya habías pagado antes de usar la app (no cuenta como pago del mes).</p>
      <button class="btn">Guardar</button>
      {x && <div class="btns"><button type="button" class="btn danger" onClick={() => { if (confirm('¿Eliminar este movimiento?')) { borrar('pmovs', x.id); openSheet(<PrestamoDetalle id={prestamoId} />); } }}>Eliminar</button></div>}
      <div class="btns"><button type="button" class="btn ghost" onClick={() => openSheet(<PrestamoDetalle id={prestamoId} />)}>Volver</button></div>
    </form>
  );
}

// ---------- listas del hogar ----------
type ListKey = 'categorias' | 'medios' | 'fuentesIngreso' | 'personas';
const LIST_NAMES: Record<ListKey, string> = { categorias: 'Categorías', medios: 'Medios de pago', fuentesIngreso: 'Tipos de ingreso', personas: 'Personas' };
const FIELD: Record<ListKey, 'cat' | 'medio' | 'persona'> = { categorias: 'cat', medios: 'medio', fuentesIngreso: 'cat', personas: 'persona' };

export function ListEditor({ k }: { k: ListKey }) {
  const h = hogar.value!;
  const [items, setItems] = useState(h[k].map(v => ({ old: v, v })));
  const save = () => {
    const vals = [...new Set(items.map(i => i.v.trim()).filter(Boolean))];
    if (!vals.length) return toast('La lista no puede quedar vacía');
    // renombrar en los movimientos que usan el valor anterior
    for (const i of items) {
      const nv = i.v.trim();
      if (!i.old || !nv || nv === i.old) continue;
      const f = FIELD[k];
      movs.value.filter(m => m[f] === i.old && (k !== 'fuentesIngreso' || m.tipo === 'ingreso') && (k !== 'categorias' || m.tipo === 'gasto'))
        .forEach(m => guardar('movs', { ...m, [f]: nv }));
      if (k === 'personas') {
        prestamos.value.filter(p => p.persona === i.old).forEach(p => guardar('prestamos', { ...p, persona: nv }));
        if (miPersona.value === i.old) setPersona(nv);
      }
    }
    actualizarHogar({ [k]: vals } as Partial<Hogar>);
    closeSheet(); toast('Guardado');
  };
  return (
    <div>
      <h3>{LIST_NAMES[k]}</h3>
      {items.map((it, i) => (
        <div class="row">
          <input class="inp" value={it.v} onInput={e => { const v = e.currentTarget.value; setItems(a => a.map((x, j) => (j === i ? { ...x, v } : x))); }} />
          <button type="button" class="iconbtn" aria-label="Quitar" onClick={() => setItems(a => a.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <button type="button" class="btn ghost" style={{ marginTop: 8 }} onClick={() => setItems(a => [...a, { old: '', v: '' }])}>+ Agregar</button>
      <p class="hint">Si renombrás algo, se actualizan los movimientos que ya lo usan.</p>
      <button class="btn" onClick={save}>Guardar</button>
      <SheetFooter />
    </div>
  );
}

/** Se muestra a quien se une a un hogar para que elija cuál de las personas es. */
export function QuienSos() {
  const h = hogar.value!;
  const [nuevo, setNuevo] = useState('');
  const elegir = (p: string) => {
    if (!h.personas.includes(p)) actualizarHogar({ personas: [...h.personas, p] });
    setPersona(p); closeSheet(); toast(`¡Hola, ${p}!`);
  };
  return (
    <div>
      <h3>¿Quién sos en este hogar?</h3>
      <p class="hint">Así tus gastos se cargan a tu nombre.</p>
      {h.personas.map(p => <button class="btn ghost" style={{ marginBottom: 8 }} onClick={() => elegir(p)}>{p}</button>)}
      <Field label="Otro nombre"><input class="inp" value={nuevo} onInput={e => setNuevo(e.currentTarget.value)} /></Field>
      <button class="btn" disabled={!nuevo.trim()} onClick={() => elegir(nuevo.trim())}>Soy yo</button>
    </div>
  );
}

