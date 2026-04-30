"use strict";

(function () {
    var MAX_VISIBLE = 4;
    var container = null;

    var icons = {
        info: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="2" width="4" height="2" fill="currentColor"/><rect x="6" y="4" width="2" height="2" fill="currentColor"/><rect x="12" y="4" width="2" height="2" fill="currentColor"/><rect x="4" y="6" width="2" height="8" fill="currentColor"/><rect x="14" y="6" width="2" height="8" fill="currentColor"/><rect x="6" y="14" width="8" height="2" fill="currentColor"/><rect x="8" y="8" width="4" height="2" fill="currentColor"/><rect x="8" y="10" width="4" height="2" fill="currentColor"/></svg>',
        success: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="2" width="4" height="2" fill="currentColor"/><rect x="6" y="4" width="2" height="2" fill="currentColor"/><rect x="12" y="4" width="2" height="2" fill="currentColor"/><rect x="4" y="6" width="2" height="8" fill="currentColor"/><rect x="14" y="6" width="2" height="8" fill="currentColor"/><rect x="6" y="14" width="8" height="2" fill="currentColor"/><rect x="14" y="8" width="2" height="2" fill="currentColor"/><rect x="12" y="10" width="2" height="2" fill="currentColor"/><rect x="10" y="12" width="2" height="2" fill="currentColor"/><rect x="6" y="10" width="2" height="2" fill="currentColor"/><rect x="8" y="12" width="2" height="2" fill="currentColor"/></svg>',
        warning: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="2" width="4" height="2" fill="currentColor"/><rect x="6" y="4" width="2" height="2" fill="currentColor"/><rect x="12" y="4" width="2" height="2" fill="currentColor"/><rect x="4" y="6" width="2" height="2" fill="currentColor"/><rect x="14" y="6" width="2" height="2" fill="currentColor"/><rect x="4" y="8" width="2" height="2" fill="currentColor"/><rect x="14" y="8" width="2" height="2" fill="currentColor"/><rect x="6" y="10" width="2" height="2" fill="currentColor"/><rect x="12" y="10" width="2" height="2" fill="currentColor"/><rect x="8" y="12" width="4" height="2" fill="currentColor"/><rect x="8" y="6" width="4" height="2" fill="currentColor"/><rect x="8" y="10" width="4" height="2" fill="currentColor"/></svg>',
        error: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="4" width="2" height="2" fill="currentColor"/><rect x="12" y="4" width="2" height="2" fill="currentColor"/><rect x="4" y="6" width="2" height="2" fill="currentColor"/><rect x="14" y="6" width="2" height="2" fill="currentColor"/><rect x="8" y="8" width="4" height="4" fill="currentColor"/><rect x="6" y="10" width="2" height="2" fill="currentColor"/><rect x="12" y="10" width="2" height="2" fill="currentColor"/><rect x="4" y="12" width="2" height="2" fill="currentColor"/><rect x="14" y="12" width="2" height="2" fill="currentColor"/><rect x="6" y="14" width="2" height="2" fill="currentColor"/><rect x="12" y="14" width="2" height="2" fill="currentColor"/></svg>',
        neutral: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="2" width="4" height="2" fill="currentColor"/><rect x="6" y="4" width="2" height="2" fill="currentColor"/><rect x="12" y="4" width="2" height="2" fill="currentColor"/><rect x="4" y="6" width="2" height="8" fill="currentColor"/><rect x="14" y="6" width="2" height="8" fill="currentColor"/><rect x="6" y="14" width="8" height="2" fill="currentColor"/><rect x="6" y="10" width="8" height="2" fill="currentColor"/></svg>'
    };

    function getContainer() {
        if (container) return container;
        container = document.createElement('div');
        container.className = 'mp-toast-container';
        container.id = 'mp-toast-container';
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-atomic', 'false');
        document.body.appendChild(container);
        return container;
    }

    /**
     * Show a toast notification.
     * @param {string}  message   Text to display
     * @param {string}  [type]    'info' | 'warning' | 'error' | 'success' | 'neutral'
     * @param {number}  [duration] Auto-dismiss delay in ms
     */
    function showToast(message, type, duration) {
        if (!message) return;
        type = type || 'info';
        duration = typeof duration === 'number' ? duration : 4000;

        var wrap = getContainer();

        var existing = wrap.querySelectorAll('.mp-toast');
        while (existing.length >= MAX_VISIBLE) {
            dismissToast(existing[0]);
            existing = wrap.querySelectorAll('.mp-toast');
        }

        var toast = document.createElement('div');
        toast.className = 'mp-toast mp-toast--' + type;
        toast.setAttribute('role', 'status');

        var iconWrap = document.createElement('div');
        iconWrap.className = 'mp-toast__icon';
        iconWrap.innerHTML = icons[type] || icons.info;
        toast.appendChild(iconWrap);

        var span = document.createElement('span');
        span.className = 'mp-toast__msg';
        span.textContent = message;
        toast.appendChild(span);

        var closeBtn = document.createElement('button');
        closeBtn.className = 'mp-toast__close';
        closeBtn.type = 'button';
        closeBtn.setAttribute('aria-label', 'Dismiss');
        closeBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="2" height="2" fill="currentColor"/><rect x="8" y="2" width="2" height="2" fill="currentColor"/><rect x="4" y="4" width="2" height="2" fill="currentColor"/><rect x="6" y="4" width="2" height="2" fill="currentColor"/><rect x="4" y="6" width="2" height="2" fill="currentColor"/><rect x="6" y="6" width="2" height="2" fill="currentColor"/><rect x="2" y="8" width="2" height="2" fill="currentColor"/><rect x="8" y="8" width="2" height="2" fill="currentColor"/></svg>';
        closeBtn.addEventListener('click', function () {
            dismissToast(toast);
        });
        toast.appendChild(closeBtn);

        var progress = document.createElement('div');
        progress.className = 'mp-toast__progress';
        var progressBar = document.createElement('div');
        progressBar.className = 'mp-toast__progress-bar';
        progress.appendChild(progressBar);
        toast.appendChild(progress);

        wrap.appendChild(toast);

        void toast.offsetWidth;
        toast.classList.add('mp-toast--visible');

        progressBar.style.transition = 'transform ' + duration + 'ms linear';
        setTimeout(function() {
            progressBar.style.transform = 'scaleX(0)';
        }, 50);

        var timer = setTimeout(function () {
            dismissToast(toast);
        }, duration);

        toast._dismissTimer = timer;
    }

    function dismissToast(el) {
        if (!el || !el.parentNode) return;
        clearTimeout(el._dismissTimer);
        el.classList.remove('mp-toast--visible');
        el.classList.add('mp-toast--exit');
        setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 300);
    }

    window.showToast = showToast;
})();
