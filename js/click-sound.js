"use strict";
(function() {
  var audioPool = [];
  var poolSize = 5;
  var currentIndex = 0;
  var isAudioEnabled = false;
  var isAnyAudioPlaying = false;
  var audioCheckInterval = null;

  function initAudioPool() {
    for (var i = 0; i < poolSize; i++) {
      var audio = new Audio('assets/click-soft.mp3');
      audio.preload = 'auto';
      audio.volume = 0.4;
      audioPool.push(audio);
    }
  }

  function isSoundEnabled() {
    var btn = document.querySelector('.sound-btn');
    return btn && btn.innerHTML.indexOf('on') !== -1;
  }

  function startAudioMonitoring() {
    if (audioCheckInterval) return;
    
    audioCheckInterval = setInterval(function() {
      var allAudios = document.querySelectorAll('audio');
      isAnyAudioPlaying = false;
      
      for (var i = 0; i < allAudios.length; i++) {
        var audio = allAudios[i];
        if (audio.src && audio.src.indexOf('click-soft.mp3') !== -1) continue;
        
        if (!audio.paused && audio.currentTime > 0 && audio.currentTime < audio.duration) {
          isAnyAudioPlaying = true;
          break;
        }
      }
    }, 50);
  }

  function playClickSound() {
    if (!isSoundEnabled()) return;
    if (isAnyAudioPlaying) return;
    
    try {
      var audio = audioPool[currentIndex];
      
      audio.currentTime = 0;
      audio.play().catch(function() {});
      
      currentIndex = (currentIndex + 1) % poolSize;
    } catch (e) {}
  }

  function attachClickListeners() {
    document.addEventListener('click', function(e) {
      var target = e.target;
      
      while (target && target !== document) {
        var tagName = target.tagName ? target.tagName.toLowerCase() : '';
        var isButton = tagName === 'button' || 
                      target.classList.contains('mp-btn') ||
                      target.classList.contains('mp-copy-btn') ||
                      target.classList.contains('mp-ready-btn') ||
                      target.classList.contains('mp-end-game-btn') ||
                      target.classList.contains('mp-fab') ||
                      target.classList.contains('diff-btn') ||
                      target.classList.contains('mp-modal__close');
        
        if (isButton) {
          var isSoundToggle = target.classList.contains('sound-btn') ||
                             target.onclick && target.onclick.toString().indexOf('toggleSound') !== -1;
          
          if (!isSoundToggle) {
            playClickSound();
          }
          break;
        }
        
        target = target.parentElement;
      }
    }, true);
  }

  function init() {
    initAudioPool();
    startAudioMonitoring();
    attachClickListeners();
    
    var unlocked = false;
    function unlockAudio() {
      if (unlocked) return;
      unlocked = true;
      
      audioPool.forEach(function(audio) {
        audio.play().then(function() {
          audio.pause();
          audio.currentTime = 0;
        }).catch(function() {});
      });
      
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    }
    
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('touchstart', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
