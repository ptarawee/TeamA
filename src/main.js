import { seedIfNeeded } from './data/seedData.js';
import { getCurrentTeamId, setCurrentTeamId, getTeamsForUser, getTeamById } from './data/store.js';
import { getCurrentUser, logout } from './auth/auth.js';
import { renderLoginScreen } from './components/loginScreen.js';
import { renderCalendar } from './components/calendar.js';
import { renderActivityList } from './components/activityList.js';
import { renderTimerWidget } from './components/timerWidget.js';
import { renderTimeline } from './components/timeline.js';
import { renderTeamManager, renderTeamSelector, showCreateTeamModal } from './components/teamManager.js';
import { renderAnalyticsView } from './components/analyticsView.js';
import { renderWorkloadView } from './components/workloadView.js';
import { renderProductivityDashboard } from './components/productivityDashboard.js';
import { renderDashboardOverview } from './components/dashboardOverview.js';
import { escapeHtml } from './utils/sanitize.js';
import { isTeamAdmin } from './auth/auth.js';
import { initTheme, renderThemeToggle, getTheme, setTheme } from './components/themeToggle.js';
import { renderNotificationBell } from './components/notifications.js';
import { openActivityModal } from './components/activityModal.js';
import { initKeyboardShortcuts } from './services/keyboardShortcuts.js';
import { showDataManagerModal } from './components/dataManager.js';
import { renderWorkflowManager } from './components/workflowManager.js';
import { openSettingsModal } from './components/settingsModal.js';
import { isSSOSession, clearSSOSession } from './services/ssoService.js';
import { processRecurringActivities } from './services/recurrenceService.js';

let currentDate = new Date();
let selectedDate = new Date();
let activeTab = 'dashboard';
// Tabs: dashboard | calendar | team | analytics | workload | productivity

function init() {
    seedIfNeeded();
    // Process recurring activities for the current team
    const initTeamId = getCurrentTeamId();
    if (initTeamId) processRecurringActivities(initTeamId);
    initTheme();
    initKeyboardShortcuts({
        onNewActivity: () => {
            if (!getCurrentUser() || !getCurrentTeamId()) return;
            openActivityModal(null, { onSave: () => renderApp() });
        },
        onStartTimer: () => {
            if (!getCurrentUser()) return;
            // Navigate to calendar tab where timer widget lives, then focus it
            activeTab = 'calendar';
            renderApp();
            const timerWidget = document.querySelector('.timer-widget');
            if (timerWidget) timerWidget.scrollIntoView({ behavior: 'smooth', block: 'center' });
        },
        onToggleTheme: () => {
            const newTheme = getTheme() === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
            renderApp();
        },
        onNavigate: (tab) => {
            if (!getCurrentUser()) return;
            activeTab = tab;
            renderApp();
        },
    });
    renderApp();
}

function renderApp() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    app.className = '';

    const user = getCurrentUser();
    if (!user) {
        renderLoginScreen(app, () => {
            // Auto-select first team
            const teams = getTeamsForUser(user?.id || getCurrentUser()?.id);
            if (teams.length > 0 && !getCurrentTeamId()) setCurrentTeamId(teams[0].id);
            renderApp();
        });
        return;
    }

    // Ensure team is selected
    if (!getCurrentTeamId()) {
        const teams = getTeamsForUser(user.id);
        if (teams.length > 0) setCurrentTeamId(teams[0].id);
    }

    app.className = 'app-layout';

    // Header
    const header = document.createElement('header');
    header.className = 'app-header';

    const headerLeft = document.createElement('div');
    headerLeft.className = 'header-left';
    headerLeft.innerHTML = `<h1 class="app-logo">Pyrio</h1>`;

    // Team selector
    renderTeamSelector(headerLeft, () => renderApp());

    // Create team button
    const createTeamBtn = document.createElement('button');
    createTeamBtn.className = 'btn btn-sm btn-secondary';
    createTeamBtn.textContent = '+ Team';
    createTeamBtn.onclick = () => showCreateTeamModal(() => renderApp());
    headerLeft.appendChild(createTeamBtn);

    // Nav tabs — members: Dashboard + Calendar; admins: all; SSO users: Calendar only
    const teamId = getCurrentTeamId();
    const userIsAdmin = teamId ? isTeamAdmin(teamId) : false;
    const ssoUser = isSSOSession();

    // SSO users are locked to Calendar regardless of role
    if (ssoUser && activeTab !== 'calendar') {
        activeTab = 'calendar';
    }

    // Non-admin non-SSO users: redirect away from admin-only tabs
    const adminOnlyTabs = ['team', 'analytics', 'workload', 'productivity'];
    if (!userIsAdmin && !ssoUser && adminOnlyTabs.includes(activeTab)) {
        activeTab = 'dashboard';
    }

    const nav = document.createElement('nav');
    nav.className = 'app-nav';
    const allTabs = [
        { id: 'dashboard', label: 'Dashboard', adminOnly: false, ssoHidden: true },
        { id: 'calendar', label: 'Calendar', adminOnly: false, ssoHidden: false },
        { id: 'team', label: 'Team', adminOnly: true, ssoHidden: true },
        { id: 'analytics', label: 'Analytics', adminOnly: true, ssoHidden: true },
        { id: 'workload', label: 'Workload', adminOnly: true, ssoHidden: true },
        { id: 'productivity', label: 'Productivity', adminOnly: true, ssoHidden: true },
    ];
    const visibleTabs = allTabs.filter(t => {
        if (ssoUser) return !t.ssoHidden;
        return !t.adminOnly || userIsAdmin;
    });
    visibleTabs.forEach(t => {
        const btn = document.createElement('button');
        btn.className = `nav-tab ${activeTab === t.id ? 'active' : ''}`;
        btn.textContent = t.label;
        btn.onclick = () => { activeTab = t.id; renderApp(); };
        nav.appendChild(btn);
    });
    headerLeft.appendChild(nav);

    const headerRight = document.createElement('div');
    headerRight.className = 'header-right';

    // SSO badge (shown when logged in via HR SSO)
    if (ssoUser) {
        const ssoBadge = document.createElement('div');
        ssoBadge.className = 'sso-session-badge';
        ssoBadge.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            SSO
        `;
        ssoBadge.title = 'Signed in via HR Platform SSO (Calendar access only)';
        headerRight.appendChild(ssoBadge);
    }

    headerRight.innerHTML += `
        <div class="header-user">
            <span class="header-avatar" style="background-color:${user.color}">${escapeHtml(user.avatarInitials)}</span>
            <span class="header-username">${escapeHtml(user.name)}</span>
        </div>
    `;

    renderNotificationBell(headerRight, user.id);
    renderThemeToggle(headerRight);

    // Settings button (admin only — gear icon)
    if (userIsAdmin) {
        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'btn btn-sm btn-secondary header-settings-btn';
        settingsBtn.title = 'Settings';
        settingsBtn.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
        `;
        settingsBtn.onclick = () => openSettingsModal(() => renderApp());
        headerRight.appendChild(settingsBtn);
    }

    // Data import/export button
    const dataBtn = document.createElement('button');
    dataBtn.className = 'btn btn-sm btn-secondary data-manager-btn';
    dataBtn.style.display = 'inline-flex';
    dataBtn.style.alignItems = 'center';
    dataBtn.style.justifyContent = 'center';
    dataBtn.style.padding = '4px 8px';
    dataBtn.style.cursor = 'pointer';
    dataBtn.title = 'Import / Export data';
    dataBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>`;
    dataBtn.onclick = () => showDataManagerModal(() => renderApp());
    headerRight.appendChild(dataBtn);

    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn btn-sm btn-secondary logout-btn';
    logoutBtn.textContent = 'Logout';
    logoutBtn.onclick = () => { clearSSOSession(); logout(); renderApp(); };
    headerRight.appendChild(logoutBtn);

    header.appendChild(headerLeft);
    header.appendChild(headerRight);
    app.appendChild(header);

    // Main content
    const main = document.createElement('main');
    main.className = 'app-main';

    const currentTeamId = getCurrentTeamId();
    if (!currentTeamId) {
        main.innerHTML = '<div class="empty-state" style="padding:4rem">No team selected. Create or join a team to get started.</div>';
        app.appendChild(main);
        return;
    }

    switch (activeTab) {
        case 'dashboard':
            renderDashboardOverview(main, () => renderApp());
            break;
        case 'calendar':
            renderCalendarView(main);
            break;
        case 'team':
            renderTeamView(main);
            break;
        case 'analytics':
            renderAnalyticsPage(main);
            break;
        case 'workload':
            renderWorkloadPage(main);
            break;
        case 'productivity':
            renderProductivityPage(main);
            break;
    }

    app.appendChild(main);
}

function renderCalendarView(main) {
    const grid = document.createElement('div');
    grid.className = 'main-grid';

    const leftCol = document.createElement('div');
    leftCol.className = 'grid-left';

    const rightCol = document.createElement('div');
    rightCol.className = 'grid-right';

    renderCalendar(leftCol, currentDate, selectedDate, (date, isNav) => {
        if (!isNav) selectedDate = date;
        renderApp();
    });

    renderTimerWidget(rightCol, () => renderApp());
    renderActivityList(rightCol, selectedDate, 'daily', () => renderApp());
    renderTimeline(rightCol, selectedDate, 'personal', () => renderApp());

    grid.appendChild(leftCol);
    grid.appendChild(rightCol);
    main.appendChild(grid);
}

function renderTeamView(main) {
    const grid = document.createElement('div');
    grid.className = 'main-grid';

    const leftCol = document.createElement('div');
    leftCol.className = 'grid-left';

    const rightCol = document.createElement('div');
    rightCol.className = 'grid-right';

    renderTeamManager(leftCol, () => renderApp());
    renderWorkflowManager(leftCol, () => renderApp());
    renderActivityList(rightCol, selectedDate, 'team', () => renderApp());
    renderTimeline(rightCol, selectedDate, 'team', () => renderApp());

    grid.appendChild(leftCol);
    grid.appendChild(rightCol);
    main.appendChild(grid);
}

function renderAnalyticsPage(main) {
    renderAnalyticsView(main, 'week', () => renderApp());
}

function renderWorkloadPage(main) {
    renderWorkloadView(main, () => renderApp());
}

function renderProductivityPage(main) {
    renderProductivityDashboard(main);
}

document.addEventListener('DOMContentLoaded', init);
