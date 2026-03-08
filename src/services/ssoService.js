/**
 * SSO Service — manages HR Platform Single Sign-On configuration and session.
 * Config is stored app-wide (not per-team) so any team admin can configure it
 * and all users see the SSO button on the login screen.
 */

const SSO_CONFIG_KEY = 'pyrio_sso_config';
const SSO_SESSION_KEY = 'pyrio_sso_session';

// ── Default configuration ────────────────────────────────────────────────────
function defaultConfig() {
    return {
        enabled: false,
        platformName: 'HR Platform',
        ssoUrl: 'https://hr.company.com/sso/auth',
        clientId: 'pyrio-app-001',
        allowedDomain: '',          // e.g. "company.com" — leave blank to allow any
        buttonColor: '#1D4ED8',   // colour for the SSO button
        buttonLabel: 'Sign in with HR Platform',
        description: 'Employees and contractors can sign in using their HR credentials.',
        calendarOnly: true,        // SSO users see Calendar only
    };
}

// ── Config ───────────────────────────────────────────────────────────────────
export function getSSOConfig() {
    try {
        const raw = localStorage.getItem(SSO_CONFIG_KEY);
        return raw ? { ...defaultConfig(), ...JSON.parse(raw) } : defaultConfig();
    } catch { return defaultConfig(); }
}

export function setSSOConfig(config) {
    localStorage.setItem(SSO_CONFIG_KEY, JSON.stringify(config));
}

export function isSSOEnabled() {
    return getSSOConfig().enabled === true;
}

// ── Session ──────────────────────────────────────────────────────────────────
export function getSSOSession() {
    try {
        const raw = localStorage.getItem(SSO_SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

export function setSSOSession(data) {
    localStorage.setItem(SSO_SESSION_KEY, JSON.stringify(data));
}

export function clearSSOSession() {
    localStorage.removeItem(SSO_SESSION_KEY);
}

export function isSSOSession() {
    return getSSOSession() !== null;
}

// ── User resolution helpers ──────────────────────────────────────────────────
/**
 * Generate a random avatar colour deterministically from an email string.
 */
export function colorFromEmail(email) {
    const COLORS = [
        '#4F46E5', '#059669', '#D97706', '#DC2626',
        '#BE185D', '#0891B2', '#7C3AED', '#0D9488',
        '#EA580C', '#65A30D',
    ];
    let hash = 0;
    for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
    return COLORS[Math.abs(hash) % COLORS.length];
}

/**
 * Derive avatar initials from a display name or email.
 */
export function initialsFromName(name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}

/**
 * Turn an email like "jane.doe@company.com" into a display name "Jane Doe".
 */
export function nameFromEmail(email) {
    const local = email.split('@')[0];
    return local
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}
