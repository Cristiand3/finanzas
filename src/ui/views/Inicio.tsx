import { cuotasFuturas, prestamoCalc, progresoMeta, resumen, sum } from '../../lib/calc';
import { fmt, monthShort, pct } from '../../lib/format';
import { CAT_ICON, MONEDAS, MONEDA_IDS } from '../../lib/model';
import { hogar, metas, movs, pmovs, prestamos } from '../../lib/store';
import { Bar } from '../common';
import { filtroPersona, mes, monedaVista, tab } from '../state';

export function Inicio() {
  const h = hogar.value!;
  const moneda = monedaVista.value;
  const r = resumen(movs.value, mes.value, filtroPersona.value, moneda);
  const max = r.porCat[0]?.v || 1;
  const cf = cuotasFuturas(
    movs.value.filter(m => filtroPersona.value === 'Todos' || m.persona === filtroPersona.value),
    mes.value, 6, moneda,
  );
  const maxCol = Math.max(1, ...cf.proximos.map(p => p.total));
  const deudas = prestamos.value.map(p => ({ p, c: prestamoCalc(p, pmovs.value, mes.value) })).filter(d => d.p.moneda === moneda);
  const otras = MONEDA_IDS.filter(c => c !== moneda && resumen(movs.value, mes.value, filtroPersona.value, c).lineas.length > 0);

  return (
    <>
      <div class="card feature">
        <div class="stat big"><div class="l">Te queda libre este mes</div><div class="v">{fmt(r.libre, moneda)}</div></div>
        <div class="hint" style={{ marginTop: 4 }}>Ingresos − gastos − ahorro{moneda !== 'ARS' ? ` · en ${MONEDAS[moneda].nombre.toLowerCase()}` : ''}</div>
      </div>
      <div class="card">
        <div class="hero">
          <div class="stat"><div class="l">Ingresos</div><div class="v in">{fmt(r.ing, moneda)}</div></div>
          <div class="stat"><div class="l">Gastos</div><div class="v out">{fmt(r.gas, moneda)}</div></div>
          <div class="stat"><div class="l">Ahorro</div><div class="v save">{fmt(r.aho, moneda)}</div></div>
          <div class="stat"><div class="l">% del ingreso gastado</div><div class="v">{pct(r.pctGasto)}</div></div>
        </div>
        {r.enCuotas > 0 && <p class="hint" style={{ marginBottom: 0 }}>Incluye {fmt(r.enCuotas, moneda)} en cuotas.</p>}
      </div>

      {filtroPersona.value === 'Todos' && h.personas.length > 1 && (
        <div class="card"><h2>Por persona</h2>
          {h.personas.map(p => {
            const x = resumen(movs.value, mes.value, p, moneda);
            return (
              <div class="row">
                <div><div class="t">{p}</div><div class="s">Ingresos {fmt(x.ing, moneda)} · Ahorro {fmt(x.aho, moneda)}</div></div>
                <div class="num out">{fmt(x.gas, moneda)}</div>
              </div>
            );
          })}
        </div>
      )}

      <div class="card"><h2>Gasto por categoría</h2>
        {r.porCat.length ? r.porCat.map(x => (
          <div class="catrow">
            <div class="h"><span>{CAT_ICON[x.cat] || '•'} {x.cat}</span><span class="num">{fmt(x.v, moneda)} <span class="hint">{pct(x.v / r.gas)}</span></span></div>
            <Bar value={x.v / max} />
          </div>
        )) : <p class="empty">Todavía no hay gastos en {MONEDAS[moneda].nombre.toLowerCase()} este mes.<br />Tocá <b>+</b> para cargar el primero.</p>}
      </div>

      {cf.activas.length > 0 && (
        <div class="card tap" onClick={() => (tab.value = 'deudas')}>
          <h2>Cuotas de los próximos meses</h2>
          <div class="cols">
            {cf.proximos.map(p => (
              <div title={fmt(p.total, moneda)}><i style={{ height: `${(p.total / maxCol) * 70}px` }} /><span>{monthShort(p.mes)}</span></div>
            ))}
          </div>
          <p class="hint" style={{ marginBottom: 0 }}>{cf.activas.length} compra{cf.activas.length > 1 ? 's' : ''} en cuotas · te quedan {fmt(cf.totalRestante, moneda)} por pagar</p>
        </div>
      )}

      {metas.value.length > 0 && (
        <div class="card tap" onClick={() => (tab.value = 'metas')}><h2>Metas de ahorro</h2>
          {metas.value.map(m => {
            const avance = progresoMeta(movs.value, m);
            if (!avance.length) return null;
            return (
              <div class="catrow">
                <div class="h">
                  <span>{m.nombre}</span>
                  <span class="num">{avance.map(a => fmt(a.ahorrado, a.moneda)).join(' + ')}</span>
                </div>
                {avance.map(a => <Bar value={a.objetivo ? a.ahorrado / a.objetivo : 0} color="var(--save)" />)}
              </div>
            );
          })}
        </div>
      )}

      {deudas.length > 0 && (
        <div class="card tap" onClick={() => (tab.value = 'deudas')}><h2>Préstamos</h2>
          <div class="row"><div class="t">Saldo total</div><div class="num out">{fmt(sum(deudas, d => d.c.saldo), moneda)}</div></div>
          <div class="row"><div class="t">Pagado este mes</div><div class="num">{fmt(sum(deudas, d => d.c.pagoMes), moneda)}</div></div>
        </div>
      )}

      {otras.length > 0 && (
        <p class="hint" style={{ textAlign: 'center' }}>
          También tenés movimientos en {otras.map(c => MONEDAS[c].nombre.toLowerCase()).join(' y ')}: elegí la moneda arriba para verlos.
        </p>
      )}
    </>
  );
}
