"use strict";

(function () {
    var DB_NAME = 'dinoc-multiplayer';
    var DB_VERSION = 1;
    var STORE_NAME = 'game_logs';
    var TTL_MS = 7 * 24 * 60 * 60 * 1000;

    var dbPromise = null;

    function openDB() {
        if (dbPromise) return dbPromise;
        dbPromise = new Promise(function (resolve, reject) {
            try {
                var request = indexedDB.open(DB_NAME, DB_VERSION);

                request.onupgradeneeded = function (e) {
                    var db = e.target.result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        var store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                        store.createIndex('ttl', 'ttl', { unique: false });
                    }
                };

                request.onsuccess = function (e) {
                    resolve(e.target.result);
                };

                request.onerror = function () {
                    console.warn('[IDBStore] Failed to open database');
                    reject(request.error);
                };
            } catch (err) {
                console.warn('[IDBStore] IndexedDB unavailable:', err);
                reject(err);
            }
        });
        return dbPromise;
    }

    function writeLog(gameLog) {
        return openDB().then(function (db) {
            return new Promise(function (resolve, reject) {
                try {
                    if (!gameLog.ttl) {
                        gameLog.ttl = (gameLog.startedAt || Date.now()) + TTL_MS;
                    }
                    var tx = db.transaction(STORE_NAME, 'readwrite');
                    var store = tx.objectStore(STORE_NAME);
                    store.put(gameLog);
                    tx.oncomplete = function () { resolve(); };
                    tx.onerror = function () {
                        console.warn('[IDBStore] Write failed:', tx.error);
                        reject(tx.error);
                    };
                } catch (err) {
                    console.warn('[IDBStore] Write error:', err);
                    reject(err);
                }
            });
        }).catch(function () {});
    }

    function readLogs() {
        return openDB().then(function (db) {
            return new Promise(function (resolve, reject) {
                try {
                    var tx = db.transaction(STORE_NAME, 'readonly');
                    var store = tx.objectStore(STORE_NAME);
                    var request = store.getAll();
                    request.onsuccess = function () {
                        resolve(request.result || []);
                    };
                    request.onerror = function () {
                        reject(request.error);
                    };
                } catch (err) {
                    reject(err);
                }
            });
        }).catch(function () {
            return [];
        });
    }

    function cleanExpired() {
        return openDB().then(function (db) {
            return new Promise(function (resolve, reject) {
                try {
                    var tx = db.transaction(STORE_NAME, 'readwrite');
                    var store = tx.objectStore(STORE_NAME);
                    var idx = store.index('ttl');
                    var now = Date.now();
                    var range = IDBKeyRange.upperBound(now);
                    var request = idx.openCursor(range);

                    request.onsuccess = function (e) {
                        var cursor = e.target.result;
                        if (cursor) {
                            cursor.delete();
                            cursor.continue();
                        }
                    };

                    tx.oncomplete = function () { resolve(); };
                    tx.onerror = function () {
                        console.warn('[IDBStore] Cleanup error:', tx.error);
                        reject(tx.error);
                    };
                } catch (err) {
                    reject(err);
                }
            });
        }).catch(function () {});
    }

    window.IDBStore = {
        writeLog: writeLog,
        readLogs: readLogs,
        cleanExpired: cleanExpired
    };

    if (typeof indexedDB !== 'undefined') {
        setTimeout(function () { cleanExpired(); }, 100);
    }
})();
