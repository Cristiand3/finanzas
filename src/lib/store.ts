import { computed, signal } from '@preact/signals';
import { onAuthStateChanged, signOut, deleteUser, type User } from 'firebase/auth';
import {
  arrayRemove, arrayUnion, collection, deleteDoc, deleteField, doc, getDocs, onSnapshot, serverTimestamp,
  setDoc, updateDoc, writeBatch, type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { conObjetivos, CUENTAS_INICIALES, DEFAULTS, type Hogar, type Meta, type Mov, type Pmov, type Prestamo } from './model';

export const COLS = ['movs', 'metas', 'prestamos', 'pmovs'] as const;
export type Col = (typeof COLS)[number];

// ---------- estado ----------
export const user = signal<User | null | undefined>(undefined); // undefined = cargando
export const perfil = signal<{ hogarId?: string; persona?: string } | null | undefined>(undefined);
export const hogar = signal<Hogar | null | undefined>(undefined);
export const movs = signal<Mov[]>([]);
export const metas = signal<Meta[]>([]);
export const prestamos = signal<Prestamo[]>([]);
export const pmovs = signal<Pmov[]>([]);
export const online = signal(navigator.onLine);
export const toastMsg = signal('');
const data = { movs, metas, prestamos, pmovs } as const;

export const miPersona = computed(() => {
  const h = hogar.value, p = perfil.value?.persona;
  return h && p && h.personas.includes(p) ? p : h?.personas[0] || '';
});

let toastTimer: number | undefined;
export function toast(msg: string) {
  toastMsg.value = msg;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toastMsg.value = ''), 2200);
}
addEventListener('online', () => (online.value = true));
addEventListener('offline', () => (online.value = false));

// ---------- suscripciones ----------
let subsPerfil: Unsubscribe | null = null;
let subsHogar: Unsubscribe[] = [];
let hogarActual: string | undefined;

function limpiarHogar() {
  subsHogar.forEach(u => u());
  subsHogar = [];
  hogarActual = undefined;
  for (const c of COLS) data[c].value = [];
}

function escucharHogar(hid: string) {
  if (hogarActual === hid) return;
  limpiarHogar();
  hogarActual = hid;
  hogar.value = undefined;
  subsHogar.push(onSnapshot(doc(db, 'hogares', hid), d => {
    hogar.value = d.exists() ? ({ id: d.id, ...d.data() } as Hogar) : null;
  }, e => {
    console.error(e);
    if (e.code === 'permission-denied') { hogar.value = null; salirLocal(); }
  }));
  for (const c of COLS) {
    subsHogar.push(onSnapshot(collection(db, 'hogares', hid, c), q => {
      let docs = q.docs.map(d => d.data());
      if (c === 'metas') docs = docs.map(m => conObjetivos(m as Meta)).sort((x, y) => (x.orden || 0) - (y.orden || 0));
      (data[c] as { value: unknown[] }).value = docs;
    }, e => console.error(c, e)));
  }
}

onAuthStateChanged(auth, u => {
  // Las sesiones anónimas de la versión 1 ya no sirven: se cierran para mostrar el ingreso.
  if (u?.isAnonymous) { signOut(auth); return; }
  user.value = u;
  subsPerfil?.();
  subsPerfil = null;
  if (!u) { perfil.value = null; hogar.value = null; limpiarHogar(); return; }
  perfil.value = undefined;
  subsPerfil = onSnapshot(doc(db, 'usuarios', u.uid), d => {
    const p = (d.data() || {}) as { hogarId?: string; persona?: string };
    perfil.value = p;
    if (p.hogarId) escucharHogar(p.hogarId);
    else { limpiarHogar(); hogar.value = null; }
  }, e => { console.error(e); perfil.value = {}; });
});

// ---------- escrituras ----------
const uid = () => auth.currentUser!.uid;
const hid = () => hogar.value!.id;
const fail = (e: unknown) => { console.error(e); toast('No se pudo guardar en la nube'); };

export const newId = () => doc(collection(db, 'x')).id;
const randomCode = () => {
  const a = crypto.getRandomValues(new Uint8Array(12));
  return btoa(String.fromCharCode(...a)).replace(/\+/g, '-').replace(/\//g, '_');
};

/** Guarda (crea o reemplaza) un ítem. No espera a la red: funciona sin conexión. */
type ItemDe = { movs: Mov; metas: Meta; prestamos: Prestamo; pmovs: Pmov };
export function guardar<C extends Col>(col: C, item: ItemDe[C]) {
  setDoc(doc(db, 'hogares', hid(), col, item.id), { ...item, creadoPor: (item as Mov).creadoPor || uid() }).catch(fail);
}
export function borrar(col: Col, id: string) {
  deleteDoc(doc(db, 'hogares', hid(), col, id)).catch(fail);
}
export function actualizarHogar(p: Partial<Hogar>) {
  updateDoc(doc(db, 'hogares', hid()), p).catch(fail);
}
export function setPersona(persona: string) {
  setDoc(doc(db, 'usuarios', uid()), { persona }, { merge: true }).catch(fail);
}

export async function crearHogar(nombre: string, personas: string[]) {
  const id = newId();
  const h: Omit<Hogar, 'id'> & { creado: unknown } = {
    nombre, owner: uid(), miembros: [uid()], invite: randomCode(), personas,
    categorias: DEFAULTS.categorias, medios: DEFAULTS.medios, fuentesIngreso: DEFAULTS.fuentesIngreso,
    cuentas: CUENTAS_INICIALES,
    creado: serverTimestamp(),
  };
  await setDoc(doc(db, 'hogares', id), h);
  const b = writeBatch(db);
  for (const [i, n] of DEFAULTS.metas.entries()) {
    const m: Meta = { id: newId(), nombre: n, objetivos: {}, orden: i };
    b.set(doc(db, 'hogares', id, 'metas', m.id), m);
  }
  await b.commit();
  await setDoc(doc(db, 'usuarios', uid()), { hogarId: id, persona: personas[0] }, { merge: true });
}

export const linkInvitacion = (h: Hogar) =>
  `${location.origin}${import.meta.env.BASE_URL}#unirse=${h.id}.${h.invite}`;

export function parseInvitacion(s: string) {
  const m = String(s).match(/unirse=([\w-]+)\.([\w-]+)/) || String(s).trim().match(/^([\w-]{15,})\.([\w-]{12,})$/);
  return m ? { hid: m[1], code: m[2] } : null;
}

export async function unirse(inv: { hid: string; code: string }) {
  const ref = doc(db, 'hogares', inv.hid);
  await updateDoc(ref, { miembros: arrayUnion(uid()), joinWith: inv.code });
  await setDoc(doc(db, 'usuarios', uid()), { hogarId: inv.hid, persona: deleteField() }, { merge: true });
}

export const nuevoEnlace = () => actualizarHogar({ invite: randomCode() });

async function borrarDatosHogar(id: string) {
  for (const c of COLS) {
    const q = await getDocs(collection(db, 'hogares', id, c));
    for (let i = 0; i < q.docs.length; i += 400) {
      const b = writeBatch(db);
      q.docs.slice(i, i + 400).forEach(d => b.delete(d.ref));
      await b.commit();
    }
  }
  await deleteDoc(doc(db, 'hogares', id));
}

function salirLocal() {
  const u = auth.currentUser;
  if (u) setDoc(doc(db, 'usuarios', u.uid), { hogarId: deleteField(), persona: deleteField() }, { merge: true }).catch(console.error);
}

/** Deja el hogar. Si es el último miembro, borra todos sus datos. */
export async function salirDelHogar() {
  const h = hogar.value;
  if (!h) return;
  if (h.miembros.length <= 1) await borrarDatosHogar(h.id);
  else {
    const p: Record<string, unknown> = { miembros: arrayRemove(uid()) };
    if (h.owner === uid()) p.owner = h.miembros.find(m => m !== uid());
    await updateDoc(doc(db, 'hogares', h.id), p);
  }
  await setDoc(doc(db, 'usuarios', uid()), { hogarId: deleteField(), persona: deleteField() }, { merge: true });
}

export async function eliminarCuenta() {
  const u = auth.currentUser!;
  // Firebase exige un inicio de sesión reciente para borrar la cuenta: se verifica antes de tocar datos.
  if (Date.now() - Date.parse(u.metadata.lastSignInTime || '') > 4 * 60_000) throw { code: 'auth/requires-recent-login' };
  await salirDelHogar();
  await deleteDoc(doc(db, 'usuarios', u.uid));
  await deleteUser(u); // puede pedir volver a iniciar sesión (auth/requires-recent-login)
}

export const cerrarSesion = () => signOut(auth);

/** Importa un respaldo (de esta versión o de la versión 1) agregándolo al hogar. */
export async function importar(obj: any) {
  const h = hogar.value!;
  const metaIds = new Map<string, string>();
  const presIds = new Map<string, string>();
  const ops: [Col, { id: string } & Record<string, unknown>][] = [];
  for (const m of obj.metas || []) {
    const existente = metas.value.find(x => x.nombre.toLowerCase() === String(m.nombre).toLowerCase());
    if (existente) { metaIds.set(m.id, existente.id); continue; }
    const id = newId(); metaIds.set(m.id, id);
    const objetivos = m.objetivos || (+m.objetivo ? { [m.moneda || 'ARS']: +m.objetivo } : {});
    ops.push(['metas', { id, nombre: m.nombre, objetivos, orden: Date.now() }]);
  }
  for (const p of obj.prestamos || []) {
    const id = newId(); presIds.set(p.id, id);
    ops.push(['prestamos', { ...p, id, moneda: p.moneda || 'ARS', cuotasTotales: +p.cuotasTotales || 0, cuota: +p.cuota || 0 }]);
  }
  for (const x of obj.pmovs || []) if (presIds.has(x.prestamoId)) ops.push(['pmovs', { ...x, id: newId(), prestamoId: presIds.get(x.prestamoId) }]);
  for (const m of obj.movs || []) {
    const cuotas = typeof m.cuotas === 'number' ? m.cuotas : 1;
    ops.push(['movs', {
      ...m, id: newId(), moneda: m.moneda || 'ARS', tc: undefined, cuotas: cuotas > 1 ? cuotas : undefined,
      meta: m.meta ? metaIds.get(m.meta) : undefined, creadoPor: uid(),
    }]);
  }
  for (let i = 0; i < ops.length; i += 400) {
    const b = writeBatch(db);
    ops.slice(i, i + 400).forEach(([c, it]) => b.set(doc(db, 'hogares', h.id, c, it.id), it));
    await b.commit();
  }
  const personas = [...new Set([...h.personas, ...(obj.personas || []).filter((p: string) => !/^Persona \d$/.test(p))])];
  if (personas.length !== h.personas.length) actualizarHogar({ personas });
  return ops.length;
}
