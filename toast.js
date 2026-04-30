/**
 * toast.js — Lightweight, stackable notification system for Dino-C Multiplayer
 *
 * API:
 *   showToast(message, type?, duration?)
 *     type:     'info' | 'warning' | 'error' | 'neutral'  (default: 'info')
 *     duration: ms before auto-dismiss                     (default: 4000)
 *
 * Toasts render in a fixed container (bottom-right), stack vertically,
 * auto-dismiss with a fade-out animation, and cap at 4 visible at once.
 */
"use strict";

(function () {
    var MAX_VISIBLE = 4;
    var container = null;

    /** Lazily create or return the toast container */
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
     * @param {string}  [type]    'info' | 'warning' | 'error' | 'neutral'
     * @param {number}  [duration] Auto-dismiss delay in ms
     */
    function showToast(message, type, duration) {
        if (!message) return;
        type = type || 'info';
        duration = typeof duration === 'number' ? duration : 4000;

        var wrap = getContainer();

        // Enforce max visible — dismiss oldest first
        var existing = wrap.querySelectorAll('.mp-toast');
        while (existing.length >= MAX_VISIBLE) {
            dismissToast(existing[0]);
            existing = wrap.querySelectorAll('.mp-toast');
        }

        var toast = document.createElement('div');
        toast.className = 'mp-toast mp-toast--' + type;
        toast.setAttribute('role', 'status');

        var span = document.createElement('span');
        span.className = 'mp-toast__msg';
        span.textContent = message;
        toast.appendChild(span);

        var closeBtn = document.createElement('button');
        closeBtn.className = 'mp-toast__close';
        closeBtn.type = 'button';
        closeBtn.setAttribute('aria-label', 'Dismiss');
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', function () {
            dismissToast(toast);
        });
        toast.appendChild(closeBtn);

        wrap.appendChild(toast);

        // Trigger reflow for enter animation
        void toast.offsetWidth;
        toast.classList.add('mp-toast--visible');

        // Auto dismiss
        var timer = setTimeout(function () {
            dismissToast(toast);
        }, duration);

        toast._dismissTimer = timer;
    }

    /** Dismiss a single toast with exit animation */
    function dismissToast(el) {
        if (!el || !el.parentNode) return;
        clearTimeout(el._dismissTimer);
        el.classList.remove('mp-toast--visible');
        el.classList.add('mp-toast--exit');
        setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 300); // match CSS transition duration
    }

    // Expose globally
    window.showToast = showToast;
})();
