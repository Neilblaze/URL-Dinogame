"use strict";

var peers = {};
var interval = 4000;
var timeout = 10000;
var pingTimerId = null;
var checkTimerId = null;

function tick() {
    var now = Date.now();
    var ids = Object.keys(peers);
    for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        self.postMessage({ type: 'SEND_PING', targetPeerId: id });

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
