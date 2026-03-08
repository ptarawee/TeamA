import { addNotification } from '../data/store.js';
import { escapeHtml } from '../utils/sanitize.js';

export function notifyAssignment(activityTitle, assigneeId, assignerId) {
    return addNotification({
        recipientId: assigneeId,
        type: 'assignment',
        message: `You were assigned to ${escapeHtml(activityTitle)}`,
        relatedId: assignerId,
    });
}

export function notifyTeamInvite(teamName, recipientId) {
    return addNotification({
        recipientId,
        type: 'team_invite',
        message: `You were invited to ${escapeHtml(teamName)}`,
        relatedId: '',
    });
}

export function notifyDeadline(activityTitle, recipientId, dueDate) {
    return addNotification({
        recipientId,
        type: 'deadline',
        message: `${escapeHtml(activityTitle)} is due on ${escapeHtml(dueDate)}`,
        relatedId: '',
    });
}

export function notifyStatusChange(activityTitle, recipientId, newStatus) {
    return addNotification({
        recipientId,
        type: 'status_change',
        message: `${escapeHtml(activityTitle)} status changed to ${escapeHtml(newStatus)}`,
        relatedId: '',
    });
}
