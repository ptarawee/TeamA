import { getActiveTimer, startTimer, stopTimer, cancelTimer,
    getActivitiesByTeam, getCurrentTeamId, getActivityById, addTimeEntry } from '../data/store.js';
import { getCurrentUser } from '../auth/auth.js';
import { escapeHtml } from '../utils/sanitize.js';
import { showToast } from './toast.js';

let timerInterval = null;

export function renderTimerWidget(container, onUpdate) {
    const user = getCurrentUser();
    const teamId = getCurrentTeamId();
    const timer = getActiveTimer();

    const div = document.createElement('div');
    div.className = 'card timer-widget';

    const header = document.createElement('div');
    header.className = 'section-header timer-header';
    header.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span>Time Tracker</span>
    `;

    const content = document.createElement('div');
    content.className = 'timer-content';

    if (timer && timer.userId === user.id) {
        // Active timer
        const activity = getActivityById(timer.activityId);
        const elapsed = document.createElement('div');
        elapsed.className = 'timer-display';
        elapsed.id = 'timer-elapsed';

        const updateElapsed = () => {
            const diff = Math.floor((Date.now() - new Date(timer.startTime).getTime()) / 1000);
            const h = Math.floor(diff / 3600);
            const m = Math.floor((diff % 3600) / 60);
            const s = diff % 60;
            elapsed.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        };
        updateElapsed();

        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(updateElapsed, 1000);

        content.innerHTML = `
            <div class="timer-active-label">Recording time for</div>
            <div class="timer-activity-name">${escapeHtml(activity?.title || 'Unknown')}</div>
        `;
        content.appendChild(elapsed);

        const btnRow = document.createElement('div');
        btnRow.className = 'timer-btn-row';

        const stopBtn = document.createElement('button');
        stopBtn.className = 'btn btn-primary timer-stop-btn';
        stopBtn.textContent = 'Stop Timer';
        stopBtn.onclick = () => {
            clearInterval(timerInterval);
            timerInterval = null;
            stopTimer();
            showToast('Timer stopped & saved', 'success');
            onUpdate();
        };

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = () => {
            clearInterval(timerInterval);
            timerInterval = null;
            cancelTimer();
            showToast('Timer cancelled', 'info');
            onUpdate();
        };

        btnRow.appendChild(stopBtn);
        btnRow.appendChild(cancelBtn);
        content.appendChild(btnRow);
    } else {
        // Start new timer or manual entry
        const activities = getActivitiesByTeam(teamId).filter(a => a.status !== 'done');

        content.innerHTML = `
            <div class="timer-start-section">
                <select id="timer-activity-select" class="form-input">
                    <option value="">Select activity...</option>
                    ${activities.map(a => `<option value="${a.id}">${escapeHtml(a.title)}</option>`).join('')}
                </select>
                <div class="timer-btn-row">
                    <button class="btn btn-primary" id="start-timer-btn">Start Timer</button>
                    <button class="btn btn-secondary" id="manual-entry-btn">Manual Entry</button>
                </div>
            </div>
        `;
    }

    div.appendChild(header);
    div.appendChild(content);
    container.appendChild(div);

    // Wire up buttons after DOM
    setTimeout(() => {
        const startBtn = div.querySelector('#start-timer-btn');
        if (startBtn) {
            startBtn.onclick = () => {
                const select = div.querySelector('#timer-activity-select');
                if (!select.value) { showToast('Please select an activity', 'error'); return; }
                startTimer(select.value, user.id, teamId);
                onUpdate();
            };
        }

        const manualBtn = div.querySelector('#manual-entry-btn');
        if (manualBtn) {
            manualBtn.onclick = () => showManualEntryModal(teamId, user.id, onUpdate);
        }
    }, 0);
}

function showManualEntryModal(teamId, userId, onUpdate) {
    const root = document.getElementById('modal-root');
    const activities = getActivitiesByTeam(teamId);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal-content';
    modal.innerHTML = `
        <div class="modal-header"><h3>Manual Time Entry</h3><button class="modal-close-btn">&times;</button></div>
        <div class="modal-body">
            <div class="form-group">
                <label>Activity *</label>
                <select id="manual-activity" class="form-input">
                    <option value="">Select activity...</option>
                    ${activities.map(a => `<option value="${a.id}">${escapeHtml(a.title)}</option>`).join('')}
                </select>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Date</label><input type="date" id="manual-date" class="form-input" value="${new Date().toISOString().split('T')[0]}"></div>
                <div class="form-group"><label>Duration (minutes)</label><input type="number" id="manual-duration" class="form-input" min="1" value="30"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Start Time</label><input type="time" id="manual-start" class="form-input" value="09:00"></div>
                <div class="form-group"><label>End Time</label><input type="time" id="manual-end" class="form-input" value="09:30"></div>
            </div>
            <div class="form-group"><label>Note</label><input type="text" id="manual-note" class="form-input" placeholder="Optional note"></div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary modal-cancel-btn">Cancel</button>
            <button class="btn btn-primary" id="save-manual-btn">Save</button>
        </div>
    `;

    const close = () => root.removeChild(overlay);
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
    modal.querySelector('.modal-close-btn').onclick = close;
    modal.querySelector('.modal-cancel-btn').onclick = close;

    // Auto-calc duration when times change
    const updateDuration = () => {
        const s = modal.querySelector('#manual-start').value;
        const e = modal.querySelector('#manual-end').value;
        if (s && e) {
            const [sh, sm] = s.split(':').map(Number);
            const [eh, em] = e.split(':').map(Number);
            const dur = (eh * 60 + em) - (sh * 60 + sm);
            if (dur > 0) modal.querySelector('#manual-duration').value = dur;
        }
    };
    modal.querySelector('#manual-start').onchange = updateDuration;
    modal.querySelector('#manual-end').onchange = updateDuration;

    modal.querySelector('#save-manual-btn').onclick = () => {
        const activityId = modal.querySelector('#manual-activity').value;
        if (!activityId) { showToast('Please select an activity', 'error'); return; }
        const date = modal.querySelector('#manual-date').value;
        const duration = parseInt(modal.querySelector('#manual-duration').value) || 0;
        if (duration <= 0) { showToast('Duration must be greater than 0', 'error'); return; }
        const startTime = modal.querySelector('#manual-start').value;
        const endTime = modal.querySelector('#manual-end').value;
        const note = modal.querySelector('#manual-note').value.trim();

        addTimeEntry({
            activityId, userId, teamId,
            startTime: `${date}T${startTime}:00.000Z`,
            endTime: `${date}T${endTime}:00.000Z`,
            duration, manual: true, note,
        });
        close();
        onUpdate();
    };

    overlay.appendChild(modal);
    root.appendChild(overlay);
}
