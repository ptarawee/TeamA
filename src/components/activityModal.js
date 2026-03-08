import { STATUSES, STATUS_LABELS } from '../data/schema.js';
import {
    addActivity, updateActivity, getTeamById, getCurrentTeamId,
    getUserById, getWorkflows
} from '../data/store.js';
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
    const workflows = getWorkflows(teamId);
    const currentUser = getCurrentUser();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal-content';

    // Build workflow options HTML
    const workflowOptionsHtml = workflows.map(wf =>
        `<option value="${escapeHtml(wf.id)}" ${act.workflowId === wf.id ? 'selected' : ''}>${escapeHtml(wf.name)}</option>`
    ).join('');

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

            <!-- Workflow selector -->
            ${workflows.length > 0 ? `
            <div class="form-group workflow-selector-group">
                <label>Workflow <span class="workflow-selector-hint">(optional — replaces default status)</span></label>
                <select id="act-workflow" class="form-input">
                    <option value="">None (use standard status)</option>
                    ${workflowOptionsHtml}
                </select>
            </div>
            <div id="workflow-step-preview" class="workflow-step-preview"></div>
            ` : ''}

            <!-- Standard status (hidden when a workflow is selected) -->
            <div class="form-group" id="status-group">
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

    // Toggle recurrence options
    const recurringCheckbox = modal.querySelector('#act-recurring');
    const recurrenceOptions = modal.querySelector('#recurrence-options');
    recurringCheckbox.onchange = () => {
        recurrenceOptions.style.display = recurringCheckbox.checked ? 'block' : 'none';
    };

    // Workflow ↔ status toggle
    const workflowSelect = modal.querySelector('#act-workflow');
    const statusGroup = modal.querySelector('#status-group');
    const stepPreview = modal.querySelector('#workflow-step-preview');

    function updateWorkflowUI() {
        if (!workflowSelect) return;
        const selectedWfId = workflowSelect.value;
        if (selectedWfId) {
            statusGroup.style.display = 'none';
            // Render step pills
            const wf = workflows.find(w => w.id === selectedWfId);
            if (wf && stepPreview) {
                const currentStep = (isEdit && act.workflowId === selectedWfId)
                    ? (act.workflowStepIndex || 0) : 0;
                stepPreview.innerHTML = `
                    <div class="wf-preview-label">Current stage:</div>
                    <div class="wf-preview-steps">
                        ${(wf.steps || []).map((s, i) => `
                            <span class="wf-preview-chip ${i === currentStep ? 'active' : ''}"
                                style="${i === currentStep
                        ? `background:${s.color}22;color:${s.color};border:1px solid ${s.color}66`
                        : ''}">
                                ${escapeHtml(s.name)}
                            </span>
                        `).join('<span class="wf-arrow-sm">›</span>')}
                    </div>
                `;
            }
        } else {
            statusGroup.style.display = '';
            if (stepPreview) stepPreview.innerHTML = '';
        }
    }

    if (workflowSelect) {
        workflowSelect.onchange = updateWorkflowUI;
        updateWorkflowUI(); // initial state
    }

    modal.querySelector('.modal-save-btn').onclick = () => {
        const title = modal.querySelector('#act-title').value.trim();
        if (!title) {
            modal.querySelector('#act-title').classList.add('input-error');
            showToast('Title is required', 'error');
            return;
        }

        const isRecurring = modal.querySelector('#act-recurring').checked;
        const selectedWfId = workflowSelect ? workflowSelect.value : '';

        // Determine workflowStepIndex: keep existing if same workflow, else start at 0
        let workflowStepIndex = 0;
        if (isEdit && act.workflowId === selectedWfId && selectedWfId) {
            workflowStepIndex = act.workflowStepIndex || 0;
        }

        const data = {
            title,
            description: modal.querySelector('#act-desc').value.trim(),
            dueDate: modal.querySelector('#act-date').value,
            dueTime: modal.querySelector('#act-time').value,
            assigneeId: modal.querySelector('#act-assignee').value,
            categoryId: modal.querySelector('#act-category').value,
            status: selectedWfId ? 'in_progress' : modal.querySelector('#act-status').value,
            teamId,
            recurring: isRecurring,
            recurrenceRule: isRecurring ? {
                frequency: modal.querySelector('#act-rec-frequency').value,
                interval: parseInt(modal.querySelector('#act-rec-interval').value, 10) || 1,
                endDate: modal.querySelector('#act-rec-end').value || null,
            } : null,
            workflowId: selectedWfId || null,
            workflowStepIndex,
        };

        if (isEdit) {
            updateActivity(act.id, data);
            if (data.assigneeId && data.assigneeId !== act.assigneeId && currentUser) {
                notifyAssignment(title, data.assigneeId, currentUser.id);
            }
        } else {
            data.createdBy = currentUser?.id || '';
            addActivity(data);
            if (data.assigneeId && currentUser) {
                notifyAssignment(title, data.assigneeId, currentUser.id);
            }
        }

        close();
        if (options.onSave) options.onSave();
    };
}
