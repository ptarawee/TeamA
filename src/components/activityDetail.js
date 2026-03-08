import { getActivityById, getTimeEntriesByActivity, getUserById, getCategories,
    updateActivity, getCurrentTeamId, getComments, addComment, deleteComment } from '../data/store.js';
import { escapeHtml } from '../utils/sanitize.js';
import { formatDisplayDate, formatTime12h, relativeTime } from '../utils/date.js';
import { STATUS_LABELS, STATUS_COLORS } from '../data/schema.js';
import { openActivityModal } from './activityModal.js';
import { generateId } from '../utils/id.js';
import { getCurrentUser } from '../auth/auth.js';

/**
 * Opens a modal showing full activity details with subtasks, time entries, etc.
 * @param {string} activityId
 * @param {string} teamId
 * @param {function} onUpdate - callback to refresh parent view
 */
export function showActivityDetail(activityId, teamId, onUpdate) {
    const root = document.getElementById('modal-root');
    if (!root) return;

    const activity = getActivityById(activityId);
    if (!activity) return;

    const categories = getCategories(teamId);
    const catMap = {};
    categories.forEach(c => { catMap[c.id] = c; });

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal-content activity-detail-modal';

    function render() {
        const act = getActivityById(activityId);
        if (!act) return;

        const assignee = getUserById(act.assigneeId);
        const cat = catMap[act.categoryId];
        const timeEntries = getTimeEntriesByActivity(act.id);
        const totalMinutes = timeEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
        const subtasks = act.subtasks || [];

        const createdDate = act.createdAt
            ? formatDisplayDate(new Date(act.createdAt))
            : 'Unknown';

        const dueDateDisplay = act.dueDate
            ? formatDisplayDate(new Date(act.dueDate + 'T00:00:00'))
            : 'No due date';

        const dueTimeDisplay = act.dueTime ? formatTime12h(act.dueTime) : '';

        const completedSubtasks = subtasks.filter(s => s.completed).length;

        modal.innerHTML = '';

        // --- Header ---
        const header = document.createElement('div');
        header.className = 'modal-header activity-detail-header';

        const headerLeft = document.createElement('div');
        headerLeft.className = 'activity-detail-header-left';

        const titleEl = document.createElement('h2');
        titleEl.className = 'activity-detail-title';
        titleEl.textContent = act.title;

        const statusBadge = document.createElement('span');
        statusBadge.className = 'status-badge';
        statusBadge.style.backgroundColor = STATUS_COLORS[act.status] + '20';
        statusBadge.style.color = STATUS_COLORS[act.status];
        statusBadge.textContent = STATUS_LABELS[act.status];

        headerLeft.appendChild(titleEl);
        headerLeft.appendChild(statusBadge);

        const headerRight = document.createElement('div');
        headerRight.className = 'activity-detail-header-right';

        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-sm btn-secondary';
        editBtn.textContent = 'Edit';
        editBtn.onclick = () => {
            close();
            openActivityModal(act, {
                onSave: () => {
                    if (onUpdate) onUpdate();
                }
            });
        };

        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close-btn';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = close;

        headerRight.appendChild(editBtn);
        headerRight.appendChild(closeBtn);

        header.appendChild(headerLeft);
        header.appendChild(headerRight);
        modal.appendChild(header);

        // --- Body ---
        const body = document.createElement('div');
        body.className = 'modal-body activity-detail-body';

        // -- Info Grid --
        const infoGrid = document.createElement('div');
        infoGrid.className = 'activity-detail-grid';

        // Assignee
        const assigneeCell = createInfoCell('Assignee');
        if (assignee) {
            const assigneeContent = document.createElement('div');
            assigneeContent.className = 'detail-assignee';
            const avatar = document.createElement('span');
            avatar.className = 'task-assignee-avatar';
            avatar.style.backgroundColor = assignee.color;
            avatar.textContent = assignee.avatarInitials;
            const nameSpan = document.createElement('span');
            nameSpan.textContent = assignee.name;
            assigneeContent.appendChild(avatar);
            assigneeContent.appendChild(nameSpan);
            assigneeCell.appendChild(assigneeContent);
        } else {
            const unassigned = document.createElement('span');
            unassigned.className = 'detail-placeholder';
            unassigned.textContent = 'Unassigned';
            assigneeCell.appendChild(unassigned);
        }
        infoGrid.appendChild(assigneeCell);

        // Category
        const catCell = createInfoCell('Category');
        if (cat) {
            const catBadge = document.createElement('span');
            catBadge.className = 'cat-badge';
            catBadge.style.backgroundColor = cat.color + '20';
            catBadge.style.color = cat.color;
            catBadge.textContent = cat.name;
            catCell.appendChild(catBadge);
        } else {
            const noCat = document.createElement('span');
            noCat.className = 'detail-placeholder';
            noCat.textContent = 'No category';
            catCell.appendChild(noCat);
        }
        infoGrid.appendChild(catCell);

        // Due date
        const dueCell = createInfoCell('Due Date');
        const dueText = document.createElement('span');
        dueText.textContent = dueDateDisplay + (dueTimeDisplay ? ' at ' + dueTimeDisplay : '');
        dueCell.appendChild(dueText);
        infoGrid.appendChild(dueCell);

        // Status
        const statusCell = createInfoCell('Status');
        const statusText = document.createElement('span');
        statusText.className = 'status-badge';
        statusText.style.backgroundColor = STATUS_COLORS[act.status] + '20';
        statusText.style.color = STATUS_COLORS[act.status];
        statusText.textContent = STATUS_LABELS[act.status];
        statusCell.appendChild(statusText);
        infoGrid.appendChild(statusCell);

        // Created date
        const createdCell = createInfoCell('Created');
        const createdText = document.createElement('span');
        createdText.textContent = createdDate;
        createdCell.appendChild(createdText);
        infoGrid.appendChild(createdCell);

        body.appendChild(infoGrid);

        // -- Description --
        const descSection = document.createElement('div');
        descSection.className = 'activity-detail-section';
        const descLabel = document.createElement('h4');
        descLabel.className = 'detail-section-label';
        descLabel.textContent = 'Description';
        descSection.appendChild(descLabel);

        const descContent = document.createElement('div');
        descContent.className = 'detail-description';
        if (act.description && act.description.trim()) {
            descContent.textContent = act.description;
        } else {
            descContent.className += ' detail-placeholder';
            descContent.textContent = 'No description';
        }
        descSection.appendChild(descContent);
        body.appendChild(descSection);

        // -- Subtasks --
        const subtaskSection = document.createElement('div');
        subtaskSection.className = 'activity-detail-section';
        const subtaskLabel = document.createElement('h4');
        subtaskLabel.className = 'detail-section-label';
        subtaskLabel.textContent = `Subtasks (${completedSubtasks}/${subtasks.length})`;
        subtaskSection.appendChild(subtaskLabel);

        const subtaskList = document.createElement('ul');
        subtaskList.className = 'subtask-list';

        subtasks.forEach((st, idx) => {
            const li = document.createElement('li');
            li.className = 'subtask-item' + (st.completed ? ' subtask-completed' : '');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = st.completed;
            checkbox.className = 'subtask-checkbox';
            checkbox.onchange = () => {
                const current = getActivityById(activityId);
                const subs = [...(current.subtasks || [])];
                subs[idx] = { ...subs[idx], completed: !subs[idx].completed };
                updateActivity(activityId, { subtasks: subs });
                if (onUpdate) onUpdate();
                render();
            };

            const label = document.createElement('span');
            label.className = 'subtask-label';
            label.textContent = st.title;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'subtask-remove-btn';
            removeBtn.textContent = '\u00d7';
            removeBtn.title = 'Remove subtask';
            removeBtn.onclick = () => {
                const current = getActivityById(activityId);
                const subs = [...(current.subtasks || [])];
                subs.splice(idx, 1);
                updateActivity(activityId, { subtasks: subs });
                if (onUpdate) onUpdate();
                render();
            };

            li.appendChild(checkbox);
            li.appendChild(label);
            li.appendChild(removeBtn);
            subtaskList.appendChild(li);
        });

        subtaskSection.appendChild(subtaskList);

        // Add subtask input
        const addSubtaskRow = document.createElement('div');
        addSubtaskRow.className = 'add-subtask-row';
        const subtaskInput = document.createElement('input');
        subtaskInput.type = 'text';
        subtaskInput.className = 'form-input subtask-input';
        subtaskInput.placeholder = 'Add a subtask...';
        const addSubBtn = document.createElement('button');
        addSubBtn.className = 'btn btn-sm btn-primary';
        addSubBtn.textContent = 'Add';

        const addSubtask = () => {
            const val = subtaskInput.value.trim();
            if (!val) return;
            const current = getActivityById(activityId);
            const subs = [...(current.subtasks || [])];
            subs.push({ id: generateId('sub'), title: val, completed: false });
            updateActivity(activityId, { subtasks: subs });
            if (onUpdate) onUpdate();
            render();
        };

        addSubBtn.onclick = addSubtask;
        subtaskInput.onkeydown = (e) => {
            if (e.key === 'Enter') addSubtask();
        };

        addSubtaskRow.appendChild(subtaskInput);
        addSubtaskRow.appendChild(addSubBtn);
        subtaskSection.appendChild(addSubtaskRow);
        body.appendChild(subtaskSection);

        // -- Time Entries --
        const timeSection = document.createElement('div');
        timeSection.className = 'activity-detail-section';
        const timeLabel = document.createElement('h4');
        timeLabel.className = 'detail-section-label';
        timeLabel.textContent = 'Time Entries';
        timeSection.appendChild(timeLabel);

        if (timeEntries.length > 0) {
            const totalHours = Math.floor(totalMinutes / 60);
            const totalMins = totalMinutes % 60;
            const totalDisplay = totalHours > 0
                ? `${totalHours}h ${totalMins}m`
                : `${totalMins}m`;

            const totalBadge = document.createElement('div');
            totalBadge.className = 'time-total-badge';
            totalBadge.textContent = `Total: ${totalDisplay}`;
            timeSection.appendChild(totalBadge);

            const timeList = document.createElement('ul');
            timeList.className = 'time-entry-list';

            timeEntries.forEach(te => {
                const li = document.createElement('li');
                li.className = 'time-entry-item';

                const user = getUserById(te.userId);
                const durH = Math.floor((te.duration || 0) / 60);
                const durM = (te.duration || 0) % 60;
                const durStr = durH > 0 ? `${durH}h ${durM}m` : `${durM}m`;

                const dateStr = te.startTime
                    ? new Date(te.startTime).toLocaleDateString()
                    : '';

                const userName = user ? escapeHtml(user.name) : 'Unknown';
                const noteStr = te.note ? ` — ${escapeHtml(te.note)}` : '';

                li.innerHTML = `
                    <span class="time-entry-duration">${escapeHtml(durStr)}</span>
                    <span class="time-entry-meta">${userName} on ${escapeHtml(dateStr)}${noteStr}</span>
                `;
                timeList.appendChild(li);
            });

            timeSection.appendChild(timeList);
        } else {
            const noTime = document.createElement('div');
            noTime.className = 'detail-placeholder';
            noTime.textContent = 'No time entries recorded.';
            timeSection.appendChild(noTime);
        }
        body.appendChild(timeSection);

        // -- Comments --
        const commentSection = document.createElement('div');
        commentSection.className = 'activity-detail-section';
        const commentLabel = document.createElement('h4');
        commentLabel.className = 'detail-section-label';
        commentLabel.textContent = 'Comments';
        commentSection.appendChild(commentLabel);

        const commentsContainer = document.createElement('div');
        commentsContainer.className = 'comments-container';
        commentSection.appendChild(commentsContainer);

        function renderComments() {
            commentsContainer.innerHTML = '';
            const comments = getComments(activityId);
            const currentUser = getCurrentUser();

            if (comments.length === 0) {
                const noComments = document.createElement('div');
                noComments.className = 'detail-placeholder';
                noComments.textContent = 'No comments yet.';
                commentsContainer.appendChild(noComments);
            } else {
                const commentList = document.createElement('ul');
                commentList.className = 'comment-list';

                comments.forEach(c => {
                    const user = getUserById(c.userId);
                    const li = document.createElement('li');
                    li.className = 'comment-item';

                    const commentHeader = document.createElement('div');
                    commentHeader.className = 'comment-header';

                    const authorInfo = document.createElement('div');
                    authorInfo.className = 'comment-author';

                    if (user) {
                        const avatar = document.createElement('span');
                        avatar.className = 'task-assignee-avatar';
                        avatar.style.backgroundColor = user.color;
                        avatar.textContent = user.avatarInitials;
                        authorInfo.appendChild(avatar);

                        const name = document.createElement('span');
                        name.className = 'comment-author-name';
                        name.textContent = escapeHtml(user.name);
                        authorInfo.appendChild(name);
                    } else {
                        const name = document.createElement('span');
                        name.className = 'comment-author-name';
                        name.textContent = 'Unknown user';
                        authorInfo.appendChild(name);
                    }

                    const time = document.createElement('span');
                    time.className = 'comment-time';
                    time.textContent = relativeTime(c.timestamp);
                    authorInfo.appendChild(time);

                    commentHeader.appendChild(authorInfo);

                    if (currentUser && c.userId === currentUser.id) {
                        const delBtn = document.createElement('button');
                        delBtn.className = 'comment-delete-btn';
                        delBtn.textContent = '\u00d7';
                        delBtn.title = 'Delete comment';
                        delBtn.onclick = () => {
                            deleteComment(c.id);
                            renderComments();
                        };
                        commentHeader.appendChild(delBtn);
                    }

                    li.appendChild(commentHeader);

                    const textEl = document.createElement('div');
                    textEl.className = 'comment-text';
                    textEl.innerHTML = escapeHtml(c.text);
                    li.appendChild(textEl);

                    commentList.appendChild(li);
                });

                commentsContainer.appendChild(commentList);
            }

            // Add comment input
            const addCommentRow = document.createElement('div');
            addCommentRow.className = 'add-comment-row';

            const commentInput = document.createElement('input');
            commentInput.type = 'text';
            commentInput.className = 'form-input comment-input';
            commentInput.placeholder = 'Add a comment...';

            const sendBtn = document.createElement('button');
            sendBtn.className = 'btn btn-sm btn-primary';
            sendBtn.textContent = 'Send';

            const submitComment = () => {
                const text = commentInput.value.trim();
                if (!text) return;
                const currentUser = getCurrentUser();
                if (!currentUser) return;
                addComment({ activityId, userId: currentUser.id, text });
                renderComments();
            };

            sendBtn.onclick = submitComment;
            commentInput.onkeydown = (e) => {
                if (e.key === 'Enter') submitComment();
            };

            addCommentRow.appendChild(commentInput);
            addCommentRow.appendChild(sendBtn);
            commentsContainer.appendChild(addCommentRow);
        }

        renderComments();
        body.appendChild(commentSection);

        modal.appendChild(body);
    }

    function close() {
        if (root.contains(overlay)) {
            root.removeChild(overlay);
        }
    }

    // Close on overlay click
    overlay.onclick = (e) => {
        if (e.target === overlay) close();
    };

    // Close on Escape
    const onKeyDown = (e) => {
        if (e.key === 'Escape') {
            close();
            document.removeEventListener('keydown', onKeyDown);
        }
    };
    document.addEventListener('keydown', onKeyDown);

    render();

    overlay.appendChild(modal);
    root.appendChild(overlay);
}

function createInfoCell(labelText) {
    const cell = document.createElement('div');
    cell.className = 'detail-info-cell';
    const label = document.createElement('span');
    label.className = 'detail-info-label';
    label.textContent = labelText;
    cell.appendChild(label);
    return cell;
}
