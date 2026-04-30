/**
 * idb-store.js — IndexedDB wrapper for Dino-C Multiplayer post-game logs
 *
 * API:
 *   IDBStore.writeLog(gameLog)    → Promise<void>
 *   IDBStore.readLogs()           → Promise<GameLog[]>
 *   IDBStore.cleanExpired()       → Promise<void>
 *
 * Database: dinoc-multiplayer, version 1
 * Object store: game_logs (keyPath: 'id')
 * TTL: 7 days from game start
 *
 * All operations wrapped in try/catch — failures are silent (§11.19).
 */
"use strict";

(function () {
    var DB_NAME = 'dinoc-multiplayer';
    var DB_VERSION = 1;
    var STORE_NAME = 'game_logs';
    var TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

    var dbPromise = null;

    /** Open (or create) the database. Returns a Promise<IDBDatabase>. */
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

    /**
     * Write a game log entry to IndexedDB.
     * @param {object} gameLog — must have an `id` field (crypto.randomUUID())
     * @returns {Promise<void>}
     */
    function writeLog(gameLog) {
        return openDB().then(function (db) {
            return new Promise(function (resolve, reject) {
                try {
                    // Ensure TTL is set
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
        }).catch(function () {
            // Silent failure per §11.19
        });
    }

    /**
     * Read all game logs from IndexedDB.
     * @returns {Promise<Array>}
     */
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

    /**
     * Delete expired entries where ttl < Date.now().
     * Called once on page load (fire-and-forget).
     * @returns {Promise<void>}
     */
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
        }).catch(function () {
            // Silent failure
        });
    }

    // Expose globally
    window.IDBStore = {
        writeLog: writeLog,
        readLogs: readLogs,
        cleanExpired: cleanExpired
    };

    // Run TTL cleanup on load (async, non-blocking)
    if (typeof indexedDB !== 'undefined') {
        setTimeout(function () { cleanExpired(); }, 100);
    }
})();
