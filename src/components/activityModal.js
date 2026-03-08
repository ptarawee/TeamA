import { STATUSES, STATUS_LABELS } from '../data/schema.js';
import { addActivity, updateActivity, getTeamById, getCurrentTeamId, getUserById } from '../data/store.js';
import { getCurrentUser } from '../auth/auth.js';
import { escapeHtml } from '../utils/sanitize.js';
import { showToast } from './toast.js';
import { notifyAssignment } from '../services/notificationService.js';

export function openActivityModal(existingActivity = null, options = {}) {
    const root = document.getElementById('modal-root');
    if (!root) return;

    const isEdit = !!existingActivity;
    const act = existingActivity || {};
    const teamId = getCurrentTeamId();
    const team = getTeamById(teamId);
    const members = team?.members || [];
    const categories = team?.categories || [];
    const currentUser = getCurrentUser();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal-content';

    modal.innerHTML = `
        <div class="modal-header">
            <h3>${isEdit ? 'Edit Activity' : 'New Activity'}</h3>
            <button class="modal-close-btn">&times;</button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label>Title <span class="required">*</span></label>
                <input type="text" id="act-title" class="form-input" value="${escapeHtml(act.title || '')}">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="act-desc" class="form-input form-textarea">${escapeHtml(act.description || '')}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Due Date</label>
                    <input type="date" id="act-date" class="form-input" value="${act.dueDate || options.defaultDate || ''}">
                </div>
                <div class="form-group">
                    <label>Due Time</label>
                    <input type="time" id="act-time" class="form-input" value="${act.dueTime || ''}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Assignee</label>
                    <select id="act-assignee" class="form-input">
                        <option value="">No assignee</option>
                        ${members.map(m => {
                            const u = getUserById(m.userId);
                            return u ? `<option value="${m.userId}" ${act.assigneeId === m.userId ? 'selected' : ''}>${escapeHtml(u.name)}</option>` : '';
                        }).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Category</label>
                    <select id="act-category" class="form-input">
                        <option value="">No category</option>
                        ${categories.map(c => `<option value="${c.id}" ${act.categoryId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Status</label>
                <select id="act-status" class="form-input">
                    ${STATUSES.map(s => `<option value="${s}" ${act.status === s ? 'selected' : ''}>${STATUS_LABELS[s]}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="recurring-toggle-label">
                    <input type="checkbox" id="act-recurring" ${act.recurring ? 'checked' : ''}>
                    <span>Recurring Activity</span>
                    <svg class="recurring-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                </label>
            </div>
            <div id="recurrence-options" class="recurrence-options" style="display:${act.recurring ? 'block' : 'none'}">
                <div class="form-row">
                    <div class="form-group">
                        <label>Frequency</label>
                        <select id="act-rec-frequency" class="form-input">
                            <option value="daily" ${act.recurrenceRule?.frequency === 'daily' ? 'selected' : ''}>Daily</option>
                            <option value="weekly" ${act.recurrenceRule?.frequency === 'weekly' ? 'selected' : ''}>Weekly</option>
                            <option value="monthly" ${act.recurrenceRule?.frequency === 'monthly' ? 'selected' : ''}>Monthly</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Interval</label>
                        <input type="number" id="act-rec-interval" class="form-input" min="1" value="${act.recurrenceRule?.interval || 1}">
                    </div>
                </div>
                <div class="form-group">
                    <label>End Date (optional)</label>
                    <input type="date" id="act-rec-end" class="form-input" value="${act.recurrenceRule?.endDate || ''}">
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary modal-cancel-btn">Cancel</button>
            <button class="btn btn-primary modal-save-btn">${isEdit ? 'Update' : 'Create'}</button>
        </div>
    `;

    overlay.appendChild(modal);
    root.appendChild(overlay);

    const close = () => root.removeChild(overlay);
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
    modal.querySelector('.modal-close-btn').onclick = close;
    modal.querySelector('.modal-cancel-btn').onclick = close;

    // Toggle recurrence options visibility
    const recurringCheckbox = modal.querySelector('#act-recurring');
    const recurrenceOptions = modal.querySelector('#recurrence-options');
    recurringCheckbox.onchange = () => {
        recurrenceOptions.style.display = recurringCheckbox.checked ? 'block' : 'none';
    };

    modal.querySelector('.modal-save-btn').onclick = () => {
        const title = modal.querySelector('#act-title').value.trim();
        if (!title) {
            modal.querySelector('#act-title').classList.add('input-error');
            showToast('Title is required', 'error');
            return;
        }

        const isRecurring = modal.querySelector('#act-recurring').checked;
        const data = {
            title,
            description: modal.querySelector('#act-desc').value.trim(),
            dueDate: modal.querySelector('#act-date').value,
            dueTime: modal.querySelector('#act-time').value,
            assigneeId: modal.querySelector('#act-assignee').value,
            categoryId: modal.querySelector('#act-category').value,
            status: modal.querySelector('#act-status').value,
            teamId,
            recurring: isRecurring,
            recurrenceRule: isRecurring ? {
                frequency: modal.querySelector('#act-rec-frequency').value,
                interval: parseInt(modal.querySelector('#act-rec-interval').value, 10) || 1,
                endDate: modal.querySelector('#act-rec-end').value || null,
            } : null,
        };

        if (isEdit) {
            updateActivity(act.id, data);
            // Notify if assignee changed
            if (data.assigneeId && data.assigneeId !== act.assigneeId && currentUser) {
                notifyAssignment(title, data.assigneeId, currentUser.id);
            }
        } else {
            data.createdBy = currentUser?.id || '';
            addActivity(data);
            // Notify assignee on new activity
            if (data.assigneeId && currentUser) {
                notifyAssignment(title, data.assigneeId, currentUser.id);
            }
        }

        close();
        if (options.onSave) options.onSave();
    };
}
