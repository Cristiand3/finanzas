import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

// Configuración pública del proyecto web (el acceso lo controlan las reglas de Firestore).
const app = initializeApp({
  apiKey: 'AIzaSyBwcSiOuP96tbHSfHH2PETFx29wRV26Zk0',
  authDomain: 'finanzas-hogar-f7b51.firebaseapp.com',
  projectId: 'finanzas-hogar-f7b51',
  storageBucket: 'finanzas-hogar-f7b51.firebasestorage.app',
  messagingSenderId: '319497039110',
  appId: '1:319497039110:web:518af6c16393a0ba9e4287',
});

export const auth = getAuth(app);
auth.languageCode = 'es';
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
