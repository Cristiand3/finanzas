import type { ComponentChildren, Ref } from 'preact';
import { useRef } from 'preact/hooks';
import { contarDigitos, fmt, formatMiles, posicionDelCursor } from '../lib/format';
import type { Moneda } from '../lib/model';
import { closeSheet } from './state';

export function Seg<T extends string>({ value, options, onChange }: {
  value: T; options: [T, string][]; onChange: (v: T) => void;
}) {
  return (
    <div class="seg" role="tablist">
      {options.map(([k, l]) => (
        <button type="button" role="tab" aria-selected={k === value} class={k === value ? 'on' : ''} onClick={() => onChange(k)}>{l}</button>
      ))}
    </div>
  );
}

/** Campo de monto: pone los puntos de miles mientras se escribe. */
export function MontoInput({ value, onValue, inputRef, class: cls = '', ...rest }: {
  value: string;
  onValue: (v: string) => void;
  inputRef?: Ref<HTMLInputElement>;
  class?: string;
  placeholder?: string;
  autocomplete?: string;
}) {
  const anterior = useRef(value);
  const onInput = (e: Event) => {
    const el = e.currentTarget as HTMLInputElement;
    const pos = el.selectionStart ?? el.value.length;
    // Si con "borrar" se comió un punto de miles, se borra el número que está antes.
    if ((e as InputEvent).inputType === 'deleteContentBackward'
      && anterior.current[pos] === '.'
      && el.value.length === anterior.current.length - 1) {
      el.value = el.value.slice(0, pos - 1) + el.value.slice(pos);
      el.setSelectionRange(pos - 1, pos - 1);
    }
    const digitosAntes = contarDigitos(el.value.slice(0, el.selectionStart ?? el.value.length));
    const formateado = formatMiles(el.value);
    el.value = formateado;
    const cursor = posicionDelCursor(formateado, digitosAntes);
    el.setSelectionRange(cursor, cursor);
    anterior.current = formateado;
    onValue(formateado);
  };
  return <input {...rest} ref={inputRef} class={`inp ${cls}`} inputmode="decimal" value={value} onInput={onInput} />;
}

export const Field = ({ label, children }: { label: string; children: ComponentChildren }) => (
  <label class="f"><span>{label}</span>{children}</label>
);

export const Bar = ({ value, color }: { value: number; color?: string }) => (
  <div class="bar"><i style={{ width: `${Math.max(0, Math.min(100, value * 100))}%`, background: color }} /></div>
);

export const Money = ({ v, moneda = 'ARS', class: cls = '' }: { v: number; moneda?: Moneda; class?: string }) => (
  <span class={`num ${cls}`}>{fmt(v, moneda)}</span>
);

export const SheetFooter = ({ children }: { children?: ComponentChildren }) => (
  <>
    {children}
    <div class="btns"><button type="button" class="btn ghost" onClick={closeSheet}>Cancelar</button></div>
  </>
);

const svg = (d: ComponentChildren) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{d}</svg>
);
export const ICONS = {
  inicio: svg(<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />),
  movs: svg(<path d="M4 6h16M4 12h16M4 18h10" />),
  metas: svg(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>),
  deudas: svg(<><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></>),
  ajustes: svg(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>),
};

export const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);
