import { setUsers, createTeam, addActivity, addTimeEntry, getTeams } from './store.js';
import { formatDate } from '../utils/date.js';
import { DEFAULT_CATEGORIES } from './schema.js';

const USERS_KEY = 'pyrio_users';

const TEAM_MEMBERS = [
    { id: 'user_1', name: 'Alice Chen', email: 'alice@pyrio.io', color: '#4F46E5', avatarInitials: 'AC' },
    { id: 'user_2', name: 'Bob Park', email: 'bob@pyrio.io', color: '#059669', avatarInitials: 'BP' },
    { id: 'user_3', name: 'Carol Diaz', email: 'carol@pyrio.io', color: '#D97706', avatarInitials: 'CD' },
    { id: 'user_4', name: 'Dan Kim', email: 'dan@pyrio.io', color: '#DC2626', avatarInitials: 'DK' },
];

export function seedIfNeeded() {
    if (!localStorage.getItem(USERS_KEY)) {
        setUsers(TEAM_MEMBERS);
    }
    if (getTeams().length === 0) {
        seedTeamAndData();
    }
}

function seedTeamAndData() {
    const team = createTeam({
        name: 'Product Team',
        description: 'Main product development team',
        members: [
            { userId: 'user_1', role: 'admin', email: 'alice@pyrio.io', joinedAt: new Date().toISOString() },
            { userId: 'user_2', role: 'member', email: 'bob@pyrio.io', joinedAt: new Date().toISOString() },
            { userId: 'user_3', role: 'member', email: 'carol@pyrio.io', joinedAt: new Date().toISOString() },
            { userId: 'user_4', role: 'member', email: 'dan@pyrio.io', joinedAt: new Date().toISOString() },
        ],
        categories: [...DEFAULT_CATEGORIES],
    });

    const today = new Date();
    const d = (offset) => { const dt = new Date(today); dt.setDate(dt.getDate() + offset); return formatDate(dt); };
    const makeTime = (dateStr, h, m) => `${dateStr}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00.000Z`;

    const acts = [
        { title: 'Weekly team standup', dueDate: d(0), dueTime: '09:00', assigneeId: 'user_1', categoryId: 'cat_meeting', status: 'done', teamId: team.id, createdBy: 'user_1' },
        { title: 'Design API specification', dueDate: d(0), dueTime: '10:00', assigneeId: 'user_2', categoryId: 'cat_development', status: 'in_progress', teamId: team.id, createdBy: 'user_1' },
        { title: 'Fix login page layout', dueDate: d(1), dueTime: '14:00', assigneeId: 'user_3', categoryId: 'cat_development', status: 'todo', teamId: team.id, createdBy: 'user_1' },
        { title: 'Client meeting - Project Alpha', dueDate: d(0), dueTime: '13:00', assigneeId: 'user_1', categoryId: 'cat_meeting', status: 'done', teamId: team.id, createdBy: 'user_1' },
        { title: 'Database migration script', dueDate: d(1), dueTime: '11:00', assigneeId: 'user_4', categoryId: 'cat_development', status: 'in_progress', teamId: team.id, createdBy: 'user_1' },
        { title: 'Update component docs', dueDate: d(2), dueTime: '', assigneeId: 'user_3', categoryId: 'cat_design', status: 'todo', teamId: team.id, createdBy: 'user_1' },
        { title: 'Code review: payment module', dueDate: d(0), dueTime: '15:00', assigneeId: 'user_2', categoryId: 'cat_development', status: 'done', teamId: team.id, createdBy: 'user_4' },
        { title: 'Sprint planning', dueDate: d(3), dueTime: '10:00', assigneeId: 'user_1', categoryId: 'cat_planning', status: 'todo', teamId: team.id, createdBy: 'user_1' },
        { title: 'Customer support tickets', dueDate: d(0), dueTime: '16:00', assigneeId: 'user_4', categoryId: 'cat_support', status: 'in_progress', teamId: team.id, createdBy: 'user_1' },
        { title: 'Research auth flow', dueDate: d(2), dueTime: '', assigneeId: 'user_2', categoryId: 'cat_research', status: 'todo', teamId: team.id, createdBy: 'user_1' },
    ];

    const created = acts.map(a => addActivity(a));

    // Seed time entries
    [
        { activityId: created[0].id, userId: 'user_1', teamId: team.id, startTime: makeTime(d(0), 9, 0), endTime: makeTime(d(0), 9, 30), duration: 30 },
        { activityId: created[1].id, userId: 'user_2', teamId: team.id, startTime: makeTime(d(0), 10, 0), endTime: makeTime(d(0), 12, 30), duration: 150 },
        { activityId: created[3].id, userId: 'user_1', teamId: team.id, startTime: makeTime(d(0), 13, 0), endTime: makeTime(d(0), 14, 30), duration: 90 },
        { activityId: created[6].id, userId: 'user_2', teamId: team.id, startTime: makeTime(d(0), 15, 0), endTime: makeTime(d(0), 16, 0), duration: 60 },
        { activityId: created[8].id, userId: 'user_4', teamId: team.id, startTime: makeTime(d(0), 16, 0), endTime: makeTime(d(0), 17, 30), duration: 90 },
        { activityId: created[1].id, userId: 'user_2', teamId: team.id, startTime: makeTime(d(-1), 9, 0), endTime: makeTime(d(-1), 12, 0), duration: 180 },
        { activityId: created[4].id, userId: 'user_4', teamId: team.id, startTime: makeTime(d(-1), 10, 0), endTime: makeTime(d(-1), 14, 0), duration: 240 },
        { activityId: created[5].id, userId: 'user_3', teamId: team.id, startTime: makeTime(d(-1), 13, 0), endTime: makeTime(d(-1), 15, 0), duration: 120 },
        { activityId: created[0].id, userId: 'user_1', teamId: team.id, startTime: makeTime(d(-2), 9, 0), endTime: makeTime(d(-2), 9, 45), duration: 45 },
        { activityId: created[2].id, userId: 'user_3', teamId: team.id, startTime: makeTime(d(-2), 10, 0), endTime: makeTime(d(-2), 14, 0), duration: 240 },
    ].forEach(te => addTimeEntry(te));
}
