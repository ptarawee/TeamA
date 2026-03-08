import { getUsers, getTeamMemberRole } from '../data/store.js';

const CURRENT_USER_KEY = 'pyrio_current_user';

export function getCurrentUser() {
    const userId = localStorage.getItem(CURRENT_USER_KEY);
    if (!userId) return null;
    return getUsers().find(u => u.id === userId) || null;
}

export function setCurrentUser(userId) {
    localStorage.setItem(CURRENT_USER_KEY, userId);
}

export function logout() {
    localStorage.removeItem(CURRENT_USER_KEY);
}

export function isTeamAdmin(teamId) {
    const user = getCurrentUser();
    if (!user) return false;
    return getTeamMemberRole(teamId, user.id) === 'admin';
}
