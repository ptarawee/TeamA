import { getTeamById, getUserById, getCurrentTeamId, getTimeEntriesInRange,
    getActivitiesByAssignee } from '../data/store.js';
import { escapeHtml } from '../utils/sanitize.js';
import { formatDate, getWeekStart, getWeekEnd } from '../utils/date.js';
import { WORKLOAD_HIGH_THRESHOLD, WORKLOAD_LOW_THRESHOLD } from '../data/schema.js';

export function renderWorkloadView(container, onUpdate, customStart, customEnd) {
    const div = document.createElement('div');
    div.className = 'card workload-section';
    const teamId = getCurrentTeamId();
    const team = getTeamById(teamId);

    const now = new Date();
    let startDate, endDate, rangeLabel;

    if (customStart && customEnd) {
        startDate = customStart;
        endDate = customEnd;
        rangeLabel = `${startDate} — ${endDate}`;
    } else {
        startDate = formatDate(getWeekStart(now));
        endDate = formatDate(getWeekEnd(now));
        rangeLabel = 'This Week';
    }
    const entries = getTimeEntriesInRange(teamId, startDate, endDate);

    const header = document.createElement('div');
    header.className = 'section-header';
    header.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        Workload Distribution — ${rangeLabel}
    `;

    // Date range picker
    const datePickerDiv = document.createElement('div');
    datePickerDiv.className = 'date-range-picker';

    const startInput = document.createElement('input');
    startInput.type = 'date';
    startInput.className = 'date-input';
    startInput.value = startDate;

    const toLabel = document.createElement('span');
    toLabel.className = 'date-range-separator';
    toLabel.textContent = 'to';

    const endInput = document.createElement('input');
    endInput.type = 'date';
    endInput.className = 'date-input';
    endInput.value = endDate;

    const onDateChange = () => {
        if (startInput.value && endInput.value && startInput.value <= endInput.value) {
            container.innerHTML = '';
            renderWorkloadView(container, onUpdate, startInput.value, endInput.value);
        }
    };
    startInput.addEventListener('change', onDateChange);
    endInput.addEventListener('change', onDateChange);

    datePickerDiv.appendChild(startInput);
    datePickerDiv.appendChild(toLabel);
    datePickerDiv.appendChild(endInput);
    header.appendChild(datePickerDiv);

    const content = document.createElement('div');
    content.className = 'workload-content';

    if (!team || team.members.length === 0) {
        content.innerHTML = '<div class="empty-state">No team members</div>';
        div.appendChild(header);
        div.appendChild(content);
        container.appendChild(div);
        return;
    }

    // Calculate per-member workload
    const memberData = team.members.map(m => {
        const u = getUserById(m.userId);
        const userEntries = entries.filter(e => e.userId === m.userId);
        const totalMinutes = userEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
        const totalHours = totalMinutes / 60;
        const openActivities = getActivitiesByAssignee(teamId, m.userId).filter(a => a.status !== 'done').length;

        let status = 'normal';
        let statusLabel = 'Balanced';
        let statusColor = '#10B981';

        if (totalHours >= WORKLOAD_HIGH_THRESHOLD) {
            status = 'high';
            statusLabel = 'Overloaded';
            statusColor = '#DC2626';
        } else if (totalHours >= WORKLOAD_HIGH_THRESHOLD * 0.75) {
            status = 'busy';
            statusLabel = 'Busy';
            statusColor = '#F59E0B';
        } else if (totalHours < WORKLOAD_LOW_THRESHOLD && totalMinutes > 0) {
            status = 'low';
            statusLabel = 'Underutilized';
            statusColor = '#6366F1';
        } else if (totalMinutes === 0) {
            status = 'idle';
            statusLabel = 'No entries';
            statusColor = '#9CA3AF';
        }

        return { user: u, totalMinutes, totalHours, openActivities, status, statusLabel, statusColor, ...m };
    });

    // Sort by hours descending
    memberData.sort((a, b) => b.totalMinutes - a.totalMinutes);
    const maxHours = Math.max(...memberData.map(m => m.totalHours), 1);

    // Alerts
    const highLoad = memberData.filter(m => m.status === 'high');
    const lowLoad = memberData.filter(m => m.status === 'low');

    if (highLoad.length > 0 || lowLoad.length > 0) {
        const alertsDiv = document.createElement('div');
        alertsDiv.className = 'workload-alerts';

        highLoad.forEach(m => {
            alertsDiv.innerHTML += `<div class="workload-alert alert-high">⚠ ${escapeHtml(m.user?.name || '')} is overloaded (${m.totalHours.toFixed(1)}h this week)</div>`;
        });
        lowLoad.forEach(m => {
            alertsDiv.innerHTML += `<div class="workload-alert alert-low">ℹ ${escapeHtml(m.user?.name || '')} has low utilization (${m.totalHours.toFixed(1)}h this week)</div>`;
        });
        content.appendChild(alertsDiv);
    }

    // Member workload bars
    memberData.forEach(m => {
        if (!m.user) return;
        const h = Math.floor(m.totalMinutes / 60);
        const mins = m.totalMinutes % 60;
        const barPct = (m.totalHours / WORKLOAD_HIGH_THRESHOLD) * 100;

        const row = document.createElement('div');
        row.className = 'workload-row';
        row.innerHTML = `
            <div class="workload-user">
                <span class="workload-avatar" style="background:${m.user.color}">${escapeHtml(m.user.avatarInitials)}</span>
                <div class="workload-user-info">
                    <span class="workload-name">${escapeHtml(m.user.name)}</span>
                    <span class="workload-detail">${m.openActivities} open activities</span>
                </div>
            </div>
            <div class="workload-bar-container">
                <div class="workload-bar" style="width:${Math.min(barPct, 100)}%; background:${m.statusColor}"></div>
            </div>
            <div class="workload-info">
                <span class="workload-hours" style="color:${m.statusColor}">${h}h ${mins}m</span>
                <span class="workload-status-label">${m.statusLabel}</span>
            </div>
        `;
        content.appendChild(row);
    });

    // Comparison summary
    const teamTotal = memberData.reduce((sum, m) => sum + m.totalMinutes, 0);
    const teamAvg = team.members.length > 0 ? teamTotal / team.members.length : 0;
    const avgH = Math.floor(teamAvg / 60);
    const avgM = Math.round(teamAvg % 60);

    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'workload-summary';
    summaryDiv.innerHTML = `
        <div class="workload-summary-item">
            <span class="summary-label">Team Total</span>
            <span class="summary-value">${Math.floor(teamTotal / 60)}h ${teamTotal % 60}m</span>
        </div>
        <div class="workload-summary-item">
            <span class="summary-label">Average / Member</span>
            <span class="summary-value">${avgH}h ${avgM}m</span>
        </div>
    `;
    content.appendChild(summaryDiv);

    div.appendChild(header);
    div.appendChild(content);
    container.appendChild(div);
}
