/**
 * Toast Notification Component
 * Types: 'success', 'error', 'info', 'warning'
 */

import { escapeHtml } from '../utils/sanitize.js';

// ── Inject styles once ──────────────────────────────────────────────
let stylesInjected = false;

function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;

    const style = document.createElement('style');
    style.textContent = `
        .toast-container {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 10000;
            display: flex;
            flex-direction: column-reverse;
            gap: 8px;
            pointer-events: none;
        }

        .toast {
            pointer-events: auto;
            background: #FFFFFF;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
            padding: 12px 16px;
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 10px;
            max-width: 380px;
            min-width: 280px;
            font-family: 'Inter', sans-serif;
            font-size: 0.85rem;
            color: var(--text-main, #111827);
            transform: translateY(20px);
            opacity: 0;
            animation: toast-slide-in 0.3s ease forwards;
        }

        .toast.toast-exit {
            animation: toast-fade-out 0.25s ease forwards;
        }

        @keyframes toast-slide-in {
            from {
                transform: translateY(20px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }

        @keyframes toast-fade-out {
            from {
                transform: translateY(0);
                opacity: 1;
            }
            to {
                transform: translateY(8px);
                opacity: 0;
            }
        }

        .toast-icon {
            flex-shrink: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .toast-icon svg {
            width: 20px;
            height: 20px;
        }

        .toast-body {
            flex: 1;
            min-width: 0;
        }

        .toast-message {
            line-height: 1.4;
            word-break: break-word;
        }

        .toast-undo-btn {
            background: none;
            border: none;
            color: var(--primary, #4F46E5);
            font-weight: 700;
            text-decoration: underline;
            cursor: pointer;
            font-family: inherit;
            font-size: 0.85rem;
            padding: 0;
            margin-left: 2px;
            flex-shrink: 0;
        }

        .toast-undo-btn:hover {
            opacity: 0.8;
        }

        .toast-close-btn {
            background: none;
            border: none;
            cursor: pointer;
            padding: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-muted, #6B7280);
            flex-shrink: 0;
            border-radius: 4px;
            transition: background 0.15s;
        }

        .toast-close-btn:hover {
            background: var(--bg-body, #F3F4F6);
        }

        .toast-close-btn svg {
            width: 16px;
            height: 16px;
        }
    `;
    document.head.appendChild(style);
}

// ── Icons (inline SVG) ──────────────────────────────────────────────
const ICONS = {
    success: `<svg viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" stroke="#10B981" stroke-width="1.5" fill="#ECFDF5"/>
        <path d="M6.5 10.5L8.5 12.5L13.5 7.5" stroke="#10B981" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,

    error: `<svg viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" stroke="#EF4444" stroke-width="1.5" fill="#FEF2F2"/>
        <path d="M7.5 7.5L12.5 12.5M12.5 7.5L7.5 12.5" stroke="#EF4444" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`,

    info: `<svg viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" stroke="#3B82F6" stroke-width="1.5" fill="#EFF6FF"/>
        <path d="M10 9V14" stroke="#3B82F6" stroke-width="1.8" stroke-linecap="round"/>
        <circle cx="10" cy="6.5" r="1" fill="#3B82F6"/>
    </svg>`,

    warning: `<svg viewBox="0 0 20 20" fill="none">
        <path d="M10 2L18.66 17H1.34L10 2Z" stroke="#F59E0B" stroke-width="1.5" fill="#FFFBEB" stroke-linejoin="round"/>
        <path d="M10 8V12" stroke="#F59E0B" stroke-width="1.8" stroke-linecap="round"/>
        <circle cx="10" cy="14.5" r="1" fill="#F59E0B"/>
    </svg>`
};

const CLOSE_ICON = `<svg viewBox="0 0 16 16" fill="none">
    <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

// ── Container management ────────────────────────────────────────────
let container = null;

function getContainer() {
    if (container && document.body.contains(container)) return container;
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// ── Dismiss a toast ─────────────────────────────────────────────────
function dismissToast(toastEl) {
    if (toastEl.dataset.dismissed === 'true') return;
    toastEl.dataset.dismissed = 'true';

    // Clear the auto-dismiss timer
    if (toastEl._autoTimer) {
        clearTimeout(toastEl._autoTimer);
        toastEl._autoTimer = null;
    }

    toastEl.classList.add('toast-exit');
    toastEl.addEventListener('animationend', () => {
        toastEl.remove();
    }, { once: true });
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Show a toast notification.
 *
 * @param {string} message      - The text message to display (will be HTML-escaped).
 * @param {'success'|'error'|'info'|'warning'} type - Toast type.
 * @param {Object} [options]
 * @param {number} [options.duration=3000] - Auto-dismiss duration in ms. Pass 0 to disable.
 * @param {Function|null} [options.undoCallback=null] - If provided, an "Undo" button is shown.
 * @returns {HTMLElement} The toast element (for programmatic dismissal).
 */
export function showToast(message, type = 'info', options = {}) {
    injectStyles();

    const { duration = 3000, undoCallback = null } = options;
    const host = getContainer();

    // Build the toast element
    const toast = document.createElement('div');
    toast.className = 'toast';

    // Icon
    const iconWrap = document.createElement('span');
    iconWrap.className = 'toast-icon';
    iconWrap.innerHTML = ICONS[type] || ICONS.info;
    toast.appendChild(iconWrap);

    // Body (message)
    const body = document.createElement('span');
    body.className = 'toast-body toast-message';
    body.innerHTML = escapeHtml(message);
    toast.appendChild(body);

    // Undo button (optional)
    if (typeof undoCallback === 'function') {
        const undoBtn = document.createElement('button');
        undoBtn.className = 'toast-undo-btn';
        undoBtn.textContent = 'Undo';
        undoBtn.addEventListener('click', () => {
            undoCallback();
            dismissToast(toast);
        });
        toast.appendChild(undoBtn);
    }

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close-btn';
    closeBtn.innerHTML = CLOSE_ICON;
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.addEventListener('click', () => dismissToast(toast));
    toast.appendChild(closeBtn);

    // Insert into container
    host.appendChild(toast);

    // Auto-dismiss
    if (duration > 0) {
        toast._autoTimer = setTimeout(() => dismissToast(toast), duration);
    }

    return toast;
}
