import { generateId } from '../utils/id.js';
import { createDefaultActivity, createDefaultTeam, createDefaultTimeEntry } from './schema.js';

// --- Storage Keys ---
const KEYS = {
    users: 'pyrio_users',
    teams: 'pyrio_teams',
    activities: 'pyrio_activities',
    timeEntries: 'pyrio_time_entries',
    activeTimer: 'pyrio_active_timer',
    invites: 'pyrio_invites',
    currentUser: 'pyrio_current_user',
    currentTeam: 'pyrio_current_team',
    notifications: 'pyrio_notifications',
    comments: 'pyrio_comments',
};

function read(key) {
    try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : null; }
    catch { return null; }
}
function write(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

// ========== USERS ==========
export function getUsers() { return read(KEYS.users) || []; }
export function setUsers(users) { write(KEYS.users, users); }
export function getUserById(id) { return getUsers().find(u => u.id === id) || null; }
export function getUserByEmail(email) { return getUsers().find(u => u.email === email) || null; }

// ========== TEAMS ==========
export function getTeams() { return read(KEYS.teams) || []; }
export function getTeamById(id) { return getTeams().find(t => t.id === id) || null; }
export function getTeamsForUser(userId) {
    return getTeams().filter(t => t.members.some(m => m.userId === userId));
}

export function createTeam(data) {
    const teams = getTeams();
    const team = createDefaultTeam({ ...data, id: generateId('team') });
    teams.push(team);
    write(KEYS.teams, teams);
    return team;
}

export function updateTeam(teamId, updates) {
    const teams = getTeams();
    const idx = teams.findIndex(t => t.id === teamId);
    if (idx === -1) return null;
    teams[idx] = { ...teams[idx], ...updates, id: teamId };
    write(KEYS.teams, teams);
    return teams[idx];
}

export function addMemberToTeam(teamId, userId, role = 'member', email = '') {
    const teams = getTeams();
    const team = teams.find(t => t.id === teamId);
    if (!team) return null;
    if (team.members.some(m => m.userId === userId)) return team;
    team.members.push({ userId, role, email, joinedAt: new Date().toISOString() });
    write(KEYS.teams, teams);
    return team;
}

export function removeMemberFromTeam(teamId, userId) {
    const teams = getTeams();
    const team = teams.find(t => t.id === teamId);
    if (!team) return null;
    team.members = team.members.filter(m => m.userId !== userId);
    write(KEYS.teams, teams);
    return team;
}

export function updateMemberRole(teamId, userId, newRole) {
    const teams = getTeams();
    const team = teams.find(t => t.id === teamId);
    if (!team) return null;
    const member = team.members.find(m => m.userId === userId);
    if (member) member.role = newRole;
    write(KEYS.teams, teams);
    return team;
}

export function getTeamMemberRole(teamId, userId) {
    const team = getTeamById(teamId);
    const member = team?.members.find(m => m.userId === userId);
    return member?.role || null;
}

// Team categories
export function addCategory(teamId, category) {
    const teams = getTeams();
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    if (!team.categories) team.categories = [];
    team.categories.push({ ...category, id: category.id || generateId('cat') });
    write(KEYS.teams, teams);
}

export function getCategories(teamId) {
    const team = getTeamById(teamId);
    return team?.categories || [];
}

// ========== INVITES ==========
export function getInvites() { return read(KEYS.invites) || []; }

export function createInvite(teamId, email, invitedBy) {
    const invites = getInvites();
    if (invites.some(i => i.teamId === teamId && i.email === email && i.status === 'pending')) return null;
    const invite = {
        id: generateId('inv'), teamId, email, invitedBy,
        status: 'pending', createdAt: new Date().toISOString(),
    };
    invites.push(invite);
    write(KEYS.invites, invites);
    return invite;
}

export function getInvitesForUser(email) {
    return getInvites().filter(i => i.email === email && i.status === 'pending');
}

export function acceptInvite(inviteId, userId) {
    const invites = getInvites();
    const inv = invites.find(i => i.id === inviteId);
    if (!inv) return false;
    inv.status = 'accepted';
    write(KEYS.invites, invites);
    addMemberToTeam(inv.teamId, userId, 'member', inv.email);
    return true;
}

export function declineInvite(inviteId) {
    const invites = getInvites();
    const inv = invites.find(i => i.id === inviteId);
    if (!inv) return false;
    inv.status = 'declined';
    write(KEYS.invites, invites);
    return true;
}

// ========== ACTIVITIES ==========
export function getActivities() { return read(KEYS.activities) || []; }
export function getActivitiesByTeam(teamId) { return getActivities().filter(a => a.teamId === teamId); }
export function getActivitiesByDate(teamId, dateStr) { return getActivities().filter(a => a.teamId === teamId && a.dueDate === dateStr); }
export function getActivitiesByAssignee(teamId, userId) { return getActivities().filter(a => a.teamId === teamId && a.assigneeId === userId); }
export function getActivitiesByCategory(teamId, categoryId) { return getActivities().filter(a => a.teamId === teamId && a.categoryId === categoryId); }
export function getActivityById(id) { return getActivities().find(a => a.id === id) || null; }

export function addActivity(data) {
    const activities = getActivities();
    const activity = createDefaultActivity({
        ...data, id: generateId('act'),
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    activities.push(activity);
    write(KEYS.activities, activities);
    return activity;
}

export function updateActivity(id, updates) {
    const activities = getActivities();
    const idx = activities.findIndex(a => a.id === id);
    if (idx === -1) return null;
    activities[idx] = { ...activities[idx], ...updates, id, updatedAt: new Date().toISOString() };
    write(KEYS.activities, activities);
    return activities[idx];
}

export function deleteActivity(id) {
    write(KEYS.activities, getActivities().filter(a => a.id !== id));
    write(KEYS.timeEntries, getTimeEntries().filter(t => t.activityId !== id));
    return true;
}

// ========== TIME ENTRIES ==========
export function getTimeEntries() { return read(KEYS.timeEntries) || []; }
export function getTimeEntriesByActivity(activityId) { return getTimeEntries().filter(t => t.activityId === activityId); }
export function getTimeEntriesByUser(userId, teamId) { return getTimeEntries().filter(t => t.userId === userId && t.teamId === teamId); }
export function getTimeEntriesByTeam(teamId) { return getTimeEntries().filter(t => t.teamId === teamId); }

export function getTimeEntriesByDate(userId, dateStr) {
    return getTimeEntries().filter(t => t.userId === userId && t.startTime.split('T')[0] === dateStr);
}

export function getTimeEntriesInRange(teamId, startDate, endDate) {
    return getTimeEntries().filter(t => {
        if (t.teamId !== teamId) return false;
        const d = t.startTime.split('T')[0];
        return d >= startDate && d <= endDate;
    });
}

export function addTimeEntry(data) {
    const entries = getTimeEntries();
    const entry = createDefaultTimeEntry({ ...data, id: generateId('time'), createdAt: new Date().toISOString() });
    entries.push(entry);
    write(KEYS.timeEntries, entries);
    return entry;
}

export function updateTimeEntry(id, updates) {
    const entries = getTimeEntries();
    const idx = entries.findIndex(e => e.id === id);
    if (idx === -1) return null;
    entries[idx] = { ...entries[idx], ...updates, id };
    write(KEYS.timeEntries, entries);
    return entries[idx];
}

export function deleteTimeEntry(id) {
    write(KEYS.timeEntries, getTimeEntries().filter(e => e.id !== id));
    return true;
}

// ========== ACTIVE TIMER ==========
export function getActiveTimer() { return read(KEYS.activeTimer); }

export function startTimer(activityId, userId, teamId) {
    const timer = { activityId, userId, teamId, startTime: new Date().toISOString() };
    write(KEYS.activeTimer, timer);
    return timer;
}

export function stopTimer() {
    const timer = getActiveTimer();
    if (!timer) return null;
    const duration = Math.round((new Date() - new Date(timer.startTime)) / 60000);
    localStorage.removeItem(KEYS.activeTimer);
    return addTimeEntry({
        activityId: timer.activityId, userId: timer.userId, teamId: timer.teamId,
        startTime: timer.startTime, endTime: new Date().toISOString(), duration, manual: false,
    });
}

export function cancelTimer() { localStorage.removeItem(KEYS.activeTimer); }

// ========== CURRENT TEAM ==========
export function getCurrentTeamId() { return localStorage.getItem(KEYS.currentTeam) || ''; }
export function setCurrentTeamId(id) { localStorage.setItem(KEYS.currentTeam, id); }

// ========== NOTIFICATIONS ==========
export function getNotifications(userId) {
    const all = read(KEYS.notifications) || [];
    return all
        .filter(n => n.recipientId === userId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export function getUnreadCount(userId) {
    const all = read(KEYS.notifications) || [];
    return all.filter(n => n.recipientId === userId && !n.read).length;
}

export function addNotification({ recipientId, type, message, relatedId }) {
    const notifications = read(KEYS.notifications) || [];
    const notification = {
        id: generateId('notif'),
        recipientId,
        type,
        message,
        relatedId: relatedId || '',
        read: false,
        timestamp: new Date().toISOString(),
    };
    notifications.push(notification);
    write(KEYS.notifications, notifications);
    return notification;
}

export function markNotificationRead(id) {
    const notifications = read(KEYS.notifications) || [];
    const notif = notifications.find(n => n.id === id);
    if (!notif) return null;
    notif.read = true;
    write(KEYS.notifications, notifications);
    return notif;
}

export function markAllNotificationsRead(userId) {
    const notifications = read(KEYS.notifications) || [];
    notifications.forEach(n => {
        if (n.recipientId === userId) n.read = true;
    });
    write(KEYS.notifications, notifications);
}

export function deleteNotification(id) {
    write(KEYS.notifications, (read(KEYS.notifications) || []).filter(n => n.id !== id));
    return true;
}

// ========== COMMENTS ==========
export function getComments(activityId) {
    const all = read(KEYS.comments) || [];
    return all
        .filter(c => c.activityId === activityId)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

export function addComment({ activityId, userId, text }) {
    const comments = read(KEYS.comments) || [];
    const comment = {
        id: generateId('cmt'),
        activityId,
        userId,
        text,
        timestamp: new Date().toISOString(),
    };
    comments.push(comment);
    write(KEYS.comments, comments);
    return comment;
}

export function deleteComment(commentId) {
    write(KEYS.comments, (read(KEYS.comments) || []).filter(c => c.id !== commentId));
    return true;
}
