import { getTimeEntriesInRange, getActivitiesByTeam, getTeamById, getUserById,
    getCurrentTeamId, getCategories } from '../data/store.js';
import { escapeHtml } from '../utils/sanitize.js';
import { formatDate, getWeekStart, getWeekEnd } from '../utils/date.js';

export function renderAnalyticsView(container, dateRange, onUpdate, customStart, customEnd) {
    const div = document.createElement('div');
    div.className = 'card analytics-section';
    const teamId = getCurrentTeamId();
    const team = getTeamById(teamId);
    const categories = getCategories(teamId);

    const range = dateRange || 'week';
    const now = new Date();
    let startDate, endDate, rangeLabel;

    if (customStart && customEnd) {
        startDate = customStart;
        endDate = customEnd;
        rangeLabel = `${startDate} — ${endDate}`;
    } else if (range === 'week') {
        const ws = getWeekStart(now);
        const we = getWeekEnd(now);
        startDate = formatDate(ws);
        endDate = formatDate(we);
        rangeLabel = 'This Week';
    } else {
        // Daily
        startDate = formatDate(now);
        endDate = formatDate(now);
        rangeLabel = 'Today';
    }

    const entries = getTimeEntriesInRange(teamId, startDate, endDate);
    const activities = getActivitiesByTeam(teamId);

    // Build activity map
    const actMap = {};
    activities.forEach(a => { actMap[a.id] = a; });

    // Category breakdown
    const catMinutes = {};
    const catMap = {};
    categories.forEach(c => { catMap[c.id] = c; catMinutes[c.id] = 0; });
    catMinutes['uncategorized'] = 0;

    entries.forEach(e => {
        const act = actMap[e.activityId];
        const catId = act?.categoryId || 'uncategorized';
        catMinutes[catId] = (catMinutes[catId] || 0) + (e.duration || 0);
    });

    const totalMinutes = Object.values(catMinutes).reduce((a, b) => a + b, 0);

    // Per-member breakdown
    const memberMinutes = {};
    (team?.members || []).forEach(m => { memberMinutes[m.userId] = 0; });
    entries.forEach(e => { memberMinutes[e.userId] = (memberMinutes[e.userId] || 0) + (e.duration || 0); });

    // Daily breakdown (for weekly view)
    const dailyMinutes = {};
    entries.forEach(e => {
        const d = e.startTime.split('T')[0];
        dailyMinutes[d] = (dailyMinutes[d] || 0) + (e.duration || 0);
    });

    const header = document.createElement('div');
    header.className = 'section-header';
    header.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        Activity Analytics — ${rangeLabel}
    `;

    // Range toggle
    const toggleDiv = document.createElement('div');
    toggleDiv.className = 'range-toggle';
    toggleDiv.innerHTML = `
        <button class="btn btn-sm ${range === 'day' ? 'btn-primary' : 'btn-secondary'}" data-range="day">Daily</button>
        <button class="btn btn-sm ${range === 'week' ? 'btn-primary' : 'btn-secondary'}" data-range="week">Weekly</button>
    `;
    toggleDiv.querySelectorAll('button').forEach(btn => {
        btn.onclick = () => {
            container.innerHTML = '';
            renderAnalyticsView(container, btn.dataset.range, onUpdate);
        };
    });
    header.appendChild(toggleDiv);

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
            renderAnalyticsView(container, range, onUpdate, startInput.value, endInput.value);
        }
    };
    startInput.addEventListener('change', onDateChange);
    endInput.addEventListener('change', onDateChange);

    datePickerDiv.appendChild(startInput);
    datePickerDiv.appendChild(toLabel);
    datePickerDiv.appendChild(endInput);
    header.appendChild(datePickerDiv);

    const content = document.createElement('div');
    content.className = 'analytics-content';

    // Total time summary
    const totalH = Math.floor(totalMinutes / 60);
    const totalM = totalMinutes % 60;
    content.innerHTML = `<div class="analytics-total">Total Time: <strong>${totalH}h ${totalM}m</strong></div>`;

    // Category chart (horizontal bars)
    const catSection = document.createElement('div');
    catSection.className = 'analytics-chart-section';
    catSection.innerHTML = '<h4 class="chart-title">Time by Category</h4>';

    const sortedCats = Object.entries(catMinutes)
        .filter(([_, min]) => min > 0)
        .sort((a, b) => b[1] - a[1]);

    if (sortedCats.length === 0) {
        catSection.innerHTML += '<div class="empty-state">No data</div>';
    } else {
        const maxCatMin = sortedCats[0][1];
        sortedCats.forEach(([catId, min]) => {
            const cat = catMap[catId] || { name: 'Uncategorized', color: '#9CA3AF' };
            const pct = totalMinutes > 0 ? Math.round((min / totalMinutes) * 100) : 0;
            const h = Math.floor(min / 60);
            const m = min % 60;

            const row = document.createElement('div');
            row.className = 'chart-bar-row';
            row.innerHTML = `
                <span class="chart-bar-label">${escapeHtml(cat.name)}</span>
                <div class="chart-bar-container">
                    <div class="chart-bar" style="width:${(min / maxCatMin) * 100}%; background:${cat.color}"></div>
                </div>
                <span class="chart-bar-value">${h}h ${m}m (${pct}%)</span>
            `;
            catSection.appendChild(row);
        });
    }
    content.appendChild(catSection);

    // Member comparison
    const memberSection = document.createElement('div');
    memberSection.className = 'analytics-chart-section';
    memberSection.innerHTML = '<h4 class="chart-title">Time by Team Member</h4>';

    const sortedMembers = Object.entries(memberMinutes)
        .sort((a, b) => b[1] - a[1]);
    const maxMemberMin = sortedMembers[0]?.[1] || 1;

    sortedMembers.forEach(([userId, min]) => {
        const u = getUserById(userId);
        if (!u) return;
        const h = Math.floor(min / 60);
        const m = min % 60;
        const row = document.createElement('div');
        row.className = 'chart-bar-row';
        row.innerHTML = `
            <span class="chart-bar-label">
                <span class="mini-avatar" style="background:${u.color}">${escapeHtml(u.avatarInitials)}</span>
                ${escapeHtml(u.name.split(' ')[0])}
            </span>
            <div class="chart-bar-container">
                <div class="chart-bar" style="width:${(min / maxMemberMin) * 100}%; background:${u.color}"></div>
            </div>
            <span class="chart-bar-value">${h}h ${m}m</span>
        `;
        memberSection.appendChild(row);
    });
    content.appendChild(memberSection);

    // Daily breakdown (for weekly)
    if (range === 'week' && Object.keys(dailyMinutes).length > 0) {
        const dailySection = document.createElement('div');
        dailySection.className = 'analytics-chart-section';
        dailySection.innerHTML = '<h4 class="chart-title">Daily Breakdown</h4>';

        const days = [];
        const ws = getWeekStart(now);
        for (let i = 0; i < 7; i++) {
            const dd = new Date(ws);
            dd.setDate(dd.getDate() + i);
            days.push(formatDate(dd));
        }

        const maxDayMin = Math.max(...days.map(d => dailyMinutes[d] || 0), 1);
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        const barChart = document.createElement('div');
        barChart.className = 'daily-bar-chart';

        days.forEach((d, i) => {
            const min = dailyMinutes[d] || 0;
            const h = Math.floor(min / 60);
            const m = min % 60;
            const heightPct = (min / maxDayMin) * 100;

            const col = document.createElement('div');
            col.className = 'daily-bar-col';
            col.innerHTML = `
                <span class="daily-bar-value">${min > 0 ? (h > 0 ? h + 'h' : m + 'm') : ''}</span>
                <div class="daily-bar" style="height:${heightPct}%; background: ${d === formatDate(now) ? 'var(--primary)' : '#CBD5E1'}"></div>
                <span class="daily-bar-label">${dayNames[i]}</span>
            `;
            barChart.appendChild(col);
        });

        dailySection.appendChild(barChart);
        content.appendChild(dailySection);
    }

    div.appendChild(header);
    div.appendChild(content);
    container.appendChild(div);
}
