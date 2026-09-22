import { useEffect, useRef, useState } from 'preact/hooks';
import { shiftMonth, todayISO, ym } from '../../lib/calc';
import { recordarTC, ultimoTC } from '../../lib/tc';
import { fmt, monthName, parseAmt } from '../../lib/format';
import { CAT_ICON, type Moneda, type Mov, type TipoMov } from '../../lib/model';
import { borrar, guardar, hogar, metas, miPersona, newId, toast } from '../../lib/store';
import { Field, Seg } from '../common';
import { closeSheet, mes } from '../state';

const CUOTAS = [1, 2, 3, 4, 6, 9, 10, 12, 18, 24];

export function MovForm({ mov, preset }: { mov?: Mov; preset?: Partial<Mov> }) {
  const h = hogar.value!;
  const hoy = todayISO();
  const init: Mov = mov ? { ...mov } : {
    id: '', tipo: 'gasto', fecha: ym(hoy) === mes.value ? hoy : `${mes.value}-01`, persona: miPersona.value,
    desc: '', cat: h.categorias[0], monto: 0, moneda: 'ARS', tc: 1, medio: lastMedio() || h.medios[0],
    ...preset,
  };
  const [m, setM] = useState<Mov>(init);
  const nuevo = !m.id; // también al duplicar
  const [montoTxt, setMontoTxt] = useState(mov ? String(mov.monto).replace('.', ',') : '');
  const [tcTxt, setTcTxt] = useState(init.moneda === 'USD' ? String(init.tc) : ultimoTC());
  const set = (p: Partial<Mov>) => setM(x => ({ ...x, ...p }));
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!mov) setTimeout(() => ref.current?.focus(), 250); }, []);

  const metaSel = metas.value.find(x => x.id === m.meta) || metas.value[0];
  const moneda: Moneda = m.tipo === 'ahorro' ? metaSel?.moneda || 'ARS' : m.moneda;
  const monto = parseAmt(montoTxt);
  const cuotas = m.tipo === 'gasto' ? m.cuotas || 1 : 1;
  const desdeDefault = (medio?: string) => (medio === 'Crédito' ? shiftMonth(ym(m.fecha), 1) : ym(m.fecha));

  const setTipo = (tipo: TipoMov) => set({
    tipo,
    cat: tipo === 'ingreso' ? h.fuentesIngreso[0] : tipo === 'gasto' ? h.categorias[0] : m.cat,
    meta: tipo === 'ahorro' ? metaSel?.id : undefined,
  });

  const save = (e?: Event) => {
    e?.preventDefault();
    if (!monto) { toast('Ingresá un monto'); return; }
    const tc = moneda === 'USD' ? parseAmt(tcTxt) : 1;
    if (moneda === 'USD' && !tc) { toast('Escribí a cuánto tomás el dólar'); return; }
    if (moneda === 'USD') recordarTC(tc);
    const out: Mov = {
      id: m.id || newId(), tipo: m.tipo, fecha: m.fecha || hoy, persona: m.persona, desc: m.desc.trim(), cat: m.cat,
      monto, moneda, tc, notas: m.notas?.trim() || undefined,
    };
    if (m.tipo === 'gasto') {
      out.medio = m.medio;
      if (cuotas > 1) { out.cuotas = cuotas; out.desde = m.desde || desdeDefault(m.medio); }
      rememberMedio(m.medio);
    }
    if (m.tipo === 'ahorro') { out.meta = metaSel?.id; out.cat = ''; }
    if (mov?.creadoPor) out.creadoPor = mov.creadoPor;
    guardar('movs', out);
    closeSheet();
    // Se muestra el mes de la compra (no el de la primera cuota), así se sigue cargando en el mismo mes.
    if (nuevo && ym(out.fecha) !== mes.value && !out.cuotas) mes.value = ym(out.fecha);
    const aviso = out.cuotas && out.desde !== mes.value ? ` · 1ª cuota en ${monthName(out.desde!).toLowerCase()}` : '';
    toast((nuevo ? 'Guardado ✓' : 'Cambios guardados') + aviso);
  };

  return (
    <form onSubmit={save}>
      <h3>{nuevo ? 'Nuevo movimiento' : 'Editar movimiento'}</h3>
      <Seg value={m.tipo} onChange={setTipo} options={[['gasto', 'Gasto'], ['ingreso', 'Ingreso'], ['ahorro', 'Ahorro']]} />

      <Field label={cuotas > 1 ? 'Monto total de la compra' : 'Monto'}>
        <div class="amountbox">
          <input ref={ref} class="inp amount" inputmode="decimal" placeholder="0" value={montoTxt} onInput={e => setMontoTxt(e.currentTarget.value)} autocomplete="off" />
          {m.tipo !== 'ahorro'
            ? <select class="inp cur" value={m.moneda} onChange={e => set({ moneda: e.currentTarget.value as Moneda })}><option value="ARS">$</option><option value="USD">US$</option></select>
            : <span class="inp cur" style={{ display: 'grid', placeItems: 'center' }}>{moneda === 'USD' ? 'US$' : '$'}</span>}
        </div>
      </Field>
      {moneda === 'USD' && (
        <Field label="¿A cuánto tomás el dólar?">
          <input class="inp" inputmode="decimal" value={tcTxt} onInput={e => setTcTxt(e.currentTarget.value)} placeholder="Ej: 1500" />
          <span class="hint">{monto > 0 && parseAmt(tcTxt) > 0 ? `Son ${fmt(monto * parseAmt(tcTxt))} · solo se usa para sumarlo con tus gastos en pesos` : 'Se usa solo para sumarlo con tus gastos en pesos.'}</span>
        </Field>
      )}

      <div class="grid2">
        <Field label="Fecha"><input type="date" class="inp" value={m.fecha} onInput={e => set({ fecha: e.currentTarget.value })} /></Field>
        <Field label="Quién">
          <select class="inp" value={m.persona} onChange={e => set({ persona: e.currentTarget.value })}>
            {h.personas.map(p => <option>{p}</option>)}
          </select>
        </Field>
      </div>

      {m.tipo === 'gasto' && (
        <>
          <div class="f-label">Categoría</div>
          <div class="catgrid">
            {h.categorias.map(c => (
              <button type="button" class={c === m.cat ? 'on' : ''} onClick={() => set({ cat: c })}><b>{CAT_ICON[c] || '•'}</b>{c}</button>
            ))}
          </div>
          <Field label="Descripción"><input class="inp" value={m.desc} onInput={e => set({ desc: e.currentTarget.value })} placeholder="Ej: súper, nafta, farmacia" /></Field>
          <div class="grid2">
            <Field label="Medio de pago">
              <select class="inp" value={m.medio} onChange={e => set({ medio: e.currentTarget.value, desde: undefined })}>
                {h.medios.map(x => <option>{x}</option>)}
              </select>
            </Field>
            <Field label="Cuotas">
              <select class="inp" value={cuotas} onChange={e => set({ cuotas: +e.currentTarget.value })}>
                {[...new Set([...CUOTAS, cuotas])].sort((a, b) => a - b).map(n => <option value={n}>{n === 1 ? 'Sin cuotas' : `${n} cuotas`}</option>)}
              </select>
            </Field>
          </div>
          {cuotas > 1 && (
            <div class="note">
              <b>{cuotas} cuotas de {fmt(monto / cuotas, moneda)}</b>
              <Field label="Primera cuota">
                <input type="month" class="inp" value={m.desde || desdeDefault(m.medio)} onInput={e => set({ desde: e.currentTarget.value })} />
              </Field>
              <span class="hint">Cada mes se cuenta solo la cuota que corresponde.</span>
            </div>
          )}
        </>
      )}
      {m.tipo === 'ingreso' && (
        <>
          <Field label="Tipo de ingreso">
            <select class="inp" value={m.cat} onChange={e => set({ cat: e.currentTarget.value })}>
              {[...new Set([...h.fuentesIngreso, m.cat])].filter(Boolean).map(x => <option>{x}</option>)}
            </select>
          </Field>
          <Field label="Descripción (opcional)"><input class="inp" value={m.desc} onInput={e => set({ desc: e.currentTarget.value })} /></Field>
        </>
      )}
      {m.tipo === 'ahorro' && (
        <>
          <Field label="Meta">
            <select class="inp" value={metaSel?.id} onChange={e => set({ meta: e.currentTarget.value })}>
              {metas.value.map(x => <option value={x.id}>{x.nombre}{x.moneda === 'USD' ? ' (US$)' : ''}</option>)}
            </select>
          </Field>
          <p class="hint">Para registrar un retiro de la meta, cargá el monto en negativo (ej: −50000).</p>
        </>
      )}

      <Field label="Notas"><input class="inp" value={m.notas || ''} onInput={e => set({ notas: e.currentTarget.value })} /></Field>
      <button class="btn">{nuevo ? 'Guardar' : 'Guardar cambios'}</button>
      {!nuevo && (
        <div class="btns">
          <button type="button" class="btn danger" onClick={() => { if (confirm('¿Eliminar este movimiento?')) { borrar('movs', m.id); closeSheet(); toast('Eliminado'); } }}>Eliminar</button>
          <button type="button" class="btn ghost" onClick={() => { set({ id: '', fecha: hoy, desde: undefined }); toast('Copia lista para guardar'); }}>Duplicar</button>
        </div>
      )}
      <div class="btns"><button type="button" class="btn ghost" onClick={closeSheet}>Cancelar</button></div>
    </form>
  );
}

function lastMedio() { try { return localStorage.getItem('finanzas.medio') || undefined; } catch { return undefined; } }
function rememberMedio(v?: string) { try { if (v) localStorage.setItem('finanzas.medio', v); } catch { /* ignore */ } }
