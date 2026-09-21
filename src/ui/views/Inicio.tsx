import { cuotasFuturas, metaAhorrado, prestamoCalc, resumen, sum } from '../../lib/calc';
import { CASAS, cotizaciones } from '../../lib/dolar';
import { fmt, monthShort, pct } from '../../lib/format';
import { CAT_ICON } from '../../lib/model';
import { hogar, metas, movs, pmovs, prestamos } from '../../lib/store';
import { Bar } from '../common';
import { filtroPersona, mes, tab } from '../state';

export function Inicio() {
  const h = hogar.value!;
  const r = resumen(movs.value, mes.value, filtroPersona.value);
  const max = r.porCat[0]?.v || 1;
  const cf = cuotasFuturas(movs.value.filter(m => filtroPersona.value === 'Todos' || m.persona === filtroPersona.value), mes.value, 6);
  const maxCol = Math.max(1, ...cf.proximos.map(p => p.total));
  const deudas = prestamos.value.map(p => ({ p, c: prestamoCalc(p, pmovs.value, mes.value) }));
  const dolar = cotizaciones.value[h.cotizacion];

  return (
    <>
      <div class="card feature">
        <div class="stat big"><div class="l">Te queda libre este mes</div><div class="v">{fmt(r.libre)}</div></div>
        <div class="hint" style={{ marginTop: 4 }}>Ingresos − gastos − ahorro</div>
      </div>
      <div class="card">
        <div class="hero">
          <div class="stat"><div class="l">Ingresos</div><div class="v in">{fmt(r.ing)}</div></div>
          <div class="stat"><div class="l">Gastos</div><div class="v out">{fmt(r.gas)}</div></div>
          <div class="stat"><div class="l">Ahorro</div><div class="v save">{fmt(r.aho)}</div></div>
          <div class="stat"><div class="l">% del ingreso gastado</div><div class="v">{pct(r.pctGasto)}</div></div>
        </div>
        {r.enCuotas > 0 && <p class="hint" style={{ marginBottom: 0 }}>Incluye {fmt(r.enCuotas)} en cuotas.</p>}
      </div>

      {filtroPersona.value === 'Todos' && h.personas.length > 1 && (
        <div class="card"><h2>Por persona</h2>
          {h.personas.map(p => {
            const x = resumen(movs.value, mes.value, p);
            return (
              <div class="row">
                <div><div class="t">{p}</div><div class="s">Ingresos {fmt(x.ing)} · Ahorro {fmt(x.aho)}</div></div>
                <div class="num out">{fmt(x.gas)}</div>
              </div>
            );
          })}
        </div>
      )}

      <div class="card"><h2>Gasto por categoría</h2>
        {r.porCat.length ? r.porCat.map(x => (
          <div class="catrow">
            <div class="h"><span>{CAT_ICON[x.cat] || '•'} {x.cat}</span><span class="num">{fmt(x.v)} <span class="hint">{pct(x.v / r.gas)}</span></span></div>
            <Bar value={x.v / max} />
          </div>
        )) : <p class="empty">Todavía no hay gastos este mes.<br />Tocá <b>+</b> para cargar el primero.</p>}
      </div>

      {cf.activas.length > 0 && (
        <div class="card tap" onClick={() => (tab.value = 'deudas')}>
          <h2>Cuotas de los próximos meses</h2>
          <div class="cols">
            {cf.proximos.map(p => (
              <div title={fmt(p.total)}><i style={{ height: `${(p.total / maxCol) * 70}px` }} /><span>{monthShort(p.mes)}</span></div>
            ))}
          </div>
          <p class="hint" style={{ marginBottom: 0 }}>{cf.activas.length} compra{cf.activas.length > 1 ? 's' : ''} en cuotas · te quedan {fmt(cf.totalRestante)} por pagar</p>
        </div>
      )}

      {metas.value.length > 0 && (
        <div class="card tap" onClick={() => (tab.value = 'metas')}><h2>Metas de ahorro</h2>
          {metas.value.map(m => {
            const a = metaAhorrado(movs.value, m);
            return (
              <div class="catrow">
                <div class="h"><span>{m.nombre}</span><span class="num">{fmt(a, m.moneda)}{m.objetivo ? <span class="hint"> / {fmt(m.objetivo, m.moneda)}</span> : null}</span></div>
                <Bar value={m.objetivo ? a / m.objetivo : 0} color="var(--save)" />
              </div>
            );
          })}
        </div>
      )}

      {deudas.length > 0 && (
        <div class="card tap" onClick={() => (tab.value = 'deudas')}><h2>Préstamos</h2>
          <div class="row"><div class="t">Saldo total</div><div class="num out">{fmt(sum(deudas, d => d.c.saldo * (d.p.moneda === 'USD' ? cotizaciones.value[h.cotizacion]?.venta || 0 : 1)))}</div></div>
          <div class="row"><div class="t">Pagado este mes</div><div class="num">{fmt(sum(deudas.filter(d => d.p.moneda === 'ARS'), d => d.c.pagoMes))}</div></div>
        </div>
      )}

      {dolar && (
        <p class="hint" style={{ textAlign: 'center' }}>Dólar {CASAS[h.cotizacion]}: {fmt(dolar.venta)} · actualizado {new Date(dolar.fecha).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
      )}
    </>
  );
}
