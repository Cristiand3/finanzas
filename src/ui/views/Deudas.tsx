import { cuotasFuturas, prestamoCalc } from '../../lib/calc';
import { fmt, monthName, monthShort, pct } from '../../lib/format';
import { CAT_ICON, MONEDAS } from '../../lib/model';
import { movs, pmovs, prestamos } from '../../lib/store';
import { Bar } from '../common';
import { MovForm } from '../forms/MovForm';
import { PrestamoDetalle, PrestamoForm } from '../forms/Otros';
import { mes, monedaVista, openSheet } from '../state';

export function Deudas() {
  const moneda = monedaVista.value;
  const cf = cuotasFuturas(movs.value, mes.value, 6, moneda);
  const maxCol = Math.max(1, ...cf.proximos.map(p => p.total));
  return (
    <>
      <div class="card feature">
        <div class="stat big"><div class="l">Compras en cuotas: te falta pagar</div><div class="v">{fmt(cf.totalRestante, moneda)}</div></div>
        <div class="hint">Incluye la cuota de {monthName(mes.value).toLowerCase()}</div>
      </div>

      {cf.activas.length > 0 ? (
        <>
          <div class="card"><h2>Próximos meses</h2>
            <div class="cols">
              {cf.proximos.map(p => (
                <div title={fmt(p.total, moneda)}><i style={{ height: `${(p.total / maxCol) * 70}px` }} /><span>{monthShort(p.mes)}</span></div>
              ))}
            </div>
            {cf.proximos.slice(0, 3).map(p => <div class="row"><span>{monthName(p.mes)}</span><span class="num">{fmt(p.total, moneda)}</span></div>)}
          </div>
          <div class="card"><h2>Compras en cuotas</h2>
            {cf.activas.map(a => (
              <div class="row tap" onClick={() => openSheet(<MovForm mov={a.mov} />)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div class="t">{CAT_ICON[a.mov.cat] || '•'} {a.mov.desc || a.mov.cat}</div>
                  <div class="s">{a.k < 1 ? `Empieza en ${monthName(a.mov.desde!).toLowerCase()}` : `Cuota ${a.k} de ${a.n}`} · {a.mov.persona}{a.mov.medio ? ` · ${a.mov.medio}` : ''}</div>
                  <Bar value={Math.max(0, a.k - 1) / a.n} />
                </div>
                <div class="num">{fmt(a.restante, moneda)}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p class="hint" style={{ textAlign: 'center' }}>Cuando cargues un gasto en cuotas en {MONEDAS[moneda].nombre.toLowerCase()}, lo vas a ver acá repartido mes a mes.</p>
      )}

      <h2 class="pagetitle" style={{ fontSize: 18, marginTop: 22 }}>Préstamos y deudas</h2>
      {prestamos.value.map(p => {
        const c = prestamoCalc(p, pmovs.value, mes.value);
        return (
          <div class="card tap" onClick={() => openSheet(<PrestamoDetalle id={p.id} />)}>
            <div class="row" style={{ paddingTop: 0 }}>
              <div>
                <div class="t">{p.nombre} {p.moneda !== 'ARS' && <span class="pill usd">{MONEDAS[p.moneda].simbolo}</span>}</div>
                <div class="s">{[p.persona, p.cuotasTotales ? `${c.cuotasPagadas}/${p.cuotasTotales} cuotas` : 'pago variable', p.fin ? `fin ${monthName(p.fin).toLowerCase()}` : ''].filter(Boolean).join(' · ')}</div>
              </div>
              <span class="pill">{pct(c.progreso)}</span>
            </div>
            <Bar value={c.progreso} />
            <div class="hero" style={{ marginTop: 10 }}>
              <div class="stat"><div class="l">Saldo</div><div class="v out">{fmt(c.saldo, p.moneda)}</div></div>
              <div class="stat"><div class="l">{p.cuotasTotales ? 'Cuotas restantes' : 'Sugerido por mes'}</div><div class="v">{p.cuotasTotales ? c.restantes : c.sugerido != null ? fmt(c.sugerido, p.moneda) : '—'}</div></div>
              <div class="stat"><div class="l">Pagado este mes</div><div class="v">{fmt(c.pagoMes, p.moneda)}</div></div>
              <div class="stat"><div class="l">Pagado en total</div><div class="v">{fmt(c.pagado, p.moneda)}</div></div>
            </div>
          </div>
        );
      })}
      <button class="btn ghost" onClick={() => openSheet(<PrestamoForm />)}>+ Agregar préstamo o deuda</button>
    </>
  );
}
