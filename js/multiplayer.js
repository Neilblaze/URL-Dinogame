"use strict";
/**
 * multiplayer.js — P2P Multiplayer Manager for Dino-C (PeerJS/WebRTC)
 * Host-authoritative star topology. Score-only sync. Max 6 players.
 */
(function(){
var MAX_PLAYERS=6,SCORE_INTERVAL=150,LB_INTERVAL=200,CONNECT_TIMEOUT=5000;
var PING_INTERVAL=4000,PING_TIMEOUT=10000;
var STATES={IDLE:'IDLE',SETUP:'SETUP',LOBBY_HOST:'LOBBY_HOST',LOBBY_CLIENT:'LOBBY_CLIENT',
  CONNECTING:'CONNECTING',COUNTDOWN:'COUNTDOWN',IN_GAME:'IN_GAME',GAME_OVER:'GAME_OVER'};

// BroadcastChannel multi-tab guard
var bc=null;
try{bc=new BroadcastChannel('dinoc-mp');}catch(e){}
var otherTabOpen=false;
if(bc){bc.onmessage=function(e){
  if(e.data&&e.data.type==='MP_SESSION_OPEN'){otherTabOpen=true;var f=document.getElementById('mp-fab');if(f)f.disabled=true;showToast('⚠ Multiplayer is already open in another tab','warning');}
  if(e.data&&e.data.type==='MP_SESSION_CLOSED'){otherTabOpen=false;var f2=document.getElementById('mp-fab');if(f2)f2.disabled=false;}
};}

// DEV ONLY — remove before shipping
function generateRoomCode(){
  var forced = new URLSearchParams(window.location.search).get('forceRoom');
  if (forced) return forced.toUpperCase().slice(0, 6);
  var u=safeUUID().replace(/-/g,'').slice(0,6);
  return u.toUpperCase().replace(/[^A-Z0-9]/g,'A');
}

// Generate a single abstract catchy room name (one word, ≤12 chars)
function generateRoomName(){
  var names=[
    // Cosmic / energy
    'Vortex','Nebula','Pulsar','Quasar','Zenith','Solstice','Eclipse','Aurora','Equinox','Aphelion',
    // Chaos / intensity
    'Mayhem','Havoc','Bedlam','Frenzy','Tumult','Rampage','Uproar','Maelstrom','Cataclysm','Carnage',
    // Weather / force
    'Tempest','Typhoon','Cyclone','Zephyr','Blizzard','Wildfire','Torrent','Squall','Inferno','Avalanche',
    // Motion / speed
    'Surge','Blitz','Flux','Drift','Warp','Hyperdrive','Overdrive','Ricochet','Freefall','Slipstream',
    // Mystical / abstract
    'Phantom','Specter','Mirage','Paradox','Anomaly','Catalyst','Cipher','Renegade','Reckoning','Oblivion',
    // Sci-fi / tech
    'Nexus','Apex','Glitch','Static','Overload','Blackout','Override','Protocol','Axiom','Datastream',
    // Sharp / punchy
    'Wraith','Marauder','Rampart','Basilisk','Raptor','Chimera','Nomad','Revenant','Banshee','Colossus',
    // Elemental
    'Magma','Abyssal','Tundra','Solaris','Lithium','Ferrite','Photon','Plasma','Neutron','Verdant',
    // Mythic
    'Valkyrie','Leviathan','Behemoth','Seraphim','Nemesis','Aegis','Ragnarok','Elysium','Pandora','Oracle'
  ];
  return names[Math.floor(Math.random()*names.length)];
}

function sanitizeName(n){return(n||'').replace(/<[^>]*>/g,'').trim().slice(0,16)||'Player';}

function JoinQueue(){this._q=Promise.resolve();}
JoinQueue.prototype.enqueue=function(fn){this._q=this._q.then(fn).catch(function(){});return this._q;};

function MultiplayerManager(){
  this.state=STATES.IDLE;
  this.peer=null;
  this.connections={};// peerId -> DataConnection
  this.roomCode='';
  this.isHost=false;
  this.localPlayerId=safeUUID();
  this.localPlayerName='';
  this.players=new Map();
  this.startTimestamp=null;
  this.gameDuration=null;
  this.worker=null;
  this.scoreTimer=null;
  this.lbTimer=null;
  this.joinQueue=new JoinQueue();
  this.gameOverTriggered=false;
  this.clientGameEndTimeout=null;
  this._seq=0;
  this._listeners={};
  this._disconnectingPeers={};// Track peers being disconnected to prevent duplicates
  this._workerStopping=false;// Flag to prevent worker messages during shutdown
  this._workerHandler=null;// Store worker message handler reference
}
var P=MultiplayerManager.prototype;

P.on=function(ev,fn){if(!this._listeners[ev])this._listeners[ev]=[];this._listeners[ev].push(fn);};
P.emit=function(ev,data){var ls=this._listeners[ev]||[];for(var i=0;i<ls.length;i++)try{ls[i](data);}catch(e){console.error(e);}};

P.transition=function(s){
  if(this.state===s)return;
  var old=this.state;this.state=s;
  console.log('[MP] '+old+' → '+s);
  this.emit('stateChange',{from:old,to:s});
};

function safeUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try { return crypto.randomUUID(); } catch(e){}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

P._peerConfig=function(){
  return{debug:0,config:{iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]}};
};

P._msg=function(type,payload){
  return{type:type,senderId:this.localPlayerId,timestamp:Date.now(),payload:payload||{}};
};

P._send=function(conn,type,payload){try{conn.send(this._msg(type,payload));}catch(e){}};
P._broadcast=function(type,payload){
  var self=this;var keys=Object.keys(self.connections);
  for(var i=0;i<keys.length;i++)self._send(self.connections[keys[i]],type,payload);
};

P._startWorker=function(){
  if(this.worker)return;
  try{this.worker=new Worker('heartbeat.worker.js');
    var self=this;
    // ★ Store worker message handler to prevent duplicates
    this._workerHandler=function(e){
      var d=e.data;if(!d)return;
      // ★ Ignore messages if worker is being stopped
      if(self._workerStopping)return;
      
      if(d.type==='SEND_PING'){
        if(self.isHost&&self.connections[d.targetPeerId])self._send(self.connections[d.targetPeerId],'HEARTBEAT',{seq:self._seq++});
        else if(!self.isHost&&self.peer)try{/* client pings host via stored conn */
          var keys=Object.keys(self.connections);if(keys.length)self._send(self.connections[keys[0]],'HEARTBEAT',{seq:self._seq++});
        }catch(ex){}
      }
      if(d.type==='PEER_TIMEOUT'){
        if(self.isHost)self._handleClientDisconnect(d.peerId);
        else self._handleHostDisconnect();
      }
    };
    this.worker.onmessage=this._workerHandler;
    this.worker.postMessage({type:'START',interval:PING_INTERVAL,timeout:PING_TIMEOUT});
  }catch(e){console.warn('[MP] Worker init failed',e);}
};

P._stopWorker=function(){
  if(this.worker){
    // ★ Set flag to ignore incoming messages during shutdown
    this._workerStopping=true;
    this.worker.postMessage({type:'STOP'});
    this.worker.terminate();
    this.worker=null;
    this._workerHandler=null;
    // ★ Reset flag after cleanup
    setTimeout(function(){this._workerStopping=false;}.bind(this),100);
  }
};

// ── Host: Create Room ──
P.createRoom=function(playerName){
  if(typeof Peer==='undefined'){showToast('⚠ Multiplayer unavailable','error');return;}
  var self=this;
  self.localPlayerName=sanitizeName(playerName);
  self.isHost=true;
  self.gameOverTriggered=false;
  
  // ★ No custom ID — let PeerJS assign a guaranteed-unique one
  self.peer=new Peer(undefined,self._peerConfig());

  self.peer.on('open',function(){
    // ★ Generate a funny room name instead of hex code
    self.hostPeerId=self.peer.id;
    self.roomCode=generateRoomName();
    
    console.log('[MP] Host peer ID:',self.hostPeerId,'| Room name:',self.roomCode);
    
    self.players.set(self.localPlayerId,{
      id:self.localPlayerId,name:self.localPlayerName,score:0,isDead:false,
      isReady:true,isHost:true,isDisconnected:false,connectionId:'local',
      lastScoreTimestamp:0,lastHeartbeatTimestamp:Date.now(),cheatFlagCount:0
    });
    self.transition(STATES.LOBBY_HOST);
    self.emit('roomCreated',{roomCode:self.roomCode,hostPeerId:self.hostPeerId});
    if(bc)bc.postMessage({type:'MP_SESSION_OPEN'});
    self._startWorker();
  });

  self.peer.on('connection',function(conn){
    console.log('[MP] Host received connection from:',conn.peer);
    self.joinQueue.enqueue(function(){return self._processJoin(conn);});
  });

  self.peer.on('disconnected',function(){
    console.warn('[MP] Host disconnected from signaling server, reconnecting...');
    if(self.peer&&!self.peer.destroyed)self.peer.reconnect();
  });

  self.peer.on('error',function(err){
    console.error('[MP] Peer error',err);
    showToast('⚠ Host network error. Falling back to single player.','error');
    self.destroy();
  });
};

P._processJoin=function(conn){
  var self=this;
  return new Promise(function(resolve){
    // ★ Track if disconnect was already handled for this connection
    var disconnectHandled=false;
    
    // ★ Set up close/error handlers immediately when connection opens
    conn.on('close',function(){
      // ★ Don't handle disconnect if connection is being intentionally destroyed
      if(disconnectHandled||conn._mpDestroying)return;
      disconnectHandled=true;
      console.log('[MP] Client connection closed:',conn.peer);
      self._handleClientDisconnect(conn.peer);
    });
    
    conn.on('error',function(err){
      // ★ Don't handle disconnect if connection is being intentionally destroyed
      if(disconnectHandled||conn._mpDestroying)return;
      disconnectHandled=true;
      console.error('[MP] Client connection error:',conn.peer,err);
      self._handleClientDisconnect(conn.peer);
    });
    
    conn.on('open',function(){
      // Wait for JOIN message
      var joined=false;
      conn.on('data',function onData(msg){
        if(joined)return self._handleMessage(conn,msg);
        if(!msg||msg.type!=='JOIN'){conn.close();resolve();return;}
        joined=true;
        // Check capacity & state
        if(self.state===STATES.IN_GAME||self.state===STATES.COUNTDOWN){
          self._send(conn,'REJECT',{reason:'started'});conn.close();resolve();return;
        }
        if(self.players.size>=MAX_PLAYERS){
          self._send(conn,'REJECT',{reason:'full'});conn.close();resolve();return;
        }
        // Deduplicate name
        var name=sanitizeName(msg.payload.playerName);
        var existingNames=[];self.players.forEach(function(p){existingNames.push(p.name);});
        var baseName=name;var suf=2;
        while(existingNames.indexOf(name)!==-1){name=baseName.slice(0,13)+' #'+suf++;} 

        var playerId=msg.payload.playerId||safeUUID();
        var ps={id:playerId,name:name,score:0,isDead:false,isReady:false,isHost:false,
          isDisconnected:false,connectionId:conn.peer,lastScoreTimestamp:0,
          lastHeartbeatTimestamp:Date.now(),cheatFlagCount:0};
        self.players.set(playerId,ps);
        self.connections[conn.peer]=conn;

        // Send ACCEPT
        var pArr=[];self.players.forEach(function(p){pArr.push({id:p.id,name:p.name,isHost:p.isHost,isReady:p.isReady});});
        var diff=localStorage.getItem('diffPref')||'med';
        var spd=parseInt(localStorage.getItem('speedPref')||'100',10);
        self._send(conn,'ACCEPT',{roomCode:self.roomCode,players:pArr,hostName:self.localPlayerName,settings:{difficulty:diff,speed:spd}});
        self._broadcast('PLAYER_JOINED',{player:{id:ps.id,name:ps.name,isHost:false}});

        if(self.worker)self.worker.postMessage({type:'PEER_ADDED',peerId:conn.peer});
        self.emit('playerJoined',ps);
        self.emit('lobbyUpdate',self._playerArray());
        showToast('🦕 '+name+' joined the room','info');
        // Play join sound
        var btn=document.querySelector('.sound-btn');
        if(btn&&btn.innerHTML==='Sound: on'){
          var audio=document.getElementById('join-sound');
          if(audio){audio.currentTime=0;audio.play().catch(function(){});}
        }
        resolve();
      });
    });
    // Timeout
    setTimeout(function(){resolve();},CONNECT_TIMEOUT);
  });
};

// ── Client: Join Room ──
// joinRoom now accepts the full hostPeerId (from invite URL)
P.joinRoom=function(hostPeerId,playerName){
  if(typeof Peer==='undefined'){showToast('⚠ Multiplayer unavailable','error');return Promise.reject('no-peerjs');}
  var self=this;
  self.localPlayerName=sanitizeName(playerName);
  // ★ Store the full peer ID for connection — room name will be received from host
  self.hostPeerId=hostPeerId;
  self.roomCode='Connecting...'; // Temporary, will be updated from ACCEPT message
  self.isHost=false;
  self.gameOverTriggered=false;
  self.transition(STATES.CONNECTING);

  return new Promise(function(resolve,reject){
    var settled=false;
    function settle(fn,val){if(settled)return;settled=true;fn(val);}
    var connTimeout=null;
    function clearTimers(){clearTimeout(timer);clearTimeout(connTimeout);}
    
    var timer=setTimeout(function(){
      clearTimers();
      showToast('⚠ Connection timed out. Check the invite link.','error');
      self.destroy();settle(reject,'timeout');
    },CONNECT_TIMEOUT);

    // ★ Client also uses undefined — no custom ID needed
    self.peer=new Peer(undefined,self._peerConfig());

    self.peer.on('open',function(){
      console.log('[MP] Client peer opened:',self.peer.id);
      console.log('[MP] Connecting to host peer:',self.hostPeerId);

      var conn=self.peer.connect(self.hostPeerId,{reliable:true,serialization:'json'});

      connTimeout=setTimeout(function(){
        if(conn&&!conn.open){
          clearTimers();
          showToast('⚠ Host not found. The room may have closed.','error');
          self.destroy();settle(reject,'connection-timeout');
        }
      },4000);

      conn.on('open',function(){
        clearTimeout(connTimeout);
        conn._mpClosed=false;
        console.log('[MP] Connected to host');
        self.connections[conn.peer]=conn;
        self._send(conn,'JOIN',{playerName:self.localPlayerName,playerId:self.localPlayerId});
      });

      conn.on('data',function(msg){
        self._handleMessage(conn,msg);
        if(msg.type==='ACCEPT'){clearTimers();settle(resolve,msg.payload);}
        if(msg.type==='REJECT'){
          clearTimers();
          conn._mpClosed=true;
          var reason=msg.payload.reason;
          showToast('❌ '+(reason==='full'?'Room is full (6/6)':reason==='started'?'Game already in progress':'Connection rejected'),'error');
          self.destroy();settle(reject,reason);
        }
      });

      conn.on('close',function(){
        clearTimeout(connTimeout);
        if(conn._mpClosed)return;
        conn._mpClosed=true;
        if(self.state!==STATES.IDLE&&self.state!==STATES.GAME_OVER)self._handleHostDisconnect();
      });

      conn.on('error',function(err){
        clearTimers();
        console.error('[MP] Connection error:',err);
        showToast('⚠ Connection error','error');
        self.destroy();settle(reject,'error');
      });
    });

    self.peer.on('error',function(err){
      clearTimers();
      console.error('[MP] Client peer error:',err);
      if(err.type==='peer-unavailable'){
        showToast('⚠ Host not found. The room may have closed.','error');
      }else if(err.type==='network'){
        showToast('⚠ Network error. Check your connection.','error');
      }else{
        showToast('⚠ Connection failed: '+(err.type||'Unknown'),'error');
      }
      self.destroy();settle(reject,err);
    });
  });
};

// ── Message Router ──
P._handleMessage=function(conn,msg){
  if(!msg||!msg.type)return;
  var self=this;var p;
  switch(msg.type){
    case'ACCEPT':
      self.transition(STATES.LOBBY_CLIENT);
      // ★ Set room code from host
      if(msg.payload.roomCode)self.roomCode=msg.payload.roomCode;
      if(msg.payload.players){
        for(var i=0;i<msg.payload.players.length;i++){
          var pl=msg.payload.players[i];
          self.players.set(pl.id,{id:pl.id,name:pl.name,score:0,isDead:false,isReady:pl.isReady||false,
            isHost:pl.isHost||false,isDisconnected:false,connectionId:'',lastScoreTimestamp:0,lastHeartbeatTimestamp:Date.now(),cheatFlagCount:0});
        }
      }
      // Add self
      self.players.set(self.localPlayerId,{id:self.localPlayerId,name:self.localPlayerName,score:0,isDead:false,
        isReady:false,isHost:false,isDisconnected:false,connectionId:'local',lastScoreTimestamp:0,lastHeartbeatTimestamp:Date.now(),cheatFlagCount:0});
      if(msg.payload.settings)self.emit('settingsSync',msg.payload.settings);
      self.emit('lobbyUpdate',self._playerArray());
      if(bc)bc.postMessage({type:'MP_SESSION_OPEN'});
      self._startWorker();
      if(self.worker)self.worker.postMessage({type:'PEER_ADDED',peerId:conn.peer});
      break;
    case'PLAYER_JOINED':
      if(msg.payload.player){var pj=msg.payload.player;
        self.players.set(pj.id,{id:pj.id,name:pj.name,score:0,isDead:false,isReady:false,isHost:pj.isHost||false,
          isDisconnected:false,connectionId:'',lastScoreTimestamp:0,lastHeartbeatTimestamp:Date.now(),cheatFlagCount:0});
        self.emit('lobbyUpdate',self._playerArray());
        showToast('🦕 '+pj.name+' joined the room','info');
        // Play join sound
        var btn=document.querySelector('.sound-btn');
        if(btn&&btn.innerHTML==='Sound: on'){
          var audio=document.getElementById('join-sound');
          if(audio){audio.currentTime=0;audio.play().catch(function(){});}
        }
      }break;
    case'PLAYER_LEFT':
      if(msg.payload.playerId){self.players.delete(msg.payload.playerId);self.emit('lobbyUpdate',self._playerArray());
        showToast('💨 A player left the room','warning');
        // Play leave sound
        var btn=document.querySelector('.sound-btn');
        if(btn&&btn.innerHTML==='Sound: on'){
          var audio=document.getElementById('leave-sound');
          if(audio){audio.currentTime=0;audio.play().catch(function(){});}
        }
      }break;
    case'SETTINGS_SYNC':
      if(self.state===STATES.LOBBY_CLIENT){self.emit('settingsSync',msg.payload);
        var diffLabel=msg.payload.difficulty||'';
        showToast('⚙️ Host changed settings'+(diffLabel?' to '+diffLabel:''),'info');}break;
    case'READY_TOGGLE':
      if(self.isHost&&msg.payload.playerId){p=self.players.get(msg.payload.playerId);
        if(p){p.isReady=!!msg.payload.isReady;self.emit('lobbyUpdate',self._playerArray());
          self._broadcast('PLAYER_READY',{playerId:p.id,isReady:p.isReady});}}break;
    case'PLAYER_READY':
      if(msg.payload.playerId){p=self.players.get(msg.payload.playerId);if(p)p.isReady=!!msg.payload.isReady;self.emit('lobbyUpdate',self._playerArray());}break;
    case'START_GAME':
      var delay=Math.max((msg.payload.startAt||0)-Date.now(),500);
      self.transition(STATES.COUNTDOWN);self.emit('countdown',{delay:delay,startAt:msg.payload.startAt});break;
    case'SCORE_UPDATE':
      if(self.isHost&&msg.payload.playerId){
        p=self.players.get(msg.payload.playerId);if(!p||p.isDisconnected)break;
        if(msg.payload.timestamp<p.lastScoreTimestamp)break;// stale
        // Cheat check
        var diff=localStorage.getItem('diffPref')||'med';
        var maxD={easy:3,med:5,hard:8};var delta=(msg.payload.score||0)-p.score;
        if(delta>(maxD[diff]||5)*2){p.cheatFlagCount++;if(p.cheatFlagCount>3){console.warn('[MP] Cheat flag:',p.name);break;}}
        p.score=msg.payload.score||0;
        // ★ Only process death once per player
        var wasAlive=!p.isDead;
        p.isDead=!!msg.payload.isDead;
        p.lastScoreTimestamp=msg.payload.timestamp;
        if(p.isDead&&wasAlive){
          self._broadcast('PLAYER_DEAD',{playerId:p.id,finalScore:p.score});
          showToast('💀 '+p.name+' is out!','neutral');
          self._checkAllDead();
        }
      }break;
    case'LEADERBOARD':
      if(!self.isHost&&msg.payload.players){self.emit('leaderboardUpdate',msg.payload.players);
        // Reset client timeout
        if(self.clientGameEndTimeout){clearTimeout(self.clientGameEndTimeout);self.clientGameEndTimeout=null;}
        var localP=self.players.get(self.localPlayerId);
        if(localP&&localP.isDead){self.clientGameEndTimeout=setTimeout(function(){if(self.state===STATES.IN_GAME)self._selfTerminate();},15000);}
      }break;
    case'PLAYER_DEAD':
      if(msg.payload.playerId){p=self.players.get(msg.payload.playerId);if(p){p.isDead=true;p.score=msg.payload.finalScore||p.score;}
        showToast('💀 '+(p?p.name:'A player')+' is out!','neutral');}break;
    case'GAME_END':
      self._onGameEnd(msg.payload);break;
    case'PLAY_AGAIN':
      // ★ Host initiated play again - reset and return to lobby
      self.playAgain();
      break;
    case'HOST_MIGRATION':
      // ★ New host has been elected - reconnect to them
      if(msg.payload.newHostId!==self.localPlayerId){
        self._reconnectToNewHost(msg.payload);
      }
      break;
    case'HEARTBEAT':
      self._send(conn,'HEARTBEAT_ACK',{seq:msg.payload.seq});break;
    case'HEARTBEAT_ACK':
      if(self.worker)self.worker.postMessage({type:'PONG_RECEIVED',peerId:conn.peer});break;
  }
};

P._playerArray=function(){var a=[];this.players.forEach(function(p){a.push(Object.assign({},p));});return a;};

// ── Host: Start Game ──
P.startGame=function(){
  if(!this.isHost||this.state!==STATES.LOBBY_HOST)return;
  var startAt=Date.now()+3000;
  this.startTimestamp=startAt;this.gameOverTriggered=false;
  this._broadcast('START_GAME',{startAt:startAt});
  this.transition(STATES.COUNTDOWN);
  this.emit('countdown',{delay:3000,startAt:startAt});
  this._startWorker();
};

P.beginGameplay=function(){
  this.transition(STATES.IN_GAME);
  var self=this;
  // Start score emission (client sends to host)
  if(!self.isHost){
    self.scoreTimer=setInterval(function(){
      var s=parseInt(document.getElementById('high-score')?.textContent||'0',10);
      var localP=self.players.get(self.localPlayerId);
      if(!localP)return;
      var dead=window.started===0&&self.state===STATES.IN_GAME&&localP.score>0;
      if(s!==localP.score||dead){
        localP.score=s;
        if(dead&&!localP.isDead){
          // ★ Only trigger death once
          localP.isDead=true;
          // Play death sound for client
          var btn=document.querySelector('.sound-btn');
          if(btn&&btn.innerHTML==='Sound: on'){
            var audio=document.getElementById('faaah');
            if(audio){audio.currentTime=0;audio.play().catch(function(){});}
          }
          // ★ Stop the score timer immediately after death
          if(self.scoreTimer){clearInterval(self.scoreTimer);self.scoreTimer=null;}
          // ★ Show waiting overlay for dead player
          self.emit('playerDied',{playerId:self.localPlayerId,score:s});
        }
        var keys=Object.keys(self.connections);
        if(keys.length)self._send(self.connections[keys[0]],'SCORE_UPDATE',{playerId:self.localPlayerId,score:s,isDead:localP.isDead,timestamp:Date.now()});
      }
    },SCORE_INTERVAL);
  }else{
    // Host also tracks own score
    self.scoreTimer=setInterval(function(){
      var s=parseInt(document.getElementById('high-score')?.textContent||'0',10);
      var localP=self.players.get(self.localPlayerId);if(!localP)return;
      var dead=window.started===0&&self.state===STATES.IN_GAME&&localP.score>0;
      localP.score=s;
      if(dead&&!localP.isDead){
        // ★ Only trigger death once
        localP.isDead=true;
        // Play death sound for host
        var btn=document.querySelector('.sound-btn');
        if(btn&&btn.innerHTML==='Sound: on'){
          var audio=document.getElementById('faaah');
          if(audio){audio.currentTime=0;audio.play().catch(function(){});}
        }
        self._broadcast('PLAYER_DEAD',{playerId:self.localPlayerId,finalScore:s});
        // ★ Stop the score timer immediately after death
        if(self.scoreTimer){clearInterval(self.scoreTimer);self.scoreTimer=null;}
        // ★ Show waiting overlay for dead host
        self.emit('playerDied',{playerId:self.localPlayerId,score:s});
        self._checkAllDead();
      }
    },SCORE_INTERVAL);
    // Leaderboard broadcast
    self.lbTimer=setInterval(function(){self._broadcastLeaderboard();},LB_INTERVAL);
  }
};

P._broadcastLeaderboard=function(){
  var entries=[];var self=this;
  this.players.forEach(function(p){entries.push({playerId:p.id,playerName:p.name,score:p.score,
    rank:0,isDead:p.isDead,isDisconnected:p.isDisconnected,isHost:p.isHost,lastSeen:p.lastHeartbeatTimestamp});});
  entries.sort(function(a,b){return b.score-a.score;});
  for(var i=0;i<entries.length;i++)entries[i].rank=i+1;
  this._broadcast('LEADERBOARD',{players:entries});
  this.emit('leaderboardUpdate',entries);
};

P._checkAllDead=function(){
  if(this.gameOverTriggered)return;
  var alive=[];this.players.forEach(function(p){if(!p.isDead&&!p.isDisconnected)alive.push(p);});
  if(alive.length===0){
    // ★ Don't set flag here - let _triggerGameEnd do it
    this._triggerGameEnd('all_dead');
  }
};

P._triggerGameEnd=function(reason){
  // ★ Double-check gameOverTriggered flag to prevent race conditions
  if(this.gameOverTriggered)return;
  this.gameOverTriggered=true;
  
  var entries=[];
  this.players.forEach(function(p){
    entries.push({
      playerId:p.id,
      playerName:p.name,
      score:p.score,
      rank:0,
      isDead:p.isDead,
      isDisconnected:p.isDisconnected,
      isHost:p.isHost,
      lastSeen:p.lastHeartbeatTimestamp,
      deathTime:p.lastScoreTimestamp||0 // When they died (higher = survived longer)
    });
  });
  
  // ★ Sort by score (descending), then by survival time (descending)
  entries.sort(function(a,b){
    if(b.score!==a.score)return b.score-a.score; // Higher score wins
    return b.deathTime-a.deathTime; // If tied, who survived longer wins
  });
  
  // ★ Assign ranks, handling ties properly
  for(var i=0;i<entries.length;i++){
    if(i===0){
      entries[i].rank=1;
    }else if(entries[i].score===entries[i-1].score){
      // Same score = same rank (tie)
      entries[i].rank=entries[i-1].rank;
    }else{
      entries[i].rank=i+1;
    }
  }
  
  var dur=this.startTimestamp?Date.now()-this.startTimestamp:0;
  var payload={reason:reason,finalBoard:entries,duration:dur};
  this._broadcast('GAME_END',payload);
  this._onGameEnd(payload);
};

P.endGame=function(){
  if(this.isHost&&this.state===STATES.IN_GAME){
    // ★ Stop the game immediately for host
    window.started = 0;
    if (window.runGame) {
      clearInterval(window.runGame);
      window.runGame = null;
    }
    this._triggerGameEnd('host_ended');
  }
};

P._onGameEnd=function(payload){
  if(this.state===STATES.GAME_OVER)return;
  
  // ★ Stop the game immediately
  window.started = 0;
  if (window.runGame) {
    clearInterval(window.runGame);
    window.runGame = null;
  }
  
  this.transition(STATES.GAME_OVER);
  if(this.scoreTimer){clearInterval(this.scoreTimer);this.scoreTimer=null;}
  if(this.lbTimer){clearInterval(this.lbTimer);this.lbTimer=null;}
  if(this.clientGameEndTimeout){clearTimeout(this.clientGameEndTimeout);this.clientGameEndTimeout=null;}
  // ★ Stop the heartbeat worker when game ends
  this._stopWorker();
  
  // ★ Update URL bar to show game over state for multiplayer
  var localP=this.players.get(this.localPlayerId);
  var finalScore = localP ? localP.score : 0;
  setTimeout(function(){
    history.replaceState(null, '', "#" + "··×·" + "YOU·DIED!" + "·" + finalScore + "pts");
  }, 200);
  setTimeout(function(){
    history.replaceState(null, '', "#" + "···" + "GAME·OVER!" + "···" + finalScore + "pts");
  }, 1600);
  
  // Write IDB log
  var log={id:safeUUID(),roomCode:this.roomCode,startedAt:this.startTimestamp||Date.now(),
    endedAt:Date.now(),durationSeconds:Math.round((payload.duration||0)/1000),reason:payload.reason,
    playerCount:this.players.size,finalLeaderboard:payload.finalBoard||[],
    localPlayerRank:0,localPlayerScore:finalScore,
    settings:{difficulty:localStorage.getItem('diffPref')||'med',speed:parseInt(localStorage.getItem('speedPref')||'100',10)}};
  if(payload.finalBoard){for(var i=0;i<payload.finalBoard.length;i++){if(payload.finalBoard[i].playerId===this.localPlayerId){log.localPlayerRank=payload.finalBoard[i].rank;break;}}}
  if(window.IDBStore)IDBStore.writeLog(log);
  this.emit('gameEnd',payload);
};

P._selfTerminate=function(){this._onGameEnd({reason:'network_error',finalBoard:[],duration:this.startTimestamp?Date.now()-this.startTimestamp:0});};

P._handleClientDisconnect=function(peerId){
  var self=this;
  
  // ★ Prevent duplicate disconnect handling for same peer
  if(self._disconnectingPeers&&self._disconnectingPeers[peerId]){
    console.log('[MP] Already handling disconnect for:',peerId);
    return;
  }
  if(!self._disconnectingPeers)self._disconnectingPeers={};
  self._disconnectingPeers[peerId]=true;
  
  try{
    var found=null;
    self.players.forEach(function(p){if(p.connectionId===peerId)found=p;});
    
    if(!found){
      // ★ Player not found - might have been removed already, just clean up connection
      console.warn('[MP] Client disconnect for unknown peer:',peerId);
      delete self.connections[peerId];
      if(self.worker)self.worker.postMessage({type:'PEER_REMOVED',peerId:peerId});
      delete self._disconnectingPeers[peerId];
      return;
    }
    
    found.isDisconnected=true;
    self._broadcast('PLAYER_LEFT',{playerId:found.id,lastScore:found.score,reason:'disconnect'});
    showToast('📡 '+found.name+' disconnected','warning');
    
    // Play leave sound
    var btn=document.querySelector('.sound-btn');
    if(btn&&btn.innerHTML==='Sound: on'){
      var audio=document.getElementById('leave-sound');
      if(audio){audio.currentTime=0;audio.play().catch(function(){});}
    }
    
    if(self.worker)self.worker.postMessage({type:'PEER_REMOVED',peerId:peerId});
    delete self.connections[peerId];
    
    if(self.state===STATES.IN_GAME){
      self._checkAllDead();
    }else{
      // ★ Safe deletion with existence check
      if(self.players.has(found.id)){
        self.players.delete(found.id);
        self.emit('lobbyUpdate',self._playerArray());
      }
    }
  }catch(err){
    console.error('[MP] Error in _handleClientDisconnect:',err);
    // ★ Fallback: just clean up the connection
    delete self.connections[peerId];
    if(self.worker)self.worker.postMessage({type:'PEER_REMOVED',peerId:peerId});
  }finally{
    // ★ Clean up disconnect tracking after a delay
    setTimeout(function(){
      delete self._disconnectingPeers[peerId];
    },1000);
  }
};

P._handleHostDisconnect=function(){
  var self=this;
  
  // Remove the old host from players list
  self.players.forEach(function(p, id) {
    if (p.isHost) self.players.delete(id);
  });
  self.emit('lobbyUpdate',self._playerArray());
  
  // ★ Host migration: promote the first remaining player to host deterministically
  if(self.state===STATES.LOBBY_CLIENT || self.state===STATES.GAME_OVER){
    var remainingPlayers=[];
    self.players.forEach(function(p){
      if(!p.isDisconnected) remainingPlayers.push(p);
    });
    
    // Sort deterministically by id
    remainingPlayers.sort(function(a,b){ return a.id.localeCompare(b.id); });
    
    if(remainingPlayers.length>0){
      var nextHost = remainingPlayers[0];
      if (nextHost.id === self.localPlayerId) {
        self._promoteToHost();
        showToast('👑 You are now the host!','info');
      } else {
        self._reconnectToNewHost(nextHost);
      }
      return;
    }
  }
  
  // If in game or no other players, end the session
  showToast('📡 Host disconnected. Game ended.','error');
  if(self.state===STATES.IN_GAME||self.state===STATES.COUNTDOWN)self._onGameEnd({reason:'host_disconnect',finalBoard:[],duration:self.startTimestamp?Date.now()-self.startTimestamp:0});
  else self.destroy();
};

P._promoteToHost=function(){
  var self=this;
  console.log('[MP] Promoting to host');
  
  self.isHost=true;
  var localP=self.players.get(self.localPlayerId);
  if(localP){
    localP.isHost=true;
    localP.isReady=true;
  }
  
  self.hostPeerId=self.peer.id;
  self.connections={};
  
  if (self.peer) {
    // Start accepting connections on existing peer
    self.peer.on('connection',function(conn){
      console.log('[MP] New host received connection from:',conn.peer);
      self.joinQueue.enqueue(function(){return self._processJoin(conn);});
    });
  }
  
  if (self.state !== STATES.GAME_OVER) {
    self.transition(STATES.LOBBY_HOST);
  }
  self.emit('roomCreated',{roomCode:self.roomCode,hostPeerId:self.hostPeerId});
  self.emit('lobbyUpdate',self._playerArray());
  
  self._stopWorker();
  setTimeout(function(){
    self._startWorker();
  },100);
};

P._reconnectToNewHost=function(newHost){
  var self=this;
  console.log('[MP] Reconnecting to new host:',newHost.name);
  
  self.players.forEach(function(p){
    p.isHost=(p.id===newHost.id);
    if(p.isHost)p.isReady=true;
  });
  
  var keys=Object.keys(self.connections);
  if(keys.length>0){
    var oldConn=self.connections[keys[0]];
    if(oldConn){
      oldConn._mpDestroying=true;
      try{oldConn.close();}catch(e){}
    }
  }
  self.connections={};
  
  if (!self.peer) return;

  var conn=self.peer.connect(newHost.peerId,{reliable:true,serialization:'json'});
  
  conn.on('open',function(){
    conn._mpClosed=false;
    console.log('[MP] Reconnected to new host');
    self.connections[conn.peer]=conn;
    self._send(conn,'JOIN',{playerName:self.localPlayerName,playerId:self.localPlayerId});
    
    conn.on('data',function(msg){
      self._handleMessage(conn,msg);
    });
    
    conn.on('close',function(){
      if(conn._mpClosed||conn._mpDestroying)return;
      conn._mpClosed=true;
      if(self.state!==STATES.IDLE&&self.state!==STATES.GAME_OVER)self._handleHostDisconnect();
    });
    
    conn.on('error',function(err){
      console.error('[MP] Reconnection error:',err);
      if(self.state!==STATES.IDLE&&self.state!==STATES.GAME_OVER)self._handleHostDisconnect();
    });
    
    showToast('🔄 Reconnected to new host: '+newHost.name,'success');
    self.emit('lobbyUpdate',self._playerArray());
  });
  
  conn.on('error',function(err){
    console.error('[MP] Failed to reconnect to new host:',err);
    showToast('⚠ Failed to reconnect. Room closed.','error');
    self.destroy();
  });
  
  self._stopWorker();
  setTimeout(function(){
    self._startWorker();
  },100);
};

P.toggleReady=function(){
  var p=this.players.get(this.localPlayerId);if(!p||this.isHost)return;
  p.isReady=!p.isReady;
  var keys=Object.keys(this.connections);
  if(keys.length)this._send(this.connections[keys[0]],'READY_TOGGLE',{playerId:this.localPlayerId,isReady:p.isReady});
  this.emit('lobbyUpdate',this._playerArray());
};

P.playAgain=function(){
  // ★ Proper reset for "Play Again" functionality
  var self=this;
  
  // ★ Clear disconnect tracking to allow fresh connections
  self._disconnectingPeers={};
  
  // Reset all player states
  self.players.forEach(function(p){
    p.score=0;
    p.isDead=false;
    p.isReady=p.isHost;
    p.lastScoreTimestamp=0;
    p.cheatFlagCount=0;
  });
  
  // Reset game flags
  self.gameOverTriggered=false;
  self.startTimestamp=null;
  
  // ★ Stop worker first, then restart to prevent duplicate handlers
  self._stopWorker();
  setTimeout(function(){
    self._startWorker();
  },100);
  
  // Broadcast reset to all clients
  if(self.isHost){
    self._broadcast('PLAY_AGAIN',{});
  }
  
  // Transition to lobby
  if(self.isHost){
    self.transition(STATES.LOBBY_HOST);
  }else{
    self.transition(STATES.LOBBY_CLIENT);
  }
  
  self.emit('lobbyUpdate',self._playerArray());
};

P.canStart=function(){
  if(!this.isHost)return false;
  var allReady=true;this.players.forEach(function(p){if(!p.isHost&&!p.isReady)allReady=false;});
  return allReady;
};

P.syncSettings=function(settings){
  if(!this.isHost||this.state===STATES.IN_GAME)return;
  this._broadcast('SETTINGS_SYNC',settings);
};

P.destroy=function(){
  var self=this;
  
  // ★ Clear disconnect tracking first
  self._disconnectingPeers={};
  
  if(self.scoreTimer){clearInterval(self.scoreTimer);self.scoreTimer=null;}
  if(self.lbTimer){clearInterval(self.lbTimer);self.lbTimer=null;}
  if(self.clientGameEndTimeout){clearTimeout(self.clientGameEndTimeout);self.clientGameEndTimeout=null;}
  self._stopWorker();
  
  // ★ Close all connections with disconnect tracking disabled
  var keys=Object.keys(self.connections);
  for(var i=0;i<keys.length;i++){
    try{
      var conn=self.connections[keys[i]];
      if(conn){
        // ★ Mark as intentionally closed to prevent disconnect handler from firing
        conn._mpDestroying=true;
        conn.close();
      }
    }catch(e){console.warn('[MP] Error closing connection:',e);}
  }
  self.connections={};
  
  if(self.peer){try{self.peer.destroy();}catch(e){}self.peer=null;}
  self.players.clear();
  self.roomCode='';self.isHost=false;self.gameOverTriggered=false;
  self.transition(STATES.IDLE);
  if(bc)bc.postMessage({type:'MP_SESSION_CLOSED'});
};

// Expose
window.MultiplayerManager=MultiplayerManager;
window.MP_STATES=STATES;
})();
