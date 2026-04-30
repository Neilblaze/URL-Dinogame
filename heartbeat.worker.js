/**
 * heartbeat.worker.js — Web Worker for background-safe heartbeat tracking
 *
 * Runs off the main thread so it is NOT throttled when the tab is backgrounded.
 *
 * Protocol (main thread → worker):
 *   { type: 'START',        interval: 4000, timeout: 10000 }
 *   { type: 'PONG_RECEIVED', peerId: 'abc' }
 *   { type: 'PEER_ADDED',   peerId: 'abc' }
 *   { type: 'PEER_REMOVED', peerId: 'abc' }
 *   { type: 'STOP' }
 *
 * Protocol (worker → main thread):
 *   { type: 'SEND_PING',   targetPeerId: 'abc' }
 *   { type: 'PEER_TIMEOUT', peerId: 'abc' }
 */
"use strict";

var peers = {};       // { peerId: { lastPong: timestamp } }
var interval = 4000;  // ping every 4s
var timeout = 10000;  // dead after 10s (2.5 missed pings)
var pingTimerId = null;
var checkTimerId = null;

/** Ping all tracked peers and check for timeouts */
function tick() {
    var now = Date.now();
    var ids = Object.keys(peers);
    for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        // Request main thread to send a ping
        self.postMessage({ type: 'SEND_PING', targetPeerId: id });

        // Check for timeout
        if (now - peers[id].lastPong > timeout) {
            self.postMessage({ type: 'PEER_TIMEOUT', peerId: id });
            delete peers[id];
        }
    }
}

self.onmessage = function (e) {
    var data = e.data;
    if (!data || !data.type) return;

    switch (data.type) {
        case 'START':
            interval = data.interval || 4000;
            timeout = data.timeout || 10000;
            // Clear any existing timers
            if (pingTimerId) clearInterval(pingTimerId);
            if (checkTimerId) clearInterval(checkTimerId);
            pingTimerId = setInterval(tick, interval);
            break;

        case 'PONG_RECEIVED':
            if (data.peerId && peers[data.peerId]) {
                peers[data.peerId].lastPong = Date.now();
            }
            break;

        case 'PEER_ADDED':
            if (data.peerId) {
                peers[data.peerId] = { lastPong: Date.now() };
            }
            break;

        case 'PEER_REMOVED':
            if (data.peerId) {
                delete peers[data.peerId];
            }
            break;

        case 'STOP':
            if (pingTimerId) {
                clearInterval(pingTimerId);
                pingTimerId = null;
            }
            if (checkTimerId) {
                clearInterval(checkTimerId);
                checkTimerId = null;
            }
            peers = {};
            break;

        default:
            break;
    }
};
