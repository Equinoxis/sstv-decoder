const DB_NAME = "sstv-decoder";
const DB_VERSION = 1;
const STORE_NAME = "decoded-images";
export const MAX_IMAGES = 20;

/** @returns {Promise<IDBDatabase>} */
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to open IndexedDB"));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
  });
}

/**
 * @param {IDBDatabase} db
 * @param {"readonly" | "readwrite"} mode
 * @param {(store: IDBObjectStore) => Promise<T>} fn
 * @returns {Promise<T>}
 * @template T
 */
function runTransaction(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);

    fn(store)
      .then(resolve)
      .catch((err) => {
        tx.abort();
        reject(err);
      });

    tx.onerror = () => {
      reject(tx.error ?? new Error("IndexedDB transaction failed"));
    };
  });
}

/**
 * @param {IDBObjectStore} store
 * @returns {Promise<{ id: string, createdAt: number, width: number, height: number, sourceFileName: string | null, blob: Blob }[]>}
 */
function getAllSorted(store) {
  return new Promise((resolve, reject) => {
    const request = store.index("createdAt").getAll();
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to read decode history"));
  });
}

/**
 * @param {IDBObjectStore} store
 * @returns {Promise<string[]>}
 */
async function trimOldest(store) {
  const all = await getAllSorted(store);
  const evicted = [];

  while (all.length > MAX_IMAGES) {
    const oldest = all.shift();
    if (!oldest) break;
    await new Promise((resolve, reject) => {
      const req = store.delete(oldest.id);
      req.onsuccess = () => resolve(undefined);
      req.onerror = () =>
        reject(req.error ?? new Error("Failed to trim decode history"));
    });
    evicted.push(oldest.id);
  }

  return evicted;
}

/**
 * @returns {Promise<{ id: string, createdAt: number, width: number, height: number, sourceFileName: string | null, blob: Blob }[]>}
 */
export async function loadAll() {
  const db = await openDatabase();
  try {
    const records = await runTransaction(db, "readonly", (store) =>
      getAllSorted(store)
    );
    if (records.length <= MAX_IMAGES) return records;

    return runTransaction(db, "readwrite", async (store) => {
      await trimOldest(store);
      return getAllSorted(store);
    });
  } finally {
    db.close();
  }
}

/**
 * @param {{ id: string, createdAt: number, width: number, height: number, sourceFileName: string | null, blob: Blob }} record
 * @returns {Promise<{ evictedIds: string[], error: string | null }>}
 */
export async function save(record) {
  try {
    const db = await openDatabase();
    try {
      const evictedIds = await runTransaction(db, "readwrite", async (store) => {
        await new Promise((resolve, reject) => {
          const req = store.put(record);
          req.onsuccess = () => resolve(undefined);
          req.onerror = () =>
            reject(req.error ?? new Error("Failed to save decoded image"));
        });
        return trimOldest(store);
      });
      return { evictedIds, error: null };
    } finally {
      db.close();
    }
  } catch (err) {
    const name = err instanceof DOMException ? err.name : "";
    if (name === "QuotaExceededError") {
      return {
        evictedIds: [],
        error:
          "Browser storage is full. This decode is shown but was not saved to history.",
      };
    }
    console.error("Failed to save decode history:", err);
    return {
      evictedIds: [],
      error: "Could not save this decode to browser history.",
    };
  }
}

/** @param {string} id */
export async function deleteById(id) {
  const db = await openDatabase();
  try {
    await runTransaction(db, "readwrite", (store) =>
      new Promise((resolve, reject) => {
        const req = store.delete(id);
        req.onsuccess = () => resolve(undefined);
        req.onerror = () =>
          reject(req.error ?? new Error("Failed to delete decoded image"));
      })
    );
  } finally {
    db.close();
  }
}

export async function clearAll() {
  const db = await openDatabase();
  try {
    await runTransaction(db, "readwrite", (store) =>
      new Promise((resolve, reject) => {
        const req = store.clear();
        req.onsuccess = () => resolve(undefined);
        req.onerror = () =>
          reject(req.error ?? new Error("Failed to clear decode history"));
      })
    );
  } finally {
    db.close();
  }
}
