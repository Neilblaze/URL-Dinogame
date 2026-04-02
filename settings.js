"use strict";

/* ── Settings: Difficulty & Game Speed ─── */
(function () {
    /* ── Difficulty presets ─────────────── */
    var diffPresets = {
        easy: { enemyMin: 30, enemyMax: 10 },
        med: { enemyMin: 26, enemyMax: 6 },
        hard: { enemyMin: 14, enemyMax: 3 }
    };

    var currentDiff = localStorage.getItem('diffPref') || 'med';
    if (!diffPresets[currentDiff]) currentDiff = 'med';

    var diffToggle = document.getElementById('difficulty-toggle');
    if (diffToggle) {
        var btns = diffToggle.querySelectorAll('.diff-btn');
        for (var i = 0; i < btns.length; i++) {
            if (btns[i].getAttribute('data-diff') === currentDiff) {
                btns[i].classList.add('active');
            } else {
                btns[i].classList.remove('active');
            }
        }

        diffToggle.addEventListener('click', function (e) {
            var btn = e.target.closest('.diff-btn');
            if (!btn) return;
            var diff = btn.getAttribute('data-diff');
            if (diff === currentDiff) return;
            currentDiff = diff;
            localStorage.setItem('diffPref', diff);

            for (var j = 0; j < btns.length; j++) btns[j].classList.remove('active');
            btn.classList.add('active');

            applyDifficulty(diff);
        });
    }

    function applyDifficulty(diff) {
        var p = diffPresets[diff];
        if (!p) return;
        if (typeof window.enemySpawn !== 'undefined' && typeof window.randomIntFromInterval === 'function') {
            window.enemySpawn = randomIntFromInterval(p.enemyMin, p.enemyMax);
        }
        window._diffPreset = p;
    }

    /* ── Speed slider ──────────────────── */
    var slider = document.getElementById('speed-slider');
    var label = document.getElementById('speed-value');
    var baseInterval = 100; // default game tick (ms)

    // Load stored speed or default to 100
    var storedSpeed = localStorage.getItem('speedPref') || '100';
    var initialSpeed = parseInt(storedSpeed, 10);
    if (isNaN(initialSpeed)) initialSpeed = 100;

    function applySpeed(pct) {
        var multiplier = pct / 100;
        if (label) label.textContent = multiplier.toFixed(1) + '\u00d7';

        // Lower interval = faster game.
        var newInterval = Math.round(baseInterval / multiplier);
        window._gameTickMs = newInterval;

        if (typeof window.runGame !== 'undefined' && typeof window.started !== 'undefined' && window.started === 1) {
            clearInterval(window.runGame);
            window.runGame = setInterval(window.gameLogic, newInterval);
        }
    }

    if (slider) {
        slider.value = initialSpeed;
        applySpeed(initialSpeed);

        slider.addEventListener('keydown', function (e) { e.stopPropagation(); });

        slider.addEventListener('input', function () {
            var pct = parseInt(slider.value, 10);
            localStorage.setItem('speedPref', pct.toString());
            applySpeed(pct);
        });
    }

    setTimeout(function () {
        applyDifficulty(currentDiff);
    }, 10);
})();
