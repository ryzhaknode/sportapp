const DB_NAME = 'gym-abc-offline'
const DB_VERSION = 1

const STORE_SNAPSHOT = 'programSnapshot'
const STORE_SESSIONS = 'localSessions'

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('INDEXEDDB_UNAVAILABLE'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error ?? new Error('IDB_OPEN_FAILED'))
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_SNAPSHOT)) {
        db.createObjectStore(STORE_SNAPSHOT)
      }
      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        db.createObjectStore(STORE_SESSIONS, { keyPath: 'localId' })
      }
    }
    req.onsuccess = () => resolve(req.result)
  })

const txDone = (tx: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IDB_TX_FAILED'))
    tx.onabort = () => reject(tx.error ?? new Error('IDB_TX_ABORTED'))
  })

export const idbGetSnapshot = async <T>(): Promise<T | null> => {
  const db = await openDb()
  const tx = db.transaction(STORE_SNAPSHOT, 'readonly')
  const store = tx.objectStore(STORE_SNAPSHOT)
  const value = await new Promise<T | undefined>((resolve, reject) => {
    const req = store.get('current')
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error)
  })
  await txDone(tx)
  db.close()
  return value ?? null
}

export const idbPutSnapshot = async <T>(value: T): Promise<void> => {
  const db = await openDb()
  const tx = db.transaction(STORE_SNAPSHOT, 'readwrite')
  tx.objectStore(STORE_SNAPSHOT).put(value, 'current')
  await txDone(tx)
  db.close()
}

export const idbPutSession = async <T extends { localId: string }>(record: T): Promise<void> => {
  const db = await openDb()
  const tx = db.transaction(STORE_SESSIONS, 'readwrite')
  tx.objectStore(STORE_SESSIONS).put(record)
  await txDone(tx)
  db.close()
}

export const idbGetSession = async <T extends { localId: string }>(
  localId: string,
): Promise<T | null> => {
  const db = await openDb()
  const tx = db.transaction(STORE_SESSIONS, 'readonly')
  const store = tx.objectStore(STORE_SESSIONS)
  const value = await new Promise<T | undefined>((resolve, reject) => {
    const req = store.get(localId)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error)
  })
  await txDone(tx)
  db.close()
  return value ?? null
}

export const idbListSessions = async <T>(): Promise<T[]> => {
  const db = await openDb()
  const tx = db.transaction(STORE_SESSIONS, 'readonly')
  const store = tx.objectStore(STORE_SESSIONS)
  const rows = await new Promise<T[]>((resolve, reject) => {
    const req = store.getAll()
    req.onsuccess = () => resolve((req.result ?? []) as T[])
    req.onerror = () => reject(req.error)
  })
  await txDone(tx)
  db.close()
  return rows
}

export const idbDeleteSession = async (localId: string): Promise<void> => {
  const db = await openDb()
  const tx = db.transaction(STORE_SESSIONS, 'readwrite')
  tx.objectStore(STORE_SESSIONS).delete(localId)
  await txDone(tx)
  db.close()
}
