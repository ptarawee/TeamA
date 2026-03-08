import { getActivitiesByTeam } from '../data/store.js';
import { formatDate } from '../utils/date.js';

/**
 * Get the "today" date string in YYYY-MM-DD format, using local time.
 */
function todayStr() {
    return formatDate(new Date());
}

/**
 * Add N days to today and return the YYYY-MM-DD string.
 */
function futureDateStr(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return formatDate(d);
}

/**
 * Return true when the activity is still open (not done) and has a due date.
 */
function isOpenWithDueDate(activity) {
    return activity.status !== 'done' && !!activity.dueDate;
}

/**
 * Get activities that are overdue (dueDate before today, not done).
 */
export function getOverdueActivities(teamId) {
    const today = todayStr();
    return getActivitiesByTeam(teamId)
        .filter(a => isOpenWithDueDate(a) && a.dueDate < today);
}

/**
 * Get activities due today (not done).
 */
export function getDueTodayActivities(teamId) {
    const today = todayStr();
    return getActivitiesByTeam(teamId)
        .filter(a => isOpenWithDueDate(a) && a.dueDate === today);
}

/**
 * Get activities due within the next N days (exclusive of today and overdue).
 * Default window is 3 days.
 */
export function getUpcomingDeadlines(teamId, days = 3) {
    const today = todayStr();
    const horizon = futureDateStr(days);
    return getActivitiesByTeam(teamId)
        .filter(a => isOpenWithDueDate(a) && a.dueDate > today && a.dueDate <= horizon);
}

/**
 * For a single activity, return its deadline status:
 *   'overdue'  | 'due-today' | 'due-soon' | null
 */
export function getDeadlineStatus(activity, days = 3) {
    if (activity.status === 'done' || !activity.dueDate) return null;
    const today = todayStr();
    if (activity.dueDate < today) return 'overdue';
    if (activity.dueDate === today) return 'due-today';
    const horizon = futureDateStr(days);
    if (activity.dueDate <= horizon) return 'due-soon';
    return null;
}
