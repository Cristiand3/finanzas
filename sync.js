// Sincronización entre celulares con Firebase (Firestore + login anónimo).
// Los datos de un hogar viven en hogares/{codigo}; quien tiene el código tiene acceso.
const FIREBASE_CONFIG = null; // ← pegar acá el firebaseConfig del proyecto

const V = '12.19.0';
const COLS = ['movs', 'pmovs', 'prestamos', 'metas'];
const CONF = ['personas', 'categorias', 'medios', 'fuentesIngreso'];
const HKEY = 'finanzas.hogar';

const Y = window.SYNC = { enabled: !!FIREBASE_CONFIG, hid: null, state: 'local', error: '', push() {} };
try { Y.hid = localStorage.getItem(HKEY) || null; } catch (e) {}

let fb, db, unsubs = [], synced = null;

const snapOf = () => {
  const o = { conf: JSON.stringify(CONF.map(k => S[k])) };
  for (const c of COLS) o[c] = new Map(S[c].map(x => [x.id, JSON.stringify(x)]));
  return o;
};
const rerender = () => render(); // solo redibuja la vista; un formulario abierto no se toca
const setState = (st, err = '') => { Y.state = st; Y.error = err; if (UI.tab === 'ajustes') rerender(); };

// Carga Firebase e inicia sesión anónima (una sola vez).
let booting = null;
function start() {
  if (!booting) booting = (async () => {
    const [app, auth, fs] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`),
    ]);
    const a = app.initializeApp(FIREBASE_CONFIG);
    db = fs.initializeFirestore(a, {
      ignoreUndefinedProperties: true,
      localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }),
    });
    fb = fs;
    const au = auth.getAuth(a);
    await au.authStateReady();
    if (!au.currentUser) await auth.signInAnonymously(au); // la primera vez necesita internet
  })().catch(e => { booting = null; throw e; });
  return booting;
}

const hogarRef = () => fb.doc(db, 'hogares', Y.hid);
const colRef = c => fb.collection(db, 'hogares', Y.hid, c);

function listen() {
  unsubs.forEach(u => u()); unsubs = [];
  const onErr = e => { console.error(e); setState('error', e.code === 'permission-denied' ? 'Sin permiso para este hogar' : 'Error de conexión'); };
  const mark = (meta) => {
    setState(meta.fromCache && !navigator.onLine ? 'offline' : 'ok');
  };
  unsubs.push(fb.onSnapshot(hogarRef(), { includeMetadataChanges: false }, d => {
    const v = d.data(); if (!v) return;
    for (const k of CONF) if (Array.isArray(v[k]) && v[k].length) S[k] = v[k];
    synced.conf = JSON.stringify(CONF.map(k => S[k]));
    localSave(); mark(d.metadata); rerender();
  }, onErr));
  for (const c of COLS) {
    unsubs.push(fb.onSnapshot(colRef(c), q => {
      S[c] = q.docs.map(d => d.data());
      synced[c] = new Map(S[c].map(x => [x.id, JSON.stringify(x)]));
      localSave(); mark(q.metadata); rerender();
    }, onErr));
  }
}
const localSave = () => { try { localStorage.setItem('finanzas.v1', JSON.stringify(S)); } catch (e) {} };

// Sube solo lo que cambió respecto de lo último sincronizado.
async function pushDiff() {
  if (!Y.hid || !db || !synced) return;
  const cur = snapOf(), ops = [];
  if (cur.conf !== synced.conf) ops.push(b => b.set(hogarRef(), Object.fromEntries(CONF.map(k => [k, S[k]])), { merge: true }));
  for (const c of COLS) {
    const prev = synced[c] || new Map();
    for (const [id, js] of cur[c]) if (prev.get(id) !== js) { const x = JSON.parse(js); ops.push(b => b.set(fb.doc(colRef(c), id), x)); }
    for (const id of prev.keys()) if (!cur[c].has(id)) ops.push(b => b.delete(fb.doc(colRef(c), id)));
  }
  synced = cur;
  for (let i = 0; i < ops.length; i += 450) {
    const b = fb.writeBatch(db);
    ops.slice(i, i + 450).forEach(f => f(b));
    b.commit().catch(e => { console.error(e); setState('error', 'No se pudo guardar en la nube'); });
  }
}
Y.push = () => { pushDiff(); };

const newCode = () => {
  const a = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...a)).replace(/\+/g, '-').replace(/\//g, '_');
};
const parseCode = s => {
  s = String(s || '').trim();
  const m = s.match(/[#&?]h=([\w-]{20,})/); if (m) return m[1];
  return /^[\w-]{20,}$/.test(s) ? s : null;
};
const inviteLink = () => location.origin + location.pathname + '#h=' + Y.hid;

Y.create = async () => {
  if (!navigator.onLine) return toast('Necesitás internet para crear el hogar');
  try {
    setState('conectando'); await start();
    Y.hid = newCode();
    synced = { conf: '', ...Object.fromEntries(COLS.map(c => [c, new Map()])) };
    await fb.setDoc(hogarRef(), { creado: fb.serverTimestamp(), ...Object.fromEntries(CONF.map(k => [k, S[k]])) });
    synced.conf = JSON.stringify(CONF.map(k => S[k]));
    localStorage.setItem(HKEY, Y.hid);
    await pushDiff();
    listen(); toast('Hogar creado ✓'); render();
  } catch (e) { console.error(e); Y.hid = null; setState('error', 'No se pudo crear el hogar'); toast('No se pudo crear el hogar'); }
};

Y.join = async (input) => {
  const code = parseCode(input);
  if (!code) return toast('El código no es válido');
  if (!navigator.onLine) return toast('Necesitás internet para unirte');
  const hasLocal = S.movs.length || S.prestamos.length || S.pmovs.length;
  if (hasLocal && !confirm('Este celular tiene datos propios. Al unirte se reemplazan por los del hogar (si querés conservarlos, descargá una copia antes). ¿Continuar?')) return;
  try {
    setState('conectando'); await start();
    const prev = Y.hid; Y.hid = code;
    const h = await fb.getDoc(hogarRef());
    if (!h.exists()) { Y.hid = prev; setState(prev ? 'ok' : 'local'); return toast('No existe un hogar con ese código'); }
    const docs = await Promise.all(COLS.map(c => fb.getDocs(colRef(c))));
    COLS.forEach((c, i) => { S[c] = docs[i].docs.map(d => d.data()); });
    for (const k of CONF) if (Array.isArray(h.data()[k])) S[k] = h.data()[k];
    synced = snapOf(); localSave();
    localStorage.setItem(HKEY, Y.hid);
    listen(); toast('Conectado al hogar ✓'); render();
  } catch (e) { console.error(e); Y.hid = null; setState('error', e.code === 'permission-denied' ? 'Sin permiso' : 'No se pudo conectar'); toast('No se pudo conectar'); }
};

Y.share = async () => {
  const url = inviteLink();
  const text = 'Sumate a nuestras finanzas: abrí este enlace en el celular';
  try { if (navigator.share) return await navigator.share({ title: 'Finanzas', text, url }); } catch (e) { return; }
  try { await navigator.clipboard.writeText(url); toast('Enlace copiado'); } catch (e) { prompt('Copiá este enlace:', url); }
};

Y.leave = () => {
  unsubs.forEach(u => u()); unsubs = []; Y.hid = null; synced = null;
  try { localStorage.removeItem(HKEY); } catch (e) {}
  setState('local'); render(); toast('Este celular ya no sincroniza');
};

addEventListener('online', () => Y.hid && setState('ok'));
addEventListener('offline', () => Y.hid && setState('offline'));

// Arranque
(async () => {
  const code = parseCode(location.hash);
  if (code) history.replaceState(null, '', location.pathname);
  if (!Y.enabled) { render(); return; }
  if (Y.hid) {
    synced = snapOf(); // lo guardado en el celular es la base; los snapshots lo corrigen
    try { setState('conectando'); await start(); await pushDiff(); listen(); } // sube lo cargado mientras conectaba
    catch (e) { setState(navigator.onLine ? 'error' : 'offline'); }
  }
  if (code && code !== Y.hid) {
    UI.tab = 'ajustes'; render();
    if (confirm('Te invitaron a un hogar compartido de Finanzas. ¿Unirte ahora?')) Y.join(code);
  } else render();
})();
