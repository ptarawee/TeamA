import { renderIntegrationSettings } from './integrationSettings.js';
import { isTeamAdmin } from '../auth/auth.js';
import { getCurrentTeamId } from '../data/store.js';

/**
 * Opens the Settings modal.
 * Contains tabbed sections — currently: Integrations.
 * Only admin sections are shown to admins.
 */
export function openSettingsModal(onUpdate) {
    const root = document.getElementById('modal-root');
    if (!root) return;

    const teamId = getCurrentTeamId();
    const isAdmin = isTeamAdmin(teamId);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay settings-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal-content settings-modal';

    // ── Shell ─────────────────────────────────────────────────────────────────
    modal.innerHTML = `
        <div class="settings-modal-header">
            <div class="settings-modal-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                Settings
            </div>
            <button class="modal-close-btn settings-close-btn">&times;</button>
        </div>
        <div class="settings-modal-layout">
            <!-- Sidebar nav -->
            <nav class="settings-nav" id="settings-nav"></nav>
            <!-- Content pane wrapper -->
            <div style="flex: 1; display: flex; flex-direction: column; min-height: 0; background: var(--bg-card);">
                <div class="settings-pane" id="settings-pane"></div>
                <!-- Global pane footer for save buttons -->
                <div class="settings-pane-footer" id="settings-footer" style="padding: 16px; border-top: 1px solid var(--border-subtle); display: none; justify-content: flex-end; background: var(--bg-card);"></div>
            </div>
        </div>
    `;

    overlay.appendChild(modal);
    root.appendChild(overlay);

    const close = () => { if (root.contains(overlay)) root.removeChild(overlay); };
    overlay.onclick = e => { if (e.target === overlay) close(); };
    modal.querySelector('.settings-close-btn').onclick = close;

    // ── Sidebar sections ──────────────────────────────────────────────────────
    const sections = [
        {
            id: 'integrations',
            label: 'Integrations',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                       <rect x="3" y="11" width="18" height="11" rx="2"/>
                       <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                   </svg>`,
            adminOnly: true,
            render: (pane, footer) => {
                pane.innerHTML = '';
                footer.innerHTML = '';
                footer.style.display = 'flex'; // show for integrations
                renderIntegrationSettings(pane, () => { onUpdate(); }, footer);
            },
        },
        // Future sections can be added here (e.g., Notifications, Appearance)
        {
            id: 'appearance',
            label: 'Appearance',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                       <circle cx="12" cy="12" r="10"/>
                       <path d="M12 8v4l3 3"/>
                   </svg>`,
            adminOnly: false,
            render: (pane, footer) => {
                footer.style.display = 'none'; // hide footer for placeholder
                pane.innerHTML = `
                    <div class="settings-placeholder">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
                            <circle cx="12" cy="12" r="10"/>
                        </svg>
                        <p>Appearance settings coming soon</p>
                    </div>
                `;
            },
        },
    ];

    const visibleSections = sections.filter(s => !s.adminOnly || isAdmin);

    const nav = modal.querySelector('#settings-nav');
    const pane = modal.querySelector('#settings-pane');
    const footer = modal.querySelector('#settings-footer');
    let activeId = visibleSections[0]?.id;

    function activate(id) {
        activeId = id;
        // Update nav
        nav.querySelectorAll('.settings-nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.id === id);
        });
        // Render pane
        const section = visibleSections.find(s => s.id === id);
        if (section) section.render(pane, footer);
    }

    visibleSections.forEach(s => {
        const btn = document.createElement('button');
        btn.className = `settings-nav-item ${s.id === activeId ? 'active' : ''}`;
        btn.dataset.id = s.id;
        btn.innerHTML = `${s.icon}<span>${s.label}</span>`;
        btn.onclick = () => activate(s.id);
        nav.appendChild(btn);
    });

    // Render first section
    if (visibleSections.length > 0) activate(activeId);
}
