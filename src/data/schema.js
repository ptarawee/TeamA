// --- Activity Statuses ---
export const STATUSES = ['todo', 'in_progress', 'done'];
export const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };
export const STATUS_COLORS = { todo: '#6B7280', in_progress: '#3B82F6', done: '#10B981' };

// --- Roles ---
export const ROLES = ['admin', 'member'];
export const ROLE_LABELS = { admin: 'Admin', member: 'Member' };

// --- Default Categories ---
export const DEFAULT_CATEGORIES = [
    { id: 'cat_meeting', name: 'Meeting', color: '#8B5CF6' },
    { id: 'cat_development', name: 'Development', color: '#3B82F6' },
    { id: 'cat_design', name: 'Design', color: '#EC4899' },
    { id: 'cat_support', name: 'Support', color: '#F59E0B' },
    { id: 'cat_planning', name: 'Planning', color: '#10B981' },
    { id: 'cat_research', name: 'Research', color: '#6366F1' },
    { id: 'cat_admin', name: 'Administrative', color: '#6B7280' },
    { id: 'cat_other', name: 'Other', color: '#9CA3AF' },
];

// --- Workload thresholds (hours per week) ---
export const WORKLOAD_HIGH_THRESHOLD = 40;
export const WORKLOAD_LOW_THRESHOLD = 10;

// --- Factory functions ---
export function createDefaultTeam(overrides = {}) {
    return {
        id: '',
        name: '',
        description: '',
        members: [], // [{ userId, role, email, joinedAt }]
        categories: [...DEFAULT_CATEGORIES],
        createdAt: new Date().toISOString(),
        ...overrides,
    };
}

export function createDefaultActivity(overrides = {}) {
    return {
        id: '',
        title: '',
        description: '',
        dueDate: '',
        dueTime: '',
        assigneeId: '',
        categoryId: '',
        teamId: '',
        status: 'todo',
        createdBy: '',
        recurring: false,
        recurrenceRule: null,
        recurrenceParentId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...overrides,
    };
}

export function createDefaultTimeEntry(overrides = {}) {
    return {
        id: '',
        activityId: '',
        userId: '',
        teamId: '',
        startTime: '', // ISO string
        endTime: '',   // ISO string
        duration: 0,   // minutes
        manual: false,
        note: '',
        createdAt: new Date().toISOString(),
        ...overrides,
    };
}
