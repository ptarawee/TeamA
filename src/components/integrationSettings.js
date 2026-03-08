import { getSSOConfig, setSSOConfig, isSSOEnabled } from '../services/ssoService.js';
import { isTeamAdmin } from '../auth/auth.js';
import { getCurrentTeamId } from '../data/store.js';
import { escapeHtml } from '../utils/sanitize.js';
import { showToast } from './toast.js';

/**
 * Renders the HR Platform SSO Integration settings card.
 * Only visible to admins.
 */
export function renderIntegrationSettings(container, onUpdate, footerContainer = null) {
    const teamId = getCurrentTeamId();
    if (!isTeamAdmin(teamId)) return; // admin-only

    const cfg = getSSOConfig();

    const section = document.createElement('div');
    section.className = 'card integration-settings-section';

    // ── Header ──────────────────────────────────────────────────────────────
    const header = document.createElement('div');
    header.className = 'section-header';
    header.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        HR Platform Integration
        <span class="integration-status-dot ${cfg.enabled ? 'active' : ''}"></span>
        <span class="integration-status-text">${cfg.enabled ? 'Enabled' : 'Disabled'}</span>
    `;

    // ── Body ─────────────────────────────────────────────────────────────────
    const body = document.createElement('div');
    body.className = 'integration-body';

    body.innerHTML = `
        <!-- Enable toggle -->
        <div class="integration-toggle-row">
            <div class="integration-toggle-info">
                <span class="integration-toggle-title">Single Sign-On (SSO)</span>
                <span class="integration-toggle-desc">Allow employees to sign in with their HR platform credentials. SSO users get Calendar access only.</span>
            </div>
            <label class="toggle-switch">
                <input type="checkbox" id="sso-enabled" ${cfg.enabled ? 'checked' : ''}>
                <span class="toggle-slider"></span>
            </label>
        </div>

        <div class="integration-divider"></div>

        <!-- Config fields -->
        <div class="integration-fields" id="sso-fields" style="${!cfg.enabled ? 'opacity:0.5;pointer-events:none' : ''}">

            <div class="form-row">
                <div class="form-group">
                    <label>Platform Name</label>
                    <input type="text" id="sso-platform-name" class="form-input" value="${escapeHtml(cfg.platformName)}" placeholder="e.g. Workday, SAP SuccessFactors">
                </div>
                <div class="form-group">
                    <label>Client / App ID</label>
                    <input type="text" id="sso-client-id" class="form-input" value="${escapeHtml(cfg.clientId)}" placeholder="e.g. pyrio-app-001">
                </div>
            </div>

            <div class="form-group">
                <label>SSO Endpoint URL</label>
                <input type="url" id="sso-url" class="form-input" value="${escapeHtml(cfg.ssoUrl)}" placeholder="https://hr.company.com/sso/auth">
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Allowed Email Domain <span class="field-hint">(optional)</span></label>
                    <div class="input-prefix-wrap">
                        <span class="input-prefix">@</span>
                        <input type="text" id="sso-domain" class="form-input input-with-prefix" value="${escapeHtml(cfg.allowedDomain)}" placeholder="company.com">
                    </div>
                </div>
                <div class="form-group">
                    <label>Button Colour</label>
                    <div class="color-input-row">
                        <input type="color" id="sso-color" class="color-picker-input" value="${escapeHtml(cfg.buttonColor)}">
                        <input type="text" id="sso-color-text" class="form-input" value="${escapeHtml(cfg.buttonColor)}" maxlength="7" style="flex:1">
                    </div>
                </div>
            </div>

            <div class="form-group">
                <label>Button Label</label>
                <input type="text" id="sso-btn-label" class="form-input" value="${escapeHtml(cfg.buttonLabel)}" placeholder="Sign in with HR Platform">
            </div>

            <div class="form-group">
                <label>Description <span class="field-hint">(shown on login page)</span></label>
                <input type="text" id="sso-description" class="form-input" value="${escapeHtml(cfg.description)}" placeholder="Short description for employees">
            </div>

            <!-- Live preview -->
            <div class="sso-preview-box">
                <div class="sso-preview-label">Login Button Preview</div>
                <button class="sso-preview-btn" id="sso-preview-btn" style="background:${escapeHtml(cfg.buttonColor)}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    ${escapeHtml(cfg.buttonLabel)}
                </button>
                <span class="sso-preview-note">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    SSO users can only access <strong>Calendar</strong>
                </span>
            </div>
        </div>
    `;

    section.appendChild(header);
    section.appendChild(body);
    container.appendChild(section);

    // Render footer
    let saveBtn;
    if (footerContainer) {
        footerContainer.innerHTML = `<button class="btn btn-primary" id="sso-save-btn">Save Configuration</button>`;
        saveBtn = footerContainer.querySelector('#sso-save-btn');
    } else {
        const footerInfo = document.createElement('div');
        footerInfo.className = 'integration-footer';
        footerInfo.innerHTML = `<button class="btn btn-primary" id="sso-save-btn">Save Configuration</button>`;
        section.appendChild(footerInfo);
        saveBtn = footerInfo.querySelector('#sso-save-btn');
    }

    // ── Event wiring ─────────────────────────────────────────────────────────
    const enabledCb = section.querySelector('#sso-enabled');
    const fieldsDiv = section.querySelector('#sso-fields');
    const colorPick = section.querySelector('#sso-color');
    const colorText = section.querySelector('#sso-color-text');

    const previewBtn = section.querySelector('#sso-preview-btn');
    const labelInput = section.querySelector('#sso-btn-label');

    enabledCb.onchange = () => {
        fieldsDiv.style.opacity = enabledCb.checked ? '1' : '0.5';
        fieldsDiv.style.pointerEvents = enabledCb.checked ? '' : 'none';
    };

    // Sync colour picker ↔ text input ↔ preview button
    colorPick.oninput = () => {
        colorText.value = colorPick.value;
        previewBtn.style.background = colorPick.value;
    };
    colorText.oninput = () => {
        if (/^#[0-9A-Fa-f]{6}$/.test(colorText.value)) {
            colorPick.value = colorText.value;
            previewBtn.style.background = colorText.value;
        }
    };

    // Live label preview
    labelInput.oninput = () => {
        previewBtn.querySelector('svg').outerHTML; // keep svg
        previewBtn.childNodes[previewBtn.childNodes.length - 1].textContent = ' ' + labelInput.value;
    };

    saveBtn.onclick = () => {
        const newCfg = {
            enabled: enabledCb.checked,
            platformName: section.querySelector('#sso-platform-name').value.trim() || 'HR Platform',
            clientId: section.querySelector('#sso-client-id').value.trim(),
            ssoUrl: section.querySelector('#sso-url').value.trim(),
            allowedDomain: section.querySelector('#sso-domain').value.trim().replace(/^@/, ''),
            buttonColor: colorPick.value,
            buttonLabel: section.querySelector('#sso-btn-label').value.trim() || 'Sign in with HR Platform',
            description: section.querySelector('#sso-description').value.trim(),
            calendarOnly: true,
        };
        setSSOConfig(newCfg);
        showToast(
            newCfg.enabled ? '✓ SSO enabled — login page updated' : 'SSO disabled',
            newCfg.enabled ? 'success' : 'info'
        );
        onUpdate();
    };
}
