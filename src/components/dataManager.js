import { escapeHtml } from '../utils/sanitize.js';

// Export all data as a single JSON file
export function exportData() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('pyrio_')) {
            try {
                data[key] = JSON.parse(localStorage.getItem(key));
            } catch {
                // Some keys (e.g. pyrio_current_team) are plain strings, not JSON
                data[key] = localStorage.getItem(key);
            }
        }
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pyrio-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Import data from JSON file
export function importData(file, onComplete) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            const keys = Object.keys(data).filter(k => k.startsWith('pyrio_'));
            if (keys.length === 0) throw new Error('Invalid backup file: no pyrio_ keys found');

            keys.forEach(key => {
                const value = data[key];
                if (typeof value === 'string') {
                    localStorage.setItem(key, value);
                } else {
                    localStorage.setItem(key, JSON.stringify(value));
                }
            });
            onComplete(true);
        } catch (err) {
            onComplete(false, err.message);
        }
    };
    reader.readAsText(file);
}

// Show import/export modal
export function showDataManagerModal(onUpdate) {
    const root = document.getElementById('modal-root');

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal-content data-manager-modal';
    modal.innerHTML = `
        <div class="modal-header">
            <h3>Data Import / Export</h3>
            <button class="modal-close-btn">&times;</button>
        </div>
        <div class="modal-body" style="display:flex;flex-direction:column;gap:1.25rem;">
            <div>
                <p style="margin:0 0 0.5rem;font-weight:600;">Export Backup</p>
                <p style="margin:0 0 0.75rem;font-size:0.85rem;color:var(--text-muted,#666);">
                    Download all your Pyrio data as a JSON file.
                </p>
                <button class="btn btn-primary export-btn" style="width:100%;">Export Backup</button>
            </div>
            <hr style="border:none;border-top:1px solid var(--border-color,#ddd);margin:0;">
            <div>
                <p style="margin:0 0 0.5rem;font-weight:600;">Import Backup</p>
                <p style="margin:0 0 0.5rem;font-size:0.85rem;color:var(--text-muted,#666);">
                    Restore data from a previously exported JSON file.
                </p>
                <p style="margin:0 0 0.75rem;font-size:0.8rem;color:var(--danger-color,#d32f2f);font-weight:500;">
                    Warning: Importing will overwrite your current data.
                </p>
                <label class="btn btn-secondary import-label" style="display:block;text-align:center;cursor:pointer;width:100%;box-sizing:border-box;">
                    Choose File&hellip;
                    <input type="file" accept=".json,application/json" class="import-input" style="display:none;">
                </label>
                <p class="import-status" style="margin:0.5rem 0 0;font-size:0.85rem;min-height:1.25rem;"></p>
            </div>
        </div>
    `;

    const close = () => root.removeChild(overlay);
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
    modal.querySelector('.modal-close-btn').onclick = close;

    // Export
    modal.querySelector('.export-btn').onclick = () => {
        exportData();
    };

    // Import
    const fileInput = modal.querySelector('.import-input');
    const statusEl = modal.querySelector('.import-status');

    fileInput.onchange = () => {
        const file = fileInput.files[0];
        if (!file) return;

        statusEl.textContent = 'Importing...';
        statusEl.style.color = 'var(--text-muted,#666)';

        importData(file, (success, errMsg) => {
            if (success) {
                statusEl.textContent = 'Import successful! Reloading...';
                statusEl.style.color = 'var(--success-color,#2e7d32)';
                setTimeout(() => {
                    close();
                    if (onUpdate) onUpdate();
                }, 600);
            } else {
                statusEl.textContent = 'Import failed: ' + escapeHtml(errMsg || 'Unknown error');
                statusEl.style.color = 'var(--danger-color,#d32f2f)';
            }
            // Reset file input so the same file can be re-selected
            fileInput.value = '';
        });
    };

    overlay.appendChild(modal);
    root.appendChild(overlay);
}
