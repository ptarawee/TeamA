import {
    getUsers, setUsers,
    getTeams, setTeams,
    getActivities, setActivities,
    createTeam, addActivity, addTimeEntry,
} from './store.js';
import { formatDate } from '../utils/date.js';
import { DEFAULT_CATEGORIES } from './schema.js';

const USERS_KEY = 'pyrio_users';
const SEED_MARKETING_KEY = 'pyrio_seed_marketing_v2'; // bump this to force re-seed

// ──────────────────────────────────────────────────────────────────────────────
// ALL users in the system
// Product Team users: user_1 … user_4
// Marketing-only users: user_5 … user_7
// ──────────────────────────────────────────────────────────────────────────────
const ALL_USERS = [
    // ── Product Team ──────────────────────────────────────────────────────────
    { id: 'user_1', name: 'Alice Chen', email: 'alice@pyrio.io', color: '#4F46E5', avatarInitials: 'AC' },
    { id: 'user_2', name: 'Bob Park', email: 'bob@pyrio.io', color: '#059669', avatarInitials: 'BP' },
    { id: 'user_3', name: 'Carol Diaz', email: 'carol@pyrio.io', color: '#D97706', avatarInitials: 'CD' },
    { id: 'user_4', name: 'Dan Kim', email: 'dan@pyrio.io', color: '#DC2626', avatarInitials: 'DK' },
    // ── Marketing only ────────────────────────────────────────────────────────
    { id: 'user_5', name: 'Emma Wilson', email: 'emma@pyrio.io', color: '#BE185D', avatarInitials: 'EW' },
    { id: 'user_6', name: 'Liam Torres', email: 'liam@pyrio.io', color: '#0891B2', avatarInitials: 'LT' },
    { id: 'user_7', name: 'Sophia Nguyen', email: 'sophia@pyrio.io', color: '#7C3AED', avatarInitials: 'SN' },
];

// ──────────────────────────────────────────────────────────────────────────────
export function seedIfNeeded() {
    // Ensure all users exist (merge new ones in without wiping existing)
    ensureAllUsers();

    // Seed Product Team if no teams exist at all
    if (getTeams().length === 0) {
        seedProductTeam();
    }

    // Re-seed Marketing team whenever the version key changes
    if (!localStorage.getItem(SEED_MARKETING_KEY)) {
        purgeAndReseedMarketing();
        localStorage.setItem(SEED_MARKETING_KEY, '1');
    }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Merge ALL_USERS into localStorage without removing users added at run-time. */
function ensureAllUsers() {
    const existing = getUsers();
    const existingIds = new Set(existing.map(u => u.id));
    const merged = [...existing];
    ALL_USERS.forEach(u => {
        if (!existingIds.has(u.id)) merged.push(u);
    });
    setUsers(merged);
}

/** Remove the old Marketing team (and its activities), then re-create fresh. */
function purgeAndReseedMarketing() {
    // Remove old Marketing team from teams list
    const teams = getTeams();
    const oldMarketing = teams.find(t => t.name === 'Marketing');
    if (oldMarketing) {
        setTeams(teams.filter(t => t.id !== oldMarketing.id));
        // Remove activities that belonged to that team
        setActivities(getActivities().filter(a => a.teamId !== oldMarketing.id));
    }
    seedMarketingTeam();
}

// ──────────────────────────────────────────────────────────────────────────────
// Product Team seed (runs once when there are zero teams)
// ──────────────────────────────────────────────────────────────────────────────
function seedProductTeam() {
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
    const mkT = (dateStr, h, m) => `${dateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`;

    const acts = [
        { title: 'Weekly team standup', dueDate: d(0), dueTime: '09:00', assigneeId: 'user_1', categoryId: 'cat_meeting', status: 'done', teamId: team.id, createdBy: 'user_1' },
        { title: 'Design API specification', dueDate: d(0), dueTime: '10:00', assigneeId: 'user_2', categoryId: 'cat_development', status: 'in_progress', teamId: team.id, createdBy: 'user_1' },
        { title: 'Fix login page layout', dueDate: d(1), dueTime: '14:00', assigneeId: 'user_3', categoryId: 'cat_development', status: 'todo', teamId: team.id, createdBy: 'user_1' },
        { title: 'Client meeting — Project Alpha', dueDate: d(0), dueTime: '13:00', assigneeId: 'user_1', categoryId: 'cat_meeting', status: 'done', teamId: team.id, createdBy: 'user_1' },
        { title: 'Database migration script', dueDate: d(1), dueTime: '11:00', assigneeId: 'user_4', categoryId: 'cat_development', status: 'in_progress', teamId: team.id, createdBy: 'user_1' },
        { title: 'Update component docs', dueDate: d(2), dueTime: '', assigneeId: 'user_3', categoryId: 'cat_design', status: 'todo', teamId: team.id, createdBy: 'user_1' },
        { title: 'Code review: payment module', dueDate: d(0), dueTime: '15:00', assigneeId: 'user_2', categoryId: 'cat_development', status: 'done', teamId: team.id, createdBy: 'user_4' },
        { title: 'Sprint planning', dueDate: d(3), dueTime: '10:00', assigneeId: 'user_1', categoryId: 'cat_planning', status: 'todo', teamId: team.id, createdBy: 'user_1' },
        { title: 'Customer support tickets', dueDate: d(0), dueTime: '16:00', assigneeId: 'user_4', categoryId: 'cat_support', status: 'in_progress', teamId: team.id, createdBy: 'user_1' },
        { title: 'Research auth flow', dueDate: d(2), dueTime: '', assigneeId: 'user_2', categoryId: 'cat_research', status: 'todo', teamId: team.id, createdBy: 'user_1' },
    ];
    const created = acts.map(a => addActivity(a));

    [
        { activityId: created[0].id, userId: 'user_1', teamId: team.id, startTime: mkT(d(0), 9, 0), endTime: mkT(d(0), 9, 30), duration: 30 },
        { activityId: created[1].id, userId: 'user_2', teamId: team.id, startTime: mkT(d(0), 10, 0), endTime: mkT(d(0), 12, 30), duration: 150 },
        { activityId: created[3].id, userId: 'user_1', teamId: team.id, startTime: mkT(d(0), 13, 0), endTime: mkT(d(0), 14, 30), duration: 90 },
        { activityId: created[6].id, userId: 'user_2', teamId: team.id, startTime: mkT(d(0), 15, 0), endTime: mkT(d(0), 16, 0), duration: 60 },
        { activityId: created[8].id, userId: 'user_4', teamId: team.id, startTime: mkT(d(0), 16, 0), endTime: mkT(d(0), 17, 30), duration: 90 },
        { activityId: created[1].id, userId: 'user_2', teamId: team.id, startTime: mkT(d(-1), 9, 0), endTime: mkT(d(-1), 12, 0), duration: 180 },
        { activityId: created[4].id, userId: 'user_4', teamId: team.id, startTime: mkT(d(-1), 10, 0), endTime: mkT(d(-1), 14, 0), duration: 240 },
        { activityId: created[5].id, userId: 'user_3', teamId: team.id, startTime: mkT(d(-1), 13, 0), endTime: mkT(d(-1), 15, 0), duration: 120 },
        { activityId: created[0].id, userId: 'user_1', teamId: team.id, startTime: mkT(d(-2), 9, 0), endTime: mkT(d(-2), 9, 45), duration: 45 },
        { activityId: created[2].id, userId: 'user_3', teamId: team.id, startTime: mkT(d(-2), 10, 0), endTime: mkT(d(-2), 14, 0), duration: 240 },
    ].forEach(te => addTimeEntry(te));
}

// ──────────────────────────────────────────────────────────────────────────────
// Marketing Team seed
// Members: Alice Chen (admin) + 3 Marketing-only users (user_5, 6, 7)
// ──────────────────────────────────────────────────────────────────────────────
function seedMarketingTeam() {
    const today = new Date();
    const d = (offset) => { const dt = new Date(today); dt.setDate(dt.getDate() + offset); return formatDate(dt); };

    // Marketing-specific categories
    const marketingCategories = [
        { id: 'mcat_content', name: 'Content', color: '#EC4899' },
        { id: 'mcat_social', name: 'Social Media', color: '#8B5CF6' },
        { id: 'mcat_campaign', name: 'Campaign', color: '#F59E0B' },
        { id: 'mcat_seo', name: 'SEO', color: '#10B981' },
        { id: 'mcat_design', name: 'Design', color: '#3B82F6' },
        { id: 'mcat_analytics', name: 'Analytics', color: '#6366F1' },
        { id: 'mcat_email', name: 'Email', color: '#0D9488' },
        { id: 'mcat_event', name: 'Events', color: '#EF4444' },
    ];

    // Workflows
    const contentPipelineWf = {
        id: 'wf_content_pipeline',
        name: 'Content Pipeline',
        description: 'From idea to published article or post',
        steps: [
            { name: 'Idea', color: '#6B7280' },
            { name: 'Drafting', color: '#3B82F6' },
            { name: 'Review', color: '#F59E0B' },
            { name: 'Design', color: '#8B5CF6' },
            { name: 'Approval', color: '#EC4899' },
            { name: 'Published', color: '#10B981' },
        ],
    };
    const campaignLaunchWf = {
        id: 'wf_campaign_launch',
        name: 'Campaign Launch',
        description: 'End-to-end campaign planning and go-live',
        steps: [
            { name: 'Brief', color: '#6B7280' },
            { name: 'Strategy', color: '#6366F1' },
            { name: 'Creative', color: '#EC4899' },
            { name: 'QA', color: '#F59E0B' },
            { name: 'Live', color: '#10B981' },
        ],
    };
    const socialMediaWf = {
        id: 'wf_social_media',
        name: 'Social Media Post',
        description: 'Quick pipeline for social content',
        steps: [
            { name: 'Draft', color: '#6B7280' },
            { name: 'Visual', color: '#8B5CF6' },
            { name: 'Approved', color: '#F59E0B' },
            { name: 'Scheduled', color: '#3B82F6' },
            { name: 'Posted', color: '#10B981' },
        ],
    };

    const team = createTeam({
        name: 'Marketing',
        description: 'Brand, content, campaigns & growth',
        members: [
            // Alice Chen is admin in both teams
            { userId: 'user_1', role: 'admin', email: 'alice@pyrio.io', joinedAt: new Date().toISOString() },
            // Marketing-only members (NOT in Product Team)
            { userId: 'user_5', role: 'member', email: 'emma@pyrio.io', joinedAt: new Date().toISOString() },
            { userId: 'user_6', role: 'member', email: 'liam@pyrio.io', joinedAt: new Date().toISOString() },
            { userId: 'user_7', role: 'member', email: 'sophia@pyrio.io', joinedAt: new Date().toISOString() },
        ],
        categories: marketingCategories,
        workflows: [contentPipelineWf, campaignLaunchWf, socialMediaWf],
    });

    // ── Activities using workflows ──────────────────────────────────────────
    [
        // Content Pipeline — various stages
        { title: 'Q1 Company Blog Post', dueDate: d(3), dueTime: '12:00', assigneeId: 'user_6', categoryId: 'mcat_content', status: 'in_progress', teamId: team.id, createdBy: 'user_1', workflowId: 'wf_content_pipeline', workflowStepIndex: 1 },  // Drafting
        { title: 'Case Study: Client Success', dueDate: d(7), dueTime: '', assigneeId: 'user_5', categoryId: 'mcat_content', status: 'in_progress', teamId: team.id, createdBy: 'user_1', workflowId: 'wf_content_pipeline', workflowStepIndex: 2 },  // Review
        { title: 'Product Launch Article', dueDate: d(5), dueTime: '10:00', assigneeId: 'user_1', categoryId: 'mcat_content', status: 'in_progress', teamId: team.id, createdBy: 'user_1', workflowId: 'wf_content_pipeline', workflowStepIndex: 4 },  // Approval
        { title: 'SEO Guide: Keyword Strategy', dueDate: d(1), dueTime: '', assigneeId: 'user_7', categoryId: 'mcat_seo', status: 'in_progress', teamId: team.id, createdBy: 'user_1', workflowId: 'wf_content_pipeline', workflowStepIndex: 0 },  // Idea

        // Campaign Launch — various stages
        { title: 'Spring Sale Campaign', dueDate: d(10), dueTime: '09:00', assigneeId: 'user_1', categoryId: 'mcat_campaign', status: 'in_progress', teamId: team.id, createdBy: 'user_1', workflowId: 'wf_campaign_launch', workflowStepIndex: 2 },  // Creative
        { title: 'Partner Co-Marketing Campaign', dueDate: d(14), dueTime: '', assigneeId: 'user_5', categoryId: 'mcat_campaign', status: 'in_progress', teamId: team.id, createdBy: 'user_1', workflowId: 'wf_campaign_launch', workflowStepIndex: 1 },  // Strategy
        { title: 'Influencer Outreach Drive', dueDate: d(6), dueTime: '14:00', assigneeId: 'user_6', categoryId: 'mcat_campaign', status: 'in_progress', teamId: team.id, createdBy: 'user_1', workflowId: 'wf_campaign_launch', workflowStepIndex: 0 },  // Brief

        // Social Media Post — various stages
        { title: 'LinkedIn: Product Feature', dueDate: d(0), dueTime: '14:00', assigneeId: 'user_7', categoryId: 'mcat_social', status: 'in_progress', teamId: team.id, createdBy: 'user_1', workflowId: 'wf_social_media', workflowStepIndex: 2 },  // Approved
        { title: 'Instagram: Behind the Scenes', dueDate: d(2), dueTime: '11:00', assigneeId: 'user_6', categoryId: 'mcat_social', status: 'in_progress', teamId: team.id, createdBy: 'user_1', workflowId: 'wf_social_media', workflowStepIndex: 1 },  // Visual
        { title: 'Twitter Thread: Trends', dueDate: d(1), dueTime: '09:00', assigneeId: 'user_5', categoryId: 'mcat_social', status: 'in_progress', teamId: team.id, createdBy: 'user_1', workflowId: 'wf_social_media', workflowStepIndex: 3 },  // Scheduled

        // Non-workflow activities
        { title: 'Monthly Marketing Report', dueDate: d(0), dueTime: '17:00', assigneeId: 'user_1', categoryId: 'mcat_analytics', status: 'in_progress', teamId: team.id, createdBy: 'user_1' },
        { title: 'Website Redesign Review', dueDate: d(2), dueTime: '15:00', assigneeId: 'user_5', categoryId: 'mcat_design', status: 'todo', teamId: team.id, createdBy: 'user_1' },
        { title: 'Email Newsletter — March', dueDate: d(4), dueTime: '', assigneeId: 'user_6', categoryId: 'mcat_email', status: 'todo', teamId: team.id, createdBy: 'user_1' },
        { title: 'Brand Event Planning Q2', dueDate: d(8), dueTime: '10:00', assigneeId: 'user_7', categoryId: 'mcat_event', status: 'todo', teamId: team.id, createdBy: 'user_1' },
    ].forEach(a => addActivity(a));
}
