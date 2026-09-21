import { describe, expect, it } from 'vitest';
import { cuotasFuturas, lineaDelMes, metaAhorrado, monthsBetween, prestamoCalc, resumen, shiftMonth } from './calc';
import type { Mov } from './model';

const mov = (p: Partial<Mov>): Mov => ({
  id: Math.random().toString(36), tipo: 'gasto', fecha: '2026-09-10', persona: 'A', desc: '', cat: 'Otros',
  monto: 0, moneda: 'ARS', tc: 1, ...p,
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
    expect(lineaDelMes(tv, '2026-10')).toMatchObject({ ars: 100_000, cuota: { k: 1, n: 6 } });
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
    expect(lineaDelMes(mov({ monto: 300, cuotas: 3 }), '2026-09')?.ars).toBe(100);
  });
});

describe('dólares', () => {
  it('convierte a pesos con la cotización guardada', () => {
    const r = resumen([
      mov({ tipo: 'ingreso', monto: 1000, moneda: 'USD', tc: 1500 }),
      mov({ monto: 300_000 }),
    ], '2026-09');
    expect(r.ing).toBe(1_500_000);
    expect(r.libre).toBe(1_200_000);
    expect(r.pctGasto).toBeCloseTo(0.2);
  });
  it('suma aportes a una meta en dólares aunque se hayan cargado en pesos', () => {
    const meta = { id: 'm', nombre: 'Viaje', objetivo: 2000, moneda: 'USD' as const };
    const movs = [
      mov({ tipo: 'ahorro', meta: 'm', monto: 100, moneda: 'USD', tc: 1500 }),
      mov({ tipo: 'ahorro', meta: 'm', monto: 150_000, moneda: 'ARS', tc: 1500 }),
    ];
    expect(metaAhorrado(movs, meta)).toBe(200);
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
