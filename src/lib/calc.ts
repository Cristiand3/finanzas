import type { Meta, Mov, Pmov, Prestamo } from './model';

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
export const toARS = (m: Pick<Mov, 'monto' | 'moneda' | 'tc'>) => (m.moneda === 'USD' ? m.monto * (m.tc || 0) : m.monto);
export const sum = <T>(a: T[], f: (x: T) => number) => a.reduce((t, x) => t + (+f(x) || 0), 0);

/** Parte de un movimiento que corresponde a un mes (en pesos). Las compras en cuotas se reparten. */
export interface Linea { mov: Mov; ars: number; cuota?: { k: number; n: number } }
export function lineaDelMes(m: Mov, mes: string): Linea | null {
  const n = m.tipo === 'gasto' ? m.cuotas || 1 : 1;
  if (n > 1) {
    const k = monthsBetween(m.desde || ym(m.fecha), mes);
    if (k < 0 || k >= n) return null;
    return { mov: m, ars: toARS(m) / n, cuota: { k: k + 1, n } };
  }
  return ym(m.fecha) === mes ? { mov: m, ars: toARS(m) } : null;
}

export function lineasDelMes(movs: Mov[], mes: string, persona = 'Todos') {
  const out: Linea[] = [];
  for (const m of movs) {
    if (persona !== 'Todos' && m.persona !== persona) continue;
    const l = lineaDelMes(m, mes);
    if (l) out.push(l);
  }
  return out;
}

export function resumen(movs: Mov[], mes: string, persona = 'Todos') {
  const ls = lineasDelMes(movs, mes, persona);
  const of = (t: string) => ls.filter(l => l.mov.tipo === t);
  const ing = sum(of('ingreso'), l => l.ars);
  const gas = sum(of('gasto'), l => l.ars);
  const aho = sum(of('ahorro'), l => l.ars);
  const porCat = new Map<string, number>();
  for (const l of of('gasto')) porCat.set(l.mov.cat, (porCat.get(l.mov.cat) || 0) + l.ars);
  const enCuotas = sum(of('gasto').filter(l => l.cuota), l => l.ars);
  return {
    ing, gas, aho, enCuotas,
    sobrante: ing - gas,
    libre: ing - gas - aho,
    pctGasto: ing ? gas / ing : NaN,
    cantidad: of('gasto').length,
    porCat: [...porCat].map(([cat, v]) => ({ cat, v })).sort((a, b) => b.v - a.v),
    lineas: ls,
  };
}

/** Cuotas por pagar: `proximos` desde el mes siguiente; `activas` incluye la cuota de `mes`. */
export function cuotasFuturas(movs: Mov[], mes: string, meses = 12) {
  const proximos = Array.from({ length: meses }, (_, i) => {
    const k = shiftMonth(mes, i + 1);
    return { mes: k, total: sum(movs, m => (m.tipo === 'gasto' && (m.cuotas || 1) > 1 ? lineaDelMes(m, k)?.ars || 0 : 0)) };
  });
  const activas = movs
    .filter(m => m.tipo === 'gasto' && (m.cuotas || 1) > 1)
    .map(m => {
      const n = m.cuotas!;
      const k = monthsBetween(m.desde || ym(m.fecha), mes) + 1; // cuota que corresponde a `mes`
      const faltan = k < 1 ? n : Math.max(0, n - k + 1); // incluye la cuota del mes
      return { mov: m, k, n, restante: (toARS(m) / n) * faltan };
    })
    .filter(a => a.k <= a.n && a.restante > 0)
    .sort((a, b) => b.restante - a.restante);
  return { proximos, activas, totalRestante: sum(activas, a => a.restante) };
}

export function metaAhorrado(movs: Mov[], meta: Meta, persona?: string) {
  return sum(
    movs.filter(m => m.tipo === 'ahorro' && m.meta === meta.id && (!persona || m.persona === persona)),
    m => (m.moneda === meta.moneda ? m.monto : meta.moneda === 'USD' ? toARS(m) / (m.tc || 1) : toARS(m)),
  );
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
