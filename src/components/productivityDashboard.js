import { getTeamById, getUserById, getCurrentTeamId, getTimeEntriesInRange,
    getActivitiesByTeam, getCategories } from '../data/store.js';
import { escapeHtml } from '../utils/sanitize.js';
import { formatDate, getWeekStart, getWeekEnd } from '../utils/date.js';

export function renderProductivityDashboard(container) {
    const div = document.createElement('div');
    div.className = 'card productivity-section';
    const teamId = getCurrentTeamId();
    const team = getTeamById(teamId);
    const categories = getCategories(teamId);

    const now = new Date();
    const startDate = formatDate(getWeekStart(now));
    const endDate = formatDate(getWeekEnd(now));
    const entries = getTimeEntriesInRange(teamId, startDate, endDate);
    const activities = getActivitiesByTeam(teamId);

    const catMap = {};
    categories.forEach(c => { catMap[c.id] = c; });

    // Categorize time
    const actMap = {};
    activities.forEach(a => { actMap[a.id] = a; });

    let meetingMinutes = 0;
    let deepWorkMinutes = 0;
    let otherMinutes = 0;
    let totalMinutes = 0;

    entries.forEach(e => {
        const act = actMap[e.activityId];
        const catId = act?.categoryId || '';
        const cat = catMap[catId];
        const dur = e.duration || 0;
        totalMinutes += dur;

        if (catId === 'cat_meeting') {
            meetingMinutes += dur;
        } else if (['cat_development', 'cat_design', 'cat_research'].includes(catId)) {
            deepWorkMinutes += dur;
        } else {
            otherMinutes += dur;
        }
    });

    // Activity completion
    const totalActivities = activities.length;
    const doneActivities = activities.filter(a => a.status === 'done').length;
    const completionRate = totalActivities > 0 ? Math.round((doneActivities / totalActivities) * 100) : 0;

    // Per-member breakdown for CSV export
    const memberData = [];
    (team?.members || []).forEach(m => {
        const u = getUserById(m.userId);
        if (!u) return;
        let mTotal = 0, mDeep = 0, mMeeting = 0;
        entries.filter(e => e.userId === m.userId).forEach(e => {
            const act = actMap[e.activityId];
            const catId = act?.categoryId || '';
            const dur = e.duration || 0;
            mTotal += dur;
            if (catId === 'cat_meeting') {
                mMeeting += dur;
            } else if (['cat_development', 'cat_design', 'cat_research'].includes(catId)) {
                mDeep += dur;
            }
        });
        const memberActivities = activities.filter(a => a.assigneeId === m.userId);
        const memberDone = memberActivities.filter(a => a.status === 'done').length;
        const memberRate = memberActivities.length > 0
            ? Math.round((memberDone / memberActivities.length) * 100) : 0;
        memberData.push({
            name: u.name,
            totalHours: (mTotal / 60).toFixed(1),
            deepWorkHours: (mDeep / 60).toFixed(1),
            meetingHours: (mMeeting / 60).toFixed(1),
            completionRate: memberRate
        });
    });

    const header = document.createElement('div');
    header.className = 'section-header';
    header.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        Productivity Dashboard — This Week
    `;

    const exportBtns = document.createElement('div');
    exportBtns.style.cssText = 'display:inline-flex;gap:8px;margin-left:auto;';

    const csvBtn = document.createElement('button');
    csvBtn.className = 'btn btn-secondary btn-sm';
    csvBtn.textContent = 'Export CSV';
    csvBtn.addEventListener('click', () => {
        const rows = [['Member', 'Total Hours', 'Deep Work Hours', 'Meeting Hours', 'Completion Rate (%)']];
        memberData.forEach(m => {
            rows.push([m.name, m.totalHours, m.deepWorkHours, m.meetingHours, m.completionRate]);
        });
        const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'productivity_' + startDate + '_' + endDate + '.csv';
        a.click();
        URL.revokeObjectURL(url);
    });

    const printBtn = document.createElement('button');
    printBtn.className = 'btn btn-secondary btn-sm';
    printBtn.textContent = 'Print';
    printBtn.addEventListener('click', () => {
        window.print();
    });

    exportBtns.appendChild(csvBtn);
    exportBtns.appendChild(printBtn);
    header.appendChild(exportBtns);

    const content = document.createElement('div');
    content.className = 'productivity-content';

    // Stats cards
    const totalH = Math.floor(totalMinutes / 60);
    const totalM = totalMinutes % 60;

    const stats = document.createElement('div');
    stats.className = 'dashboard-stats';
    stats.innerHTML = `
        <div class="stat-card">
            <span class="stat-number">${totalH}h ${totalM}m</span>
            <span class="stat-label">Total Hours</span>
        </div>
        <div class="stat-card">
            <span class="stat-number">${completionRate}%</span>
            <span class="stat-label">Completion Rate</span>
        </div>
        <div class="stat-card">
            <span class="stat-number">${team?.members?.length || 0}</span>
            <span class="stat-label">Team Size</span>
        </div>
    `;
    content.appendChild(stats);

    // Deep Work vs Meeting ratio
    const ratioSection = document.createElement('div');
    ratioSection.className = 'ratio-section';
    ratioSection.innerHTML = '<h4 class="chart-title">Deep Work vs Meeting</h4>';

    const deepPct = totalMinutes > 0 ? Math.round((deepWorkMinutes / totalMinutes) * 100) : 0;
    const meetPct = totalMinutes > 0 ? Math.round((meetingMinutes / totalMinutes) * 100) : 0;
    const otherPct = 100 - deepPct - meetPct;

    const deepH = Math.floor(deepWorkMinutes / 60);
    const meetH = Math.floor(meetingMinutes / 60);

    ratioSection.innerHTML += `
        <div class="ratio-bar">
            <div class="ratio-segment" style="width:${deepPct}%; background:#3B82F6" title="Deep Work ${deepPct}%"></div>
            <div class="ratio-segment" style="width:${meetPct}%; background:#8B5CF6" title="Meeting ${meetPct}%"></div>
            <div class="ratio-segment" style="width:${otherPct}%; background:#CBD5E1" title="Other ${otherPct}%"></div>
        </div>
        <div class="ratio-legend">
            <span><span class="legend-dot" style="background:#3B82F6"></span>Deep Work ${deepPct}% (${deepH}h)</span>
            <span><span class="legend-dot" style="background:#8B5CF6"></span>Meeting ${meetPct}% (${meetH}h)</span>
            <span><span class="legend-dot" style="background:#CBD5E1"></span>Other ${otherPct}%</span>
        </div>
    `;
    content.appendChild(ratioSection);

    // Weekly productivity graph (daily bars)
    const weeklySection = document.createElement('div');
    weeklySection.className = 'analytics-chart-section';
    weeklySection.innerHTML = '<h4 class="chart-title">Weekly Productivity</h4>';

    const days = [];
    const ws = getWeekStart(now);
    for (let i = 0; i < 7; i++) {
        const dd = new Date(ws);
        dd.setDate(dd.getDate() + i);
        days.push(formatDate(dd));
    }

    const dailyMinutes = {};
    entries.forEach(e => {
        const d = e.startTime.split('T')[0];
        dailyMinutes[d] = (dailyMinutes[d] || 0) + (e.duration || 0);
    });

    const maxDayMin = Math.max(...days.map(d => dailyMinutes[d] || 0), 1);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const barChart = document.createElement('div');
    barChart.className = 'daily-bar-chart';
    days.forEach((d, i) => {
        const min = dailyMinutes[d] || 0;
        const h = Math.floor(min / 60);
        const m = min % 60;
        const col = document.createElement('div');
        col.className = 'daily-bar-col';
        col.innerHTML = `
            <span class="daily-bar-value">${min > 0 ? (h > 0 ? h + 'h' : m + 'm') : ''}</span>
            <div class="daily-bar" style="height:${(min / maxDayMin) * 100}%; background: ${d === formatDate(now) ? 'var(--primary)' : '#CBD5E1'}"></div>
            <span class="daily-bar-label">${dayNames[i]}</span>
        `;
        barChart.appendChild(col);
    });
    weeklySection.appendChild(barChart);
    content.appendChild(weeklySection);

    // Insights
    const insights = [];
    if (meetPct > 40) insights.push('Meeting time is over 40% — consider reducing meetings to allow more deep work.');
    if (deepPct > 60) insights.push('Great! Deep work makes up over 60% of total time — team is focused.');
    if (completionRate < 30) insights.push('Activity completion rate is low — consider reviewing priorities.');
    if (completionRate > 70) insights.push('Strong completion rate — team is executing well.');

    if (insights.length > 0) {
        const insightSection = document.createElement('div');
        insightSection.className = 'insights-section';
        insightSection.innerHTML = '<h4 class="chart-title">Insights</h4>';
        insights.forEach(text => {
            insightSection.innerHTML += `<div class="insight-item">💡 ${escapeHtml(text)}</div>`;
        });
        content.appendChild(insightSection);
    }

    // Per-member productivity
    const memberSection = document.createElement('div');
    memberSection.className = 'analytics-chart-section';
    memberSection.innerHTML = '<h4 class="chart-title">Member Productivity</h4>';

    const memberMinutes = {};
    (team?.members || []).forEach(m => { memberMinutes[m.userId] = 0; });
    entries.forEach(e => { memberMinutes[e.userId] = (memberMinutes[e.userId] || 0) + (e.duration || 0); });

    const sortedMembers = Object.entries(memberMinutes).sort((a, b) => b[1] - a[1]);
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

    div.appendChild(header);
    div.appendChild(content);
    container.appendChild(div);
}
