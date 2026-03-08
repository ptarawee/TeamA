import { getCurrentUser } from '../auth/auth.js';
import {
    getCurrentTeamId, getTeamById, getUserById,
    getActivitiesByTeam, getActiveTimer, getActivityById,
    getTimeEntriesByTeam, updateActivity
} from '../data/store.js';
import { formatDate, formatDisplayDate, relativeTime } from '../utils/date.js';
import { escapeHtml } from '../utils/sanitize.js';
import { STATUS_LABELS, STATUS_COLORS } from '../data/schema.js';

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2, '': 3 };

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
}

function formatDuration(minutes) {
    if (!minutes || minutes <= 0) return '0m';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
}

function nextStatus(status) {
    if (status === 'todo') return 'in_progress';
    if (status === 'in_progress') return 'done';
    return 'todo';
}

export function renderDashboardOverview(container, onUpdate) {
    const user = getCurrentUser();
    const teamId = getCurrentTeamId();
    const team = getTeamById(teamId);
    const now = new Date();
    const todayStr = formatDate(now);
    const activities = getActivitiesByTeam(teamId);
    const timer = getActiveTimer();
    const timeEntries = getTimeEntriesByTeam(teamId);

    const div = document.createElement('div');
    div.className = 'dashboard-overview';

    // === 1. Welcome Banner ===
    const banner = document.createElement('div');
    banner.className = 'dashboard-welcome card';
    banner.innerHTML = `
        <div class="welcome-content">
            <h2 class="welcome-greeting">${getGreeting()}, ${escapeHtml(user?.name?.split(' ')[0] || 'there')}</h2>
            <p class="welcome-date">${formatDisplayDate(now)}</p>
        </div>
    `;
    div.appendChild(banner);

    // === 2. Quick Stats Row ===
    const myTasksToday = activities.filter(a =>
        a.assigneeId === user?.id && a.dueDate === todayStr && a.status !== 'done'
    );
    const overdueItems = activities.filter(a =>
        a.assigneeId === user?.id && a.dueDate && a.dueDate < todayStr && a.status !== 'done'
    );

    let timerLabel = 'No timer';
    if (timer && timer.userId === user?.id) {
        const timerAct = getActivityById(timer.activityId);
        const elapsed = Math.round((now - new Date(timer.startTime)) / 60000);
        timerLabel = `${escapeHtml(timerAct?.title || 'Timer')} — ${formatDuration(elapsed)}`;
    }

    const memberCount = team?.members?.length || 0;

    const statsRow = document.createElement('div');
    statsRow.className = 'dashboard-stats dashboard-stats-4';
    statsRow.innerHTML = `
        <div class="stat-card">
            <span class="stat-number">${myTasksToday.length}</span>
            <span class="stat-label">My Tasks Today</span>
        </div>
        <div class="stat-card">
            <span class="stat-number stat-timer-text">${timerLabel}</span>
            <span class="stat-label">Active Timer</span>
        </div>
        <div class="stat-card">
            <span class="stat-number${overdueItems.length > 0 ? ' stat-danger' : ''}">${overdueItems.length}</span>
            <span class="stat-label">Overdue Items</span>
        </div>
        <div class="stat-card">
            <span class="stat-number">${memberCount}</span>
            <span class="stat-label">Team Members</span>
        </div>
    `;
    div.appendChild(statsRow);

    // === 3. My Tasks Today ===
    const tasksSection = document.createElement('div');
    tasksSection.className = 'card';
    const tasksHeader = document.createElement('div');
    tasksHeader.className = 'section-header';
    tasksHeader.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        My Tasks Today
    `;
    tasksSection.appendChild(tasksHeader);

    const tasksContent = document.createElement('div');
    tasksContent.className = 'activity-list-content';

    const todayTasks = activities
        .filter(a => a.assigneeId === user?.id && a.dueDate === todayStr)
        .sort((a, b) => (PRIORITY_ORDER[a.priority || ''] ?? 3) - (PRIORITY_ORDER[b.priority || ''] ?? 3));

    if (todayTasks.length === 0) {
        tasksContent.innerHTML = '<div class="empty-state">No tasks due today.</div>';
    } else {
        todayTasks.forEach(act => {
            const item = document.createElement('div');
            item.className = `activity-item${act.status === 'done' ? ' completed' : ''}`;

            const statusColor = STATUS_COLORS[act.status] || '#6B7280';
            const statusLabel = STATUS_LABELS[act.status] || act.status;

            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'status-pill-btn';
            toggleBtn.style.cssText = `background:${statusColor}20; color:${statusColor};`;
            toggleBtn.textContent = statusLabel;
            toggleBtn.addEventListener('click', () => {
                updateActivity(act.id, { status: nextStatus(act.status) });
                if (onUpdate) onUpdate();
            });

            item.innerHTML = `
                <span class="cat-dot" style="background:${statusColor}"></span>
                <div class="activity-item-info">
                    <span class="activity-item-title">${escapeHtml(act.title)}</span>
                </div>
            `;
            item.querySelector('.activity-item-info').after(toggleBtn);
            tasksContent.appendChild(item);
        });
    }
    tasksSection.appendChild(tasksContent);
    div.appendChild(tasksSection);

    // === 4. Upcoming Deadlines (next 7 days, grouped by date) ===
    const deadlinesSection = document.createElement('div');
    deadlinesSection.className = 'card';
    const deadlinesHeader = document.createElement('div');
    deadlinesHeader.className = 'section-header';
    deadlinesHeader.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        Upcoming Deadlines
    `;
    deadlinesSection.appendChild(deadlinesHeader);

    const deadlinesContent = document.createElement('div');
    deadlinesContent.className = 'activity-list-content';

    const futureEnd = new Date(now);
    futureEnd.setDate(futureEnd.getDate() + 7);
    const futureEndStr = formatDate(futureEnd);

    // Activities with due dates from tomorrow to 7 days out
    const tomorrowStr = formatDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
    const upcoming = activities
        .filter(a => a.dueDate && a.dueDate >= tomorrowStr && a.dueDate <= futureEndStr && a.status !== 'done')
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    // Group by date
    const grouped = {};
    upcoming.forEach(a => {
        if (!grouped[a.dueDate]) grouped[a.dueDate] = [];
        grouped[a.dueDate].push(a);
    });

    if (Object.keys(grouped).length === 0) {
        deadlinesContent.innerHTML = '<div class="empty-state">No upcoming deadlines in the next 7 days.</div>';
    } else {
        Object.keys(grouped).sort().forEach(dateStr => {
            const dateLabel = document.createElement('div');
            dateLabel.className = 'deadline-date-label';
            const d = new Date(dateStr + 'T00:00:00');
            dateLabel.textContent = formatDisplayDate(d);
            deadlinesContent.appendChild(dateLabel);

            grouped[dateStr].forEach(act => {
                const assignee = getUserById(act.assigneeId);
                const item = document.createElement('div');
                item.className = 'activity-item';
                item.innerHTML = `
                    <span class="cat-dot" style="background:${STATUS_COLORS[act.status] || '#6B7280'}"></span>
                    <div class="activity-item-info">
                        <span class="activity-item-title">${escapeHtml(act.title)}</span>
                    </div>
                    ${assignee ? `<span class="task-assignee-avatar" style="background:${assignee.color}">${escapeHtml(assignee.avatarInitials)}</span>` : ''}
                    <span class="status-pill-btn" style="background:${STATUS_COLORS[act.status]}20; color:${STATUS_COLORS[act.status]}">${STATUS_LABELS[act.status] || act.status}</span>
                `;
                deadlinesContent.appendChild(item);
            });
        });
    }

    deadlinesSection.appendChild(deadlinesContent);
    div.appendChild(deadlinesSection);

    // === 5. Recent Activity (last 5 time entries across team) ===
    const recentSection = document.createElement('div');
    recentSection.className = 'card';
    const recentHeader = document.createElement('div');
    recentHeader.className = 'section-header';
    recentHeader.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Recent Activity
    `;
    recentSection.appendChild(recentHeader);

    const recentContent = document.createElement('div');
    recentContent.className = 'activity-list-content';

    const recentEntries = [...timeEntries]
        .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
        .slice(0, 5);

    if (recentEntries.length === 0) {
        recentContent.innerHTML = '<div class="empty-state">No recent time entries.</div>';
    } else {
        recentEntries.forEach(entry => {
            const entryUser = getUserById(entry.userId);
            const act = getActivityById(entry.activityId);
            const item = document.createElement('div');
            item.className = 'activity-item';
            item.innerHTML = `
                ${entryUser ? `<span class="task-assignee-avatar" style="background:${entryUser.color}">${escapeHtml(entryUser.avatarInitials)}</span>` : ''}
                <div class="activity-item-info">
                    <span class="activity-item-title">${escapeHtml(act?.title || 'Unknown')}</span>
                    <div class="activity-item-meta">
                        <span class="task-time-badge">${formatDuration(entry.duration)}</span>
                        <span class="task-time-badge">${relativeTime(entry.startTime)}</span>
                        ${entryUser ? `<span class="task-time-badge">${escapeHtml(entryUser.name)}</span>` : ''}
                    </div>
                </div>
            `;
            recentContent.appendChild(item);
        });
    }

    recentSection.appendChild(recentContent);
    div.appendChild(recentSection);

    container.appendChild(div);
}

