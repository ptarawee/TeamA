// src/utils/id.js
function generateId(prefix = "") {
  const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  return prefix ? `${prefix}_${id}` : id;
}

// src/data/schema.js
var STATUSES = ["todo", "in_progress", "done"];
var STATUS_LABELS = { todo: "To Do", in_progress: "In Progress", done: "Done" };
var STATUS_COLORS = { todo: "#6B7280", in_progress: "#3B82F6", done: "#10B981" };
var DEFAULT_CATEGORIES = [
  { id: "cat_meeting", name: "Meeting", color: "#8B5CF6" },
  { id: "cat_development", name: "Development", color: "#3B82F6" },
  { id: "cat_design", name: "Design", color: "#EC4899" },
  { id: "cat_support", name: "Support", color: "#F59E0B" },
  { id: "cat_planning", name: "Planning", color: "#10B981" },
  { id: "cat_research", name: "Research", color: "#6366F1" },
  { id: "cat_admin", name: "Administrative", color: "#6B7280" },
  { id: "cat_other", name: "Other", color: "#9CA3AF" }
];
var WORKLOAD_HIGH_THRESHOLD = 40;
var WORKLOAD_LOW_THRESHOLD = 10;
function createDefaultTeam(overrides = {}) {
  return {
    id: "",
    name: "",
    description: "",
    members: [],
    // [{ userId, role, email, joinedAt }]
    categories: [...DEFAULT_CATEGORIES],
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    ...overrides
  };
}
function createDefaultActivity(overrides = {}) {
  return {
    id: "",
    title: "",
    description: "",
    dueDate: "",
    dueTime: "",
    assigneeId: "",
    categoryId: "",
    teamId: "",
    status: "todo",
    createdBy: "",
    recurring: false,
    recurrenceRule: null,
    recurrenceParentId: null,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    ...overrides
  };
}
function createDefaultTimeEntry(overrides = {}) {
  return {
    id: "",
    activityId: "",
    userId: "",
    teamId: "",
    startTime: "",
    // ISO string
    endTime: "",
    // ISO string
    duration: 0,
    // minutes
    manual: false,
    note: "",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    ...overrides
  };
}

// src/data/store.js
var KEYS = {
  users: "pyrio_users",
  teams: "pyrio_teams",
  activities: "pyrio_activities",
  timeEntries: "pyrio_time_entries",
  activeTimer: "pyrio_active_timer",
  invites: "pyrio_invites",
  currentUser: "pyrio_current_user",
  currentTeam: "pyrio_current_team",
  notifications: "pyrio_notifications",
  comments: "pyrio_comments"
};
function read(key) {
  try {
    const d = localStorage.getItem(key);
    return d ? JSON.parse(d) : null;
  } catch {
    return null;
  }
}
function write(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}
function getUsers() {
  return read(KEYS.users) || [];
}
function setUsers(users) {
  write(KEYS.users, users);
}
function getUserById(id) {
  return getUsers().find((u) => u.id === id) || null;
}
function getTeams() {
  return read(KEYS.teams) || [];
}
function getTeamById(id) {
  return getTeams().find((t) => t.id === id) || null;
}
function getTeamsForUser(userId) {
  return getTeams().filter((t) => t.members.some((m) => m.userId === userId));
}
function createTeam(data) {
  const teams = getTeams();
  const team = createDefaultTeam({ ...data, id: generateId("team") });
  teams.push(team);
  write(KEYS.teams, teams);
  return team;
}
function updateTeam(teamId, updates) {
  const teams = getTeams();
  const idx = teams.findIndex((t) => t.id === teamId);
  if (idx === -1) return null;
  teams[idx] = { ...teams[idx], ...updates, id: teamId };
  write(KEYS.teams, teams);
  return teams[idx];
}
function addMemberToTeam(teamId, userId, role = "member", email = "") {
  const teams = getTeams();
  const team = teams.find((t) => t.id === teamId);
  if (!team) return null;
  if (team.members.some((m) => m.userId === userId)) return team;
  team.members.push({ userId, role, email, joinedAt: (/* @__PURE__ */ new Date()).toISOString() });
  write(KEYS.teams, teams);
  return team;
}
function removeMemberFromTeam(teamId, userId) {
  const teams = getTeams();
  const team = teams.find((t) => t.id === teamId);
  if (!team) return null;
  team.members = team.members.filter((m) => m.userId !== userId);
  write(KEYS.teams, teams);
  return team;
}
function updateMemberRole(teamId, userId, newRole) {
  const teams = getTeams();
  const team = teams.find((t) => t.id === teamId);
  if (!team) return null;
  const member = team.members.find((m) => m.userId === userId);
  if (member) member.role = newRole;
  write(KEYS.teams, teams);
  return team;
}
function getTeamMemberRole(teamId, userId) {
  const team = getTeamById(teamId);
  const member = team?.members.find((m) => m.userId === userId);
  return member?.role || null;
}
function getCategories(teamId) {
  const team = getTeamById(teamId);
  return team?.categories || [];
}
function getInvites() {
  return read(KEYS.invites) || [];
}
function createInvite(teamId, email, invitedBy) {
  const invites = getInvites();
  if (invites.some((i) => i.teamId === teamId && i.email === email && i.status === "pending")) return null;
  const invite = {
    id: generateId("inv"),
    teamId,
    email,
    invitedBy,
    status: "pending",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  invites.push(invite);
  write(KEYS.invites, invites);
  return invite;
}
function getInvitesForUser(email) {
  return getInvites().filter((i) => i.email === email && i.status === "pending");
}
function acceptInvite(inviteId, userId) {
  const invites = getInvites();
  const inv = invites.find((i) => i.id === inviteId);
  if (!inv) return false;
  inv.status = "accepted";
  write(KEYS.invites, invites);
  addMemberToTeam(inv.teamId, userId, "member", inv.email);
  return true;
}
function declineInvite(inviteId) {
  const invites = getInvites();
  const inv = invites.find((i) => i.id === inviteId);
  if (!inv) return false;
  inv.status = "declined";
  write(KEYS.invites, invites);
  return true;
}
function getActivities() {
  return read(KEYS.activities) || [];
}
function getActivitiesByTeam(teamId) {
  return getActivities().filter((a) => a.teamId === teamId);
}
function getActivitiesByDate(teamId, dateStr) {
  return getActivities().filter((a) => a.teamId === teamId && a.dueDate === dateStr);
}
function getActivitiesByAssignee(teamId, userId) {
  return getActivities().filter((a) => a.teamId === teamId && a.assigneeId === userId);
}
function getActivityById(id) {
  return getActivities().find((a) => a.id === id) || null;
}
function addActivity(data) {
  const activities = getActivities();
  const activity = createDefaultActivity({
    ...data,
    id: generateId("act"),
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  activities.push(activity);
  write(KEYS.activities, activities);
  return activity;
}
function updateActivity(id, updates) {
  const activities = getActivities();
  const idx = activities.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  activities[idx] = { ...activities[idx], ...updates, id, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  write(KEYS.activities, activities);
  return activities[idx];
}
function deleteActivity(id) {
  write(KEYS.activities, getActivities().filter((a) => a.id !== id));
  write(KEYS.timeEntries, getTimeEntries().filter((t) => t.activityId !== id));
  return true;
}
function getTimeEntries() {
  return read(KEYS.timeEntries) || [];
}
function getTimeEntriesByActivity(activityId) {
  return getTimeEntries().filter((t) => t.activityId === activityId);
}
function getTimeEntriesByTeam(teamId) {
  return getTimeEntries().filter((t) => t.teamId === teamId);
}
function getTimeEntriesByDate(userId, dateStr) {
  return getTimeEntries().filter((t) => t.userId === userId && t.startTime.split("T")[0] === dateStr);
}
function getTimeEntriesInRange(teamId, startDate, endDate) {
  return getTimeEntries().filter((t) => {
    if (t.teamId !== teamId) return false;
    const d = t.startTime.split("T")[0];
    return d >= startDate && d <= endDate;
  });
}
function addTimeEntry(data) {
  const entries = getTimeEntries();
  const entry = createDefaultTimeEntry({ ...data, id: generateId("time"), createdAt: (/* @__PURE__ */ new Date()).toISOString() });
  entries.push(entry);
  write(KEYS.timeEntries, entries);
  return entry;
}
function updateTimeEntry(id, updates) {
  const entries = getTimeEntries();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  entries[idx] = { ...entries[idx], ...updates, id };
  write(KEYS.timeEntries, entries);
  return entries[idx];
}
function deleteTimeEntry(id) {
  write(KEYS.timeEntries, getTimeEntries().filter((e) => e.id !== id));
  return true;
}
function getActiveTimer() {
  return read(KEYS.activeTimer);
}
function startTimer(activityId, userId, teamId) {
  const timer = { activityId, userId, teamId, startTime: (/* @__PURE__ */ new Date()).toISOString() };
  write(KEYS.activeTimer, timer);
  return timer;
}
function stopTimer() {
  const timer = getActiveTimer();
  if (!timer) return null;
  const duration = Math.round((/* @__PURE__ */ new Date() - new Date(timer.startTime)) / 6e4);
  localStorage.removeItem(KEYS.activeTimer);
  return addTimeEntry({
    activityId: timer.activityId,
    userId: timer.userId,
    teamId: timer.teamId,
    startTime: timer.startTime,
    endTime: (/* @__PURE__ */ new Date()).toISOString(),
    duration,
    manual: false
  });
}
function cancelTimer() {
  localStorage.removeItem(KEYS.activeTimer);
}
function getCurrentTeamId() {
  return localStorage.getItem(KEYS.currentTeam) || "";
}
function setCurrentTeamId(id) {
  localStorage.setItem(KEYS.currentTeam, id);
}
function getNotifications(userId) {
  const all = read(KEYS.notifications) || [];
  return all.filter((n) => n.recipientId === userId).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}
function getUnreadCount(userId) {
  const all = read(KEYS.notifications) || [];
  return all.filter((n) => n.recipientId === userId && !n.read).length;
}
function addNotification({ recipientId, type, message, relatedId }) {
  const notifications = read(KEYS.notifications) || [];
  const notification = {
    id: generateId("notif"),
    recipientId,
    type,
    message,
    relatedId: relatedId || "",
    read: false,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  notifications.push(notification);
  write(KEYS.notifications, notifications);
  return notification;
}
function markNotificationRead(id) {
  const notifications = read(KEYS.notifications) || [];
  const notif = notifications.find((n) => n.id === id);
  if (!notif) return null;
  notif.read = true;
  write(KEYS.notifications, notifications);
  return notif;
}
function markAllNotificationsRead(userId) {
  const notifications = read(KEYS.notifications) || [];
  notifications.forEach((n) => {
    if (n.recipientId === userId) n.read = true;
  });
  write(KEYS.notifications, notifications);
}
function getComments(activityId) {
  const all = read(KEYS.comments) || [];
  return all.filter((c) => c.activityId === activityId).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}
function addComment({ activityId, userId, text }) {
  const comments = read(KEYS.comments) || [];
  const comment = {
    id: generateId("cmt"),
    activityId,
    userId,
    text,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  comments.push(comment);
  write(KEYS.comments, comments);
  return comment;
}
function deleteComment(commentId) {
  write(KEYS.comments, (read(KEYS.comments) || []).filter((c) => c.id !== commentId));
  return true;
}

// src/utils/date.js
var monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
var weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function formatDisplayDate(date) {
  return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}
function formatTime12h(timeStr) {
  if (!timeStr || !timeStr.includes(":")) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hours12 = hour % 12 || 12;
  return `${hours12}:${m} ${ampm}`;
}
function getWeekStart(date = /* @__PURE__ */ new Date()) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}
function getWeekEnd(date = /* @__PURE__ */ new Date()) {
  const d = getWeekStart(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}
function relativeTime(timestamp) {
  const now = Date.now();
  const diff = now - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 6e4);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

// src/data/seedData.js
var USERS_KEY = "pyrio_users";
var TEAM_MEMBERS = [
  { id: "user_1", name: "Alice Chen", email: "alice@pyrio.io", color: "#4F46E5", avatarInitials: "AC" },
  { id: "user_2", name: "Bob Park", email: "bob@pyrio.io", color: "#059669", avatarInitials: "BP" },
  { id: "user_3", name: "Carol Diaz", email: "carol@pyrio.io", color: "#D97706", avatarInitials: "CD" },
  { id: "user_4", name: "Dan Kim", email: "dan@pyrio.io", color: "#DC2626", avatarInitials: "DK" }
];
function seedIfNeeded() {
  if (!localStorage.getItem(USERS_KEY)) {
    setUsers(TEAM_MEMBERS);
  }
  if (getTeams().length === 0) {
    seedTeamAndData();
  }
}
function seedTeamAndData() {
  const team = createTeam({
    name: "Product Team",
    description: "Main product development team",
    members: [
      { userId: "user_1", role: "admin", email: "alice@pyrio.io", joinedAt: (/* @__PURE__ */ new Date()).toISOString() },
      { userId: "user_2", role: "member", email: "bob@pyrio.io", joinedAt: (/* @__PURE__ */ new Date()).toISOString() },
      { userId: "user_3", role: "member", email: "carol@pyrio.io", joinedAt: (/* @__PURE__ */ new Date()).toISOString() },
      { userId: "user_4", role: "member", email: "dan@pyrio.io", joinedAt: (/* @__PURE__ */ new Date()).toISOString() }
    ],
    categories: [...DEFAULT_CATEGORIES]
  });
  const today = /* @__PURE__ */ new Date();
  const d = (offset) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + offset);
    return formatDate(dt);
  };
  const makeTime = (dateStr, h, m) => `${dateStr}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00.000Z`;
  const acts = [
    { title: "Weekly team standup", dueDate: d(0), dueTime: "09:00", assigneeId: "user_1", categoryId: "cat_meeting", status: "done", teamId: team.id, createdBy: "user_1" },
    { title: "Design API specification", dueDate: d(0), dueTime: "10:00", assigneeId: "user_2", categoryId: "cat_development", status: "in_progress", teamId: team.id, createdBy: "user_1" },
    { title: "Fix login page layout", dueDate: d(1), dueTime: "14:00", assigneeId: "user_3", categoryId: "cat_development", status: "todo", teamId: team.id, createdBy: "user_1" },
    { title: "Client meeting - Project Alpha", dueDate: d(0), dueTime: "13:00", assigneeId: "user_1", categoryId: "cat_meeting", status: "done", teamId: team.id, createdBy: "user_1" },
    { title: "Database migration script", dueDate: d(1), dueTime: "11:00", assigneeId: "user_4", categoryId: "cat_development", status: "in_progress", teamId: team.id, createdBy: "user_1" },
    { title: "Update component docs", dueDate: d(2), dueTime: "", assigneeId: "user_3", categoryId: "cat_design", status: "todo", teamId: team.id, createdBy: "user_1" },
    { title: "Code review: payment module", dueDate: d(0), dueTime: "15:00", assigneeId: "user_2", categoryId: "cat_development", status: "done", teamId: team.id, createdBy: "user_4" },
    { title: "Sprint planning", dueDate: d(3), dueTime: "10:00", assigneeId: "user_1", categoryId: "cat_planning", status: "todo", teamId: team.id, createdBy: "user_1" },
    { title: "Customer support tickets", dueDate: d(0), dueTime: "16:00", assigneeId: "user_4", categoryId: "cat_support", status: "in_progress", teamId: team.id, createdBy: "user_1" },
    { title: "Research auth flow", dueDate: d(2), dueTime: "", assigneeId: "user_2", categoryId: "cat_research", status: "todo", teamId: team.id, createdBy: "user_1" }
  ];
  const created = acts.map((a) => addActivity(a));
  [
    { activityId: created[0].id, userId: "user_1", teamId: team.id, startTime: makeTime(d(0), 9, 0), endTime: makeTime(d(0), 9, 30), duration: 30 },
    { activityId: created[1].id, userId: "user_2", teamId: team.id, startTime: makeTime(d(0), 10, 0), endTime: makeTime(d(0), 12, 30), duration: 150 },
    { activityId: created[3].id, userId: "user_1", teamId: team.id, startTime: makeTime(d(0), 13, 0), endTime: makeTime(d(0), 14, 30), duration: 90 },
    { activityId: created[6].id, userId: "user_2", teamId: team.id, startTime: makeTime(d(0), 15, 0), endTime: makeTime(d(0), 16, 0), duration: 60 },
    { activityId: created[8].id, userId: "user_4", teamId: team.id, startTime: makeTime(d(0), 16, 0), endTime: makeTime(d(0), 17, 30), duration: 90 },
    { activityId: created[1].id, userId: "user_2", teamId: team.id, startTime: makeTime(d(-1), 9, 0), endTime: makeTime(d(-1), 12, 0), duration: 180 },
    { activityId: created[4].id, userId: "user_4", teamId: team.id, startTime: makeTime(d(-1), 10, 0), endTime: makeTime(d(-1), 14, 0), duration: 240 },
    { activityId: created[5].id, userId: "user_3", teamId: team.id, startTime: makeTime(d(-1), 13, 0), endTime: makeTime(d(-1), 15, 0), duration: 120 },
    { activityId: created[0].id, userId: "user_1", teamId: team.id, startTime: makeTime(d(-2), 9, 0), endTime: makeTime(d(-2), 9, 45), duration: 45 },
    { activityId: created[2].id, userId: "user_3", teamId: team.id, startTime: makeTime(d(-2), 10, 0), endTime: makeTime(d(-2), 14, 0), duration: 240 }
  ].forEach((te) => addTimeEntry(te));
}

// src/auth/auth.js
var CURRENT_USER_KEY = "pyrio_current_user";
function getCurrentUser() {
  const userId = localStorage.getItem(CURRENT_USER_KEY);
  if (!userId) return null;
  return getUsers().find((u) => u.id === userId) || null;
}
function setCurrentUser(userId) {
  localStorage.setItem(CURRENT_USER_KEY, userId);
}
function logout() {
  localStorage.removeItem(CURRENT_USER_KEY);
}
function isTeamAdmin(teamId) {
  const user = getCurrentUser();
  if (!user) return false;
  return getTeamMemberRole(teamId, user.id) === "admin";
}

// src/utils/sanitize.js
function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// src/components/loginScreen.js
function renderLoginScreen(container2, onLogin) {
  const users = getUsers();
  container2.innerHTML = "";
  const wrapper = document.createElement("div");
  wrapper.className = "login-screen";
  const card = document.createElement("div");
  card.className = "login-card";
  card.innerHTML = `
        <div class="login-header">
            <h1 class="login-title">Pyrio</h1>
            <p class="login-subtitle">Team Activity & Time Tracking</p>
        </div>
        <p class="login-prompt">Select your profile to continue</p>
        <div class="login-users"></div>
    `;
  const usersDiv = card.querySelector(".login-users");
  users.forEach((user) => {
    const btn = document.createElement("button");
    btn.className = "login-user-btn";
    btn.innerHTML = `
            <div class="login-avatar" style="background-color: ${escapeHtml(user.color)}">${escapeHtml(user.avatarInitials)}</div>
            <div class="login-user-info">
                <span class="login-user-name">${escapeHtml(user.name)}</span>
                <span class="login-user-role">${escapeHtml(user.email)}</span>
            </div>
        `;
    btn.onclick = () => {
      setCurrentUser(user.id);
      onLogin();
    };
    usersDiv.appendChild(btn);
  });
  wrapper.appendChild(card);
  container2.appendChild(wrapper);
}

// src/components/calendar.js
var calendarViewMode = "month";
function renderCalendar(container2, currentDate2, selectedDate2, onDateSelect) {
  const teamId = getCurrentTeamId();
  const categories = getCategories(teamId);
  const catMap = {};
  categories.forEach((c) => {
    catMap[c.id] = c;
  });
  const calendarDiv = document.createElement("div");
  calendarDiv.className = "card calendar-section";
  const headerDiv = document.createElement("div");
  headerDiv.className = "calendar-header";
  const prevBtn = document.createElement("button");
  prevBtn.className = "nav-btn";
  prevBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>';
  prevBtn.onclick = () => {
    if (calendarViewMode === "month") {
      currentDate2.setMonth(currentDate2.getMonth() - 1);
    } else {
      currentDate2.setDate(currentDate2.getDate() - 7);
    }
    onDateSelect(selectedDate2, true);
  };
  const nextBtn = document.createElement("button");
  nextBtn.className = "nav-btn";
  nextBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>';
  nextBtn.onclick = () => {
    if (calendarViewMode === "month") {
      currentDate2.setMonth(currentDate2.getMonth() + 1);
    } else {
      currentDate2.setDate(currentDate2.getDate() + 7);
    }
    onDateSelect(selectedDate2, true);
  };
  const titleDiv = document.createElement("h2");
  if (calendarViewMode === "month") {
    const year = currentDate2.getFullYear();
    const month = currentDate2.getMonth();
    titleDiv.textContent = `${monthNames[month]} ${year}`;
  } else {
    const weekStart = getWeekStart(currentDate2);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const startLabel = `${monthNames[weekStart.getMonth()]} ${weekStart.getDate()}`;
    const endLabel = weekEnd.getMonth() !== weekStart.getMonth() ? `${monthNames[weekEnd.getMonth()]} ${weekEnd.getDate()}` : `${weekEnd.getDate()}`;
    titleDiv.textContent = `${startLabel} - ${endLabel}, ${weekEnd.getFullYear()}`;
  }
  headerDiv.appendChild(prevBtn);
  headerDiv.appendChild(titleDiv);
  const toggleDiv = document.createElement("div");
  toggleDiv.className = "calendar-view-toggle";
  const monthBtn = document.createElement("button");
  monthBtn.className = `view-toggle-btn ${calendarViewMode === "month" ? "active" : ""}`;
  monthBtn.textContent = "Month";
  monthBtn.onclick = () => {
    calendarViewMode = "month";
    onDateSelect(selectedDate2, true);
  };
  const weekBtn = document.createElement("button");
  weekBtn.className = `view-toggle-btn ${calendarViewMode === "week" ? "active" : ""}`;
  weekBtn.textContent = "Week";
  weekBtn.onclick = () => {
    calendarViewMode = "week";
    onDateSelect(selectedDate2, true);
  };
  toggleDiv.appendChild(monthBtn);
  toggleDiv.appendChild(weekBtn);
  headerDiv.appendChild(toggleDiv);
  headerDiv.appendChild(nextBtn);
  const bodyDiv = document.createElement("div");
  bodyDiv.className = "calendar-body";
  if (calendarViewMode === "month") {
    renderMonthView(bodyDiv, currentDate2, selectedDate2, onDateSelect, teamId, catMap);
  } else {
    renderWeekView(bodyDiv, currentDate2, selectedDate2, onDateSelect, teamId, catMap);
  }
  calendarDiv.appendChild(headerDiv);
  calendarDiv.appendChild(bodyDiv);
  container2.appendChild(calendarDiv);
}
function renderActivityPill(act, catMap) {
  const pill = document.createElement("div");
  pill.className = `day-task-pill ${act.status === "done" ? "completed" : ""}`;
  const cat = catMap[act.categoryId];
  const assignee = getUserById(act.assigneeId);
  if (cat) {
    pill.style.backgroundColor = cat.color + "20";
    pill.style.color = cat.color;
    pill.style.borderLeft = `3px solid ${cat.color}`;
  } else if (assignee) {
    pill.style.backgroundColor = assignee.color + "20";
    pill.style.color = assignee.color;
    pill.style.borderLeft = `3px solid ${assignee.color}`;
  }
  pill.textContent = act.title;
  return pill;
}
function renderMonthView(bodyDiv, currentDate2, selectedDate2, onDateSelect, teamId, catMap) {
  const year = currentDate2.getFullYear();
  const month = currentDate2.getMonth();
  const weekdaysDiv = document.createElement("div");
  weekdaysDiv.className = "weekdays";
  weekdays.forEach((day) => {
    const span = document.createElement("span");
    span.textContent = day;
    weekdaysDiv.appendChild(span);
  });
  bodyDiv.appendChild(weekdaysDiv);
  const daysDiv = document.createElement("div");
  daysDiv.className = "days";
  const firstDayIndex = new Date(year, month, 1).getDay();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const prevLastDay = new Date(year, month, 0).getDate();
  const today = /* @__PURE__ */ new Date();
  for (let x = firstDayIndex; x > 0; x--) {
    const dayDiv = document.createElement("div");
    dayDiv.className = "day other-month empty";
    dayDiv.textContent = prevLastDay - x + 1;
    daysDiv.appendChild(dayDiv);
  }
  for (let i = 1; i <= lastDay; i++) {
    const dayDiv = document.createElement("div");
    dayDiv.className = "day";
    const dayNumber = document.createElement("span");
    dayNumber.className = "day-number";
    dayNumber.textContent = i;
    dayDiv.appendChild(dayNumber);
    if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
      dayDiv.classList.add("today");
    }
    if (i === selectedDate2.getDate() && month === selectedDate2.getMonth() && year === selectedDate2.getFullYear()) {
      dayDiv.classList.add("selected");
    }
    const iterDateStr = formatDate(new Date(year, month, i));
    const dayActivities = getActivitiesByDate(teamId, iterDateStr);
    if (dayActivities.length > 0) {
      const taskContainer = document.createElement("div");
      taskContainer.className = "day-task-container";
      const displayLimit = 3;
      for (let t = 0; t < Math.min(dayActivities.length, displayLimit); t++) {
        taskContainer.appendChild(renderActivityPill(dayActivities[t], catMap));
      }
      if (dayActivities.length > displayLimit) {
        const morePill = document.createElement("div");
        morePill.className = "day-task-pill more";
        morePill.textContent = `+${dayActivities.length - displayLimit} more`;
        taskContainer.appendChild(morePill);
      }
      dayDiv.appendChild(taskContainer);
    }
    dayDiv.onclick = () => onDateSelect(new Date(year, month, i));
    daysDiv.appendChild(dayDiv);
  }
  const totalCells = firstDayIndex + lastDay;
  const nextDays = Math.ceil(totalCells / 7) * 7 - totalCells;
  for (let j = 1; j <= nextDays; j++) {
    const dayDiv = document.createElement("div");
    dayDiv.className = "day other-month empty";
    dayDiv.textContent = j;
    daysDiv.appendChild(dayDiv);
  }
  bodyDiv.appendChild(daysDiv);
}
function renderWeekView(bodyDiv, currentDate2, selectedDate2, onDateSelect, teamId, catMap) {
  const weekStart = getWeekStart(currentDate2);
  const today = /* @__PURE__ */ new Date();
  const weekHeaderDiv = document.createElement("div");
  weekHeaderDiv.className = "week-view-header";
  const weekDaysDiv = document.createElement("div");
  weekDaysDiv.className = "week-view-days";
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + i);
    const dayYear = dayDate.getFullYear();
    const dayMonth = dayDate.getMonth();
    const dayNum = dayDate.getDate();
    const colHeader = document.createElement("div");
    colHeader.className = "week-col-header";
    const isToday = dayNum === today.getDate() && dayMonth === today.getMonth() && dayYear === today.getFullYear();
    const isSelected = dayNum === selectedDate2.getDate() && dayMonth === selectedDate2.getMonth() && dayYear === selectedDate2.getFullYear();
    if (isToday) colHeader.classList.add("today");
    if (isSelected) colHeader.classList.add("selected");
    const dayLabel = document.createElement("span");
    dayLabel.className = "week-col-day-name";
    dayLabel.textContent = weekdays[i];
    const dateLabel = document.createElement("span");
    dateLabel.className = "week-col-date-num";
    dateLabel.textContent = dayNum;
    colHeader.appendChild(dayLabel);
    colHeader.appendChild(dateLabel);
    weekHeaderDiv.appendChild(colHeader);
    const colBody = document.createElement("div");
    colBody.className = "week-col-body";
    if (isToday) colBody.classList.add("today");
    if (isSelected) colBody.classList.add("selected");
    const dateStr = formatDate(dayDate);
    const dayActivities = getActivitiesByDate(teamId, dateStr);
    dayActivities.forEach((act) => {
      colBody.appendChild(renderActivityPill(act, catMap));
    });
    if (dayActivities.length === 0) {
      const emptyMsg = document.createElement("div");
      emptyMsg.className = "week-col-empty";
      emptyMsg.textContent = "No activities";
      colBody.appendChild(emptyMsg);
    }
    colBody.onclick = () => onDateSelect(new Date(dayYear, dayMonth, dayNum));
    weekDaysDiv.appendChild(colBody);
  }
  bodyDiv.appendChild(weekHeaderDiv);
  bodyDiv.appendChild(weekDaysDiv);
}

// src/components/toast.js
var stylesInjected = false;
function injectStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement("style");
  style.textContent = `
        .toast-container {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 10000;
            display: flex;
            flex-direction: column-reverse;
            gap: 8px;
            pointer-events: none;
        }

        .toast {
            pointer-events: auto;
            background: #FFFFFF;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
            padding: 12px 16px;
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 10px;
            max-width: 380px;
            min-width: 280px;
            font-family: 'Inter', sans-serif;
            font-size: 0.85rem;
            color: var(--text-main, #111827);
            transform: translateY(20px);
            opacity: 0;
            animation: toast-slide-in 0.3s ease forwards;
        }

        .toast.toast-exit {
            animation: toast-fade-out 0.25s ease forwards;
        }

        @keyframes toast-slide-in {
            from {
                transform: translateY(20px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }

        @keyframes toast-fade-out {
            from {
                transform: translateY(0);
                opacity: 1;
            }
            to {
                transform: translateY(8px);
                opacity: 0;
            }
        }

        .toast-icon {
            flex-shrink: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .toast-icon svg {
            width: 20px;
            height: 20px;
        }

        .toast-body {
            flex: 1;
            min-width: 0;
        }

        .toast-message {
            line-height: 1.4;
            word-break: break-word;
        }

        .toast-undo-btn {
            background: none;
            border: none;
            color: var(--primary, #4F46E5);
            font-weight: 700;
            text-decoration: underline;
            cursor: pointer;
            font-family: inherit;
            font-size: 0.85rem;
            padding: 0;
            margin-left: 2px;
            flex-shrink: 0;
        }

        .toast-undo-btn:hover {
            opacity: 0.8;
        }

        .toast-close-btn {
            background: none;
            border: none;
            cursor: pointer;
            padding: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-muted, #6B7280);
            flex-shrink: 0;
            border-radius: 4px;
            transition: background 0.15s;
        }

        .toast-close-btn:hover {
            background: var(--bg-body, #F3F4F6);
        }

        .toast-close-btn svg {
            width: 16px;
            height: 16px;
        }
    `;
  document.head.appendChild(style);
}
var ICONS = {
  success: `<svg viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" stroke="#10B981" stroke-width="1.5" fill="#ECFDF5"/>
        <path d="M6.5 10.5L8.5 12.5L13.5 7.5" stroke="#10B981" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  error: `<svg viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" stroke="#EF4444" stroke-width="1.5" fill="#FEF2F2"/>
        <path d="M7.5 7.5L12.5 12.5M12.5 7.5L7.5 12.5" stroke="#EF4444" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`,
  info: `<svg viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" stroke="#3B82F6" stroke-width="1.5" fill="#EFF6FF"/>
        <path d="M10 9V14" stroke="#3B82F6" stroke-width="1.8" stroke-linecap="round"/>
        <circle cx="10" cy="6.5" r="1" fill="#3B82F6"/>
    </svg>`,
  warning: `<svg viewBox="0 0 20 20" fill="none">
        <path d="M10 2L18.66 17H1.34L10 2Z" stroke="#F59E0B" stroke-width="1.5" fill="#FFFBEB" stroke-linejoin="round"/>
        <path d="M10 8V12" stroke="#F59E0B" stroke-width="1.8" stroke-linecap="round"/>
        <circle cx="10" cy="14.5" r="1" fill="#F59E0B"/>
    </svg>`
};
var CLOSE_ICON = `<svg viewBox="0 0 16 16" fill="none">
    <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;
var container = null;
function getContainer() {
  if (container && document.body.contains(container)) return container;
  container = document.createElement("div");
  container.className = "toast-container";
  document.body.appendChild(container);
  return container;
}
function dismissToast(toastEl) {
  if (toastEl.dataset.dismissed === "true") return;
  toastEl.dataset.dismissed = "true";
  if (toastEl._autoTimer) {
    clearTimeout(toastEl._autoTimer);
    toastEl._autoTimer = null;
  }
  toastEl.classList.add("toast-exit");
  toastEl.addEventListener("animationend", () => {
    toastEl.remove();
  }, { once: true });
}
function showToast(message, type = "info", options = {}) {
  injectStyles();
  const { duration = 3e3, undoCallback = null } = options;
  const host = getContainer();
  const toast = document.createElement("div");
  toast.className = "toast";
  const iconWrap = document.createElement("span");
  iconWrap.className = "toast-icon";
  iconWrap.innerHTML = ICONS[type] || ICONS.info;
  toast.appendChild(iconWrap);
  const body = document.createElement("span");
  body.className = "toast-body toast-message";
  body.innerHTML = escapeHtml(message);
  toast.appendChild(body);
  if (typeof undoCallback === "function") {
    const undoBtn = document.createElement("button");
    undoBtn.className = "toast-undo-btn";
    undoBtn.textContent = "Undo";
    undoBtn.addEventListener("click", () => {
      undoCallback();
      dismissToast(toast);
    });
    toast.appendChild(undoBtn);
  }
  const closeBtn = document.createElement("button");
  closeBtn.className = "toast-close-btn";
  closeBtn.innerHTML = CLOSE_ICON;
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.addEventListener("click", () => dismissToast(toast));
  toast.appendChild(closeBtn);
  host.appendChild(toast);
  if (duration > 0) {
    toast._autoTimer = setTimeout(() => dismissToast(toast), duration);
  }
  return toast;
}

// src/services/notificationService.js
function notifyAssignment(activityTitle, assigneeId, assignerId) {
  return addNotification({
    recipientId: assigneeId,
    type: "assignment",
    message: `You were assigned to ${escapeHtml(activityTitle)}`,
    relatedId: assignerId
  });
}
function notifyTeamInvite(teamName, recipientId) {
  return addNotification({
    recipientId,
    type: "team_invite",
    message: `You were invited to ${escapeHtml(teamName)}`,
    relatedId: ""
  });
}
function notifyStatusChange(activityTitle, recipientId, newStatus) {
  return addNotification({
    recipientId,
    type: "status_change",
    message: `${escapeHtml(activityTitle)} status changed to ${escapeHtml(newStatus)}`,
    relatedId: ""
  });
}

// src/components/activityModal.js
function openActivityModal(existingActivity = null, options = {}) {
  const root = document.getElementById("modal-root");
  if (!root) return;
  const isEdit = !!existingActivity;
  const act = existingActivity || {};
  const teamId = getCurrentTeamId();
  const team = getTeamById(teamId);
  const members = team?.members || [];
  const categories = team?.categories || [];
  const currentUser = getCurrentUser();
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  const modal = document.createElement("div");
  modal.className = "modal-content";
  modal.innerHTML = `
        <div class="modal-header">
            <h3>${isEdit ? "Edit Activity" : "New Activity"}</h3>
            <button class="modal-close-btn">&times;</button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label>Title <span class="required">*</span></label>
                <input type="text" id="act-title" class="form-input" value="${escapeHtml(act.title || "")}">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="act-desc" class="form-input form-textarea">${escapeHtml(act.description || "")}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Due Date</label>
                    <input type="date" id="act-date" class="form-input" value="${act.dueDate || options.defaultDate || ""}">
                </div>
                <div class="form-group">
                    <label>Due Time</label>
                    <input type="time" id="act-time" class="form-input" value="${act.dueTime || ""}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Assignee</label>
                    <select id="act-assignee" class="form-input">
                        <option value="">No assignee</option>
                        ${members.map((m) => {
    const u = getUserById(m.userId);
    return u ? `<option value="${m.userId}" ${act.assigneeId === m.userId ? "selected" : ""}>${escapeHtml(u.name)}</option>` : "";
  }).join("")}
                    </select>
                </div>
                <div class="form-group">
                    <label>Category</label>
                    <select id="act-category" class="form-input">
                        <option value="">No category</option>
                        ${categories.map((c) => `<option value="${c.id}" ${act.categoryId === c.id ? "selected" : ""}>${escapeHtml(c.name)}</option>`).join("")}
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Status</label>
                <select id="act-status" class="form-input">
                    ${STATUSES.map((s) => `<option value="${s}" ${act.status === s ? "selected" : ""}>${STATUS_LABELS[s]}</option>`).join("")}
                </select>
            </div>
            <div class="form-group">
                <label class="recurring-toggle-label">
                    <input type="checkbox" id="act-recurring" ${act.recurring ? "checked" : ""}>
                    <span>Recurring Activity</span>
                    <svg class="recurring-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                </label>
            </div>
            <div id="recurrence-options" class="recurrence-options" style="display:${act.recurring ? "block" : "none"}">
                <div class="form-row">
                    <div class="form-group">
                        <label>Frequency</label>
                        <select id="act-rec-frequency" class="form-input">
                            <option value="daily" ${act.recurrenceRule?.frequency === "daily" ? "selected" : ""}>Daily</option>
                            <option value="weekly" ${act.recurrenceRule?.frequency === "weekly" ? "selected" : ""}>Weekly</option>
                            <option value="monthly" ${act.recurrenceRule?.frequency === "monthly" ? "selected" : ""}>Monthly</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Interval</label>
                        <input type="number" id="act-rec-interval" class="form-input" min="1" value="${act.recurrenceRule?.interval || 1}">
                    </div>
                </div>
                <div class="form-group">
                    <label>End Date (optional)</label>
                    <input type="date" id="act-rec-end" class="form-input" value="${act.recurrenceRule?.endDate || ""}">
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary modal-cancel-btn">Cancel</button>
            <button class="btn btn-primary modal-save-btn">${isEdit ? "Update" : "Create"}</button>
        </div>
    `;
  overlay.appendChild(modal);
  root.appendChild(overlay);
  const close = () => root.removeChild(overlay);
  overlay.onclick = (e) => {
    if (e.target === overlay) close();
  };
  modal.querySelector(".modal-close-btn").onclick = close;
  modal.querySelector(".modal-cancel-btn").onclick = close;
  const recurringCheckbox = modal.querySelector("#act-recurring");
  const recurrenceOptions = modal.querySelector("#recurrence-options");
  recurringCheckbox.onchange = () => {
    recurrenceOptions.style.display = recurringCheckbox.checked ? "block" : "none";
  };
  modal.querySelector(".modal-save-btn").onclick = () => {
    const title = modal.querySelector("#act-title").value.trim();
    if (!title) {
      modal.querySelector("#act-title").classList.add("input-error");
      showToast("Title is required", "error");
      return;
    }
    const isRecurring = modal.querySelector("#act-recurring").checked;
    const data = {
      title,
      description: modal.querySelector("#act-desc").value.trim(),
      dueDate: modal.querySelector("#act-date").value,
      dueTime: modal.querySelector("#act-time").value,
      assigneeId: modal.querySelector("#act-assignee").value,
      categoryId: modal.querySelector("#act-category").value,
      status: modal.querySelector("#act-status").value,
      teamId,
      recurring: isRecurring,
      recurrenceRule: isRecurring ? {
        frequency: modal.querySelector("#act-rec-frequency").value,
        interval: parseInt(modal.querySelector("#act-rec-interval").value, 10) || 1,
        endDate: modal.querySelector("#act-rec-end").value || null
      } : null
    };
    if (isEdit) {
      updateActivity(act.id, data);
      if (data.assigneeId && data.assigneeId !== act.assigneeId && currentUser) {
        notifyAssignment(title, data.assigneeId, currentUser.id);
      }
    } else {
      data.createdBy = currentUser?.id || "";
      addActivity(data);
      if (data.assigneeId && currentUser) {
        notifyAssignment(title, data.assigneeId, currentUser.id);
      }
    }
    close();
    if (options.onSave) options.onSave();
  };
}

// src/components/activityDetail.js
function showActivityDetail(activityId, teamId, onUpdate) {
  const root = document.getElementById("modal-root");
  if (!root) return;
  const activity = getActivityById(activityId);
  if (!activity) return;
  const categories = getCategories(teamId);
  const catMap = {};
  categories.forEach((c) => {
    catMap[c.id] = c;
  });
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  const modal = document.createElement("div");
  modal.className = "modal-content activity-detail-modal";
  function render() {
    const act = getActivityById(activityId);
    if (!act) return;
    const assignee = getUserById(act.assigneeId);
    const cat = catMap[act.categoryId];
    const timeEntries = getTimeEntriesByActivity(act.id);
    const totalMinutes = timeEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
    const subtasks = act.subtasks || [];
    const createdDate = act.createdAt ? formatDisplayDate(new Date(act.createdAt)) : "Unknown";
    const dueDateDisplay = act.dueDate ? formatDisplayDate(/* @__PURE__ */ new Date(act.dueDate + "T00:00:00")) : "No due date";
    const dueTimeDisplay = act.dueTime ? formatTime12h(act.dueTime) : "";
    const completedSubtasks = subtasks.filter((s) => s.completed).length;
    modal.innerHTML = "";
    const header = document.createElement("div");
    header.className = "modal-header activity-detail-header";
    const headerLeft = document.createElement("div");
    headerLeft.className = "activity-detail-header-left";
    const titleEl = document.createElement("h2");
    titleEl.className = "activity-detail-title";
    titleEl.textContent = act.title;
    const statusBadge = document.createElement("span");
    statusBadge.className = "status-badge";
    statusBadge.style.backgroundColor = STATUS_COLORS[act.status] + "20";
    statusBadge.style.color = STATUS_COLORS[act.status];
    statusBadge.textContent = STATUS_LABELS[act.status];
    headerLeft.appendChild(titleEl);
    headerLeft.appendChild(statusBadge);
    const headerRight = document.createElement("div");
    headerRight.className = "activity-detail-header-right";
    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-sm btn-secondary";
    editBtn.textContent = "Edit";
    editBtn.onclick = () => {
      close();
      openActivityModal(act, {
        onSave: () => {
          if (onUpdate) onUpdate();
        }
      });
    };
    const closeBtn = document.createElement("button");
    closeBtn.className = "modal-close-btn";
    closeBtn.innerHTML = "&times;";
    closeBtn.onclick = close;
    headerRight.appendChild(editBtn);
    headerRight.appendChild(closeBtn);
    header.appendChild(headerLeft);
    header.appendChild(headerRight);
    modal.appendChild(header);
    const body = document.createElement("div");
    body.className = "modal-body activity-detail-body";
    const infoGrid = document.createElement("div");
    infoGrid.className = "activity-detail-grid";
    const assigneeCell = createInfoCell("Assignee");
    if (assignee) {
      const assigneeContent = document.createElement("div");
      assigneeContent.className = "detail-assignee";
      const avatar = document.createElement("span");
      avatar.className = "task-assignee-avatar";
      avatar.style.backgroundColor = assignee.color;
      avatar.textContent = assignee.avatarInitials;
      const nameSpan = document.createElement("span");
      nameSpan.textContent = assignee.name;
      assigneeContent.appendChild(avatar);
      assigneeContent.appendChild(nameSpan);
      assigneeCell.appendChild(assigneeContent);
    } else {
      const unassigned = document.createElement("span");
      unassigned.className = "detail-placeholder";
      unassigned.textContent = "Unassigned";
      assigneeCell.appendChild(unassigned);
    }
    infoGrid.appendChild(assigneeCell);
    const catCell = createInfoCell("Category");
    if (cat) {
      const catBadge = document.createElement("span");
      catBadge.className = "cat-badge";
      catBadge.style.backgroundColor = cat.color + "20";
      catBadge.style.color = cat.color;
      catBadge.textContent = cat.name;
      catCell.appendChild(catBadge);
    } else {
      const noCat = document.createElement("span");
      noCat.className = "detail-placeholder";
      noCat.textContent = "No category";
      catCell.appendChild(noCat);
    }
    infoGrid.appendChild(catCell);
    const dueCell = createInfoCell("Due Date");
    const dueText = document.createElement("span");
    dueText.textContent = dueDateDisplay + (dueTimeDisplay ? " at " + dueTimeDisplay : "");
    dueCell.appendChild(dueText);
    infoGrid.appendChild(dueCell);
    const statusCell = createInfoCell("Status");
    const statusText = document.createElement("span");
    statusText.className = "status-badge";
    statusText.style.backgroundColor = STATUS_COLORS[act.status] + "20";
    statusText.style.color = STATUS_COLORS[act.status];
    statusText.textContent = STATUS_LABELS[act.status];
    statusCell.appendChild(statusText);
    infoGrid.appendChild(statusCell);
    const createdCell = createInfoCell("Created");
    const createdText = document.createElement("span");
    createdText.textContent = createdDate;
    createdCell.appendChild(createdText);
    infoGrid.appendChild(createdCell);
    body.appendChild(infoGrid);
    const descSection = document.createElement("div");
    descSection.className = "activity-detail-section";
    const descLabel = document.createElement("h4");
    descLabel.className = "detail-section-label";
    descLabel.textContent = "Description";
    descSection.appendChild(descLabel);
    const descContent = document.createElement("div");
    descContent.className = "detail-description";
    if (act.description && act.description.trim()) {
      descContent.textContent = act.description;
    } else {
      descContent.className += " detail-placeholder";
      descContent.textContent = "No description";
    }
    descSection.appendChild(descContent);
    body.appendChild(descSection);
    const subtaskSection = document.createElement("div");
    subtaskSection.className = "activity-detail-section";
    const subtaskLabel = document.createElement("h4");
    subtaskLabel.className = "detail-section-label";
    subtaskLabel.textContent = `Subtasks (${completedSubtasks}/${subtasks.length})`;
    subtaskSection.appendChild(subtaskLabel);
    const subtaskList = document.createElement("ul");
    subtaskList.className = "subtask-list";
    subtasks.forEach((st, idx) => {
      const li = document.createElement("li");
      li.className = "subtask-item" + (st.completed ? " subtask-completed" : "");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = st.completed;
      checkbox.className = "subtask-checkbox";
      checkbox.onchange = () => {
        const current = getActivityById(activityId);
        const subs = [...current.subtasks || []];
        subs[idx] = { ...subs[idx], completed: !subs[idx].completed };
        updateActivity(activityId, { subtasks: subs });
        if (onUpdate) onUpdate();
        render();
      };
      const label = document.createElement("span");
      label.className = "subtask-label";
      label.textContent = st.title;
      const removeBtn = document.createElement("button");
      removeBtn.className = "subtask-remove-btn";
      removeBtn.textContent = "\xD7";
      removeBtn.title = "Remove subtask";
      removeBtn.onclick = () => {
        const current = getActivityById(activityId);
        const subs = [...current.subtasks || []];
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
    const addSubtaskRow = document.createElement("div");
    addSubtaskRow.className = "add-subtask-row";
    const subtaskInput = document.createElement("input");
    subtaskInput.type = "text";
    subtaskInput.className = "form-input subtask-input";
    subtaskInput.placeholder = "Add a subtask...";
    const addSubBtn = document.createElement("button");
    addSubBtn.className = "btn btn-sm btn-primary";
    addSubBtn.textContent = "Add";
    const addSubtask = () => {
      const val = subtaskInput.value.trim();
      if (!val) return;
      const current = getActivityById(activityId);
      const subs = [...current.subtasks || []];
      subs.push({ id: generateId("sub"), title: val, completed: false });
      updateActivity(activityId, { subtasks: subs });
      if (onUpdate) onUpdate();
      render();
    };
    addSubBtn.onclick = addSubtask;
    subtaskInput.onkeydown = (e) => {
      if (e.key === "Enter") addSubtask();
    };
    addSubtaskRow.appendChild(subtaskInput);
    addSubtaskRow.appendChild(addSubBtn);
    subtaskSection.appendChild(addSubtaskRow);
    body.appendChild(subtaskSection);
    const timeSection = document.createElement("div");
    timeSection.className = "activity-detail-section";
    const timeLabel = document.createElement("h4");
    timeLabel.className = "detail-section-label";
    timeLabel.textContent = "Time Entries";
    timeSection.appendChild(timeLabel);
    if (timeEntries.length > 0) {
      const totalHours = Math.floor(totalMinutes / 60);
      const totalMins = totalMinutes % 60;
      const totalDisplay = totalHours > 0 ? `${totalHours}h ${totalMins}m` : `${totalMins}m`;
      const totalBadge = document.createElement("div");
      totalBadge.className = "time-total-badge";
      totalBadge.textContent = `Total: ${totalDisplay}`;
      timeSection.appendChild(totalBadge);
      const timeList = document.createElement("ul");
      timeList.className = "time-entry-list";
      timeEntries.forEach((te) => {
        const li = document.createElement("li");
        li.className = "time-entry-item";
        const user = getUserById(te.userId);
        const durH = Math.floor((te.duration || 0) / 60);
        const durM = (te.duration || 0) % 60;
        const durStr = durH > 0 ? `${durH}h ${durM}m` : `${durM}m`;
        const dateStr = te.startTime ? new Date(te.startTime).toLocaleDateString() : "";
        const userName = user ? escapeHtml(user.name) : "Unknown";
        const noteStr = te.note ? ` \u2014 ${escapeHtml(te.note)}` : "";
        li.innerHTML = `
                    <span class="time-entry-duration">${escapeHtml(durStr)}</span>
                    <span class="time-entry-meta">${userName} on ${escapeHtml(dateStr)}${noteStr}</span>
                `;
        timeList.appendChild(li);
      });
      timeSection.appendChild(timeList);
    } else {
      const noTime = document.createElement("div");
      noTime.className = "detail-placeholder";
      noTime.textContent = "No time entries recorded.";
      timeSection.appendChild(noTime);
    }
    body.appendChild(timeSection);
    const commentSection = document.createElement("div");
    commentSection.className = "activity-detail-section";
    const commentLabel = document.createElement("h4");
    commentLabel.className = "detail-section-label";
    commentLabel.textContent = "Comments";
    commentSection.appendChild(commentLabel);
    const commentsContainer = document.createElement("div");
    commentsContainer.className = "comments-container";
    commentSection.appendChild(commentsContainer);
    function renderComments() {
      commentsContainer.innerHTML = "";
      const comments = getComments(activityId);
      const currentUser = getCurrentUser();
      if (comments.length === 0) {
        const noComments = document.createElement("div");
        noComments.className = "detail-placeholder";
        noComments.textContent = "No comments yet.";
        commentsContainer.appendChild(noComments);
      } else {
        const commentList = document.createElement("ul");
        commentList.className = "comment-list";
        comments.forEach((c) => {
          const user = getUserById(c.userId);
          const li = document.createElement("li");
          li.className = "comment-item";
          const commentHeader = document.createElement("div");
          commentHeader.className = "comment-header";
          const authorInfo = document.createElement("div");
          authorInfo.className = "comment-author";
          if (user) {
            const avatar = document.createElement("span");
            avatar.className = "task-assignee-avatar";
            avatar.style.backgroundColor = user.color;
            avatar.textContent = user.avatarInitials;
            authorInfo.appendChild(avatar);
            const name = document.createElement("span");
            name.className = "comment-author-name";
            name.textContent = escapeHtml(user.name);
            authorInfo.appendChild(name);
          } else {
            const name = document.createElement("span");
            name.className = "comment-author-name";
            name.textContent = "Unknown user";
            authorInfo.appendChild(name);
          }
          const time = document.createElement("span");
          time.className = "comment-time";
          time.textContent = relativeTime(c.timestamp);
          authorInfo.appendChild(time);
          commentHeader.appendChild(authorInfo);
          if (currentUser && c.userId === currentUser.id) {
            const delBtn = document.createElement("button");
            delBtn.className = "comment-delete-btn";
            delBtn.textContent = "\xD7";
            delBtn.title = "Delete comment";
            delBtn.onclick = () => {
              deleteComment(c.id);
              renderComments();
            };
            commentHeader.appendChild(delBtn);
          }
          li.appendChild(commentHeader);
          const textEl = document.createElement("div");
          textEl.className = "comment-text";
          textEl.innerHTML = escapeHtml(c.text);
          li.appendChild(textEl);
          commentList.appendChild(li);
        });
        commentsContainer.appendChild(commentList);
      }
      const addCommentRow = document.createElement("div");
      addCommentRow.className = "add-comment-row";
      const commentInput = document.createElement("input");
      commentInput.type = "text";
      commentInput.className = "form-input comment-input";
      commentInput.placeholder = "Add a comment...";
      const sendBtn = document.createElement("button");
      sendBtn.className = "btn btn-sm btn-primary";
      sendBtn.textContent = "Send";
      const submitComment = () => {
        const text = commentInput.value.trim();
        if (!text) return;
        const currentUser2 = getCurrentUser();
        if (!currentUser2) return;
        addComment({ activityId, userId: currentUser2.id, text });
        renderComments();
      };
      sendBtn.onclick = submitComment;
      commentInput.onkeydown = (e) => {
        if (e.key === "Enter") submitComment();
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
  overlay.onclick = (e) => {
    if (e.target === overlay) close();
  };
  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      close();
      document.removeEventListener("keydown", onKeyDown);
    }
  };
  document.addEventListener("keydown", onKeyDown);
  render();
  overlay.appendChild(modal);
  root.appendChild(overlay);
}
function createInfoCell(labelText) {
  const cell = document.createElement("div");
  cell.className = "detail-info-cell";
  const label = document.createElement("span");
  label.className = "detail-info-label";
  label.textContent = labelText;
  cell.appendChild(label);
  return cell;
}

// src/services/deadlineService.js
function todayStr() {
  return formatDate(/* @__PURE__ */ new Date());
}
function futureDateStr(days) {
  const d = /* @__PURE__ */ new Date();
  d.setDate(d.getDate() + days);
  return formatDate(d);
}
function isOpenWithDueDate(activity) {
  return activity.status !== "done" && !!activity.dueDate;
}
function getOverdueActivities(teamId) {
  const today = todayStr();
  return getActivitiesByTeam(teamId).filter((a) => isOpenWithDueDate(a) && a.dueDate < today);
}
function getDeadlineStatus(activity, days = 3) {
  if (activity.status === "done" || !activity.dueDate) return null;
  const today = todayStr();
  if (activity.dueDate < today) return "overdue";
  if (activity.dueDate === today) return "due-today";
  const horizon = futureDateStr(days);
  if (activity.dueDate <= horizon) return "due-soon";
  return null;
}

// src/components/confirmModal.js
function showConfirmModal(title, message, onConfirm) {
  const root = document.getElementById("modal-root");
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  const modal = document.createElement("div");
  modal.className = "modal-content confirm-modal";
  modal.innerHTML = `
        <div class="modal-header"><h3>${escapeHtml(title)}</h3><button class="modal-close-btn">&times;</button></div>
        <div class="modal-body">
            <p class="confirm-message">${escapeHtml(message)}</p>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary modal-cancel-btn">Cancel</button>
            <button class="btn btn-danger confirm-ok-btn">Delete</button>
        </div>
    `;
  const close = () => root.removeChild(overlay);
  overlay.onclick = (e) => {
    if (e.target === overlay) close();
  };
  modal.querySelector(".modal-close-btn").onclick = close;
  modal.querySelector(".modal-cancel-btn").onclick = close;
  modal.querySelector(".confirm-ok-btn").onclick = () => {
    close();
    onConfirm();
  };
  overlay.appendChild(modal);
  root.appendChild(overlay);
}

// src/components/activityList.js
var DEADLINE_LABELS = {
  "overdue": "Overdue",
  "due-today": "Due today",
  "due-soon": "Due soon"
};
var filterSearch = "";
var filterStatus = "";
var filterCategory = "";
var filterAssignee = "";
function formatTrackedTime(totalMinutes) {
  if (totalMinutes <= 0) return "";
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m tracked`;
  if (hours > 0) return `${hours}h tracked`;
  return `${mins}m tracked`;
}
function renderActivityList(container2, selectedDate2, viewMode, onUpdate) {
  const div = document.createElement("div");
  div.className = "card activity-list-section";
  const teamId = getCurrentTeamId();
  const dateStr = formatDate(selectedDate2);
  const displayDate = formatDisplayDate(selectedDate2);
  const categories = getCategories(teamId);
  const catMap = {};
  categories.forEach((c) => {
    catMap[c.id] = c;
  });
  const team = getTeamById(teamId);
  const teamMembers = (team?.members || []).map((m) => {
    const user = getUserById(m.userId);
    return user ? { id: user.id, name: user.name } : null;
  }).filter(Boolean);
  let titleText;
  if (viewMode === "team") {
    titleText = "Team Activities";
  } else {
    titleText = `Activities for ${displayDate}`;
  }
  const header = document.createElement("div");
  header.className = "section-header";
  header.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        ${escapeHtml(titleText)}
    `;
  const addBtn = document.createElement("button");
  addBtn.className = "btn btn-sm btn-primary add-task-btn";
  addBtn.textContent = "+ Add";
  addBtn.onclick = () => openActivityModal(null, { defaultDate: dateStr, onSave: onUpdate });
  header.appendChild(addBtn);
  const content = document.createElement("div");
  content.className = "activity-list-content";
  const itemsContainer = document.createElement("div");
  itemsContainer.className = "activity-items-container";
  function renderItems() {
    itemsContainer.innerHTML = "";
    let activities;
    if (viewMode === "team") {
      activities = getActivitiesByTeam(teamId);
    } else {
      activities = getActivitiesByDate(teamId, dateStr);
    }
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      activities = activities.filter((a) => a.title.toLowerCase().includes(q));
    }
    if (filterStatus) {
      activities = activities.filter((a) => a.status === filterStatus);
    }
    if (filterCategory) {
      activities = activities.filter((a) => a.categoryId === filterCategory);
    }
    if (filterAssignee) {
      activities = activities.filter((a) => a.assigneeId === filterAssignee);
    }
    const statusOrder = { in_progress: 0, todo: 1, done: 2 };
    activities.sort((a, b) => (statusOrder[a.status] ?? 1) - (statusOrder[b.status] ?? 1));
    const overdueList = getOverdueActivities(teamId);
    if (overdueList.length > 0) {
      const banner = document.createElement("div");
      banner.className = "deadline-warning-banner";
      const count = overdueList.length;
      const word = count === 1 ? "activity is" : "activities are";
      banner.textContent = `\u26A0 ${escapeHtml(String(count))} ${word} overdue`;
      itemsContainer.appendChild(banner);
    }
    if (activities.length === 0) {
      itemsContainer.insertAdjacentHTML("beforeend", '<div class="empty-state">No activities.</div>');
    } else {
      activities.forEach((act) => {
        const item = document.createElement("div");
        item.className = `activity-item ${act.status === "done" ? "completed" : ""}`;
        const assignee = getUserById(act.assigneeId);
        const cat = catMap[act.categoryId];
        const catDot = document.createElement("span");
        catDot.className = "cat-dot";
        catDot.style.backgroundColor = cat?.color || "#9CA3AF";
        catDot.title = cat?.name || "Uncategorized";
        const info = document.createElement("div");
        info.className = "activity-item-info";
        const titleEl = document.createElement("span");
        titleEl.className = "activity-item-title";
        titleEl.textContent = act.title;
        titleEl.style.cursor = "pointer";
        titleEl.onclick = () => showActivityDetail(act.id, teamId, onUpdate);
        const meta = document.createElement("div");
        meta.className = "activity-item-meta";
        if (act.dueTime) {
          const timeBadge = document.createElement("span");
          timeBadge.className = "task-time-badge";
          timeBadge.textContent = formatTime12h(act.dueTime);
          meta.appendChild(timeBadge);
        }
        if (cat) {
          const catBadge = document.createElement("span");
          catBadge.className = "cat-badge";
          catBadge.style.backgroundColor = cat.color + "20";
          catBadge.style.color = cat.color;
          catBadge.textContent = cat.name;
          meta.appendChild(catBadge);
        }
        const timeEntries = getTimeEntriesByActivity(act.id);
        const totalMinutes = timeEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
        const trackedLabel = formatTrackedTime(totalMinutes);
        if (trackedLabel) {
          const trackedBadge = document.createElement("span");
          trackedBadge.className = "tracked-time-badge";
          trackedBadge.textContent = escapeHtml(trackedLabel);
          meta.appendChild(trackedBadge);
        }
        const statusPill = document.createElement("button");
        statusPill.className = "status-pill-btn";
        statusPill.style.backgroundColor = STATUS_COLORS[act.status] + "20";
        statusPill.style.color = STATUS_COLORS[act.status];
        statusPill.textContent = STATUS_LABELS[act.status];
        statusPill.onclick = () => {
          const idx = STATUSES.indexOf(act.status);
          const newStatus = STATUSES[(idx + 1) % STATUSES.length];
          updateActivity(act.id, { status: newStatus });
          showToast("Status updated", "info");
          if (act.assigneeId) {
            notifyStatusChange(act.title, act.assigneeId, STATUS_LABELS[newStatus]);
          }
          onUpdate();
        };
        meta.appendChild(statusPill);
        if (act.recurring) {
          const recurBadge = document.createElement("span");
          recurBadge.className = "recurring-badge";
          recurBadge.title = `Repeats ${act.recurrenceRule?.frequency || "recurring"}`;
          recurBadge.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>';
          meta.appendChild(recurBadge);
        }
        const dlStatus = getDeadlineStatus(act);
        if (dlStatus) {
          const dlBadge = document.createElement("span");
          dlBadge.className = `deadline-badge ${dlStatus}`;
          dlBadge.textContent = DEADLINE_LABELS[dlStatus];
          meta.appendChild(dlBadge);
        }
        info.appendChild(titleEl);
        info.appendChild(meta);
        const right = document.createElement("div");
        right.className = "activity-item-right";
        if (assignee) {
          const avatar = document.createElement("span");
          avatar.className = "task-assignee-avatar";
          avatar.style.backgroundColor = assignee.color;
          avatar.textContent = assignee.avatarInitials;
          avatar.title = assignee.name;
          right.appendChild(avatar);
        }
        const delBtn = document.createElement("button");
        delBtn.className = "delete-btn";
        delBtn.textContent = "\xD7";
        delBtn.onclick = () => {
          showConfirmModal(
            "Delete Activity",
            `Delete "${act.title}"?`,
            () => {
              deleteActivity(act.id);
              showToast("Activity deleted", "success");
              onUpdate();
            }
          );
        };
        right.appendChild(delBtn);
        item.appendChild(catDot);
        item.appendChild(info);
        item.appendChild(right);
        itemsContainer.appendChild(item);
      });
    }
  }
  const filterBar = document.createElement("div");
  filterBar.className = "filter-bar";
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.className = "filter-search";
  searchInput.placeholder = "Search activities...";
  searchInput.value = filterSearch;
  searchInput.oninput = (e) => {
    filterSearch = e.target.value;
    renderItems();
  };
  filterBar.appendChild(searchInput);
  const statusSelect = document.createElement("select");
  statusSelect.className = "filter-select";
  const statusAllOpt = document.createElement("option");
  statusAllOpt.value = "";
  statusAllOpt.textContent = "All Statuses";
  statusSelect.appendChild(statusAllOpt);
  STATUSES.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = STATUS_LABELS[s];
    if (filterStatus === s) opt.selected = true;
    statusSelect.appendChild(opt);
  });
  statusSelect.onchange = (e) => {
    filterStatus = e.target.value;
    renderItems();
  };
  filterBar.appendChild(statusSelect);
  const categorySelect = document.createElement("select");
  categorySelect.className = "filter-select";
  const catAllOpt = document.createElement("option");
  catAllOpt.value = "";
  catAllOpt.textContent = "All Categories";
  categorySelect.appendChild(catAllOpt);
  categories.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    if (filterCategory === c.id) opt.selected = true;
    categorySelect.appendChild(opt);
  });
  categorySelect.onchange = (e) => {
    filterCategory = e.target.value;
    renderItems();
  };
  filterBar.appendChild(categorySelect);
  if (viewMode === "team") {
    const assigneeSelect = document.createElement("select");
    assigneeSelect.className = "filter-select";
    const assigneeAllOpt = document.createElement("option");
    assigneeAllOpt.value = "";
    assigneeAllOpt.textContent = "All Members";
    assigneeSelect.appendChild(assigneeAllOpt);
    teamMembers.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.name;
      if (filterAssignee === m.id) opt.selected = true;
      assigneeSelect.appendChild(opt);
    });
    assigneeSelect.onchange = (e) => {
      filterAssignee = e.target.value;
      renderItems();
    };
    filterBar.appendChild(assigneeSelect);
  }
  content.appendChild(filterBar);
  content.appendChild(itemsContainer);
  renderItems();
  div.appendChild(header);
  div.appendChild(content);
  container2.appendChild(div);
}

// src/components/timerWidget.js
var timerInterval = null;
function renderTimerWidget(container2, onUpdate) {
  const user = getCurrentUser();
  const teamId = getCurrentTeamId();
  const timer = getActiveTimer();
  const div = document.createElement("div");
  div.className = "card timer-widget";
  const header = document.createElement("div");
  header.className = "section-header timer-header";
  header.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span>Time Tracker</span>
    `;
  const content = document.createElement("div");
  content.className = "timer-content";
  if (timer && timer.userId === user.id) {
    const activity = getActivityById(timer.activityId);
    const elapsed = document.createElement("div");
    elapsed.className = "timer-display";
    elapsed.id = "timer-elapsed";
    const updateElapsed = () => {
      const diff = Math.floor((Date.now() - new Date(timer.startTime).getTime()) / 1e3);
      const h = Math.floor(diff / 3600);
      const m = Math.floor(diff % 3600 / 60);
      const s = diff % 60;
      elapsed.textContent = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };
    updateElapsed();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateElapsed, 1e3);
    content.innerHTML = `
            <div class="timer-active-label">Recording time for</div>
            <div class="timer-activity-name">${escapeHtml(activity?.title || "Unknown")}</div>
        `;
    content.appendChild(elapsed);
    const btnRow = document.createElement("div");
    btnRow.className = "timer-btn-row";
    const stopBtn = document.createElement("button");
    stopBtn.className = "btn btn-primary timer-stop-btn";
    stopBtn.textContent = "Stop Timer";
    stopBtn.onclick = () => {
      clearInterval(timerInterval);
      timerInterval = null;
      stopTimer();
      showToast("Timer stopped & saved", "success");
      onUpdate();
    };
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn btn-secondary";
    cancelBtn.textContent = "Cancel";
    cancelBtn.onclick = () => {
      clearInterval(timerInterval);
      timerInterval = null;
      cancelTimer();
      showToast("Timer cancelled", "info");
      onUpdate();
    };
    btnRow.appendChild(stopBtn);
    btnRow.appendChild(cancelBtn);
    content.appendChild(btnRow);
  } else {
    const activities = getActivitiesByTeam(teamId).filter((a) => a.status !== "done");
    content.innerHTML = `
            <div class="timer-start-section">
                <select id="timer-activity-select" class="form-input">
                    <option value="">Select activity...</option>
                    ${activities.map((a) => `<option value="${a.id}">${escapeHtml(a.title)}</option>`).join("")}
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
  container2.appendChild(div);
  setTimeout(() => {
    const startBtn = div.querySelector("#start-timer-btn");
    if (startBtn) {
      startBtn.onclick = () => {
        const select = div.querySelector("#timer-activity-select");
        if (!select.value) {
          showToast("Please select an activity", "error");
          return;
        }
        startTimer(select.value, user.id, teamId);
        onUpdate();
      };
    }
    const manualBtn = div.querySelector("#manual-entry-btn");
    if (manualBtn) {
      manualBtn.onclick = () => showManualEntryModal(teamId, user.id, onUpdate);
    }
  }, 0);
}
function showManualEntryModal(teamId, userId, onUpdate) {
  const root = document.getElementById("modal-root");
  const activities = getActivitiesByTeam(teamId);
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  const modal = document.createElement("div");
  modal.className = "modal-content";
  modal.innerHTML = `
        <div class="modal-header"><h3>Manual Time Entry</h3><button class="modal-close-btn">&times;</button></div>
        <div class="modal-body">
            <div class="form-group">
                <label>Activity *</label>
                <select id="manual-activity" class="form-input">
                    <option value="">Select activity...</option>
                    ${activities.map((a) => `<option value="${a.id}">${escapeHtml(a.title)}</option>`).join("")}
                </select>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Date</label><input type="date" id="manual-date" class="form-input" value="${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}"></div>
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
  overlay.onclick = (e) => {
    if (e.target === overlay) close();
  };
  modal.querySelector(".modal-close-btn").onclick = close;
  modal.querySelector(".modal-cancel-btn").onclick = close;
  const updateDuration = () => {
    const s = modal.querySelector("#manual-start").value;
    const e = modal.querySelector("#manual-end").value;
    if (s && e) {
      const [sh, sm] = s.split(":").map(Number);
      const [eh, em] = e.split(":").map(Number);
      const dur = eh * 60 + em - (sh * 60 + sm);
      if (dur > 0) modal.querySelector("#manual-duration").value = dur;
    }
  };
  modal.querySelector("#manual-start").onchange = updateDuration;
  modal.querySelector("#manual-end").onchange = updateDuration;
  modal.querySelector("#save-manual-btn").onclick = () => {
    const activityId = modal.querySelector("#manual-activity").value;
    if (!activityId) {
      showToast("Please select an activity", "error");
      return;
    }
    const date = modal.querySelector("#manual-date").value;
    const duration = parseInt(modal.querySelector("#manual-duration").value) || 0;
    if (duration <= 0) {
      showToast("Duration must be greater than 0", "error");
      return;
    }
    const startTime = modal.querySelector("#manual-start").value;
    const endTime = modal.querySelector("#manual-end").value;
    const note = modal.querySelector("#manual-note").value.trim();
    addTimeEntry({
      activityId,
      userId,
      teamId,
      startTime: `${date}T${startTime}:00.000Z`,
      endTime: `${date}T${endTime}:00.000Z`,
      duration,
      manual: true,
      note
    });
    close();
    onUpdate();
  };
  overlay.appendChild(modal);
  root.appendChild(overlay);
}

// src/components/timeline.js
function renderTimeline(container2, selectedDate2, viewMode, onUpdate) {
  const div = document.createElement("div");
  div.className = "card timeline-section";
  const teamId = getCurrentTeamId();
  const user = getCurrentUser();
  const dateStr = formatDate(selectedDate2);
  const header = document.createElement("div");
  header.className = "section-header";
  header.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        Timeline \u2014 ${escapeHtml(formatDisplayDate(selectedDate2))}
    `;
  const content = document.createElement("div");
  content.className = "timeline-content";
  let entries;
  if (viewMode === "team") {
    const team = getTeamById(teamId);
    entries = [];
    (team?.members || []).forEach((m) => {
      const userEntries = getTimeEntriesByDate(m.userId, dateStr);
      userEntries.forEach((e) => entries.push({ ...e, _userId: m.userId }));
    });
  } else {
    entries = getTimeEntriesByDate(user.id, dateStr);
    entries = entries.map((e) => ({ ...e, _userId: user.id }));
  }
  entries.sort((a, b) => a.startTime.localeCompare(b.startTime));
  if (entries.length === 0) {
    content.innerHTML = '<div class="empty-state">No time entries for this day.</div>';
  } else {
    const totalMinutes = entries.reduce((sum, e) => sum + (e.duration || 0), 0);
    const totalH = Math.floor(totalMinutes / 60);
    const totalM = totalMinutes % 60;
    const summary = document.createElement("div");
    summary.className = "timeline-summary";
    summary.innerHTML = `
            <span class="timeline-total">Total: <strong>${totalH}h ${totalM}m</strong></span>
            <span class="timeline-count">${entries.length} entries</span>
        `;
    content.appendChild(summary);
    entries.forEach((entry) => {
      const activity = getActivityById(entry.activityId);
      const entryUser = getUserById(entry._userId);
      const isOwn = entry._userId === user.id;
      const item = document.createElement("div");
      item.className = "timeline-item";
      const startT = entry.startTime.split("T")[1]?.substring(0, 5) || "";
      const endT = entry.endTime.split("T")[1]?.substring(0, 5) || "";
      const durH = Math.floor(entry.duration / 60);
      const durM = entry.duration % 60;
      const timeCol = document.createElement("div");
      timeCol.className = "timeline-time";
      timeCol.innerHTML = `
                <span class="timeline-start">${startT}</span>
                <span class="timeline-dash">\u2014</span>
                <span class="timeline-end">${endT}</span>
            `;
      const bar = document.createElement("div");
      bar.className = "timeline-bar";
      bar.style.background = entryUser?.color || "#6B7280";
      const info = document.createElement("div");
      info.className = "timeline-info";
      const nameSpan = document.createElement("span");
      nameSpan.className = "timeline-activity-name";
      nameSpan.textContent = activity?.title || "Unknown";
      info.appendChild(nameSpan);
      const durSpan = document.createElement("span");
      durSpan.className = "timeline-duration";
      durSpan.textContent = `${durH > 0 ? durH + "h " : ""}${durM}m ${entry.manual ? "(manual)" : ""}`;
      info.appendChild(durSpan);
      if (viewMode === "team" && entryUser) {
        const userBadge = document.createElement("span");
        userBadge.className = "timeline-user-badge";
        userBadge.style.color = entryUser.color;
        userBadge.textContent = entryUser.name;
        info.appendChild(userBadge);
      }
      if (entry.note) {
        const noteSpan = document.createElement("span");
        noteSpan.className = "timeline-note";
        noteSpan.textContent = entry.note;
        info.appendChild(noteSpan);
      }
      const actions = document.createElement("div");
      actions.className = "timeline-actions";
      if (isOwn) {
        const editBtn = document.createElement("button");
        editBtn.className = "btn-icon timeline-edit-btn";
        editBtn.title = "Edit";
        editBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>';
        editBtn.onclick = (e) => {
          e.stopPropagation();
          showEditTimeEntryModal(entry, teamId, onUpdate);
        };
        const delBtn = document.createElement("button");
        delBtn.className = "btn-icon timeline-delete-btn";
        delBtn.title = "Delete";
        delBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
        delBtn.onclick = (e) => {
          e.stopPropagation();
          showConfirmModal(
            "Delete Time Entry",
            `Delete this ${durH > 0 ? durH + "h " : ""}${durM}m entry for "${activity?.title || "Unknown"}"?`,
            () => {
              deleteTimeEntry(entry.id);
              showToast("Time entry deleted", "success");
              onUpdate();
            }
          );
        };
        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
      }
      item.appendChild(timeCol);
      item.appendChild(bar);
      item.appendChild(info);
      item.appendChild(actions);
      content.appendChild(item);
    });
  }
  div.appendChild(header);
  div.appendChild(content);
  container2.appendChild(div);
}
function showEditTimeEntryModal(entry, teamId, onUpdate) {
  const root = document.getElementById("modal-root");
  const activities = getActivitiesByTeam(teamId);
  const dateStr = entry.startTime.split("T")[0];
  const startTime = entry.startTime.split("T")[1]?.substring(0, 5) || "";
  const endTime = entry.endTime.split("T")[1]?.substring(0, 5) || "";
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  const modal = document.createElement("div");
  modal.className = "modal-content";
  modal.innerHTML = `
        <div class="modal-header"><h3>Edit Time Entry</h3><button class="modal-close-btn">&times;</button></div>
        <div class="modal-body">
            <div class="form-group">
                <label>Activity</label>
                <select id="edit-te-activity" class="form-input">
                    ${activities.map((a) => `<option value="${a.id}" ${a.id === entry.activityId ? "selected" : ""}>${escapeHtml(a.title)}</option>`).join("")}
                </select>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Date</label><input type="date" id="edit-te-date" class="form-input" value="${dateStr}"></div>
                <div class="form-group"><label>Duration (min)</label><input type="number" id="edit-te-duration" class="form-input" min="1" value="${entry.duration}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Start Time</label><input type="time" id="edit-te-start" class="form-input" value="${startTime}"></div>
                <div class="form-group"><label>End Time</label><input type="time" id="edit-te-end" class="form-input" value="${endTime}"></div>
            </div>
            <div class="form-group"><label>Note</label><input type="text" id="edit-te-note" class="form-input" value="${escapeHtml(entry.note || "")}"></div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary modal-cancel-btn">Cancel</button>
            <button class="btn btn-primary" id="save-edit-te-btn">Save</button>
        </div>
    `;
  const close = () => root.removeChild(overlay);
  overlay.onclick = (e) => {
    if (e.target === overlay) close();
  };
  modal.querySelector(".modal-close-btn").onclick = close;
  modal.querySelector(".modal-cancel-btn").onclick = close;
  const updateDuration = () => {
    const s = modal.querySelector("#edit-te-start").value;
    const e = modal.querySelector("#edit-te-end").value;
    if (s && e) {
      const [sh, sm] = s.split(":").map(Number);
      const [eh, em] = e.split(":").map(Number);
      const dur = eh * 60 + em - (sh * 60 + sm);
      if (dur > 0) modal.querySelector("#edit-te-duration").value = dur;
    }
  };
  modal.querySelector("#edit-te-start").onchange = updateDuration;
  modal.querySelector("#edit-te-end").onchange = updateDuration;
  modal.querySelector("#save-edit-te-btn").onclick = () => {
    const date = modal.querySelector("#edit-te-date").value;
    const start = modal.querySelector("#edit-te-start").value;
    const end = modal.querySelector("#edit-te-end").value;
    const duration = parseInt(modal.querySelector("#edit-te-duration").value) || 0;
    const note = modal.querySelector("#edit-te-note").value.trim();
    const activityId = modal.querySelector("#edit-te-activity").value;
    updateTimeEntry(entry.id, {
      activityId,
      startTime: `${date}T${start}:00.000Z`,
      endTime: `${date}T${end}:00.000Z`,
      duration,
      note
    });
    close();
    showToast("Time entry updated", "success");
    onUpdate();
  };
  overlay.appendChild(modal);
  root.appendChild(overlay);
}

// src/components/teamManager.js
function renderTeamManager(container2, onUpdate) {
  const user = getCurrentUser();
  if (!user) return;
  const teamId = getCurrentTeamId();
  const team = getTeamById(teamId);
  const isAdmin = isTeamAdmin(teamId);
  const div = document.createElement("div");
  div.className = "card team-manager-section";
  const header = document.createElement("div");
  header.className = "section-header";
  header.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        Team Management
    `;
  const content = document.createElement("div");
  content.className = "team-content";
  if (!team) {
    content.innerHTML = '<div class="empty-state">No team selected</div>';
    div.appendChild(header);
    div.appendChild(content);
    container2.appendChild(div);
    return;
  }
  const infoSection = document.createElement("div");
  infoSection.className = "team-info-section";
  if (isAdmin) {
    infoSection.innerHTML = `
            <div class="form-group">
                <label>Team Name</label>
                <input type="text" class="form-input" id="team-name-input" value="${escapeHtml(team.name)}">
            </div>
            <div class="form-group">
                <label>Description</label>
                <input type="text" class="form-input" id="team-desc-input" value="${escapeHtml(team.description || "")}">
            </div>
            <button class="btn btn-sm btn-primary" id="save-team-btn">Save Changes</button>
        `;
  } else {
    infoSection.innerHTML = `
            <h3 class="team-name">${escapeHtml(team.name)}</h3>
            <p class="team-desc">${escapeHtml(team.description || "")}</p>
        `;
  }
  content.appendChild(infoSection);
  if (isAdmin) {
    setTimeout(() => {
      const saveBtn = div.querySelector("#save-team-btn");
      if (saveBtn) {
        saveBtn.onclick = () => {
          const name = div.querySelector("#team-name-input").value.trim();
          const description = div.querySelector("#team-desc-input").value.trim();
          if (name) {
            updateTeam(teamId, { name, description });
            onUpdate();
          }
        };
      }
    }, 0);
  }
  if (isAdmin) {
    const inviteSection = document.createElement("div");
    inviteSection.className = "invite-section";
    inviteSection.innerHTML = `
            <h4 class="subsection-title">Invite Member</h4>
            <div class="invite-row">
                <input type="email" class="form-input" id="invite-email" placeholder="Enter email address">
                <button class="btn btn-sm btn-primary" id="invite-btn">Invite</button>
            </div>
        `;
    content.appendChild(inviteSection);
    setTimeout(() => {
      const inviteBtn = div.querySelector("#invite-btn");
      if (inviteBtn) {
        inviteBtn.onclick = () => {
          const emailInput = div.querySelector("#invite-email");
          const email = emailInput.value.trim();
          if (!email) return;
          const existingUser = getUsers().find((u) => u.email === email);
          if (existingUser) {
            addMemberToTeam(teamId, existingUser.id, "member", email);
            notifyTeamInvite(team.name, existingUser.id);
          } else {
            createInvite(teamId, email, user.id);
          }
          emailInput.value = "";
          showToast("Invitation sent", "success");
          onUpdate();
        };
      }
    }, 0);
  }
  const pendingInvites = getInvitesForUser(user.email);
  if (pendingInvites.length > 0) {
    const invitesDiv = document.createElement("div");
    invitesDiv.className = "pending-invites";
    invitesDiv.innerHTML = `<h4 class="subsection-title">Pending Invitations</h4>`;
    pendingInvites.forEach((inv) => {
      const invTeam = getTeamById(inv.teamId);
      const row = document.createElement("div");
      row.className = "invite-item";
      row.innerHTML = `
                <span>${escapeHtml(invTeam?.name || "Unknown Team")}</span>
                <div class="invite-actions">
                    <button class="btn btn-sm btn-primary accept-inv">Accept</button>
                    <button class="btn btn-sm btn-secondary decline-inv">Decline</button>
                </div>
            `;
      row.querySelector(".accept-inv").onclick = () => {
        acceptInvite(inv.id, user.id);
        onUpdate();
      };
      row.querySelector(".decline-inv").onclick = () => {
        declineInvite(inv.id);
        onUpdate();
      };
      invitesDiv.appendChild(row);
    });
    content.appendChild(invitesDiv);
  }
  const membersSection = document.createElement("div");
  membersSection.className = "members-section";
  membersSection.innerHTML = `<h4 class="subsection-title">Members (${team.members.length})</h4>`;
  const membersList = document.createElement("div");
  membersList.className = "members-list";
  team.members.forEach((member) => {
    const memberUser = getUserById(member.userId);
    if (!memberUser) return;
    const row = document.createElement("div");
    row.className = "member-row";
    row.innerHTML = `
            <div class="member-info">
                <span class="member-avatar" style="background:${memberUser.color}">${escapeHtml(memberUser.avatarInitials)}</span>
                <div>
                    <span class="member-name">${escapeHtml(memberUser.name)}</span>
                    <span class="member-email">${escapeHtml(memberUser.email)}</span>
                </div>
            </div>
            <div class="member-actions">
                <span class="role-badge role-${member.role}">${escapeHtml(member.role)}</span>
            </div>
        `;
    if (isAdmin && member.userId !== user.id) {
      const actions = row.querySelector(".member-actions");
      const roleBtn = document.createElement("button");
      roleBtn.className = "btn btn-sm btn-secondary";
      roleBtn.textContent = member.role === "admin" ? "Set Member" : "Set Admin";
      roleBtn.onclick = () => {
        updateMemberRole(teamId, member.userId, member.role === "admin" ? "member" : "admin");
        onUpdate();
      };
      actions.insertBefore(roleBtn, actions.firstChild);
      const removeBtn = document.createElement("button");
      removeBtn.className = "btn btn-sm btn-danger";
      removeBtn.textContent = "Remove";
      removeBtn.onclick = () => {
        showConfirmModal(
          "Remove Member",
          `Remove ${memberUser.name} from team?`,
          () => {
            removeMemberFromTeam(teamId, member.userId);
            showToast("Member removed", "success");
            onUpdate();
          }
        );
      };
      actions.appendChild(removeBtn);
    }
    membersList.appendChild(row);
  });
  membersSection.appendChild(membersList);
  content.appendChild(membersSection);
  div.appendChild(header);
  div.appendChild(content);
  container2.appendChild(div);
}
function renderTeamSelector(headerEl, onTeamChange) {
  const user = getCurrentUser();
  if (!user) return;
  const teams = getTeamsForUser(user.id);
  const currentTeamId = getCurrentTeamId();
  const selector = document.createElement("select");
  selector.className = "team-selector";
  if (teams.length === 0) {
    selector.innerHTML = '<option value="">No teams</option>';
  } else {
    teams.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = t.name;
      opt.selected = t.id === currentTeamId;
      selector.appendChild(opt);
    });
  }
  selector.onchange = () => {
    setCurrentTeamId(selector.value);
    onTeamChange();
  };
  if (!currentTeamId && teams.length > 0) {
    setCurrentTeamId(teams[0].id);
  }
  headerEl.appendChild(selector);
}
function showCreateTeamModal(onCreated) {
  const root = document.getElementById("modal-root");
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  const modal = document.createElement("div");
  modal.className = "modal-content";
  modal.innerHTML = `
        <div class="modal-header"><h3>Create New Team</h3><button class="modal-close-btn">&times;</button></div>
        <div class="modal-body">
            <div class="form-group"><label>Team Name *</label><input type="text" class="form-input" id="new-team-name" placeholder="e.g. Product Team"></div>
            <div class="form-group"><label>Description</label><input type="text" class="form-input" id="new-team-desc" placeholder="What does this team do?"></div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary modal-cancel-btn">Cancel</button>
            <button class="btn btn-primary" id="create-team-submit">Create Team</button>
        </div>
    `;
  const close = () => root.removeChild(overlay);
  overlay.onclick = (e) => {
    if (e.target === overlay) close();
  };
  modal.querySelector(".modal-close-btn").onclick = close;
  modal.querySelector(".modal-cancel-btn").onclick = close;
  modal.querySelector("#create-team-submit").onclick = () => {
    const name = modal.querySelector("#new-team-name").value.trim();
    if (!name) return;
    const user = getCurrentUser();
    const team = createTeam({
      name,
      description: modal.querySelector("#new-team-desc").value.trim(),
      members: [{ userId: user.id, role: "admin", email: user.email, joinedAt: (/* @__PURE__ */ new Date()).toISOString() }]
    });
    setCurrentTeamId(team.id);
    close();
    onCreated();
  };
  overlay.appendChild(modal);
  root.appendChild(overlay);
}

// src/components/analyticsView.js
function renderAnalyticsView(container2, dateRange, onUpdate, customStart, customEnd) {
  const div = document.createElement("div");
  div.className = "card analytics-section";
  const teamId = getCurrentTeamId();
  const team = getTeamById(teamId);
  const categories = getCategories(teamId);
  const range = dateRange || "week";
  const now = /* @__PURE__ */ new Date();
  let startDate, endDate, rangeLabel;
  if (customStart && customEnd) {
    startDate = customStart;
    endDate = customEnd;
    rangeLabel = `${startDate} \u2014 ${endDate}`;
  } else if (range === "week") {
    const ws = getWeekStart(now);
    const we = getWeekEnd(now);
    startDate = formatDate(ws);
    endDate = formatDate(we);
    rangeLabel = "This Week";
  } else {
    startDate = formatDate(now);
    endDate = formatDate(now);
    rangeLabel = "Today";
  }
  const entries = getTimeEntriesInRange(teamId, startDate, endDate);
  const activities = getActivitiesByTeam(teamId);
  const actMap = {};
  activities.forEach((a) => {
    actMap[a.id] = a;
  });
  const catMinutes = {};
  const catMap = {};
  categories.forEach((c) => {
    catMap[c.id] = c;
    catMinutes[c.id] = 0;
  });
  catMinutes["uncategorized"] = 0;
  entries.forEach((e) => {
    const act = actMap[e.activityId];
    const catId = act?.categoryId || "uncategorized";
    catMinutes[catId] = (catMinutes[catId] || 0) + (e.duration || 0);
  });
  const totalMinutes = Object.values(catMinutes).reduce((a, b) => a + b, 0);
  const memberMinutes = {};
  (team?.members || []).forEach((m) => {
    memberMinutes[m.userId] = 0;
  });
  entries.forEach((e) => {
    memberMinutes[e.userId] = (memberMinutes[e.userId] || 0) + (e.duration || 0);
  });
  const dailyMinutes = {};
  entries.forEach((e) => {
    const d = e.startTime.split("T")[0];
    dailyMinutes[d] = (dailyMinutes[d] || 0) + (e.duration || 0);
  });
  const header = document.createElement("div");
  header.className = "section-header";
  header.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        Activity Analytics \u2014 ${rangeLabel}
    `;
  const toggleDiv = document.createElement("div");
  toggleDiv.className = "range-toggle";
  toggleDiv.innerHTML = `
        <button class="btn btn-sm ${range === "day" ? "btn-primary" : "btn-secondary"}" data-range="day">Daily</button>
        <button class="btn btn-sm ${range === "week" ? "btn-primary" : "btn-secondary"}" data-range="week">Weekly</button>
    `;
  toggleDiv.querySelectorAll("button").forEach((btn) => {
    btn.onclick = () => {
      container2.innerHTML = "";
      renderAnalyticsView(container2, btn.dataset.range, onUpdate);
    };
  });
  header.appendChild(toggleDiv);
  const datePickerDiv = document.createElement("div");
  datePickerDiv.className = "date-range-picker";
  const startInput = document.createElement("input");
  startInput.type = "date";
  startInput.className = "date-input";
  startInput.value = startDate;
  const toLabel = document.createElement("span");
  toLabel.className = "date-range-separator";
  toLabel.textContent = "to";
  const endInput = document.createElement("input");
  endInput.type = "date";
  endInput.className = "date-input";
  endInput.value = endDate;
  const onDateChange = () => {
    if (startInput.value && endInput.value && startInput.value <= endInput.value) {
      container2.innerHTML = "";
      renderAnalyticsView(container2, range, onUpdate, startInput.value, endInput.value);
    }
  };
  startInput.addEventListener("change", onDateChange);
  endInput.addEventListener("change", onDateChange);
  datePickerDiv.appendChild(startInput);
  datePickerDiv.appendChild(toLabel);
  datePickerDiv.appendChild(endInput);
  header.appendChild(datePickerDiv);
  const content = document.createElement("div");
  content.className = "analytics-content";
  const totalH = Math.floor(totalMinutes / 60);
  const totalM = totalMinutes % 60;
  content.innerHTML = `<div class="analytics-total">Total Time: <strong>${totalH}h ${totalM}m</strong></div>`;
  const catSection = document.createElement("div");
  catSection.className = "analytics-chart-section";
  catSection.innerHTML = '<h4 class="chart-title">Time by Category</h4>';
  const sortedCats = Object.entries(catMinutes).filter(([_, min]) => min > 0).sort((a, b) => b[1] - a[1]);
  if (sortedCats.length === 0) {
    catSection.innerHTML += '<div class="empty-state">No data</div>';
  } else {
    const maxCatMin = sortedCats[0][1];
    sortedCats.forEach(([catId, min]) => {
      const cat = catMap[catId] || { name: "Uncategorized", color: "#9CA3AF" };
      const pct = totalMinutes > 0 ? Math.round(min / totalMinutes * 100) : 0;
      const h = Math.floor(min / 60);
      const m = min % 60;
      const row = document.createElement("div");
      row.className = "chart-bar-row";
      row.innerHTML = `
                <span class="chart-bar-label">${escapeHtml(cat.name)}</span>
                <div class="chart-bar-container">
                    <div class="chart-bar" style="width:${min / maxCatMin * 100}%; background:${cat.color}"></div>
                </div>
                <span class="chart-bar-value">${h}h ${m}m (${pct}%)</span>
            `;
      catSection.appendChild(row);
    });
  }
  content.appendChild(catSection);
  const memberSection = document.createElement("div");
  memberSection.className = "analytics-chart-section";
  memberSection.innerHTML = '<h4 class="chart-title">Time by Team Member</h4>';
  const sortedMembers = Object.entries(memberMinutes).sort((a, b) => b[1] - a[1]);
  const maxMemberMin = sortedMembers[0]?.[1] || 1;
  sortedMembers.forEach(([userId, min]) => {
    const u = getUserById(userId);
    if (!u) return;
    const h = Math.floor(min / 60);
    const m = min % 60;
    const row = document.createElement("div");
    row.className = "chart-bar-row";
    row.innerHTML = `
            <span class="chart-bar-label">
                <span class="mini-avatar" style="background:${u.color}">${escapeHtml(u.avatarInitials)}</span>
                ${escapeHtml(u.name.split(" ")[0])}
            </span>
            <div class="chart-bar-container">
                <div class="chart-bar" style="width:${min / maxMemberMin * 100}%; background:${u.color}"></div>
            </div>
            <span class="chart-bar-value">${h}h ${m}m</span>
        `;
    memberSection.appendChild(row);
  });
  content.appendChild(memberSection);
  if (range === "week" && Object.keys(dailyMinutes).length > 0) {
    const dailySection = document.createElement("div");
    dailySection.className = "analytics-chart-section";
    dailySection.innerHTML = '<h4 class="chart-title">Daily Breakdown</h4>';
    const days = [];
    const ws = getWeekStart(now);
    for (let i = 0; i < 7; i++) {
      const dd = new Date(ws);
      dd.setDate(dd.getDate() + i);
      days.push(formatDate(dd));
    }
    const maxDayMin = Math.max(...days.map((d) => dailyMinutes[d] || 0), 1);
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const barChart = document.createElement("div");
    barChart.className = "daily-bar-chart";
    days.forEach((d, i) => {
      const min = dailyMinutes[d] || 0;
      const h = Math.floor(min / 60);
      const m = min % 60;
      const heightPct = min / maxDayMin * 100;
      const col = document.createElement("div");
      col.className = "daily-bar-col";
      col.innerHTML = `
                <span class="daily-bar-value">${min > 0 ? h > 0 ? h + "h" : m + "m" : ""}</span>
                <div class="daily-bar" style="height:${heightPct}%; background: ${d === formatDate(now) ? "var(--primary)" : "#CBD5E1"}"></div>
                <span class="daily-bar-label">${dayNames[i]}</span>
            `;
      barChart.appendChild(col);
    });
    dailySection.appendChild(barChart);
    content.appendChild(dailySection);
  }
  div.appendChild(header);
  div.appendChild(content);
  container2.appendChild(div);
}

// src/components/workloadView.js
function renderWorkloadView(container2, onUpdate, customStart, customEnd) {
  const div = document.createElement("div");
  div.className = "card workload-section";
  const teamId = getCurrentTeamId();
  const team = getTeamById(teamId);
  const now = /* @__PURE__ */ new Date();
  let startDate, endDate, rangeLabel;
  if (customStart && customEnd) {
    startDate = customStart;
    endDate = customEnd;
    rangeLabel = `${startDate} \u2014 ${endDate}`;
  } else {
    startDate = formatDate(getWeekStart(now));
    endDate = formatDate(getWeekEnd(now));
    rangeLabel = "This Week";
  }
  const entries = getTimeEntriesInRange(teamId, startDate, endDate);
  const header = document.createElement("div");
  header.className = "section-header";
  header.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        Workload Distribution \u2014 ${rangeLabel}
    `;
  const datePickerDiv = document.createElement("div");
  datePickerDiv.className = "date-range-picker";
  const startInput = document.createElement("input");
  startInput.type = "date";
  startInput.className = "date-input";
  startInput.value = startDate;
  const toLabel = document.createElement("span");
  toLabel.className = "date-range-separator";
  toLabel.textContent = "to";
  const endInput = document.createElement("input");
  endInput.type = "date";
  endInput.className = "date-input";
  endInput.value = endDate;
  const onDateChange = () => {
    if (startInput.value && endInput.value && startInput.value <= endInput.value) {
      container2.innerHTML = "";
      renderWorkloadView(container2, onUpdate, startInput.value, endInput.value);
    }
  };
  startInput.addEventListener("change", onDateChange);
  endInput.addEventListener("change", onDateChange);
  datePickerDiv.appendChild(startInput);
  datePickerDiv.appendChild(toLabel);
  datePickerDiv.appendChild(endInput);
  header.appendChild(datePickerDiv);
  const content = document.createElement("div");
  content.className = "workload-content";
  if (!team || team.members.length === 0) {
    content.innerHTML = '<div class="empty-state">No team members</div>';
    div.appendChild(header);
    div.appendChild(content);
    container2.appendChild(div);
    return;
  }
  const memberData = team.members.map((m) => {
    const u = getUserById(m.userId);
    const userEntries = entries.filter((e) => e.userId === m.userId);
    const totalMinutes = userEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
    const totalHours = totalMinutes / 60;
    const openActivities = getActivitiesByAssignee(teamId, m.userId).filter((a) => a.status !== "done").length;
    let status = "normal";
    let statusLabel = "Balanced";
    let statusColor = "#10B981";
    if (totalHours >= WORKLOAD_HIGH_THRESHOLD) {
      status = "high";
      statusLabel = "Overloaded";
      statusColor = "#DC2626";
    } else if (totalHours >= WORKLOAD_HIGH_THRESHOLD * 0.75) {
      status = "busy";
      statusLabel = "Busy";
      statusColor = "#F59E0B";
    } else if (totalHours < WORKLOAD_LOW_THRESHOLD && totalMinutes > 0) {
      status = "low";
      statusLabel = "Underutilized";
      statusColor = "#6366F1";
    } else if (totalMinutes === 0) {
      status = "idle";
      statusLabel = "No entries";
      statusColor = "#9CA3AF";
    }
    return { user: u, totalMinutes, totalHours, openActivities, status, statusLabel, statusColor, ...m };
  });
  memberData.sort((a, b) => b.totalMinutes - a.totalMinutes);
  const maxHours = Math.max(...memberData.map((m) => m.totalHours), 1);
  const highLoad = memberData.filter((m) => m.status === "high");
  const lowLoad = memberData.filter((m) => m.status === "low");
  if (highLoad.length > 0 || lowLoad.length > 0) {
    const alertsDiv = document.createElement("div");
    alertsDiv.className = "workload-alerts";
    highLoad.forEach((m) => {
      alertsDiv.innerHTML += `<div class="workload-alert alert-high">\u26A0 ${escapeHtml(m.user?.name || "")} is overloaded (${m.totalHours.toFixed(1)}h this week)</div>`;
    });
    lowLoad.forEach((m) => {
      alertsDiv.innerHTML += `<div class="workload-alert alert-low">\u2139 ${escapeHtml(m.user?.name || "")} has low utilization (${m.totalHours.toFixed(1)}h this week)</div>`;
    });
    content.appendChild(alertsDiv);
  }
  memberData.forEach((m) => {
    if (!m.user) return;
    const h = Math.floor(m.totalMinutes / 60);
    const mins = m.totalMinutes % 60;
    const barPct = m.totalHours / WORKLOAD_HIGH_THRESHOLD * 100;
    const row = document.createElement("div");
    row.className = "workload-row";
    row.innerHTML = `
            <div class="workload-user">
                <span class="workload-avatar" style="background:${m.user.color}">${escapeHtml(m.user.avatarInitials)}</span>
                <div class="workload-user-info">
                    <span class="workload-name">${escapeHtml(m.user.name)}</span>
                    <span class="workload-detail">${m.openActivities} open activities</span>
                </div>
            </div>
            <div class="workload-bar-container">
                <div class="workload-bar" style="width:${Math.min(barPct, 100)}%; background:${m.statusColor}"></div>
            </div>
            <div class="workload-info">
                <span class="workload-hours" style="color:${m.statusColor}">${h}h ${mins}m</span>
                <span class="workload-status-label">${m.statusLabel}</span>
            </div>
        `;
    content.appendChild(row);
  });
  const teamTotal = memberData.reduce((sum, m) => sum + m.totalMinutes, 0);
  const teamAvg = team.members.length > 0 ? teamTotal / team.members.length : 0;
  const avgH = Math.floor(teamAvg / 60);
  const avgM = Math.round(teamAvg % 60);
  const summaryDiv = document.createElement("div");
  summaryDiv.className = "workload-summary";
  summaryDiv.innerHTML = `
        <div class="workload-summary-item">
            <span class="summary-label">Team Total</span>
            <span class="summary-value">${Math.floor(teamTotal / 60)}h ${teamTotal % 60}m</span>
        </div>
        <div class="workload-summary-item">
            <span class="summary-label">Average / Member</span>
            <span class="summary-value">${avgH}h ${avgM}m</span>
        </div>
    `;
  content.appendChild(summaryDiv);
  div.appendChild(header);
  div.appendChild(content);
  container2.appendChild(div);
}

// src/components/productivityDashboard.js
function renderProductivityDashboard(container2) {
  const div = document.createElement("div");
  div.className = "card productivity-section";
  const teamId = getCurrentTeamId();
  const team = getTeamById(teamId);
  const categories = getCategories(teamId);
  const now = /* @__PURE__ */ new Date();
  const startDate = formatDate(getWeekStart(now));
  const endDate = formatDate(getWeekEnd(now));
  const entries = getTimeEntriesInRange(teamId, startDate, endDate);
  const activities = getActivitiesByTeam(teamId);
  const catMap = {};
  categories.forEach((c) => {
    catMap[c.id] = c;
  });
  const actMap = {};
  activities.forEach((a) => {
    actMap[a.id] = a;
  });
  let meetingMinutes = 0;
  let deepWorkMinutes = 0;
  let otherMinutes = 0;
  let totalMinutes = 0;
  entries.forEach((e) => {
    const act = actMap[e.activityId];
    const catId = act?.categoryId || "";
    const cat = catMap[catId];
    const dur = e.duration || 0;
    totalMinutes += dur;
    if (catId === "cat_meeting") {
      meetingMinutes += dur;
    } else if (["cat_development", "cat_design", "cat_research"].includes(catId)) {
      deepWorkMinutes += dur;
    } else {
      otherMinutes += dur;
    }
  });
  const totalActivities = activities.length;
  const doneActivities = activities.filter((a) => a.status === "done").length;
  const completionRate = totalActivities > 0 ? Math.round(doneActivities / totalActivities * 100) : 0;
  const memberData = [];
  (team?.members || []).forEach((m) => {
    const u = getUserById(m.userId);
    if (!u) return;
    let mTotal = 0, mDeep = 0, mMeeting = 0;
    entries.filter((e) => e.userId === m.userId).forEach((e) => {
      const act = actMap[e.activityId];
      const catId = act?.categoryId || "";
      const dur = e.duration || 0;
      mTotal += dur;
      if (catId === "cat_meeting") {
        mMeeting += dur;
      } else if (["cat_development", "cat_design", "cat_research"].includes(catId)) {
        mDeep += dur;
      }
    });
    const memberActivities = activities.filter((a) => a.assigneeId === m.userId);
    const memberDone = memberActivities.filter((a) => a.status === "done").length;
    const memberRate = memberActivities.length > 0 ? Math.round(memberDone / memberActivities.length * 100) : 0;
    memberData.push({
      name: u.name,
      totalHours: (mTotal / 60).toFixed(1),
      deepWorkHours: (mDeep / 60).toFixed(1),
      meetingHours: (mMeeting / 60).toFixed(1),
      completionRate: memberRate
    });
  });
  const header = document.createElement("div");
  header.className = "section-header";
  header.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        Productivity Dashboard \u2014 This Week
    `;
  const exportBtns = document.createElement("div");
  exportBtns.style.cssText = "display:inline-flex;gap:8px;margin-left:auto;";
  const csvBtn = document.createElement("button");
  csvBtn.className = "btn btn-secondary btn-sm";
  csvBtn.textContent = "Export CSV";
  csvBtn.addEventListener("click", () => {
    const rows = [["Member", "Total Hours", "Deep Work Hours", "Meeting Hours", "Completion Rate (%)"]];
    memberData.forEach((m) => {
      rows.push([m.name, m.totalHours, m.deepWorkHours, m.meetingHours, m.completionRate]);
    });
    const csv = rows.map((r) => r.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "productivity_" + startDate + "_" + endDate + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  });
  const printBtn = document.createElement("button");
  printBtn.className = "btn btn-secondary btn-sm";
  printBtn.textContent = "Print";
  printBtn.addEventListener("click", () => {
    window.print();
  });
  exportBtns.appendChild(csvBtn);
  exportBtns.appendChild(printBtn);
  header.appendChild(exportBtns);
  const content = document.createElement("div");
  content.className = "productivity-content";
  const totalH = Math.floor(totalMinutes / 60);
  const totalM = totalMinutes % 60;
  const stats = document.createElement("div");
  stats.className = "dashboard-stats";
  stats.innerHTML = `
        <div class="stat-card">
            <span class="stat-number">${totalH}h ${totalM}m</span>
            <span class="stat-label">Total Hours</span>
        </div>
        <div class="stat-card">
            <span class="stat-number">${completionRate}%</span>
            <span class="stat-label">Completion Rate</span>
        </div>
        <div class="stat-card">
            <span class="stat-number">${team?.members?.length || 0}</span>
            <span class="stat-label">Team Size</span>
        </div>
    `;
  content.appendChild(stats);
  const ratioSection = document.createElement("div");
  ratioSection.className = "ratio-section";
  ratioSection.innerHTML = '<h4 class="chart-title">Deep Work vs Meeting</h4>';
  const deepPct = totalMinutes > 0 ? Math.round(deepWorkMinutes / totalMinutes * 100) : 0;
  const meetPct = totalMinutes > 0 ? Math.round(meetingMinutes / totalMinutes * 100) : 0;
  const otherPct = 100 - deepPct - meetPct;
  const deepH = Math.floor(deepWorkMinutes / 60);
  const meetH = Math.floor(meetingMinutes / 60);
  ratioSection.innerHTML += `
        <div class="ratio-bar">
            <div class="ratio-segment" style="width:${deepPct}%; background:#3B82F6" title="Deep Work ${deepPct}%"></div>
            <div class="ratio-segment" style="width:${meetPct}%; background:#8B5CF6" title="Meeting ${meetPct}%"></div>
            <div class="ratio-segment" style="width:${otherPct}%; background:#CBD5E1" title="Other ${otherPct}%"></div>
        </div>
        <div class="ratio-legend">
            <span><span class="legend-dot" style="background:#3B82F6"></span>Deep Work ${deepPct}% (${deepH}h)</span>
            <span><span class="legend-dot" style="background:#8B5CF6"></span>Meeting ${meetPct}% (${meetH}h)</span>
            <span><span class="legend-dot" style="background:#CBD5E1"></span>Other ${otherPct}%</span>
        </div>
    `;
  content.appendChild(ratioSection);
  const weeklySection = document.createElement("div");
  weeklySection.className = "analytics-chart-section";
  weeklySection.innerHTML = '<h4 class="chart-title">Weekly Productivity</h4>';
  const days = [];
  const ws = getWeekStart(now);
  for (let i = 0; i < 7; i++) {
    const dd = new Date(ws);
    dd.setDate(dd.getDate() + i);
    days.push(formatDate(dd));
  }
  const dailyMinutes = {};
  entries.forEach((e) => {
    const d = e.startTime.split("T")[0];
    dailyMinutes[d] = (dailyMinutes[d] || 0) + (e.duration || 0);
  });
  const maxDayMin = Math.max(...days.map((d) => dailyMinutes[d] || 0), 1);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const barChart = document.createElement("div");
  barChart.className = "daily-bar-chart";
  days.forEach((d, i) => {
    const min = dailyMinutes[d] || 0;
    const h = Math.floor(min / 60);
    const m = min % 60;
    const col = document.createElement("div");
    col.className = "daily-bar-col";
    col.innerHTML = `
            <span class="daily-bar-value">${min > 0 ? h > 0 ? h + "h" : m + "m" : ""}</span>
            <div class="daily-bar" style="height:${min / maxDayMin * 100}%; background: ${d === formatDate(now) ? "var(--primary)" : "#CBD5E1"}"></div>
            <span class="daily-bar-label">${dayNames[i]}</span>
        `;
    barChart.appendChild(col);
  });
  weeklySection.appendChild(barChart);
  content.appendChild(weeklySection);
  const insights = [];
  if (meetPct > 40) insights.push("Meeting time is over 40% \u2014 consider reducing meetings to allow more deep work.");
  if (deepPct > 60) insights.push("Great! Deep work makes up over 60% of total time \u2014 team is focused.");
  if (completionRate < 30) insights.push("Activity completion rate is low \u2014 consider reviewing priorities.");
  if (completionRate > 70) insights.push("Strong completion rate \u2014 team is executing well.");
  if (insights.length > 0) {
    const insightSection = document.createElement("div");
    insightSection.className = "insights-section";
    insightSection.innerHTML = '<h4 class="chart-title">Insights</h4>';
    insights.forEach((text) => {
      insightSection.innerHTML += `<div class="insight-item">\u{1F4A1} ${escapeHtml(text)}</div>`;
    });
    content.appendChild(insightSection);
  }
  const memberSection = document.createElement("div");
  memberSection.className = "analytics-chart-section";
  memberSection.innerHTML = '<h4 class="chart-title">Member Productivity</h4>';
  const memberMinutes = {};
  (team?.members || []).forEach((m) => {
    memberMinutes[m.userId] = 0;
  });
  entries.forEach((e) => {
    memberMinutes[e.userId] = (memberMinutes[e.userId] || 0) + (e.duration || 0);
  });
  const sortedMembers = Object.entries(memberMinutes).sort((a, b) => b[1] - a[1]);
  const maxMemberMin = sortedMembers[0]?.[1] || 1;
  sortedMembers.forEach(([userId, min]) => {
    const u = getUserById(userId);
    if (!u) return;
    const h = Math.floor(min / 60);
    const m = min % 60;
    const row = document.createElement("div");
    row.className = "chart-bar-row";
    row.innerHTML = `
            <span class="chart-bar-label">
                <span class="mini-avatar" style="background:${u.color}">${escapeHtml(u.avatarInitials)}</span>
                ${escapeHtml(u.name.split(" ")[0])}
            </span>
            <div class="chart-bar-container">
                <div class="chart-bar" style="width:${min / maxMemberMin * 100}%; background:${u.color}"></div>
            </div>
            <span class="chart-bar-value">${h}h ${m}m</span>
        `;
    memberSection.appendChild(row);
  });
  content.appendChild(memberSection);
  div.appendChild(header);
  div.appendChild(content);
  container2.appendChild(div);
}

// src/components/dashboardOverview.js
var PRIORITY_ORDER = { high: 0, medium: 1, low: 2, "": 3 };
function getGreeting() {
  const h = (/* @__PURE__ */ new Date()).getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}
function nextStatus(status) {
  if (status === "todo") return "in_progress";
  if (status === "in_progress") return "done";
  return "todo";
}
function renderDashboardOverview(container2, onUpdate) {
  const user = getCurrentUser();
  const teamId = getCurrentTeamId();
  const team = getTeamById(teamId);
  const now = /* @__PURE__ */ new Date();
  const todayStr2 = formatDate(now);
  const activities = getActivitiesByTeam(teamId);
  const timer = getActiveTimer();
  const timeEntries = getTimeEntriesByTeam(teamId);
  const div = document.createElement("div");
  div.className = "dashboard-overview";
  const banner = document.createElement("div");
  banner.className = "dashboard-welcome card";
  banner.innerHTML = `
        <div class="welcome-content">
            <h2 class="welcome-greeting">${getGreeting()}, ${escapeHtml(user?.name?.split(" ")[0] || "there")}</h2>
            <p class="welcome-date">${formatDisplayDate(now)}</p>
        </div>
    `;
  div.appendChild(banner);
  const myTasksToday = activities.filter(
    (a) => a.assigneeId === user?.id && a.dueDate === todayStr2 && a.status !== "done"
  );
  const overdueItems = activities.filter(
    (a) => a.assigneeId === user?.id && a.dueDate && a.dueDate < todayStr2 && a.status !== "done"
  );
  let timerLabel = "No timer";
  if (timer && timer.userId === user?.id) {
    const timerAct = getActivityById(timer.activityId);
    const elapsed = Math.round((now - new Date(timer.startTime)) / 6e4);
    timerLabel = `${escapeHtml(timerAct?.title || "Timer")} \u2014 ${formatDuration(elapsed)}`;
  }
  const memberCount = team?.members?.length || 0;
  const statsRow = document.createElement("div");
  statsRow.className = "dashboard-stats dashboard-stats-4";
  statsRow.innerHTML = `
        <div class="stat-card">
            <span class="stat-number">${myTasksToday.length}</span>
            <span class="stat-label">My Tasks Today</span>
        </div>
        <div class="stat-card">
            <span class="stat-number stat-timer-text">${timerLabel}</span>
            <span class="stat-label">Active Timer</span>
        </div>
        <div class="stat-card">
            <span class="stat-number${overdueItems.length > 0 ? " stat-danger" : ""}">${overdueItems.length}</span>
            <span class="stat-label">Overdue Items</span>
        </div>
        <div class="stat-card">
            <span class="stat-number">${memberCount}</span>
            <span class="stat-label">Team Members</span>
        </div>
    `;
  div.appendChild(statsRow);
  const tasksSection = document.createElement("div");
  tasksSection.className = "card";
  const tasksHeader = document.createElement("div");
  tasksHeader.className = "section-header";
  tasksHeader.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        My Tasks Today
    `;
  tasksSection.appendChild(tasksHeader);
  const tasksContent = document.createElement("div");
  tasksContent.className = "activity-list-content";
  const todayTasks = activities.filter((a) => a.assigneeId === user?.id && a.dueDate === todayStr2).sort((a, b) => (PRIORITY_ORDER[a.priority || ""] ?? 3) - (PRIORITY_ORDER[b.priority || ""] ?? 3));
  if (todayTasks.length === 0) {
    tasksContent.innerHTML = '<div class="empty-state">No tasks due today.</div>';
  } else {
    todayTasks.forEach((act) => {
      const item = document.createElement("div");
      item.className = `activity-item${act.status === "done" ? " completed" : ""}`;
      const statusColor = STATUS_COLORS[act.status] || "#6B7280";
      const statusLabel = STATUS_LABELS[act.status] || act.status;
      const toggleBtn = document.createElement("button");
      toggleBtn.className = "status-pill-btn";
      toggleBtn.style.cssText = `background:${statusColor}20; color:${statusColor};`;
      toggleBtn.textContent = statusLabel;
      toggleBtn.addEventListener("click", () => {
        updateActivity(act.id, { status: nextStatus(act.status) });
        if (onUpdate) onUpdate();
      });
      item.innerHTML = `
                <span class="cat-dot" style="background:${statusColor}"></span>
                <div class="activity-item-info">
                    <span class="activity-item-title">${escapeHtml(act.title)}</span>
                </div>
            `;
      item.querySelector(".activity-item-info").after(toggleBtn);
      tasksContent.appendChild(item);
    });
  }
  tasksSection.appendChild(tasksContent);
  div.appendChild(tasksSection);
  const deadlinesSection = document.createElement("div");
  deadlinesSection.className = "card";
  const deadlinesHeader = document.createElement("div");
  deadlinesHeader.className = "section-header";
  deadlinesHeader.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        Upcoming Deadlines
    `;
  deadlinesSection.appendChild(deadlinesHeader);
  const deadlinesContent = document.createElement("div");
  deadlinesContent.className = "activity-list-content";
  const futureEnd = new Date(now);
  futureEnd.setDate(futureEnd.getDate() + 7);
  const futureEndStr = formatDate(futureEnd);
  const tomorrowStr = formatDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const upcoming = activities.filter((a) => a.dueDate && a.dueDate >= tomorrowStr && a.dueDate <= futureEndStr && a.status !== "done").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const grouped = {};
  upcoming.forEach((a) => {
    if (!grouped[a.dueDate]) grouped[a.dueDate] = [];
    grouped[a.dueDate].push(a);
  });
  if (Object.keys(grouped).length === 0) {
    deadlinesContent.innerHTML = '<div class="empty-state">No upcoming deadlines in the next 7 days.</div>';
  } else {
    Object.keys(grouped).sort().forEach((dateStr) => {
      const dateLabel = document.createElement("div");
      dateLabel.className = "deadline-date-label";
      const d = /* @__PURE__ */ new Date(dateStr + "T00:00:00");
      dateLabel.textContent = formatDisplayDate(d);
      deadlinesContent.appendChild(dateLabel);
      grouped[dateStr].forEach((act) => {
        const assignee = getUserById(act.assigneeId);
        const item = document.createElement("div");
        item.className = "activity-item";
        item.innerHTML = `
                    <span class="cat-dot" style="background:${STATUS_COLORS[act.status] || "#6B7280"}"></span>
                    <div class="activity-item-info">
                        <span class="activity-item-title">${escapeHtml(act.title)}</span>
                    </div>
                    ${assignee ? `<span class="task-assignee-avatar" style="background:${assignee.color}">${escapeHtml(assignee.avatarInitials)}</span>` : ""}
                    <span class="status-pill-btn" style="background:${STATUS_COLORS[act.status]}20; color:${STATUS_COLORS[act.status]}">${STATUS_LABELS[act.status] || act.status}</span>
                `;
        deadlinesContent.appendChild(item);
      });
    });
  }
  deadlinesSection.appendChild(deadlinesContent);
  div.appendChild(deadlinesSection);
  const recentSection = document.createElement("div");
  recentSection.className = "card";
  const recentHeader = document.createElement("div");
  recentHeader.className = "section-header";
  recentHeader.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Recent Activity
    `;
  recentSection.appendChild(recentHeader);
  const recentContent = document.createElement("div");
  recentContent.className = "activity-list-content";
  const recentEntries = [...timeEntries].sort((a, b) => new Date(b.startTime) - new Date(a.startTime)).slice(0, 5);
  if (recentEntries.length === 0) {
    recentContent.innerHTML = '<div class="empty-state">No recent time entries.</div>';
  } else {
    recentEntries.forEach((entry) => {
      const entryUser = getUserById(entry.userId);
      const act = getActivityById(entry.activityId);
      const item = document.createElement("div");
      item.className = "activity-item";
      item.innerHTML = `
                ${entryUser ? `<span class="task-assignee-avatar" style="background:${entryUser.color}">${escapeHtml(entryUser.avatarInitials)}</span>` : ""}
                <div class="activity-item-info">
                    <span class="activity-item-title">${escapeHtml(act?.title || "Unknown")}</span>
                    <div class="activity-item-meta">
                        <span class="task-time-badge">${formatDuration(entry.duration)}</span>
                        <span class="task-time-badge">${relativeTime(entry.startTime)}</span>
                        ${entryUser ? `<span class="task-time-badge">${escapeHtml(entryUser.name)}</span>` : ""}
                    </div>
                </div>
            `;
      recentContent.appendChild(item);
    });
  }
  recentSection.appendChild(recentContent);
  div.appendChild(recentSection);
  container2.appendChild(div);
}

// src/components/themeToggle.js
var THEME_KEY = "pyrio_theme";
function getTheme() {
  return localStorage.getItem(THEME_KEY) || "light";
}
function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.setAttribute("data-theme", theme);
}
function initTheme() {
  const theme = getTheme();
  document.documentElement.setAttribute("data-theme", theme);
}
function renderThemeToggle(container2) {
  const btn = document.createElement("button");
  btn.className = "btn btn-sm btn-secondary theme-toggle-btn";
  btn.style.display = "inline-flex";
  btn.style.alignItems = "center";
  btn.style.justifyContent = "center";
  btn.style.padding = "4px 8px";
  btn.style.cursor = "pointer";
  btn.title = "Toggle dark mode";
  function updateIcon() {
    const isDark = getTheme() === "dark";
    btn.innerHTML = isDark ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
               </svg>` : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
               </svg>`;
  }
  updateIcon();
  btn.addEventListener("click", () => {
    const newTheme = getTheme() === "dark" ? "light" : "dark";
    setTheme(newTheme);
    updateIcon();
  });
  container2.prepend(btn);
}

// src/components/notifications.js
var TYPE_ICONS = {
  assignment: "\u{1F4CB}",
  team_invite: "\u{1F465}",
  deadline: "\u23F0",
  status_change: "\u{1F504}"
};
function renderNotificationBell(headerEl, userId) {
  const wrapper = document.createElement("div");
  wrapper.className = "notification-bell-wrapper";
  wrapper.style.position = "relative";
  wrapper.style.display = "inline-block";
  const bellBtn = document.createElement("button");
  bellBtn.className = "btn btn-sm btn-secondary notification-bell-btn";
  bellBtn.setAttribute("aria-label", "Notifications");
  const unreadCount = getUnreadCount(userId);
  bellBtn.innerHTML = "\u{1F514}";
  if (unreadCount > 0) {
    const badge = document.createElement("span");
    badge.className = "notification-badge";
    badge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
    badge.style.cssText = "position:absolute;top:-4px;right:-4px;background:#EF4444;color:#fff;border-radius:50%;min-width:18px;height:18px;font-size:11px;display:flex;align-items:center;justify-content:center;padding:0 4px;font-weight:600;";
    bellBtn.style.position = "relative";
    bellBtn.appendChild(badge);
  }
  let panelOpen = false;
  bellBtn.onclick = (e) => {
    e.stopPropagation();
    panelOpen = !panelOpen;
    const existing = wrapper.querySelector(".notification-panel");
    if (existing) {
      existing.remove();
      panelOpen = false;
      return;
    }
    const panel = buildPanel(userId, wrapper);
    wrapper.appendChild(panel);
    panelOpen = true;
    const closeHandler = (evt) => {
      if (!wrapper.contains(evt.target)) {
        const p = wrapper.querySelector(".notification-panel");
        if (p) p.remove();
        panelOpen = false;
        document.removeEventListener("click", closeHandler);
      }
    };
    setTimeout(() => document.addEventListener("click", closeHandler), 0);
  };
  wrapper.appendChild(bellBtn);
  headerEl.appendChild(wrapper);
}
function buildPanel(userId, wrapper) {
  const panel = document.createElement("div");
  panel.className = "notification-panel";
  panel.style.cssText = "position:absolute;top:100%;right:0;width:340px;max-height:420px;overflow-y:auto;background:#fff;border:1px solid #E5E7EB;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.12);z-index:1000;margin-top:8px;";
  const panelHeader = document.createElement("div");
  panelHeader.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #E5E7EB;";
  const title = document.createElement("span");
  title.style.cssText = "font-weight:600;font-size:14px;color:#111827;";
  title.textContent = "Notifications";
  const markAllBtn = document.createElement("button");
  markAllBtn.className = "btn btn-sm btn-secondary";
  markAllBtn.textContent = "Mark all read";
  markAllBtn.style.cssText = "font-size:12px;padding:4px 8px;";
  markAllBtn.onclick = (e) => {
    e.stopPropagation();
    markAllNotificationsRead(userId);
    refreshPanel(panel, userId, wrapper);
    refreshBadge(wrapper, userId);
  };
  panelHeader.appendChild(title);
  panelHeader.appendChild(markAllBtn);
  panel.appendChild(panelHeader);
  renderNotificationList(panel, userId, wrapper);
  return panel;
}
function renderNotificationList(panel, userId, wrapper) {
  const existing = panel.querySelector(".notification-list");
  if (existing) existing.remove();
  const list = document.createElement("div");
  list.className = "notification-list";
  const notifications = getNotifications(userId);
  if (notifications.length === 0) {
    const empty = document.createElement("div");
    empty.style.cssText = "padding:24px 16px;text-align:center;color:#9CA3AF;font-size:14px;";
    empty.textContent = "No notifications";
    list.appendChild(empty);
  } else {
    notifications.forEach((notif) => {
      const item = document.createElement("div");
      item.className = "notification-item";
      item.style.cssText = `display:flex;align-items:flex-start;gap:10px;padding:10px 16px;cursor:pointer;border-bottom:1px solid #F3F4F6;transition:background 0.15s;${notif.read ? "opacity:0.6;" : "background:#F0F9FF;"}`;
      item.onmouseenter = () => {
        item.style.background = notif.read ? "#F9FAFB" : "#E0F2FE";
      };
      item.onmouseleave = () => {
        item.style.background = notif.read ? "transparent" : "#F0F9FF";
      };
      const icon = document.createElement("span");
      icon.style.cssText = "font-size:18px;flex-shrink:0;margin-top:2px;";
      icon.textContent = TYPE_ICONS[notif.type] || "\u{1F514}";
      const content = document.createElement("div");
      content.style.cssText = "flex:1;min-width:0;";
      const msg = document.createElement("div");
      msg.style.cssText = `font-size:13px;color:#111827;line-height:1.4;${notif.read ? "" : "font-weight:500;"}`;
      msg.innerHTML = escapeHtml(notif.message);
      const time = document.createElement("div");
      time.style.cssText = "font-size:11px;color:#9CA3AF;margin-top:2px;";
      time.textContent = relativeTime(notif.timestamp);
      content.appendChild(msg);
      content.appendChild(time);
      if (!notif.read) {
        const dot = document.createElement("span");
        dot.style.cssText = "width:8px;height:8px;border-radius:50%;background:#3B82F6;flex-shrink:0;margin-top:6px;";
        item.appendChild(icon);
        item.appendChild(content);
        item.appendChild(dot);
      } else {
        item.appendChild(icon);
        item.appendChild(content);
      }
      item.onclick = (e) => {
        e.stopPropagation();
        if (!notif.read) {
          markNotificationRead(notif.id);
          refreshPanel(panel, userId, wrapper);
          refreshBadge(wrapper, userId);
        }
      };
      list.appendChild(item);
    });
  }
  panel.appendChild(list);
}
function refreshPanel(panel, userId, wrapper) {
  renderNotificationList(panel, userId, wrapper);
}
function refreshBadge(wrapper, userId) {
  const btn = wrapper.querySelector(".notification-bell-btn");
  if (!btn) return;
  const existingBadge = btn.querySelector(".notification-badge");
  if (existingBadge) existingBadge.remove();
  const count = getUnreadCount(userId);
  if (count > 0) {
    const badge = document.createElement("span");
    badge.className = "notification-badge";
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.style.cssText = "position:absolute;top:-4px;right:-4px;background:#EF4444;color:#fff;border-radius:50%;min-width:18px;height:18px;font-size:11px;display:flex;align-items:center;justify-content:center;padding:0 4px;font-weight:600;";
    btn.style.position = "relative";
    btn.appendChild(badge);
  }
}

// src/services/keyboardShortcuts.js
function initKeyboardShortcuts(handlers) {
  document.addEventListener("keydown", (e) => {
    if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
    if (document.querySelector(".modal-overlay")) return;
    switch (e.key) {
      case "n":
        handlers.onNewActivity?.();
        break;
      // N = new activity
      case "t":
        handlers.onStartTimer?.();
        break;
      // T = focus timer
      case "d":
        handlers.onToggleTheme?.();
        break;
      // D = toggle dark mode
      case "1":
        handlers.onNavigate?.("calendar");
        break;
      // 1-5 = tabs
      case "2":
        handlers.onNavigate?.("team");
        break;
      case "3":
        handlers.onNavigate?.("analytics");
        break;
      case "4":
        handlers.onNavigate?.("workload");
        break;
      case "5":
        handlers.onNavigate?.("productivity");
        break;
      case "?":
        showShortcutsHelp();
        break;
    }
  });
}
function showShortcutsHelp() {
  if (document.querySelector(".shortcuts-help-overlay")) return;
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay shortcuts-help-overlay";
  const modal = document.createElement("div");
  modal.className = "modal-content";
  const shortcuts = [
    { key: "N", description: "New Activity" },
    { key: "T", description: "Focus Timer" },
    { key: "D", description: "Toggle Dark Mode" },
    { key: "1", description: "Calendar tab" },
    { key: "2", description: "Team tab" },
    { key: "3", description: "Analytics tab" },
    { key: "4", description: "Workload tab" },
    { key: "5", description: "Productivity tab" },
    { key: "?", description: "Show this help" },
    { key: "Esc", description: "Close this dialog" }
  ];
  const shortcutRows = shortcuts.map(
    (s) => `<tr>
            <td><kbd style="display:inline-block;padding:2px 8px;border:1px solid var(--border);border-radius:4px;
                background:var(--bg-secondary);font-family:monospace;font-size:0.9em;min-width:24px;text-align:center">${s.key}</kbd></td>
            <td style="padding-left:12px">${s.description}</td>
        </tr>`
  ).join("");
  modal.innerHTML = `
        <div class="modal-header">
            <h3>Keyboard Shortcuts</h3>
            <button class="modal-close-btn">&times;</button>
        </div>
        <div class="modal-body">
            <table style="width:100%;border-collapse:collapse">
                <tbody>${shortcutRows}</tbody>
            </table>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary modal-cancel-btn">Close</button>
        </div>
    `;
  overlay.appendChild(modal);
  const root = document.getElementById("modal-root") || document.body;
  root.appendChild(overlay);
  const close = () => {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  };
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  modal.querySelector(".modal-close-btn").addEventListener("click", close);
  modal.querySelector(".modal-cancel-btn").addEventListener("click", close);
  const escHandler = (e) => {
    if (e.key === "Escape") {
      close();
      document.removeEventListener("keydown", escHandler);
    }
  };
  document.addEventListener("keydown", escHandler);
}

// src/components/dataManager.js
function exportData() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith("pyrio_")) {
      try {
        data[key] = JSON.parse(localStorage.getItem(key));
      } catch {
        data[key] = localStorage.getItem(key);
      }
    }
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pyrio-backup-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
function importData(file, onComplete) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      const keys = Object.keys(data).filter((k) => k.startsWith("pyrio_"));
      if (keys.length === 0) throw new Error("Invalid backup file: no pyrio_ keys found");
      keys.forEach((key) => {
        const value = data[key];
        if (typeof value === "string") {
          localStorage.setItem(key, value);
        } else {
          localStorage.setItem(key, JSON.stringify(value));
        }
      });
      onComplete(true);
    } catch (err) {
      onComplete(false, err.message);
    }
  };
  reader.readAsText(file);
}
function showDataManagerModal(onUpdate) {
  const root = document.getElementById("modal-root");
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  const modal = document.createElement("div");
  modal.className = "modal-content data-manager-modal";
  modal.innerHTML = `
        <div class="modal-header">
            <h3>Data Import / Export</h3>
            <button class="modal-close-btn">&times;</button>
        </div>
        <div class="modal-body" style="display:flex;flex-direction:column;gap:1.25rem;">
            <div>
                <p style="margin:0 0 0.5rem;font-weight:600;">Export Backup</p>
                <p style="margin:0 0 0.75rem;font-size:0.85rem;color:var(--text-muted,#666);">
                    Download all your Pyrio data as a JSON file.
                </p>
                <button class="btn btn-primary export-btn" style="width:100%;">Export Backup</button>
            </div>
            <hr style="border:none;border-top:1px solid var(--border-color,#ddd);margin:0;">
            <div>
                <p style="margin:0 0 0.5rem;font-weight:600;">Import Backup</p>
                <p style="margin:0 0 0.5rem;font-size:0.85rem;color:var(--text-muted,#666);">
                    Restore data from a previously exported JSON file.
                </p>
                <p style="margin:0 0 0.75rem;font-size:0.8rem;color:var(--danger-color,#d32f2f);font-weight:500;">
                    Warning: Importing will overwrite your current data.
                </p>
                <label class="btn btn-secondary import-label" style="display:block;text-align:center;cursor:pointer;width:100%;box-sizing:border-box;">
                    Choose File&hellip;
                    <input type="file" accept=".json,application/json" class="import-input" style="display:none;">
                </label>
                <p class="import-status" style="margin:0.5rem 0 0;font-size:0.85rem;min-height:1.25rem;"></p>
            </div>
        </div>
    `;
  const close = () => root.removeChild(overlay);
  overlay.onclick = (e) => {
    if (e.target === overlay) close();
  };
  modal.querySelector(".modal-close-btn").onclick = close;
  modal.querySelector(".export-btn").onclick = () => {
    exportData();
  };
  const fileInput = modal.querySelector(".import-input");
  const statusEl = modal.querySelector(".import-status");
  fileInput.onchange = () => {
    const file = fileInput.files[0];
    if (!file) return;
    statusEl.textContent = "Importing...";
    statusEl.style.color = "var(--text-muted,#666)";
    importData(file, (success, errMsg) => {
      if (success) {
        statusEl.textContent = "Import successful! Reloading...";
        statusEl.style.color = "var(--success-color,#2e7d32)";
        setTimeout(() => {
          close();
          if (onUpdate) onUpdate();
        }, 600);
      } else {
        statusEl.textContent = "Import failed: " + escapeHtml(errMsg || "Unknown error");
        statusEl.style.color = "var(--danger-color,#d32f2f)";
      }
      fileInput.value = "";
    });
  };
  overlay.appendChild(modal);
  root.appendChild(overlay);
}

// src/services/recurrenceService.js
function generateNextOccurrence(activity) {
  if (!activity.recurring || !activity.recurrenceRule) return null;
  const rule = activity.recurrenceRule;
  const currentDate2 = new Date(activity.dueDate);
  let nextDate = new Date(currentDate2);
  switch (rule.frequency) {
    case "daily":
      nextDate.setDate(nextDate.getDate() + (rule.interval || 1));
      break;
    case "weekly":
      nextDate.setDate(nextDate.getDate() + 7 * (rule.interval || 1));
      break;
    case "monthly":
      nextDate.setMonth(nextDate.getMonth() + (rule.interval || 1));
      break;
  }
  if (rule.endDate && nextDate > new Date(rule.endDate)) return null;
  return addActivity({
    ...activity,
    id: void 0,
    // let addActivity generate new id
    dueDate: formatDate(nextDate),
    status: "todo",
    recurrenceParentId: activity.id,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  });
}
function processRecurringActivities(teamId) {
  const activities = getActivitiesByTeam(teamId);
  activities.forEach((act) => {
    if (!act.recurring || act.status !== "done") return;
    const hasNext = activities.some((a) => a.recurrenceParentId === act.id && a.status !== "done");
    if (!hasNext) generateNextOccurrence(act);
  });
}

// src/main.js
var currentDate = /* @__PURE__ */ new Date();
var selectedDate = /* @__PURE__ */ new Date();
var activeTab = "dashboard";
function init() {
  seedIfNeeded();
  const initTeamId = getCurrentTeamId();
  if (initTeamId) processRecurringActivities(initTeamId);
  initTheme();
  initKeyboardShortcuts({
    onNewActivity: () => {
      if (!getCurrentUser() || !getCurrentTeamId()) return;
      openActivityModal(null, { onSave: () => renderApp() });
    },
    onStartTimer: () => {
      if (!getCurrentUser()) return;
      activeTab = "calendar";
      renderApp();
      const timerWidget = document.querySelector(".timer-widget");
      if (timerWidget) timerWidget.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    onToggleTheme: () => {
      const newTheme = getTheme() === "dark" ? "light" : "dark";
      setTheme(newTheme);
      renderApp();
    },
    onNavigate: (tab) => {
      if (!getCurrentUser()) return;
      activeTab = tab;
      renderApp();
    }
  });
  renderApp();
}
function renderApp() {
  const app = document.getElementById("app");
  app.innerHTML = "";
  app.className = "";
  const user = getCurrentUser();
  if (!user) {
    renderLoginScreen(app, () => {
      const teams = getTeamsForUser(user?.id || getCurrentUser()?.id);
      if (teams.length > 0 && !getCurrentTeamId()) setCurrentTeamId(teams[0].id);
      renderApp();
    });
    return;
  }
  if (!getCurrentTeamId()) {
    const teams = getTeamsForUser(user.id);
    if (teams.length > 0) setCurrentTeamId(teams[0].id);
  }
  app.className = "app-layout";
  const header = document.createElement("header");
  header.className = "app-header";
  const headerLeft = document.createElement("div");
  headerLeft.className = "header-left";
  headerLeft.innerHTML = `<h1 class="app-logo">Pyrio</h1>`;
  renderTeamSelector(headerLeft, () => renderApp());
  const createTeamBtn = document.createElement("button");
  createTeamBtn.className = "btn btn-sm btn-secondary";
  createTeamBtn.textContent = "+ Team";
  createTeamBtn.onclick = () => showCreateTeamModal(() => renderApp());
  headerLeft.appendChild(createTeamBtn);
  const nav = document.createElement("nav");
  nav.className = "app-nav";
  const tabs = [
    { id: "dashboard", label: "Dashboard" },
    { id: "calendar", label: "Calendar" },
    { id: "team", label: "Team" },
    { id: "analytics", label: "Analytics" },
    { id: "workload", label: "Workload" },
    { id: "productivity", label: "Productivity" }
  ];
  tabs.forEach((t) => {
    const btn = document.createElement("button");
    btn.className = `nav-tab ${activeTab === t.id ? "active" : ""}`;
    btn.textContent = t.label;
    btn.onclick = () => {
      activeTab = t.id;
      renderApp();
    };
    nav.appendChild(btn);
  });
  headerLeft.appendChild(nav);
  const headerRight = document.createElement("div");
  headerRight.className = "header-right";
  headerRight.innerHTML = `
        <div class="header-user">
            <span class="header-avatar" style="background-color:${user.color}">${escapeHtml(user.avatarInitials)}</span>
            <span class="header-username">${escapeHtml(user.name)}</span>
        </div>
    `;
  renderNotificationBell(headerRight, user.id);
  renderThemeToggle(headerRight);
  const dataBtn = document.createElement("button");
  dataBtn.className = "btn btn-sm btn-secondary data-manager-btn";
  dataBtn.style.display = "inline-flex";
  dataBtn.style.alignItems = "center";
  dataBtn.style.justifyContent = "center";
  dataBtn.style.padding = "4px 8px";
  dataBtn.style.cursor = "pointer";
  dataBtn.title = "Import / Export data";
  dataBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>`;
  dataBtn.onclick = () => showDataManagerModal(() => renderApp());
  headerRight.appendChild(dataBtn);
  const logoutBtn = document.createElement("button");
  logoutBtn.className = "btn btn-sm btn-secondary logout-btn";
  logoutBtn.textContent = "Logout";
  logoutBtn.onclick = () => {
    logout();
    renderApp();
  };
  headerRight.appendChild(logoutBtn);
  header.appendChild(headerLeft);
  header.appendChild(headerRight);
  app.appendChild(header);
  const main = document.createElement("main");
  main.className = "app-main";
  const teamId = getCurrentTeamId();
  if (!teamId) {
    main.innerHTML = '<div class="empty-state" style="padding:4rem">No team selected. Create or join a team to get started.</div>';
    app.appendChild(main);
    return;
  }
  switch (activeTab) {
    case "dashboard":
      renderDashboardOverview(main, () => renderApp());
      break;
    case "calendar":
      renderCalendarView(main);
      break;
    case "team":
      renderTeamView(main);
      break;
    case "analytics":
      renderAnalyticsPage(main);
      break;
    case "workload":
      renderWorkloadPage(main);
      break;
    case "productivity":
      renderProductivityPage(main);
      break;
  }
  app.appendChild(main);
}
function renderCalendarView(main) {
  const grid = document.createElement("div");
  grid.className = "main-grid";
  const leftCol = document.createElement("div");
  leftCol.className = "grid-left";
  const rightCol = document.createElement("div");
  rightCol.className = "grid-right";
  renderCalendar(leftCol, currentDate, selectedDate, (date, isNav) => {
    if (!isNav) selectedDate = date;
    renderApp();
  });
  renderTimerWidget(rightCol, () => renderApp());
  renderActivityList(rightCol, selectedDate, "daily", () => renderApp());
  renderTimeline(rightCol, selectedDate, "personal", () => renderApp());
  grid.appendChild(leftCol);
  grid.appendChild(rightCol);
  main.appendChild(grid);
}
function renderTeamView(main) {
  const grid = document.createElement("div");
  grid.className = "main-grid";
  const leftCol = document.createElement("div");
  leftCol.className = "grid-left";
  const rightCol = document.createElement("div");
  rightCol.className = "grid-right";
  renderTeamManager(leftCol, () => renderApp());
  renderActivityList(rightCol, selectedDate, "team", () => renderApp());
  renderTimeline(rightCol, selectedDate, "team", () => renderApp());
  grid.appendChild(leftCol);
  grid.appendChild(rightCol);
  main.appendChild(grid);
}
function renderAnalyticsPage(main) {
  renderAnalyticsView(main, "week", () => renderApp());
}
function renderWorkloadPage(main) {
  renderWorkloadView(main, () => renderApp());
}
function renderProductivityPage(main) {
  renderProductivityDashboard(main);
}
document.addEventListener("DOMContentLoaded", init);
