import { getTimeEntriesByDate, getActivityById, getUserById,
    getTeamById, getCurrentTeamId, updateTimeEntry, deleteTimeEntry,
    getActivitiesByTeam } from '../data/store.js';
import { getCurrentUser } from '../auth/auth.js';
import { escapeHtml } from '../utils/sanitize.js';
import { formatDate, formatDisplayDate } from '../utils/date.js';
import { showConfirmModal } from './confirmModal.js';
import { showToast } from './toast.js';

export function renderTimeline(container, selectedDate, viewMode, onUpdate) {
    const div = document.createElement('div');
    div.className = 'card timeline-section';
    const teamId = getCurrentTeamId();
    const user = getCurrentUser();
    const dateStr = formatDate(selectedDate);

    const header = document.createElement('div');
    header.className = 'section-header';
    header.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        Timeline — ${escapeHtml(formatDisplayDate(selectedDate))}
    `;

    const content = document.createElement('div');
    content.className = 'timeline-content';

    let entries;
    if (viewMode === 'team') {
        const team = getTeamById(teamId);
        entries = [];
        (team?.members || []).forEach(m => {
            const userEntries = getTimeEntriesByDate(m.userId, dateStr);
            userEntries.forEach(e => entries.push({ ...e, _userId: m.userId }));
        });
    } else {
        entries = getTimeEntriesByDate(user.id, dateStr);
        entries = entries.map(e => ({ ...e, _userId: user.id }));
    }

    entries.sort((a, b) => a.startTime.localeCompare(b.startTime));

    if (entries.length === 0) {
        content.innerHTML = '<div class="empty-state">No time entries for this day.</div>';
    } else {
        const totalMinutes = entries.reduce((sum, e) => sum + (e.duration || 0), 0);
        const totalH = Math.floor(totalMinutes / 60);
        const totalM = totalMinutes % 60;

        const summary = document.createElement('div');
        summary.className = 'timeline-summary';
        summary.innerHTML = `
            <span class="timeline-total">Total: <strong>${totalH}h ${totalM}m</strong></span>
            <span class="timeline-count">${entries.length} entries</span>
        `;
        content.appendChild(summary);

        entries.forEach(entry => {
            const activity = getActivityById(entry.activityId);
            const entryUser = getUserById(entry._userId);
            const isOwn = entry._userId === user.id;

            const item = document.createElement('div');
            item.className = 'timeline-item';

            const startT = entry.startTime.split('T')[1]?.substring(0, 5) || '';
            const endT = entry.endTime.split('T')[1]?.substring(0, 5) || '';
            const durH = Math.floor(entry.duration / 60);
            const durM = entry.duration % 60;

            // Time column
            const timeCol = document.createElement('div');
            timeCol.className = 'timeline-time';
            timeCol.innerHTML = `
                <span class="timeline-start">${startT}</span>
                <span class="timeline-dash">—</span>
                <span class="timeline-end">${endT}</span>
            `;

            // Bar
            const bar = document.createElement('div');
            bar.className = 'timeline-bar';
            bar.style.background = entryUser?.color || '#6B7280';

            // Info
            const info = document.createElement('div');
            info.className = 'timeline-info';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'timeline-activity-name';
            nameSpan.textContent = activity?.title || 'Unknown';
            info.appendChild(nameSpan);

            const durSpan = document.createElement('span');
            durSpan.className = 'timeline-duration';
            durSpan.textContent = `${durH > 0 ? durH + 'h ' : ''}${durM}m ${entry.manual ? '(manual)' : ''}`;
            info.appendChild(durSpan);

            if (viewMode === 'team' && entryUser) {
                const userBadge = document.createElement('span');
                userBadge.className = 'timeline-user-badge';
                userBadge.style.color = entryUser.color;
                userBadge.textContent = entryUser.name;
                info.appendChild(userBadge);
            }

            if (entry.note) {
                const noteSpan = document.createElement('span');
                noteSpan.className = 'timeline-note';
                noteSpan.textContent = entry.note;
                info.appendChild(noteSpan);
            }

            // Action buttons (edit/delete) — only for own entries
            const actions = document.createElement('div');
            actions.className = 'timeline-actions';

            if (isOwn) {
                const editBtn = document.createElement('button');
                editBtn.className = 'btn-icon timeline-edit-btn';
                editBtn.title = 'Edit';
                editBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>';
                editBtn.onclick = (e) => {
                    e.stopPropagation();
                    showEditTimeEntryModal(entry, teamId, onUpdate);
                };

                const delBtn = document.createElement('button');
                delBtn.className = 'btn-icon timeline-delete-btn';
                delBtn.title = 'Delete';
                delBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
                delBtn.onclick = (e) => {
                    e.stopPropagation();
                    showConfirmModal(
                        'Delete Time Entry',
                        `Delete this ${durH > 0 ? durH + 'h ' : ''}${durM}m entry for "${activity?.title || 'Unknown'}"?`,
                        () => { deleteTimeEntry(entry.id); showToast('Time entry deleted', 'success'); onUpdate(); }
                    );
                };

                actions.appendChild(editBtn);
                actions.appendChild(delBtn);
            }

            item.appendChild(timeCol);
            item.appendChild(bar);
            item.appendChild(info);
            item.appendChild(actions);
            content.appendChild(item);
        });
    }

    div.appendChild(header);
    div.appendChild(content);
    container.appendChild(div);
}

function showEditTimeEntryModal(entry, teamId, onUpdate) {
    const root = document.getElementById('modal-root');
    const activities = getActivitiesByTeam(teamId);
    const dateStr = entry.startTime.split('T')[0];
    const startTime = entry.startTime.split('T')[1]?.substring(0, 5) || '';
    const endTime = entry.endTime.split('T')[1]?.substring(0, 5) || '';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal-content';
    modal.innerHTML = `
        <div class="modal-header"><h3>Edit Time Entry</h3><button class="modal-close-btn">&times;</button></div>
        <div class="modal-body">
            <div class="form-group">
                <label>Activity</label>
                <select id="edit-te-activity" class="form-input">
                    ${activities.map(a => `<option value="${a.id}" ${a.id === entry.activityId ? 'selected' : ''}>${escapeHtml(a.title)}</option>`).join('')}
                </select>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Date</label><input type="date" id="edit-te-date" class="form-input" value="${dateStr}"></div>
                <div class="form-group"><label>Duration (min)</label><input type="number" id="edit-te-duration" class="form-input" min="1" value="${entry.duration}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Start Time</label><input type="time" id="edit-te-start" class="form-input" value="${startTime}"></div>
                <div class="form-group"><label>End Time</label><input type="time" id="edit-te-end" class="form-input" value="${endTime}"></div>
            </div>
            <div class="form-group"><label>Note</label><input type="text" id="edit-te-note" class="form-input" value="${escapeHtml(entry.note || '')}"></div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary modal-cancel-btn">Cancel</button>
            <button class="btn btn-primary" id="save-edit-te-btn">Save</button>
        </div>
    `;

    const close = () => root.removeChild(overlay);
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
    modal.querySelector('.modal-close-btn').onclick = close;
    modal.querySelector('.modal-cancel-btn').onclick = close;

    // Auto-calc duration
    const updateDuration = () => {
        const s = modal.querySelector('#edit-te-start').value;
        const e = modal.querySelector('#edit-te-end').value;
        if (s && e) {
            const [sh, sm] = s.split(':').map(Number);
            const [eh, em] = e.split(':').map(Number);
            const dur = (eh * 60 + em) - (sh * 60 + sm);
            if (dur > 0) modal.querySelector('#edit-te-duration').value = dur;
        }
    };
    modal.querySelector('#edit-te-start').onchange = updateDuration;
    modal.querySelector('#edit-te-end').onchange = updateDuration;

    modal.querySelector('#save-edit-te-btn').onclick = () => {
        const date = modal.querySelector('#edit-te-date').value;
        const start = modal.querySelector('#edit-te-start').value;
        const end = modal.querySelector('#edit-te-end').value;
        const duration = parseInt(modal.querySelector('#edit-te-duration').value) || 0;
        const note = modal.querySelector('#edit-te-note').value.trim();
        const activityId = modal.querySelector('#edit-te-activity').value;

        updateTimeEntry(entry.id, {
            activityId,
            startTime: `${date}T${start}:00.000Z`,
            endTime: `${date}T${end}:00.000Z`,
            duration, note,
        });
        close();
        showToast('Time entry updated', 'success');
        onUpdate();
    };

    overlay.appendChild(modal);
    root.appendChild(overlay);
}
