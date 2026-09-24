import { useState } from 'preact/hooks';
import { saldos, sinCuenta } from '../../lib/calc';
import { fmt, formatMiles, parseAmt } from '../../lib/format';
import { cuentasDe, MONEDAS, MONEDA_IDS, TIPOS_CUENTA, type Cuenta, type Moneda, type TipoCuenta } from '../../lib/model';
import { actualizarHogar, hogar, movs, newId, toast } from '../../lib/store';
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
        {invertido.length > 0 && <div class="stat"><div class="l">Invertido</div><div class="v save">{fmt(total(invertido), moneda)}</div></div>}
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
        <p class="hint">Hay {pendientes} movimiento{pendientes > 1 ? 's' : ''} cargado{pendientes > 1 ? 's' : ''} antes de usar las cuentas: no afectan estos saldos. Podés abrirlos y elegirles una cuenta.</p>
      )}
      <button class="btn ghost" onClick={() => openSheet(<CuentaForm />)}>+ Nueva cuenta</button>
      <SheetFooter />
    </div>
  );
}

export function CuentaForm({ cuenta }: { cuenta?: Cuenta }) {
  const h = hogar.value!;
  const cuentas = cuentasDe(h);
  const [nombre, setNombre] = useState(cuenta?.nombre || '');
  const [tipo, setTipo] = useState<TipoCuenta>(cuenta?.tipo || 'banco');
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
      {cuenta && <div class="btns"><button type="button" class="btn danger" onClick={eliminar}>Eliminar cuenta</button></div>}
      <div class="btns"><button type="button" class="btn ghost" onClick={() => openSheet(<CuentasSheet />)}>Volver</button></div>
      <div class="btns"><button type="button" class="btn ghost" onClick={closeSheet}>Cerrar</button></div>
    </form>
  );
}
