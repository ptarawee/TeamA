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

    // Nav tabs
    const nav = document.createElement('nav');
    nav.className = 'app-nav';
    const tabs = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'calendar', label: 'Calendar' },
        { id: 'team', label: 'Team' },
        { id: 'analytics', label: 'Analytics' },
        { id: 'workload', label: 'Workload' },
        { id: 'productivity', label: 'Productivity' },
    ];
    tabs.forEach(t => {
        const btn = document.createElement('button');
        btn.className = `nav-tab ${activeTab === t.id ? 'active' : ''}`;
        btn.textContent = t.label;
        btn.onclick = () => { activeTab = t.id; renderApp(); };
        nav.appendChild(btn);
    });
    headerLeft.appendChild(nav);

    const headerRight = document.createElement('div');
    headerRight.className = 'header-right';
    headerRight.innerHTML = `
        <div class="header-user">
            <span class="header-avatar" style="background-color:${user.color}">${escapeHtml(user.avatarInitials)}</span>
            <span class="header-username">${escapeHtml(user.name)}</span>
        </div>
    `;

    renderNotificationBell(headerRight, user.id);
    renderThemeToggle(headerRight);

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
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>`;
    dataBtn.onclick = () => showDataManagerModal(() => renderApp());
    headerRight.appendChild(dataBtn);

    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn btn-sm btn-secondary logout-btn';
    logoutBtn.textContent = 'Logout';
    logoutBtn.onclick = () => { logout(); renderApp(); };
    headerRight.appendChild(logoutBtn);

    header.appendChild(headerLeft);
    header.appendChild(headerRight);
    app.appendChild(header);

    // Main content
    const main = document.createElement('main');
    main.className = 'app-main';

    const teamId = getCurrentTeamId();
    if (!teamId) {
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
