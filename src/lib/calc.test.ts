import { describe, expect, it } from 'vitest';
import { cuotasFuturas, lineaDelMes, monedasUsadas, monthsBetween, prestamoCalc, progresoMeta, resumen, saldos, shiftMonth, sinCuenta } from './calc';
import { conObjetivos, type Meta, type Mov } from './model';

const mov = (p: Partial<Mov>): Mov => ({
  id: Math.random().toString(36), tipo: 'gasto', fecha: '2026-09-10', persona: 'A', desc: '', cat: 'Otros',
  monto: 0, moneda: 'ARS', ...p,
});

describe('fechas', () => {
  it('mueve meses cruzando el año', () => {
    expect(shiftMonth('2026-11', 3)).toBe('2027-02');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(monthsBetween('2026-09', '2027-07')).toBe(10);
  });
});

describe('cuotas', () => {
  const tv = mov({ monto: 600_000, cuotas: 6, desde: '2026-10', cat: 'Hogar' });
  it('reparte la compra en los meses de cada cuota', () => {
    expect(lineaDelMes(tv, '2026-09')).toBeNull();
    expect(lineaDelMes(tv, '2026-10')).toMatchObject({ monto: 100_000, cuota: { k: 1, n: 6 } });
    expect(lineaDelMes(tv, '2027-03')).toMatchObject({ cuota: { k: 6, n: 6 } });
    expect(lineaDelMes(tv, '2027-04')).toBeNull();
  });
  it('cuenta solo la cuota del mes en el resumen', () => {
    const r = resumen([tv, mov({ monto: 50_000 })], '2026-10');
    expect(r.gas).toBe(100_000);
    expect(r.enCuotas).toBe(100_000);
  });
  it('proyecta lo que falta pagar', () => {
    const f = cuotasFuturas([tv], '2026-12'); // cuota 3 en diciembre
    expect(f.proximos[0]).toEqual({ mes: '2027-01', total: 100_000 });
    expect(f.proximos[3].total).toBe(0);
    expect(f.activas[0]).toMatchObject({ k: 3, n: 6, restante: 400_000 }); // cuotas 3 a 6
  });
  it('sin fecha de primera cuota arranca en el mes de la compra', () => {
    expect(lineaDelMes(mov({ monto: 300, cuotas: 3 }), '2026-09')?.monto).toBe(100);
  });
  it('separa las cuotas de cada moneda', () => {
    const movs = [tv, mov({ monto: 1200, moneda: 'USD', cuotas: 12, desde: '2026-10' })];
    expect(cuotasFuturas(movs, '2026-10').totalRestante).toBe(600_000);
    expect(cuotasFuturas(movs, '2026-10', 12, 'USD').totalRestante).toBe(1200);
  });
});

describe('monedas', () => {
  const movs = [
    mov({ tipo: 'ingreso', monto: 1_000_000 }),
    mov({ monto: 300_000 }),
    mov({ monto: 200, moneda: 'USD' }),
    mov({ tipo: 'ingreso', monto: 500, moneda: 'EUR' }),
  ];
  it('nunca mezcla monedas en los totales', () => {
    const pesos = resumen(movs, '2026-09');
    expect(pesos.ing).toBe(1_000_000);
    expect(pesos.gas).toBe(300_000);
    const dolares = resumen(movs, '2026-09', 'Todos', 'USD');
    expect(dolares.gas).toBe(200);
    expect(dolares.ing).toBe(0);
    expect(resumen(movs, '2026-09', 'Todos', 'EUR').libre).toBe(500);
  });
  it('lista las monedas usadas en el mes, con pesos siempre primero', () => {
    expect(monedasUsadas(movs, '2026-09')).toEqual(['ARS', 'USD', 'EUR']);
    expect(monedasUsadas([mov({ monto: 10, moneda: 'BRL' })])).toEqual(['ARS', 'BRL']);
  });
});

describe('metas con varias monedas', () => {
  const meta: Meta = { id: 'm', nombre: 'Viaje', objetivos: { ARS: 500_000, USD: 1000 } };
  const movs = [
    mov({ tipo: 'ahorro', meta: 'm', monto: 150_000, persona: 'A' }),
    mov({ tipo: 'ahorro', meta: 'm', monto: 50_000, persona: 'B' }),
    mov({ tipo: 'ahorro', meta: 'm', monto: 400, moneda: 'USD', persona: 'A' }),
  ];
  it('lleva el avance de cada moneda por separado', () => {
    expect(progresoMeta(movs, meta)).toEqual([
      { moneda: 'ARS', objetivo: 500_000, ahorrado: 200_000 },
      { moneda: 'USD', objetivo: 1000, ahorrado: 400 },
    ]);
  });
  it('puede filtrar por persona', () => {
    expect(progresoMeta(movs, meta, 'B')).toEqual([
      { moneda: 'ARS', objetivo: 500_000, ahorrado: 50_000 },
      { moneda: 'USD', objetivo: 1000, ahorrado: 0 },
    ]);
  });
  it('muestra aportes en una moneda sin objetivo', () => {
    const solo: Meta = { id: 'm', nombre: 'Viaje', objetivos: {} };
    expect(progresoMeta(movs, solo)).toEqual([
      { moneda: 'ARS', objetivo: 0, ahorrado: 200_000 },
      { moneda: 'USD', objetivo: 0, ahorrado: 400 },
    ]);
  });
  it('convierte las metas guardadas por la versión anterior', () => {
    expect(conObjetivos({ id: 'x', nombre: 'Viejo', objetivo: 2000, moneda: 'USD' } as Meta).objetivos).toEqual({ USD: 2000 });
    expect(conObjetivos({ id: 'x', nombre: 'Sin objetivo' } as Meta).objetivos).toEqual({});
  });
});

describe('préstamos (mismos números que la planilla)', () => {
  it('Santander: saldo y pago sugerido para terminar en julio 2027', () => {
    const p = { id: 's', nombre: 'Santander', persona: 'Ambos', original: 33_962_917, moneda: 'ARS' as const, cuotasTotales: 0, cuota: 0, fin: '2027-07' };
    const c = prestamoCalc(p, [{ id: '1', prestamoId: 's', fecha: '2026-09-12', tipo: 'Pago previo', monto: 13_399_119, cuotas: 0, nota: '' }], '2026-09');
    expect(c.saldo).toBe(20_563_798);
    expect(Math.round(c.sugerido!)).toBe(1_869_436);
    expect(c.pagoMes).toBe(0);
  });
  it('Mercado Pago: cuotas restantes', () => {
    const p = { id: 'mp', nombre: 'MP', persona: 'A', original: 976_956, moneda: 'ARS' as const, cuotasTotales: 12, cuota: 81_413 };
    const c = prestamoCalc(p, [
      { id: '1', prestamoId: 'mp', fecha: '2026-09-12', tipo: 'Pago previo', monto: 162_826, cuotas: 2, nota: '' },
      { id: '2', prestamoId: 'mp', fecha: '2026-09-20', tipo: 'Pago', monto: 81_413, cuotas: 1, nota: '' },
    ], '2026-09');
    expect(c.saldo).toBe(732_717);
    expect(c.restantes).toBe(9);
    expect(c.pagoMes).toBe(81_413);
  });
});

describe('saldos por cuenta', () => {
  const cuentas = [
    { id: 'ef', nombre: 'Efectivo', tipo: 'efectivo' as const, inicial: { ARS: 50_000 } },
    { id: 'bco', nombre: 'Banco', tipo: 'banco' as const, inicial: { ARS: 200_000, USD: 500 } },
    { id: 'fci', nombre: 'FCI', tipo: 'inversion' as const },
  ];
  const saldoDe = (movs: Mov[], id: string, moneda: 'ARS' | 'USD' = 'ARS') =>
    saldos(movs, cuentas, moneda, '2026-09-30').find(s => s.cuenta.id === id)!.saldo;

  it('parte del saldo inicial de cada cuenta', () => {
    expect(saldoDe([], 'ef')).toBe(50_000);
    expect(saldoDe([], 'bco', 'USD')).toBe(500);
    expect(saldoDe([], 'fci')).toBe(0);
  });
  it('el sueldo entra a la cuenta elegida y el gasto sale de la suya', () => {
    const movs = [
      mov({ tipo: 'ingreso', monto: 1_000_000, cuenta: 'bco', fecha: '2026-09-05' }),
      mov({ monto: 30_000, cuenta: 'ef', fecha: '2026-09-06' }),
    ];
    expect(saldoDe(movs, 'bco')).toBe(1_200_000);
    expect(saldoDe(movs, 'ef')).toBe(20_000);
  });
  it('un retiro del banco pasa plata al efectivo sin ser gasto ni ingreso', () => {
    const t = mov({ tipo: 'transferencia', monto: 100_000, cuenta: 'bco', cuentaDestino: 'ef', fecha: '2026-09-10' });
    expect(saldoDe([t], 'bco')).toBe(100_000);
    expect(saldoDe([t], 'ef')).toBe(150_000);
    const r = resumen([t], '2026-09');
    expect([r.ing, r.gas, r.aho]).toEqual([0, 0, 0]); // no toca los totales del mes
  });
  it('lo que se pasa a un fondo de inversión sale de la cuenta y se ve aparte', () => {
    const t = mov({ tipo: 'transferencia', monto: 150_000, cuenta: 'bco', cuentaDestino: 'fci', fecha: '2026-09-11' });
    expect(saldoDe([t], 'bco')).toBe(50_000);
    expect(saldoDe([t], 'fci')).toBe(150_000);
  });
  it('el aporte a una meta descuenta de la cuenta y el retiro la devuelve', () => {
    const aporte = mov({ tipo: 'ahorro', meta: 'm', monto: 80_000, cuenta: 'bco', fecha: '2026-09-12' });
    const retiro = mov({ tipo: 'ahorro', meta: 'm', monto: -30_000, cuenta: 'bco', fecha: '2026-09-20' });
    expect(saldoDe([aporte], 'bco')).toBe(120_000);
    expect(saldoDe([aporte, retiro], 'bco')).toBe(150_000);
  });
  it('una compra en cuotas descuenta solo las cuotas ya pagadas', () => {
    const tv = mov({ monto: 600_000, cuotas: 6, desde: '2026-08', cuenta: 'bco' });
    expect(saldoDe([tv], 'bco')).toBe(0); // agosto y septiembre: 2 cuotas de 100.000
  });
  it('no cuenta movimientos futuros ni de otra moneda', () => {
    const futuro = mov({ monto: 999_999, cuenta: 'ef', fecha: '2026-12-01' });
    const enDolares = mov({ monto: 100, moneda: 'USD', cuenta: 'ef', fecha: '2026-09-02' });
    expect(saldoDe([futuro, enDolares], 'ef')).toBe(50_000);
    expect(saldoDe([enDolares], 'ef', 'USD')).toBe(-100);
  });
  it('los movimientos viejos sin cuenta no mueven ningún saldo', () => {
    expect(sinCuenta([mov({ monto: 1000 })])).toBe(1);
    expect(saldos([mov({ monto: 1000 })], cuentas, 'ARS', '2026-09-30').map(s => s.saldo)).toEqual([50_000, 200_000, 0]);
  });
});
