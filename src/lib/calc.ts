import { type Cuenta, type Meta, type Moneda, type Mov, type Pmov, type Prestamo } from './model';

// ---------- fechas ----------
export const ym = (iso: string) => iso.slice(0, 7);
export const todayISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};
export const shiftMonth = (k: string, n: number) => {
  const [y, m] = k.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
};
/** Meses de `a` a `b` (b − a). */
export const monthsBetween = (a: string, b: string) => {
  const [ay, am] = a.split('-').map(Number);
  const [by, bm] = b.split('-').map(Number);
  return (by - ay) * 12 + (bm - am);
};

// ---------- montos ----------
// Cada movimiento vive en su moneda: nunca se convierte de una a otra.
export const sum = <T>(a: T[], f: (x: T) => number) => a.reduce((t, x) => t + (+f(x) || 0), 0);

/** Parte de un movimiento que corresponde a un mes. Las compras en cuotas se reparten. */
export interface Linea { mov: Mov; monto: number; cuota?: { k: number; n: number } }
export function lineaDelMes(m: Mov, mes: string): Linea | null {
  const n = m.tipo === 'gasto' ? m.cuotas || 1 : 1;
  if (n > 1) {
    const k = monthsBetween(m.desde || ym(m.fecha), mes);
    if (k < 0 || k >= n) return null;
    return { mov: m, monto: m.monto / n, cuota: { k: k + 1, n } };
  }
  return ym(m.fecha) === mes ? { mov: m, monto: m.monto } : null;
}

export function lineasDelMes(movs: Mov[], mes: string, persona = 'Todos', moneda?: Moneda) {
  const out: Linea[] = [];
  for (const m of movs) {
    if (persona !== 'Todos' && m.persona !== persona) continue;
    if (moneda && m.moneda !== moneda) continue;
    const l = lineaDelMes(m, mes);
    if (l) out.push(l);
  }
  return out;
}

/** Monedas con movimientos, para mostrar los totales de cada una por separado. */
export function monedasUsadas(movs: Mov[], mes?: string, persona = 'Todos'): Moneda[] {
  const set = new Set<Moneda>(['ARS']);
  for (const m of movs) {
    if (persona !== 'Todos' && m.persona !== persona) continue;
    if (mes && !lineaDelMes(m, mes)) continue;
    set.add(m.moneda);
  }
  return [...set];
}

export function resumen(movs: Mov[], mes: string, persona = 'Todos', moneda: Moneda = 'ARS') {
  const ls = lineasDelMes(movs, mes, persona, moneda);
  const of = (t: string) => ls.filter(l => l.mov.tipo === t);
  const ing = sum(of('ingreso'), l => l.monto);
  const gas = sum(of('gasto'), l => l.monto);
  const aho = sum(of('ahorro'), l => l.monto);
  const porCat = new Map<string, number>();
  for (const l of of('gasto')) porCat.set(l.mov.cat, (porCat.get(l.mov.cat) || 0) + l.monto);
  const ajustes = sum(of('ajuste'), l => l.monto); // rendimientos de inversiones
  return {
    moneda, ing, gas, aho, ajustes,
    enCuotas: sum(of('gasto').filter(l => l.cuota), l => l.monto),
    // Resultado del mes: lo que entró menos lo que se fue de verdad. Apartar plata en una
    // meta no es un gasto, así que no resta: por eso esto explica cuánto variaron los saldos.
    resultado: ing - gas,
    // Cuánto cambiaron las cuentas: lo apartado en metas sale de la cuenta (pero sigue siendo tuyo).
    variacionCuentas: ing - gas - aho + ajustes,
    variacionSaldos: ing - gas + ajustes, // incluyendo lo apartado en metas
    pctGasto: ing ? gas / ing : NaN,
    cantidad: of('gasto').length,
    porCat: [...porCat].map(([cat, v]) => ({ cat, v })).sort((a, b) => b.v - a.v),
    lineas: ls,
  };
}

/** Cuotas por pagar: `proximos` desde el mes siguiente; `activas` incluye la cuota de `mes`. */
export function cuotasFuturas(movs: Mov[], mes: string, meses = 12, moneda: Moneda = 'ARS') {
  const enCuotas = movs.filter(m => m.tipo === 'gasto' && (m.cuotas || 1) > 1 && m.moneda === moneda);
  const proximos = Array.from({ length: meses }, (_, i) => {
    const k = shiftMonth(mes, i + 1);
    return { mes: k, total: sum(enCuotas, m => lineaDelMes(m, k)?.monto || 0) };
  });
  const activas = enCuotas
    .map(m => {
      const n = m.cuotas!;
      const k = monthsBetween(m.desde || ym(m.fecha), mes) + 1; // cuota que corresponde a `mes`
      const faltan = k < 1 ? n : Math.max(0, n - k + 1); // incluye la cuota del mes
      return { mov: m, k, n, restante: (m.monto / n) * faltan };
    })
    .filter(a => a.k <= a.n && a.restante > 0)
    .sort((a, b) => b.restante - a.restante);
  return { moneda, proximos, activas, totalRestante: sum(activas, a => a.restante) };
}

/** Plata apartada en metas: sigue siendo tuya, pero ya no está disponible en la cuenta. */
export function apartadoEnMetas(movs: Mov[], moneda: Moneda = 'ARS', hoy = todayISO(), persona = 'Todos') {
  return sum(
    movs.filter(m => m.tipo === 'ahorro' && m.moneda === moneda && m.fecha <= hoy && (persona === 'Todos' || m.persona === persona)),
    m => m.monto,
  );
}

export const aportesMeta = (movs: Mov[], metaId: string, moneda: Moneda, persona?: string) =>
  sum(movs.filter(m => m.tipo === 'ahorro' && m.meta === metaId && m.moneda === moneda && (!persona || m.persona === persona)), m => m.monto);

/** Avance de una meta: una línea por cada moneda con objetivo o con aportes. */
export function progresoMeta(movs: Mov[], meta: Meta, persona?: string) {
  const objetivos = meta.objetivos || {};
  const monedas = new Set<Moneda>(Object.keys(objetivos) as Moneda[]);
  for (const m of movs) if (m.tipo === 'ahorro' && m.meta === meta.id) monedas.add(m.moneda);
  return [...monedas]
    .map(moneda => ({
      moneda,
      objetivo: objetivos[moneda] || 0,
      ahorrado: aportesMeta(movs, meta.id, moneda, persona),
    }))
    .filter(x => x.objetivo > 0 || x.ahorrado !== 0);
}

export function prestamoCalc(p: Prestamo, pmovs: Pmov[], mes: string) {
  const mv = pmovs.filter(x => x.prestamoId === p.id);
  const by = (t: string) => sum(mv.filter(x => x.tipo === t), x => x.monto);
  const total = (+p.original || 0) + by('Interés') + by('Ajuste');
  const pagado = by('Pago') + by('Pago previo');
  const saldo = total - pagado;
  const cuotasPagadas = sum(mv.filter(x => x.tipo === 'Pago' || x.tipo === 'Pago previo'), x => x.cuotas);
  const restantes = p.cuotasTotales ? Math.max(0, p.cuotasTotales - cuotasPagadas) : null;
  const mesesFin = p.fin ? Math.max(1, monthsBetween(mes, p.fin) + 1) : null;
  const sugerido = p.cuotasTotales && p.cuota
    ? Math.min(p.cuota, Math.max(0, saldo))
    : mesesFin ? Math.max(0, saldo) / mesesFin : null;
  const pagoMes = sum(mv.filter(x => x.tipo === 'Pago' && ym(x.fecha) === mes), x => x.monto);
  return { mv, total, pagado, saldo, cuotasPagadas, restantes, sugerido, pagoMes, progreso: total ? pagado / total : 0 };
}

// ---------- saldos por cuenta ----------
/**
 * Movimiento de plata que produce un movimiento sobre una cuenta.
 * Un gasto en cuotas descuenta la cuota de cada mes, no todo junto.
 */
function efectoEnCuentas(m: Mov, hastaMes: string, hoy: string): { cuenta: string; delta: number }[] {
  const cuotas = m.tipo === 'gasto' ? m.cuotas || 1 : 1;
  const out: { cuenta: string; delta: number }[] = [];
  if (m.tipo === 'transferencia') {
    if (m.fecha > hoy) return out;
    if (m.cuenta) out.push({ cuenta: m.cuenta, delta: -m.monto });
    if (m.cuentaDestino) out.push({ cuenta: m.cuentaDestino, delta: m.monto });
    return out;
  }
  if (!m.cuenta) return out; // movimientos viejos, sin cuenta asignada
  if (m.tipo === 'ajuste') { // rendimiento de un fondo o corrección del saldo
    if (m.fecha > hoy) return out;
    out.push({ cuenta: m.cuenta, delta: m.monto });
    return out;
  }
  if (cuotas > 1) {
    const desde = m.desde || ym(m.fecha);
    const pagadas = Math.min(cuotas, Math.max(0, monthsBetween(desde, hastaMes) + 1));
    if (pagadas > 0) out.push({ cuenta: m.cuenta, delta: -(m.monto / cuotas) * pagadas });
    return out;
  }
  if (m.fecha > hoy) return out;
  const signo = m.tipo === 'ingreso' ? 1 : -1; // el ahorro sale de la cuenta; un retiro (monto negativo) vuelve
  out.push({ cuenta: m.cuenta, delta: signo * m.monto });
  return out;
}

export interface SaldoCuenta { cuenta: Cuenta; saldo: number }
/**
 * Cuánta plata hay hoy en cada cuenta. Con `persona` se ve la parte de esa persona,
 * calculada con sus propios movimientos; la suma de todas las personas da el total del hogar.
 */
export function saldos(movs: Mov[], cuentas: Cuenta[], moneda: Moneda = 'ARS', hoy = todayISO(), persona = 'Todos'): SaldoCuenta[] {
  const hastaMes = ym(hoy);
  const porCuenta = new Map<string, number>();
  // El saldo de partida de la cuenta es del hogar: solo suma en la vista de todos.
  for (const c of cuentas) porCuenta.set(c.id, persona === 'Todos' ? c.inicial?.[moneda] || 0 : 0);
  for (const m of movs) {
    if (m.moneda !== moneda) continue;
    if (persona !== 'Todos' && m.persona !== persona) continue;
    for (const e of efectoEnCuentas(m, hastaMes, hoy)) {
      if (porCuenta.has(e.cuenta)) porCuenta.set(e.cuenta, porCuenta.get(e.cuenta)! + e.delta);
    }
  }
  return cuentas.map(c => ({ cuenta: c, saldo: porCuenta.get(c.id) || 0 }));
}

/** Movimientos que todavía no tienen cuenta asignada (cargados antes de esta función). */
export const movsSinCuenta = (movs: Mov[]) =>
  movs.filter(m => m.tipo !== 'transferencia' && m.tipo !== 'ajuste' && !m.cuenta);
export const sinCuenta = (movs: Mov[]) => movsSinCuenta(movs).length;

/** Agrupa los movimientos sin cuenta para poder asignarles una de a muchos. */
export function gruposSinCuenta(movs: Mov[]) {
  const grupos = new Map<string, { clave: string; titulo: string; movs: Mov[] }>();
  for (const m of movsSinCuenta(movs)) {
    const clave = m.tipo === 'gasto' ? `gasto:${m.medio || 'Sin medio'}` : m.tipo;
    const titulo = m.tipo === 'gasto' ? `Gastos con ${m.medio || 'medio sin especificar'}`
      : m.tipo === 'ingreso' ? 'Ingresos' : 'Aportes a metas';
    if (!grupos.has(clave)) grupos.set(clave, { clave, titulo, movs: [] });
    grupos.get(clave)!.movs.push(m);
  }
  return [...grupos.values()].sort((a, b) => b.movs.length - a.movs.length);
}

/** Cuánto puso y cuánto le queda a cada integrante, según sus propios movimientos. */
export function saldosPorPersona(movs: Mov[], cuentas: Cuenta[], personas: string[], moneda: Moneda = 'ARS', hoy = todayISO()) {
  return personas.map(p => ({ nombre: p, total: sum(saldos(movs, cuentas, moneda, hoy, p), s => s.saldo) }));
}

/** Último día del mes (para ver cómo cerraron las cuentas ese mes). */
export const finDeMes = (mes: string) => {
  const [y, m] = mes.split('-').map(Number);
  return new Date(y, m, 0).toISOString().slice(0, 10);
};
/** Fecha hasta la que hay que calcular saldos si estás mirando `mes`: hoy, o el cierre de ese mes. */
export const corteDelMes = (mes: string, hoy = todayISO()) => (mes >= ym(hoy) ? hoy : finDeMes(mes));
