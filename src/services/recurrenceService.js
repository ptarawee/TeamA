import { getActivitiesByTeam, addActivity } from '../data/store.js';
import { formatDate } from '../utils/date.js';

// Generate next occurrence of a recurring activity
export function generateNextOccurrence(activity) {
    if (!activity.recurring || !activity.recurrenceRule) return null;
    const rule = activity.recurrenceRule;
    const currentDate = new Date(activity.dueDate);
    let nextDate = new Date(currentDate);

    switch (rule.frequency) {
        case 'daily': nextDate.setDate(nextDate.getDate() + (rule.interval || 1)); break;
        case 'weekly': nextDate.setDate(nextDate.getDate() + 7 * (rule.interval || 1)); break;
        case 'monthly': nextDate.setMonth(nextDate.getMonth() + (rule.interval || 1)); break;
    }

    if (rule.endDate && nextDate > new Date(rule.endDate)) return null;

    // Create new activity based on parent
    return addActivity({
        ...activity,
        id: undefined, // let addActivity generate new id
        dueDate: formatDate(nextDate),
        status: 'todo',
        recurrenceParentId: activity.id,
        createdAt: new Date().toISOString(),
    });
}

// Check and generate overdue recurring activities
export function processRecurringActivities(teamId) {
    const activities = getActivitiesByTeam(teamId);

    activities.forEach(act => {
        if (!act.recurring || act.status !== 'done') return;
        // Check if next occurrence already exists
        const hasNext = activities.some(a => a.recurrenceParentId === act.id && a.status !== 'done');
        if (!hasNext) generateNextOccurrence(act);
    });
}
