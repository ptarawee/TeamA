import { escapeHtml } from '../utils/sanitize.js';

export function showConfirmModal(title, message, onConfirm) {
    const root = document.getElementById('modal-root');

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal-content confirm-modal';
    modal.innerHTML = `
        <div class="modal-header"><h3>${escapeHtml(title)}</h3><button class="modal-close-btn">&times;</button></div>
        <div class="modal-body">
            <p class="confirm-message">${escapeHtml(message)}</p>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary modal-cancel-btn">Cancel</button>
            <button class="btn btn-danger confirm-ok-btn">Delete</button>
        </div>
    `;

    const close = () => root.removeChild(overlay);
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
    modal.querySelector('.modal-close-btn').onclick = close;
    modal.querySelector('.modal-cancel-btn').onclick = close;
    modal.querySelector('.confirm-ok-btn').onclick = () => {
        close();
        onConfirm();
    };

    overlay.appendChild(modal);
    root.appendChild(overlay);
}
