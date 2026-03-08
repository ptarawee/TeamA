// Register global keyboard shortcuts
// Only active when no modal is open and no input/textarea is focused

export function initKeyboardShortcuts(handlers) {
    // handlers = { onNewActivity, onStartTimer, onToggleTheme, onNavigate }
    document.addEventListener('keydown', (e) => {
        // Skip if typing in input/textarea/select
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
        // Skip if modal is open
        if (document.querySelector('.modal-overlay')) return;

        switch (e.key) {
            case 'n': handlers.onNewActivity?.(); break;         // N = new activity
            case 't': handlers.onStartTimer?.(); break;          // T = focus timer
            case 'd': handlers.onToggleTheme?.(); break;         // D = toggle dark mode
            case '1': handlers.onNavigate?.('calendar'); break;   // 1-5 = tabs
            case '2': handlers.onNavigate?.('team'); break;
            case '3': handlers.onNavigate?.('analytics'); break;
            case '4': handlers.onNavigate?.('workload'); break;
            case '5': handlers.onNavigate?.('productivity'); break;
            case '?': showShortcutsHelp(); break;                // ? = show help
        }
    });
}

function showShortcutsHelp() {
    // Don't open if already showing
    if (document.querySelector('.shortcuts-help-overlay')) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay shortcuts-help-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal-content';

    const shortcuts = [
        { key: 'N', description: 'New Activity' },
        { key: 'T', description: 'Focus Timer' },
        { key: 'D', description: 'Toggle Dark Mode' },
        { key: '1', description: 'Calendar tab' },
        { key: '2', description: 'Team tab' },
        { key: '3', description: 'Analytics tab' },
        { key: '4', description: 'Workload tab' },
        { key: '5', description: 'Productivity tab' },
        { key: '?', description: 'Show this help' },
        { key: 'Esc', description: 'Close this dialog' },
    ];

    const shortcutRows = shortcuts.map(s =>
        `<tr>
            <td><kbd style="display:inline-block;padding:2px 8px;border:1px solid var(--border);border-radius:4px;
                background:var(--bg-secondary);font-family:monospace;font-size:0.9em;min-width:24px;text-align:center">${s.key}</kbd></td>
            <td style="padding-left:12px">${s.description}</td>
        </tr>`
    ).join('');

    modal.innerHTML = `
        <div class="modal-header">
            <h3>Keyboard Shortcuts</h3>
            <button class="modal-close-btn">&times;</button>
        </div>
        <div class="modal-body">
            <table style="width:100%;border-collapse:collapse">
                <tbody>${shortcutRows}</tbody>
            </table>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary modal-cancel-btn">Close</button>
        </div>
    `;

    overlay.appendChild(modal);

    const root = document.getElementById('modal-root') || document.body;
    root.appendChild(overlay);

    const close = () => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    };

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
    });
    modal.querySelector('.modal-close-btn').addEventListener('click', close);
    modal.querySelector('.modal-cancel-btn').addEventListener('click', close);

    // Allow Esc to close the help modal
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            close();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}
