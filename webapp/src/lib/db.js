/* IndexedDB ROM library — store: 'roms' (keyPath id, index addedAt) */
const DB_NAME = 'retroplay';
const DB_VERSION = 1;

function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('roms')) {
        const st = db.createObjectStore('roms', { keyPath: 'id' });
        st.createIndex('addedAt', 'addedAt');
      }
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export async function listRoms() {
  const db = await openDB();
  return new Promise((res, rej) => {
    const t = db.transaction('roms', 'readonly');
    const rq = t.objectStore('roms').getAll();
    rq.onsuccess = () => { db.close(); res(rq.result || []); };
    rq.onerror = () => { db.close(); rej(rq.error); };
  });
}

export async function getRom(id) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const t = db.transaction('roms', 'readonly');
    const rq = t.objectStore('roms').get(id);
    rq.onsuccess = () => { db.close(); res(rq.result); };
    rq.onerror = () => { db.close(); rej(rq.error); };
  });
}

export function putRom(rec) {
  return openDB().then((db) => new Promise((res, rej) => {
    const t = db.transaction('roms', 'readwrite');
    t.objectStore('roms').put(rec);
    t.oncomplete = () => { db.close(); res(true); };
    t.onerror = () => { db.close(); rej(t.error); };
  }));
}

export function deleteRom(id) {
  return openDB().then((db) => new Promise((res, rej) => {
    const t = db.transaction('roms', 'readwrite');
    t.objectStore('roms').delete(id);
    t.oncomplete = () => { db.close(); res(true); };
    t.onerror = () => { db.close(); rej(t.error); };
  }));
}

export async function storageEstimate() {
  if (!navigator.storage || !navigator.storage.estimate) return null;
  try { return await navigator.storage.estimate(); } catch (e) { return null; }
}

export function fmtSize(n) {
  if (!n && n !== 0) return '';
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1048576).toFixed(1) + ' MB';
}
