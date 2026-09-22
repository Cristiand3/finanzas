import { progresoMeta, sum } from '../../lib/calc';
import { fmt, pct } from '../../lib/format';
import { MONEDAS, MONEDA_IDS } from '../../lib/model';
import { hogar, metas, movs } from '../../lib/store';
import { Bar } from '../common';
import { MetaForm } from '../forms/Otros';
import { openSheet } from '../state';

export function Metas() {
  const h = hogar.value!;
  const totales = MONEDA_IDS
    .map(c => ({ moneda: c, total: sum(metas.value, m => progresoMeta(movs.value, m).find(x => x.moneda === c)?.ahorrado || 0) }))
    .filter(x => x.total !== 0 || x.moneda === 'ARS');

  return (
    <>
      <div class="card feature">
        <div class="stat big"><div class="l">Total ahorrado</div><div class="v">{fmt(totales[0].total, totales[0].moneda)}</div></div>
        {totales.length > 1 && <div class="hint">más {totales.slice(1).map(x => fmt(x.total, x.moneda)).join(' y ')}</div>}
      </div>

      {metas.value.map(m => {
        const avance = progresoMeta(movs.value, m);
        return (
          <div class="card tap" onClick={() => openSheet(<MetaForm meta={m} />)}>
            <div class="row" style={{ paddingTop: 0 }}>
              <div class="t">{m.nombre}</div>
              <div class="s">{avance.map(a => MONEDAS[a.moneda].simbolo).join(' + ')}</div>
            </div>
            {avance.length === 0 && <p class="hint" style={{ margin: '6px 0 0' }}>Todavía no juntaste nada. Tocá para poner un objetivo o aportar.</p>}
            {avance.map(a => (
              <div class="catrow">
                <div class="h">
                  <span>{fmt(a.ahorrado, a.moneda)} {a.objetivo
                    ? <span class="hint">de {fmt(a.objetivo, a.moneda)}</span>
                    : <span class="hint">en {MONEDAS[a.moneda].nombre.toLowerCase()}</span>}</span>
                  {a.objetivo ? <span class="pill">{pct(a.ahorrado / a.objetivo)}</span> : null}
                </div>
                <Bar value={a.objetivo ? a.ahorrado / a.objetivo : 0} color="var(--save)" />
                {a.objetivo > a.ahorrado && <div class="hint" style={{ marginTop: 4 }}>Faltan {fmt(a.objetivo - a.ahorrado, a.moneda)}</div>}
                {h.personas.length > 1 && (
                  <div class="hint">{h.personas.map(p => `${p} ${fmt(progresoMeta(movs.value, m, p).find(x => x.moneda === a.moneda)?.ahorrado || 0, a.moneda)}`).join(' · ')}</div>
                )}
              </div>
            ))}
          </div>
        );
      })}
      <button class="btn ghost" onClick={() => openSheet(<MetaForm />)}>+ Nueva meta</button>
    </>
  );
}
