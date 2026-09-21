import { useState } from 'preact/hooks';
import { crearHogar, parseInvitacion, unirse, user, cerrarSesion } from '../lib/store';
import { Field, Seg } from './common';
import { getInvite, clearInvite } from './invite';

const BASE = import.meta.env.BASE_URL;

export function Onboarding() {
  const nombreUsuario = (user.value?.displayName || '').split(' ')[0];
  const inv = getInvite();
  const [modo, setModo] = useState<'solo' | 'pareja'>('pareja');
  const [yo, setYo] = useState(nombreUsuario);
  const [pareja, setPareja] = useState('');
  const [link, setLink] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const join = async (i: { hid: string; code: string } | null) => {
    if (!i) { setError('El enlace no es válido.'); return; }
    setBusy(true); setError('');
    try { await unirse(i); clearInvite(); } catch (e: any) {
      console.error(e);
      setError(e?.code === 'permission-denied'
        ? 'La invitación no es válida o ya se renovó. Pedí un enlace nuevo.'
        : e?.code === 'not-found' ? 'Ese hogar ya no existe.' : 'No se pudo conectar. Revisá internet.');
    } finally { setBusy(false); }
  };

  const crear = async (e: Event) => {
    e.preventDefault();
    const personas = [yo.trim() || 'Yo', ...(modo === 'pareja' && pareja.trim() ? [pareja.trim()] : [])];
    setBusy(true); setError('');
    try { await crearHogar(modo === 'pareja' ? 'Nuestro hogar' : 'Mis finanzas', personas); }
    catch (err) { console.error(err); setError('No se pudo crear. Revisá tu conexión.'); setBusy(false); }
  };

  if (inv) return (
    <main class="wrap welcome">
      <img class="logo" src={`${BASE}icon-192.png`} alt="" />
      <h1>Te invitaron</h1>
      <p class="lead">Vas a compartir gastos, metas y deudas con quien te mandó el enlace. Los dos van a ver y cargar lo mismo.</p>
      <button class="btn" disabled={busy} onClick={() => join(inv)}>{busy ? 'Uniéndote…' : 'Unirme al hogar'}</button>
      <div class="btns"><button class="btn ghost" onClick={clearInvite}>Prefiero crear el mío</button></div>
      {error && <p class="note" style={{ color: 'var(--out)' }}>{error}</p>}
    </main>
  );

  return (
    <main class="wrap welcome">
      <h1 style={{ fontSize: 28 }}>¡Hola{nombreUsuario ? `, ${nombreUsuario}` : ''}!</h1>
      <p class="lead">Configuremos tus finanzas. Lleva menos de un minuto.</p>
      <form onSubmit={crear}>
        <Field label="¿Cómo la vas a usar?">
          <Seg value={modo} onChange={setModo} options={[['pareja', 'En pareja'], ['solo', 'Solo/a']]} />
        </Field>
        <Field label="Tu nombre"><input class="inp" value={yo} onInput={e => setYo(e.currentTarget.value)} required /></Field>
        {modo === 'pareja' && (
          <Field label="Nombre de tu pareja"><input class="inp" value={pareja} onInput={e => setPareja(e.currentTarget.value)} placeholder="Podés agregarlo después" /></Field>
        )}
        {modo === 'pareja' && <p class="hint">Después vas a poder invitarla con un enlace para que use la app desde su celular.</p>}
        <button class="btn" disabled={busy}>{busy ? 'Creando…' : 'Empezar'}</button>
      </form>
      <div class="or">¿Te mandaron una invitación?</div>
      <Field label="Pegá el enlace"><input class="inp" value={link} onInput={e => setLink(e.currentTarget.value)} placeholder="https://…#unirse=…" /></Field>
      <button class="btn ghost" disabled={busy || !link} onClick={() => join(parseInvitacion(link))}>Unirme</button>
      {error && <p class="note" style={{ color: 'var(--out)' }}>{error}</p>}
      <div style={{ textAlign: 'center', marginTop: 14 }}><button class="link" onClick={cerrarSesion}>Usar otra cuenta</button></div>
    </main>
  );
}
