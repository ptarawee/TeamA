import {
    getActivitiesByDate, getActivitiesByTeam, deleteActivity, updateActivity,
    getUserById, getCategories, getCurrentTeamId, getTimeEntriesByActivity,
    getTeamById, getWorkflows
} from '../data/store.js';
import { escapeHtml } from '../utils/sanitize.js';
import { formatTime12h, formatDisplayDate, formatDate } from '../utils/date.js';
import { STATUS_LABELS, STATUS_COLORS, STATUSES } from '../data/schema.js';
import { openActivityModal } from './activityModal.js';
import { showActivityDetail } from './activityDetail.js';
import { getDeadlineStatus, getOverdueActivities } from '../services/deadlineService.js';
import { showConfirmModal } from './confirmModal.js';
import { showToast } from './toast.js';
import { notifyStatusChange } from '../services/notificationService.js';

const DEADLINE_LABELS = {
    'overdue': 'Overdue',
    'due-today': 'Due today',
    'due-soon': 'Due soon',
};

// Module-level filter state
let filterSearch = '';
let filterStatus = '';
let filterCategory = '';
let filterAssignee = '';

function formatTrackedTime(totalMinutes) {
    if (totalMinutes <= 0) return '';
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m tracked`;
    if (hours > 0) return `${hours}h tracked`;
    return `${mins}m tracked`;
}

export function renderActivityList(container, selectedDate, viewMode, onUpdate) {
    const div = document.createElement('div');
    div.className = 'card activity-list-section';
    const teamId = getCurrentTeamId();

    const dateStr = formatDate(selectedDate);
    const displayDate = formatDisplayDate(selectedDate);

    const categories = getCategories(teamId);
    const catMap = {};
    categories.forEach(c => { catMap[c.id] = c; });

    // Build workflow map for quick lookup
    const workflows = getWorkflows(teamId);
    const workflowMap = {};
    workflows.forEach(wf => { workflowMap[wf.id] = wf; });

    // Get team members for assignee filter
    const team = getTeamById(teamId);
    const teamMembers = (team?.members || []).map(m => {
        const user = getUserById(m.userId);
        return user ? { id: user.id, name: user.name } : null;
    }).filter(Boolean);

    let titleText;
    if (viewMode === 'team') {
        titleText = 'Team Activities';
    } else {
        titleText = `Activities for ${displayDate}`;
    }

    const header = document.createElement('div');
    header.className = 'section-header';
    header.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        ${escapeHtml(titleText)}
    `;

    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-sm btn-primary add-task-btn';
    addBtn.textContent = '+ Add';
    addBtn.onclick = () => openActivityModal(null, { defaultDate: dateStr, onSave: onUpdate });
    header.appendChild(addBtn);

    const content = document.createElement('div');
    content.className = 'activity-list-content';

    // Container for items that will be re-rendered on filter changes
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'activity-items-container';

    // Render just the activity items (called on filter change without full re-render)
    function renderItems() {
        itemsContainer.innerHTML = '';

        let activities;
        if (viewMode === 'team') {
            activities = getActivitiesByTeam(teamId);
        } else {
            activities = getActivitiesByDate(teamId, dateStr);
        }

        // Apply filters
        if (filterSearch) {
            const q = filterSearch.toLowerCase();
            activities = activities.filter(a => a.title.toLowerCase().includes(q));
        }
        if (filterStatus) {
            activities = activities.filter(a => a.status === filterStatus);
        }
        if (filterCategory) {
            activities = activities.filter(a => a.categoryId === filterCategory);
        }
        if (filterAssignee) {
            activities = activities.filter(a => a.assigneeId === filterAssignee);
        }

        // Sort: in_progress first, then todo, then done
        const statusOrder = { in_progress: 0, todo: 1, done: 2 };
        activities.sort((a, b) => (statusOrder[a.status] ?? 1) - (statusOrder[b.status] ?? 1));

        // Deadline warning banner
        const overdueList = getOverdueActivities(teamId);
        if (overdueList.length > 0) {
            const banner = document.createElement('div');
            banner.className = 'deadline-warning-banner';
            const count = overdueList.length;
            const word = count === 1 ? 'activity is' : 'activities are';
            banner.textContent = `\u26A0 ${escapeHtml(String(count))} ${word} overdue`;
            itemsContainer.appendChild(banner);
        }

        if (activities.length === 0) {
            itemsContainer.insertAdjacentHTML('beforeend', '<div class="empty-state">No activities.</div>');
        } else {
            activities.forEach(act => {
                const item = document.createElement('div');
                item.className = `activity-item ${act.status === 'done' ? 'completed' : ''}`;

                const assignee = getUserById(act.assigneeId);
                const cat = catMap[act.categoryId];

                // Category dot
                const catDot = document.createElement('span');
                catDot.className = 'cat-dot';
                catDot.style.backgroundColor = cat?.color || '#9CA3AF';
                catDot.title = cat?.name || 'Uncategorized';

                // Info
                const info = document.createElement('div');
                info.className = 'activity-item-info';

                const titleEl = document.createElement('span');
                titleEl.className = 'activity-item-title';
                titleEl.textContent = act.title;
                titleEl.style.cursor = 'pointer';
                titleEl.onclick = () => showActivityDetail(act.id, teamId, onUpdate);

                const meta = document.createElement('div');
                meta.className = 'activity-item-meta';

                if (act.dueTime) {
                    const timeBadge = document.createElement('span');
                    timeBadge.className = 'task-time-badge';
                    timeBadge.textContent = formatTime12h(act.dueTime);
                    meta.appendChild(timeBadge);
                }

                if (cat) {
                    const catBadge = document.createElement('span');
                    catBadge.className = 'cat-badge';
                    catBadge.style.backgroundColor = cat.color + '20';
                    catBadge.style.color = cat.color;
                    catBadge.textContent = cat.name;
                    meta.appendChild(catBadge);
                }

                // Tracked time badge
                const timeEntries = getTimeEntriesByActivity(act.id);
                const totalMinutes = timeEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
                const trackedLabel = formatTrackedTime(totalMinutes);
                if (trackedLabel) {
                    const trackedBadge = document.createElement('span');
                    trackedBadge.className = 'tracked-time-badge';
                    trackedBadge.textContent = escapeHtml(trackedLabel);
                    meta.appendChild(trackedBadge);
                }

                // Status / Workflow step pill
                if (act.workflowId && workflowMap[act.workflowId]) {
                    const wf = workflowMap[act.workflowId];
                    const stepIdx = act.workflowStepIndex ?? 0;
                    const step = wf.steps[stepIdx];
                    const isLastStep = stepIdx === wf.steps.length - 1;

                    const wfPill = document.createElement('button');
                    wfPill.className = 'status-pill-btn wf-step-pill';
                    wfPill.style.backgroundColor = (step?.color || '#6B7280') + '22';
                    wfPill.style.color = step?.color || '#6B7280';
                    wfPill.style.borderColor = (step?.color || '#6B7280') + '55';
                    wfPill.title = `Workflow: ${wf.name} — click to advance`;
                    wfPill.innerHTML = `
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                        </svg>
                        ${escapeHtml(step?.name || 'Unknown')}
                    `;
                    wfPill.onclick = () => {
                        const nextIdx = stepIdx + 1;
                        if (nextIdx >= wf.steps.length) {
                            // Already at last step — mark done
                            updateActivity(act.id, { status: 'done' });
                            showToast(`✓ Completed all stages of "${wf.name}"`, 'success');
                        } else {
                            updateActivity(act.id, { workflowStepIndex: nextIdx });
                            showToast(`Moved to: ${wf.steps[nextIdx].name}`, 'info');
                        }
                        onUpdate();
                    };
                    meta.appendChild(wfPill);

                    // Small workflow progress dots
                    const dots = document.createElement('span');
                    dots.className = 'wf-progress-dots';
                    wf.steps.forEach((s, i) => {
                        const dot = document.createElement('span');
                        dot.className = `wf-dot ${i < stepIdx ? 'done' : i === stepIdx ? 'active' : ''}`;
                        dot.style.setProperty('--dot-color', s.color || '#6B7280');
                        dot.title = s.name;
                        dots.appendChild(dot);
                    });
                    meta.appendChild(dots);
                } else {
                    // Standard status cycling
                    const statusPill = document.createElement('button');
                    statusPill.className = 'status-pill-btn';
                    statusPill.style.backgroundColor = STATUS_COLORS[act.status] + '20';
                    statusPill.style.color = STATUS_COLORS[act.status];
                    statusPill.textContent = STATUS_LABELS[act.status];
                    statusPill.onclick = () => {
                        const idx = STATUSES.indexOf(act.status);
                        const newStatus = STATUSES[(idx + 1) % STATUSES.length];
                        updateActivity(act.id, { status: newStatus });
                        showToast('Status updated', 'info');
                        if (act.assigneeId) {
                            notifyStatusChange(act.title, act.assigneeId, STATUS_LABELS[newStatus]);
                        }
                        onUpdate();
                    };
                    meta.appendChild(statusPill);
                }

                // Recurring badge
                if (act.recurring) {
                    const recurBadge = document.createElement('span');
                    recurBadge.className = 'recurring-badge';
                    recurBadge.title = `Repeats ${act.recurrenceRule?.frequency || 'recurring'}`;
                    recurBadge.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>';
                    meta.appendChild(recurBadge);
                }

                // Deadline badge
                const dlStatus = getDeadlineStatus(act);
                if (dlStatus) {
                    const dlBadge = document.createElement('span');
                    dlBadge.className = `deadline-badge ${dlStatus}`;
                    dlBadge.textContent = DEADLINE_LABELS[dlStatus];
                    meta.appendChild(dlBadge);
                }

                info.appendChild(titleEl);
                info.appendChild(meta);

                // Assignee
                const right = document.createElement('div');
                right.className = 'activity-item-right';

                if (assignee) {
                    const avatar = document.createElement('span');
                    avatar.className = 'task-assignee-avatar';
                    avatar.style.backgroundColor = assignee.color;
                    avatar.textContent = assignee.avatarInitials;
                    avatar.title = assignee.name;
                    right.appendChild(avatar);
                }

                const delBtn = document.createElement('button');
                delBtn.className = 'delete-btn';
                delBtn.textContent = '×';
                delBtn.onclick = () => {
                    showConfirmModal(
                        'Delete Activity',
                        `Delete "${act.title}"?`,
                        () => { deleteActivity(act.id); showToast('Activity deleted', 'success'); onUpdate(); }
                    );
                };
                right.appendChild(delBtn);

                item.appendChild(catDot);
                item.appendChild(info);
                item.appendChild(right);
                itemsContainer.appendChild(item);
            });
        }
    }

    // Filter bar
    const filterBar = document.createElement('div');
    filterBar.className = 'filter-bar';

    // Search input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'filter-search';
    searchInput.placeholder = 'Search activities...';
    searchInput.value = filterSearch;
    searchInput.oninput = (e) => {
        filterSearch = e.target.value;
        renderItems();
    };
    filterBar.appendChild(searchInput);

    // Status dropdown
    const statusSelect = document.createElement('select');
    statusSelect.className = 'filter-select';
    const statusAllOpt = document.createElement('option');
    statusAllOpt.value = '';
    statusAllOpt.textContent = 'All Statuses';
    statusSelect.appendChild(statusAllOpt);
    STATUSES.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = STATUS_LABELS[s];
        if (filterStatus === s) opt.selected = true;
        statusSelect.appendChild(opt);
    });
    statusSelect.onchange = (e) => {
        filterStatus = e.target.value;
        renderItems();
    };
    filterBar.appendChild(statusSelect);

    // Category dropdown
    const categorySelect = document.createElement('select');
    categorySelect.className = 'filter-select';
    const catAllOpt = document.createElement('option');
    catAllOpt.value = '';
    catAllOpt.textContent = 'All Categories';
    categorySelect.appendChild(catAllOpt);
    categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        if (filterCategory === c.id) opt.selected = true;
        categorySelect.appendChild(opt);
    });
    categorySelect.onchange = (e) => {
        filterCategory = e.target.value;
        renderItems();
    };
    filterBar.appendChild(categorySelect);

    // Assignee dropdown (team view only)
    if (viewMode === 'team') {
        const assigneeSelect = document.createElement('select');
        assigneeSelect.className = 'filter-select';
        const assigneeAllOpt = document.createElement('option');
        assigneeAllOpt.value = '';
        assigneeAllOpt.textContent = 'All Members';
        assigneeSelect.appendChild(assigneeAllOpt);
        teamMembers.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.name;
            if (filterAssignee === m.id) opt.selected = true;
            assigneeSelect.appendChild(opt);
        });
        assigneeSelect.onchange = (e) => {
            filterAssignee = e.target.value;
            renderItems();
        };
        filterBar.appendChild(assigneeSelect);
    }

    content.appendChild(filterBar);
    content.appendChild(itemsContainer);

    // Initial render of items
    renderItems();

    div.appendChild(header);
    div.appendChild(content);
    container.appendChild(div);
}
