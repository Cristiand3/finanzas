import { useState } from 'preact/hooks';
import {
  GoogleAuthProvider, createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword,
  signInWithPopup, signInWithRedirect, updateProfile,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Field, GoogleIcon } from './common';

const BASE = import.meta.env.BASE_URL;

export const authError = (code: string) => ({
  'auth/invalid-credential': 'Email o contraseña incorrectos.',
  'auth/wrong-password': 'Email o contraseña incorrectos.',
  'auth/user-not-found': 'No hay una cuenta con ese email.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese email. Probá entrar.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/invalid-email': 'El email no es válido.',
  'auth/too-many-requests': 'Demasiados intentos. Esperá unos minutos.',
  'auth/network-request-failed': 'Sin conexión. Revisá internet.',
  'auth/popup-closed-by-user': '',
  'auth/cancelled-popup-request': '',
} as Record<string, string>)[code] ?? 'Algo salió mal. Probá de nuevo.';

export function Login({ invitado }: { invitado: boolean }) {
  const [modo, setModo] = useState<'inicio' | 'entrar' | 'crear' | 'recuperar'>('inicio');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (f: () => Promise<unknown>) => {
    setError(''); setInfo(''); setBusy(true);
    try { await f(); } catch (e: any) { setError(authError(e?.code)); } finally { setBusy(false); }
  };

  const google = () => run(async () => {
    const p = new GoogleAuthProvider();
    try { await signInWithPopup(auth, p); } catch (e: any) {
      if (e?.code === 'auth/popup-blocked' || e?.code === 'auth/operation-not-supported-in-this-environment') await signInWithRedirect(auth, p);
      else throw e;
    }
  });

  const submit = (e: Event) => {
    e.preventDefault();
    if (modo === 'entrar') run(() => signInWithEmailAndPassword(auth, email.trim(), pass));
    if (modo === 'crear') run(async () => {
      const c = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      if (nombre.trim()) await updateProfile(c.user, { displayName: nombre.trim() });
    });
    if (modo === 'recuperar') run(async () => {
      await sendPasswordResetEmail(auth, email.trim());
      setInfo('Te mandamos un email para crear una contraseña nueva.');
    });
  };

  return (
    <main class="wrap welcome">
      <img class="logo" src={`${BASE}icon-192.png`} alt="" />
      <h1>Finanzas</h1>
      <p class="lead">{invitado ? 'Te invitaron a compartir las finanzas del hogar. Entrá para sumarte.' : 'Gastos, cuotas y ahorro en pareja, pensado para Argentina.'}</p>
      {modo === 'inicio' && !invitado && (
        <ul class="perks">
          <li><b>💳</b><span>Cuotas que se reparten solas mes a mes</span></li>
          <li><b>💵</b><span>Gastos y ahorros en pesos o en dólares</span></li>
          <li><b>👫</b><span>Compartido con tu pareja, en tiempo real</span></li>
        </ul>
      )}
      {modo === 'inicio' ? (
        <>
          <button class="btn ghost" onClick={google} disabled={busy}><GoogleIcon /> Continuar con Google</button>
          <div class="or">o</div>
          <button class="btn" onClick={() => setModo('crear')}>Crear cuenta con email</button>
          <div style={{ textAlign: 'center', marginTop: 8 }}><button class="link" onClick={() => setModo('entrar')}>Ya tengo cuenta</button></div>
        </>
      ) : (
        <form onSubmit={submit}>
          {modo === 'crear' && <Field label="Tu nombre"><input class="inp" value={nombre} onInput={e => setNombre(e.currentTarget.value)} autocomplete="given-name" required /></Field>}
          <Field label="Email"><input class="inp" type="email" value={email} onInput={e => setEmail(e.currentTarget.value)} autocomplete="email" required /></Field>
          {modo !== 'recuperar' && (
            <Field label="Contraseña"><input class="inp" type="password" value={pass} onInput={e => setPass(e.currentTarget.value)} autocomplete={modo === 'crear' ? 'new-password' : 'current-password'} minLength={6} required /></Field>
          )}
          <button class="btn" disabled={busy}>{{ entrar: 'Entrar', crear: 'Crear cuenta', recuperar: 'Enviar email' }[modo]}</button>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <button type="button" class="link" onClick={() => setModo('inicio')}>← Volver</button>
            {modo === 'entrar' && <button type="button" class="link" onClick={() => setModo('recuperar')}>Olvidé mi contraseña</button>}
          </div>
        </form>
      )}
      {error && <p class="note" style={{ color: 'var(--out)' }}>{error}</p>}
      {info && <p class="note">{info}</p>}
      <p class="legal">Al continuar aceptás los <a href={`${BASE}terminos.html`} target="_blank">Términos</a> y la <a href={`${BASE}privacidad.html`} target="_blank">Política de privacidad</a>.</p>
    </main>
  );
}
