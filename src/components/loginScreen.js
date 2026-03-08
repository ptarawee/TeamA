import { getUsers, getTeams, getTeamsForUser, setCurrentTeamId } from '../data/store.js';
import { setCurrentUser } from '../auth/auth.js';
import { escapeHtml } from '../utils/sanitize.js';
import {
    isSSOEnabled, getSSOConfig, setSSOSession,
    colorFromEmail, initialsFromName, nameFromEmail
} from '../services/ssoService.js';
import { showToast } from './toast.js';

/** Returns 'admin' if the user is admin in ANY team, otherwise 'member'. */
function getUserGlobalRole(userId) {
    for (const team of getTeams()) {
        const member = team.members?.find(m => m.userId === userId);
        if (member?.role === 'admin') return 'admin';
    }
    return 'member';
}

/** Returns array of team names the user belongs to. */
function getUserTeamNames(userId) {
    return getTeams()
        .filter(t => t.members?.some(m => m.userId === userId))
        .map(t => t.name);
}

export function renderLoginScreen(container, onLogin) {
    const users = getUsers();
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'login-screen';

    const card = document.createElement('div');
    card.className = 'login-card';

    card.innerHTML = `
        <div class="login-header">
            <h1 class="login-title">Pyrio</h1>
            <p class="login-subtitle">Team Activity &amp; Time Tracking</p>
        </div>
        <p class="login-prompt">Select your profile to continue</p>
        <div class="login-users"></div>
    `;

    // ── Normal user list ─────────────────────────────────────────────────────
    const usersDiv = card.querySelector('.login-users');
    users.forEach(user => {
        const role = getUserGlobalRole(user.id);
        const teamNames = getUserTeamNames(user.id);
        const btn = document.createElement('button');
        btn.className = 'login-user-btn';

        const teamsHtml = teamNames.length
            ? teamNames.map(n => `<span class="login-team-chip">${escapeHtml(n)}</span>`).join('')
            : '';

        btn.innerHTML = `
            <div class="login-avatar" style="background-color: ${escapeHtml(user.color)}">${escapeHtml(user.avatarInitials)}</div>
            <div class="login-user-info">
                <div class="login-user-name-row">
                    <span class="login-user-name">${escapeHtml(user.name)}</span>
                    <span class="login-role-badge login-role-badge--${escapeHtml(role)}">${role === 'admin' ? 'Admin' : 'Member'}</span>
                </div>
                <div class="login-user-meta">
                    <span class="login-user-email">${escapeHtml(user.email)}</span>
                    ${teamsHtml ? `<span class="login-teams-row">${teamsHtml}</span>` : ''}
                </div>
            </div>
        `;
        btn.onclick = () => { setCurrentUser(user.id); onLogin(); };
        usersDiv.appendChild(btn);
    });

    // ── SSO section ──────────────────────────────────────────────────────────
    if (isSSOEnabled()) {
        const cfg = getSSOConfig();

        const ssoDivider = document.createElement('div');
        ssoDivider.className = 'login-sso-divider';
        ssoDivider.innerHTML = '<span>or</span>';
        card.appendChild(ssoDivider);

        const ssoSection = document.createElement('div');
        ssoSection.className = 'login-sso-section';

        if (cfg.description) {
            const desc = document.createElement('p');
            desc.className = 'login-sso-desc';
            desc.textContent = cfg.description;
            ssoSection.appendChild(desc);
        }

        const ssoBtn = document.createElement('button');
        ssoBtn.className = 'login-sso-btn';
        ssoBtn.style.setProperty('--sso-color', cfg.buttonColor);
        ssoBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>${escapeHtml(cfg.buttonLabel)}</span>
        `;
        ssoBtn.onclick = () => openSSOModal(cfg, onLogin);
        ssoSection.appendChild(ssoBtn);

        const secureBadge = document.createElement('div');
        secureBadge.className = 'login-sso-secure';
        secureBadge.innerHTML = `
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Secured by ${escapeHtml(cfg.platformName)}
        `;
        ssoSection.appendChild(secureBadge);
        card.appendChild(ssoSection);
    }

    wrapper.appendChild(card);
    container.appendChild(wrapper);
}

// ── Mock SSO Portal Modal ─────────────────────────────────────────────────────
function openSSOModal(cfg, onLogin) {
    const root = document.getElementById('modal-root');
    if (!root) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay sso-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal-content sso-modal';

    modal.innerHTML = `
        <div class="sso-modal-header" style="--sso-color:${escapeHtml(cfg.buttonColor)}">
            <div class="sso-modal-logo">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
            </div>
            <div class="sso-modal-title-wrap">
                <span class="sso-modal-platform">${escapeHtml(cfg.platformName)}</span>
                <span class="sso-modal-subtitle">Single Sign-On</span>
            </div>
        </div>

        <div class="sso-modal-body" id="sso-modal-body">
            <div id="sso-step-email">
                <p class="sso-body-title">Sign in to your organization</p>
                <p class="sso-body-hint">Enter your work email address to continue</p>
                <div class="form-group">
                    <label>Work Email</label>
                    <input type="email" id="sso-email-input" class="form-input"
                        placeholder="you@${escapeHtml(cfg.allowedDomain || 'company.com')}">
                </div>
                <button class="btn btn-primary sso-continue-btn" id="sso-continue-btn"
                    style="width:100%;background:${escapeHtml(cfg.buttonColor)};border-color:${escapeHtml(cfg.buttonColor)}">
                    Continue
                </button>
            </div>

            <div id="sso-step-auth" style="display:none" class="sso-step-auth">
                <div class="sso-spinner"></div>
                <p class="sso-auth-text">Authenticating with ${escapeHtml(cfg.platformName)}&hellip;</p>
            </div>

            <div id="sso-step-success" style="display:none" class="sso-step-success">
                <div class="sso-success-icon" style="color:${escapeHtml(cfg.buttonColor)}">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                </div>
                <p class="sso-auth-text">Signed in successfully!</p>
                <p class="sso-auth-hint">Redirecting to Calendar&hellip;</p>
            </div>
        </div>

        <div class="sso-modal-footer">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Secured by ${escapeHtml(cfg.platformName)} &middot; Client ID: ${escapeHtml(cfg.clientId)}
        </div>
    `;

    overlay.appendChild(modal);
    root.appendChild(overlay);
    overlay.onclick = e => { if (e.target === overlay) root.removeChild(overlay); };

    setTimeout(() => modal.querySelector('#sso-email-input')?.focus(), 50);

    modal.querySelector('#sso-continue-btn').onclick = () => {
        const email = modal.querySelector('#sso-email-input').value.trim().toLowerCase();
        if (!email || !email.includes('@')) {
            modal.querySelector('#sso-email-input').classList.add('input-error');
            return;
        }

        // Domain validation
        if (cfg.allowedDomain) {
            const domain = email.split('@')[1];
            if (domain !== cfg.allowedDomain) {
                modal.querySelector('#sso-email-input').classList.add('input-error');
                showToast(`Only @${cfg.allowedDomain} addresses are allowed`, 'error');
                return;
            }
        }

        // Show authenticating step
        modal.querySelector('#sso-step-email').style.display = 'none';
        modal.querySelector('#sso-step-auth').style.display = '';

        // Simulate SSO round-trip (800–1400ms)
        const delay = 800 + Math.random() * 600;
        setTimeout(() => {
            // Find or auto-create SSO user
            const allUsers = getUsers();
            let matchedUser = allUsers.find(u => u.email.toLowerCase() === email);

            if (!matchedUser) {
                const name = nameFromEmail(email);
                const initials = initialsFromName(name);
                const color = colorFromEmail(email);
                matchedUser = {
                    id: `sso_${Date.now()}`,
                    name,
                    email,
                    color,
                    avatarInitials: initials,
                };
                allUsers.push(matchedUser);
                localStorage.setItem('pyrio_users', JSON.stringify(allUsers));
            }

            // Mark this session as SSO
            setSSOSession({ email, userId: matchedUser.id, via: 'sso', at: Date.now() });

            // Log the user in
            setCurrentUser(matchedUser.id);

            // Auto-select a team (prefer one the user belongs to, else first available)
            const userTeams = getTeamsForUser(matchedUser.id);
            const allTeams = getTeams();
            const target = userTeams[0] || allTeams[0];
            if (target) setCurrentTeamId(target.id);

            // Show success
            modal.querySelector('#sso-step-auth').style.display = 'none';
            modal.querySelector('#sso-step-success').style.display = '';

            setTimeout(() => {
                root.removeChild(overlay);
                onLogin();
            }, 1000);
        }, delay);
    };

    modal.querySelector('#sso-email-input').onkeydown = e => {
        if (e.key === 'Enter') modal.querySelector('#sso-continue-btn').click();
    };
}
