import { useState } from 'preact/hooks';
import { gruposSinCuenta, saldos, sinCuenta, todayISO } from '../../lib/calc';
import { fmt, formatMiles, parseAmt } from '../../lib/format';
import { cuentasDe, MONEDAS, MONEDA_IDS, SUGERENCIAS_INVERSION, TIPOS_CUENTA, type Cuenta, type Moneda, type TipoCuenta } from '../../lib/model';
import { actualizarHogar, guardar, hogar, miPersona, movs, newId, toast } from '../../lib/store';
import { Field, MontoInput, Seg, SheetFooter } from '../common';
import { closeSheet, monedaVista, openSheet } from '../state';

const TIPO_IDS = Object.keys(TIPOS_CUENTA) as TipoCuenta[];

export function CuentasSheet() {
  const h = hogar.value!;
  const cuentas = cuentasDe(h);
  const moneda = monedaVista.value;
  const lista = saldos(movs.value, cuentas, moneda);
  const disponible = lista.filter(s => TIPOS_CUENTA[s.cuenta.tipo].disponible);
  const invertido = lista.filter(s => !TIPOS_CUENTA[s.cuenta.tipo].disponible);
  const total = (xs: typeof lista) => xs.reduce((t, s) => t + s.saldo, 0);
  const pendientes = sinCuenta(movs.value);

  return (
    <div>
      <h3>Mis cuentas</h3>
      <div class="hero">
        <div class="stat"><div class="l">Disponible</div><div class="v">{fmt(total(disponible), moneda)}</div></div>
        <div class="stat"><div class="l">Invertido</div><div class="v save">{fmt(total(invertido), moneda)}</div></div>
      </div>
      {MONEDA_IDS.length > 1 && <p class="hint">Saldos en {MONEDAS[moneda].nombre.toLowerCase()}. Para ver otra moneda, cambiala en Inicio.</p>}

      <div class="card" style={{ boxShadow: 'none' }}>
        {lista.map(s => (
          <div class="row tap" onClick={() => openSheet(<CuentaForm cuenta={s.cuenta} />)}>
            <div>
              <div class="t">{TIPOS_CUENTA[s.cuenta.tipo].icono} {s.cuenta.nombre}</div>
              <div class="s">{TIPOS_CUENTA[s.cuenta.tipo].nombre}{TIPOS_CUENTA[s.cuenta.tipo].disponible ? '' : ' · no cuenta como disponible'}</div>
            </div>
            <div class={`num ${s.saldo < 0 ? 'out' : ''}`}>{fmt(s.saldo, moneda)}</div>
          </div>
        ))}
      </div>
      {pendientes > 0 && (
        <div class="note">
          <b>Faltan {pendientes} movimiento{pendientes > 1 ? 's' : ''} por ubicar.</b> Los cargaste antes de que existieran las cuentas, así que todavía no suman ni restan de estos saldos.
          <button type="button" class="btn sm" style={{ marginTop: 8 }} onClick={() => openSheet(<AsignarCuentas />)}>Ubicarlos ahora</button>
        </div>
      )}
      {lista.some(s => s.saldo < 0) && (
        <p class="hint">Si alguna cuenta te queda en negativo, entrá y cargá el <b>saldo de partida</b>: es la plata que tenías antes de los movimientos que ya cargaste.</p>
      )}
      {invertido.length === 0 && (
        <p class="hint">¿Tenés plata en un fondo común, un plazo fijo, acciones o cripto? Agregala como inversión: se ve por separado y no suma a lo disponible.</p>
      )}
      <div class="btns" style={{ flexWrap: 'wrap' }}>
        <button class="btn ghost" onClick={() => openSheet(<CuentaForm />)}>+ Cuenta o efectivo</button>
        <button class="btn ghost" onClick={() => openSheet(<CuentaForm tipoInicial="inversion" />)}>+ Inversión</button>
      </div>
      <SheetFooter />
    </div>
  );
}

export function CuentaForm({ cuenta, tipoInicial }: { cuenta?: Cuenta; tipoInicial?: TipoCuenta }) {
  const h = hogar.value!;
  const cuentas = cuentasDe(h);
  const [nombre, setNombre] = useState(cuenta?.nombre || '');
  const [tipo, setTipo] = useState<TipoCuenta>(cuenta?.tipo || tipoInicial || 'banco');
  const [iniciales, setIniciales] = useState<Partial<Record<Moneda, string>>>(() => {
    const o: Partial<Record<Moneda, string>> = {};
    for (const c of MONEDA_IDS) if (cuenta?.inicial?.[c]) o[c] = formatMiles(String(cuenta.inicial[c]));
    return o;
  });
  const usadas = MONEDA_IDS.filter(c => iniciales[c] !== undefined || c === 'ARS');
  const libres = MONEDA_IDS.filter(c => !usadas.includes(c));
  const enUso = !!cuenta && movs.value.some(m => m.cuenta === cuenta.id || m.cuentaDestino === cuenta.id);

  const guardarCuenta = (e: Event) => {
    e.preventDefault();
    if (!nombre.trim()) return toast('Poné un nombre');
    const inicial: Partial<Record<Moneda, number>> = {};
    for (const c of usadas) { const v = parseAmt(iniciales[c] || ''); if (v) inicial[c] = v; }
    const nueva: Cuenta = {
      id: cuenta?.id || newId(), nombre: nombre.trim(), tipo, inicial,
      orden: cuenta?.orden ?? cuentas.length,
    };
    actualizarHogar({ cuentas: cuenta ? cuentas.map(c => (c.id === cuenta.id ? nueva : c)) : [...cuentas, nueva] });
    openSheet(<CuentasSheet />);
    toast('Guardado ✓');
  };

  const eliminar = () => {
    if (enUso) return toast('Tiene movimientos: no se puede eliminar');
    if (cuentas.length <= 1) return toast('Tiene que quedar al menos una cuenta');
    if (!confirm(`¿Eliminar la cuenta "${cuenta!.nombre}"?`)) return;
    actualizarHogar({ cuentas: cuentas.filter(c => c.id !== cuenta!.id) });
    openSheet(<CuentasSheet />);
  };

  return (
    <form onSubmit={guardarCuenta}>
      <h3>{cuenta ? 'Editar cuenta' : 'Nueva cuenta'}</h3>
      <Field label="Nombre"><input class="inp" value={nombre} onInput={e => setNombre(e.currentTarget.value)} placeholder="Ej: Banco Nación, FCI Mercado Pago" /></Field>
      <Field label="Tipo">
        <Seg value={tipo} onChange={setTipo} options={TIPO_IDS.map(t => [t, TIPOS_CUENTA[t].nombre])} />
      </Field>
      {tipo === 'inversion' && !cuenta && (
        <div class="btns" style={{ flexWrap: 'wrap' }}>
          {SUGERENCIAS_INVERSION.map(n => <button type="button" class="btn ghost sm" onClick={() => setNombre(n)}>{n}</button>)}
        </div>
      )}
      <p class="hint">{TIPOS_CUENTA[tipo].disponible
        ? 'Suma a lo que tenés disponible para gastar.'
        : 'La plata invertida se muestra aparte y no suma a lo disponible (fondos comunes, plazo fijo, acciones…).'}</p>

      <div class="f-label">¿Cuánto tenés hoy acá?</div>
      {usadas.map(c => (
        <div class="row" style={{ borderBottom: 0, paddingTop: 4 }}>
          <span class="pill" style={{ minWidth: 58, textAlign: 'center' }}>{MONEDAS[c].simbolo}</span>
          <MontoInput class="" value={iniciales[c] || ''} onValue={v => setIniciales(o => ({ ...o, [c]: v }))} placeholder="0" />
        </div>
      ))}
      {libres.length > 0 && (
        <div class="btns" style={{ flexWrap: 'wrap' }}>
          {libres.map(c => <button type="button" class="btn ghost sm" onClick={() => setIniciales(o => ({ ...o, [c]: '' }))}>+ {MONEDAS[c].nombre}</button>)}
        </div>
      )}
      <p class="hint">Es el saldo de partida. Después se suma y se resta solo con lo que vayas cargando.</p>

      <button class="btn">Guardar</button>
      {cuenta && (
        <div class="btns">
          <button type="button" class="btn ghost" onClick={() => openSheet(<AjustarSaldo cuenta={cuenta} />)}>Actualizar saldo</button>
          <button type="button" class="btn danger" onClick={eliminar}>Eliminar cuenta</button>
        </div>
      )}
      <div class="btns"><button type="button" class="btn ghost" onClick={() => openSheet(<CuentasSheet />)}>Volver</button></div>
      <div class="btns"><button type="button" class="btn ghost" onClick={closeSheet}>Cerrar</button></div>
    </form>
  );
}

/** Pone el saldo real de una cuenta: sirve para cargar cuánto rindió un fondo o corregir el efectivo. */
export function AjustarSaldo({ cuenta }: { cuenta: Cuenta }) {
  const moneda = monedaVista.value;
  const actual = saldos(movs.value, cuentasDe(hogar.value!), moneda).find(s => s.cuenta.id === cuenta.id)?.saldo || 0;
  const [txt, setTxt] = useState(formatMiles(String(Math.round(actual))));
  const nuevo = parseAmt(txt);
  const diferencia = nuevo - actual;

  const aplicar = (e: Event) => {
    e.preventDefault();
    if (!diferencia) { toast('El saldo es el mismo'); return; }
    guardar('movs', {
      id: newId(), tipo: 'ajuste', fecha: todayISO(), persona: miPersona.value, desc: diferencia > 0 ? 'Rendimiento' : 'Ajuste de saldo',
      cat: '', monto: diferencia, moneda, cuenta: cuenta.id,
    });
    openSheet(<CuentasSheet />);
    toast(diferencia > 0 ? `Sumaste ${fmt(diferencia, moneda)} ✓` : `Restaste ${fmt(-diferencia, moneda)} ✓`);
  };

  return (
    <form onSubmit={aplicar}>
      <h3>Actualizar saldo · {cuenta.nombre}</h3>
      <p class="hint" style={{ marginTop: 0 }}>Poné cuánto tenés hoy en esta cuenta. La diferencia se guarda como rendimiento o ajuste, sin contarse como ingreso ni gasto.</p>
      <Field label={`Saldo de hoy (${MONEDAS[moneda].simbolo})`}><MontoInput class="amount" value={txt} onValue={setTxt} /></Field>
      <div class="note">
        Ahora figura {fmt(actual, moneda)}.{' '}
        {diferencia ? <b>{diferencia > 0 ? 'Suma' : 'Resta'} {fmt(Math.abs(diferencia), moneda)}.</b> : 'Sin cambios.'}
      </div>
      <button class="btn">Guardar</button>
      <div class="btns"><button type="button" class="btn ghost" onClick={() => openSheet(<CuentaForm cuenta={cuenta} />)}>Volver</button></div>
    </form>
  );
}

/** Asigna una cuenta, de a muchos, a los movimientos cargados antes de que existieran las cuentas. */
export function AsignarCuentas() {
  const h = hogar.value!;
  const cuentas = cuentasDe(h);
  const grupos = gruposSinCuenta(movs.value);
  const porDefecto = (clave: string) => {
    const efectivo = cuentas.find(c => c.tipo === 'efectivo')?.id;
    const banco = cuentas.find(c => c.tipo === 'banco')?.id;
    return (/efectivo/i.test(clave) ? efectivo : banco) || cuentas[0]?.id;
  };
  const [elegidas, setElegidas] = useState<Record<string, string>>(
    () => Object.fromEntries(grupos.map(g => [g.clave, porDefecto(g.clave)!])),
  );
  const [aplicando, setAplicando] = useState(false);

  const aplicar = async () => {
    setAplicando(true);
    let n = 0;
    for (const g of grupos) {
      const cuenta = elegidas[g.clave];
      if (!cuenta) continue;
      for (const m of g.movs) { guardar('movs', { ...m, cuenta }); n++; }
    }
    toast(`Listo: ${n} movimiento${n === 1 ? '' : 's'} ubicado${n === 1 ? '' : 's'} ✓`);
    openSheet(<CuentasSheet />);
  };

  if (!grupos.length) return (
    <div><h3>Todo en orden</h3><p class="empty">No quedan movimientos sin cuenta.</p><SheetFooter /></div>
  );

  return (
    <div>
      <h3>¿De dónde salió esa plata?</h3>
      <p class="hint" style={{ marginTop: 0 }}>Elegí una cuenta para cada grupo y los saldos se recalculan con todo tu historial. Después podés cambiar cualquier movimiento uno por uno.</p>
      {grupos.map(g => (
        <Field label={`${g.titulo} (${g.movs.length})`}>
          <select class="inp" value={elegidas[g.clave]} onChange={e => setElegidas(o => ({ ...o, [g.clave]: e.currentTarget.value }))}>
            {cuentas.map(c => <option value={c.id}>{TIPOS_CUENTA[c.tipo].icono} {c.nombre}</option>)}
          </select>
        </Field>
      ))}
      <p class="hint">Ojo con el saldo de partida: si ya cargaste cuánto tenías, ese número tiene que ser el de <b>antes</b> de estos movimientos.</p>
      <button class="btn" disabled={aplicando} onClick={aplicar}>{aplicando ? 'Ubicando…' : 'Ubicar todos'}</button>
      <div class="btns"><button type="button" class="btn ghost" onClick={() => openSheet(<CuentasSheet />)}>Volver</button></div>
    </div>
  );
}
