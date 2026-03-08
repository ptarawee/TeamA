import { getCurrentTeamId } from '../data/store.js';
import { getWorkflows, addWorkflow, updateWorkflow, deleteWorkflow } from '../data/store.js';
import { isTeamAdmin } from '../auth/auth.js';
import { escapeHtml } from '../utils/sanitize.js';
import { showToast } from './toast.js';
import { showConfirmModal } from './confirmModal.js';

/**
 * Renders the Workflow Manager panel inside `container`.
 * Only admins can create/edit/delete workflows; everyone sees them listed.
 * @param {HTMLElement} container
 * @param {Function} onUpdate – called when data changes
 */
export function renderWorkflowManager(container, onUpdate) {
    const teamId = getCurrentTeamId();
    const isAdmin = isTeamAdmin(teamId);

    const section = document.createElement('div');
    section.className = 'card workflow-manager-section';

    // ── Header ──────────────────────────────────────────────────────────────
    const header = document.createElement('div');
    header.className = 'section-header';
    header.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        Custom Workflows
    `;
    if (isAdmin) {
        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-sm btn-primary add-task-btn';
        addBtn.textContent = '+ New Workflow';
        addBtn.onclick = () => openWorkflowEditModal(teamId, null, () => { renderList(); onUpdate(); });
        header.appendChild(addBtn);
    }

    // ── List ─────────────────────────────────────────────────────────────────
    const listEl = document.createElement('div');
    listEl.className = 'workflow-list';

    function renderList() {
        listEl.innerHTML = '';
        const workflows = getWorkflows(teamId);

        if (workflows.length === 0) {
            listEl.innerHTML = '<div class="empty-state">No workflows yet.' +
                (isAdmin ? ' Click <strong>+ New Workflow</strong> to create one.' : '') +
                '</div>';
            return;
        }

        workflows.forEach(wf => {
            const card = document.createElement('div');
            card.className = 'workflow-card';

            const stepsHtml = (wf.steps || []).map((s, i) => `
                <span class="wf-step-chip" style="background:${escapeHtml(s.color || '#6B7280')}22;color:${escapeHtml(s.color || '#6B7280')};border:1px solid ${escapeHtml(s.color || '#6B7280')}44">
                    <span class="wf-step-num">${i + 1}</span>${escapeHtml(s.name)}
                </span>
            `).join('<span class="wf-arrow">→</span>');

            card.innerHTML = `
                <div class="workflow-card-header">
                    <div>
                        <span class="workflow-name">${escapeHtml(wf.name)}</span>
                        ${wf.description ? `<span class="workflow-desc">${escapeHtml(wf.description)}</span>` : ''}
                    </div>
                    ${isAdmin ? `<div class="workflow-card-actions">
                        <button class="btn btn-sm btn-secondary wf-edit-btn">Edit</button>
                        <button class="btn btn-sm btn-danger wf-del-btn">Delete</button>
                    </div>` : ''}
                </div>
                <div class="wf-steps-row">${stepsHtml || '<span class="text-muted">No steps defined</span>'}</div>
            `;

            if (isAdmin) {
                card.querySelector('.wf-edit-btn').onclick = () =>
                    openWorkflowEditModal(teamId, wf, () => { renderList(); onUpdate(); });

                card.querySelector('.wf-del-btn').onclick = () =>
                    showConfirmModal(
                        'Delete Workflow',
                        `Delete workflow "${wf.name}"? Activities using it will keep their current step but lose workflow tracking.`,
                        () => {
                            deleteWorkflow(teamId, wf.id);
                            showToast('Workflow deleted', 'success');
                            renderList();
                            onUpdate();
                        }
                    );
            }

            listEl.appendChild(card);
        });
    }

    renderList();

    section.appendChild(header);
    section.appendChild(listEl);
    container.appendChild(section);
}

// ── Edit / Create Modal ──────────────────────────────────────────────────────
const STEP_COLORS = [
    '#6B7280', '#3B82F6', '#8B5CF6', '#EC4899',
    '#F59E0B', '#10B981', '#EF4444', '#0D9488',
];

function openWorkflowEditModal(teamId, existingWf, onSave) {
    const root = document.getElementById('modal-root');
    if (!root) return;

    const isEdit = !!existingWf;
    let steps = existingWf ? JSON.parse(JSON.stringify(existingWf.steps || [])) : [
        { name: 'To Do', color: '#6B7280' },
        { name: 'In Progress', color: '#3B82F6' },
        { name: 'Done', color: '#10B981' },
    ];

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal-content workflow-edit-modal';

    function buildModal() {
        modal.innerHTML = `
            <div class="modal-header">
                <h3>${isEdit ? 'Edit Workflow' : 'New Workflow'}</h3>
                <button class="modal-close-btn">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Workflow Name <span class="required">*</span></label>
                    <input type="text" id="wf-name" class="form-input" placeholder="e.g. Bug Fix Process" value="${escapeHtml(existingWf?.name || '')}">
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <input type="text" id="wf-desc" class="form-input" placeholder="Optional description" value="${escapeHtml(existingWf?.description || '')}">
                </div>

                <div class="wf-steps-label">
                    <label>Stages</label>
                    <button class="btn btn-sm btn-secondary" id="wf-add-step">+ Add Stage</button>
                </div>
                <div id="wf-steps-list" class="wf-steps-edit-list"></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary modal-cancel-btn">Cancel</button>
                <button class="btn btn-primary modal-save-btn">${isEdit ? 'Save Changes' : 'Create Workflow'}</button>
            </div>
        `;

        renderStepsList();
        bindModalEvents();
    }

    function renderStepsList() {
        const list = modal.querySelector('#wf-steps-list');
        list.innerHTML = '';
        steps.forEach((step, idx) => {
            const row = document.createElement('div');
            row.className = 'wf-step-edit-row';
            row.dataset.idx = idx;
            row.innerHTML = `
                <span class="wf-step-drag-handle">⠿</span>
                <input type="text" class="form-input wf-step-name" value="${escapeHtml(step.name)}" placeholder="Stage name">
                <div class="wf-color-picker">
                    ${STEP_COLORS.map(c => `
                        <button class="wf-color-swatch ${step.color === c ? 'active' : ''}"
                            style="background:${c}" data-color="${c}" title="${c}"></button>
                    `).join('')}
                </div>
                <div class="wf-step-edit-actions">
                    ${idx > 0 ? '<button class="btn btn-sm btn-secondary wf-step-up" title="Move up">↑</button>' : '<span style="width:28px"></span>'}
                    ${idx < steps.length - 1 ? '<button class="btn btn-sm btn-secondary wf-step-down" title="Move down">↓</button>' : '<span style="width:28px"></span>'}
                    ${steps.length > 1 ? '<button class="btn btn-sm btn-danger wf-step-del">×</button>' : '<span style="width:28px"></span>'}
                </div>
            `;

            // Name input
            row.querySelector('.wf-step-name').oninput = e => { steps[idx].name = e.target.value; };

            // Color swatches
            row.querySelectorAll('.wf-color-swatch').forEach(btn => {
                btn.onclick = () => {
                    steps[idx].color = btn.dataset.color;
                    renderStepsList();
                };
            });

            // Up / Down / Delete
            row.querySelector('.wf-step-up')?.addEventListener('click', () => {
                [steps[idx - 1], steps[idx]] = [steps[idx], steps[idx - 1]];
                renderStepsList();
            });
            row.querySelector('.wf-step-down')?.addEventListener('click', () => {
                [steps[idx], steps[idx + 1]] = [steps[idx + 1], steps[idx]];
                renderStepsList();
            });
            row.querySelector('.wf-step-del')?.addEventListener('click', () => {
                steps.splice(idx, 1);
                renderStepsList();
            });

            list.appendChild(row);
        });
    }

    function bindModalEvents() {
        const close = () => root.removeChild(overlay);
        overlay.onclick = e => { if (e.target === overlay) close(); };
        modal.querySelector('.modal-close-btn').onclick = close;
        modal.querySelector('.modal-cancel-btn').onclick = close;

        modal.querySelector('#wf-add-step').onclick = () => {
            // Sync current names before adding
            modal.querySelectorAll('.wf-step-name').forEach((inp, i) => { steps[i].name = inp.value; });
            steps.push({ name: 'New Stage', color: STEP_COLORS[steps.length % STEP_COLORS.length] });
            renderStepsList();
        };

        modal.querySelector('.modal-save-btn').onclick = () => {
            // Sync current name inputs
            modal.querySelectorAll('.wf-step-name').forEach((inp, i) => { if (steps[i]) steps[i].name = inp.value.trim(); });

            const name = modal.querySelector('#wf-name').value.trim();
            if (!name) {
                modal.querySelector('#wf-name').classList.add('input-error');
                showToast('Workflow name is required', 'error');
                return;
            }
            if (steps.length === 0) {
                showToast('Add at least one stage', 'error');
                return;
            }
            if (steps.some(s => !s.name)) {
                showToast('All stages must have a name', 'error');
                return;
            }

            const description = modal.querySelector('#wf-desc').value.trim();

            if (isEdit) {
                updateWorkflow(teamId, existingWf.id, { name, description, steps });
                showToast('Workflow updated', 'success');
            } else {
                addWorkflow(teamId, { name, description, steps });
                showToast('Workflow created', 'success');
            }

            close();
            onSave();
        };
    }

    buildModal();
    overlay.appendChild(modal);
    root.appendChild(overlay);
}
