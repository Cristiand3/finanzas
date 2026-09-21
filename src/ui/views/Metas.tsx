import { metaAhorrado, sum } from '../../lib/calc';
import { cotizaciones } from '../../lib/dolar';
import { fmt, pct } from '../../lib/format';
import { hogar, metas, movs } from '../../lib/store';
import { Bar } from '../common';
import { MetaForm } from '../forms/Otros';
import { openSheet } from '../state';

export function Metas() {
  const h = hogar.value!;
  const usd = cotizaciones.value[h.cotizacion]?.venta || 0;
  const enPesos = sum(metas.value, m => metaAhorrado(movs.value, m) * (m.moneda === 'USD' ? usd : 1));
  return (
    <>
      <div class="card feature">
        <div class="stat big"><div class="l">Total ahorrado</div><div class="v">{fmt(enPesos)}</div></div>
        {usd > 0 && <div class="hint">≈ {fmt(enPesos / usd, 'USD')} al dólar de hoy</div>}
      </div>
      {metas.value.map(m => {
        const a = metaAhorrado(movs.value, m);
        return (
          <div class="card tap" onClick={() => openSheet(<MetaForm meta={m} />)}>
            <div class="row" style={{ paddingTop: 0 }}>
              <div>
                <div class="t">{m.nombre} {m.moneda === 'USD' && <span class="pill usd">US$</span>}</div>
                <div class="s">{h.personas.map(p => `${p} ${fmt(metaAhorrado(movs.value, m, p), m.moneda)}`).join(' · ')}</div>
              </div>
              <span class="pill">{m.objetivo ? pct(a / m.objetivo) : 'sin objetivo'}</span>
            </div>
            <Bar value={m.objetivo ? a / m.objetivo : 0} color="var(--save)" />
            <div class="hero" style={{ marginTop: 10 }}>
              <div class="stat"><div class="l">Ahorrado</div><div class="v">{fmt(a, m.moneda)}</div></div>
              <div class="stat"><div class="l">{m.objetivo ? 'Faltan' : 'Objetivo'}</div><div class="v">{m.objetivo ? fmt(Math.max(0, m.objetivo - a), m.moneda) : '—'}</div></div>
            </div>
          </div>
        );
      })}
      <button class="btn ghost" onClick={() => openSheet(<MetaForm />)}>+ Nueva meta</button>
    </>
  );
}
