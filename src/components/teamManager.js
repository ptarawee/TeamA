import { getTeamById, updateTeam, getTeamsForUser, createTeam, addMemberToTeam,
    removeMemberFromTeam, updateMemberRole, getUserById, getUsers, createInvite,
    getInvitesForUser, acceptInvite, declineInvite, getCurrentTeamId, setCurrentTeamId } from '../data/store.js';
import { getCurrentUser, isTeamAdmin } from '../auth/auth.js';
import { escapeHtml } from '../utils/sanitize.js';
import { generateId } from '../utils/id.js';
import { showConfirmModal } from './confirmModal.js';
import { showToast } from './toast.js';
import { notifyTeamInvite } from '../services/notificationService.js';

export function renderTeamManager(container, onUpdate) {
    const user = getCurrentUser();
    if (!user) return;

    const teamId = getCurrentTeamId();
    const team = getTeamById(teamId);
    const isAdmin = isTeamAdmin(teamId);

    const div = document.createElement('div');
    div.className = 'card team-manager-section';

    const header = document.createElement('div');
    header.className = 'section-header';
    header.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        Team Management
    `;

    const content = document.createElement('div');
    content.className = 'team-content';

    if (!team) {
        content.innerHTML = '<div class="empty-state">No team selected</div>';
        div.appendChild(header);
        div.appendChild(content);
        container.appendChild(div);
        return;
    }

    // Team info (editable by admin)
    const infoSection = document.createElement('div');
    infoSection.className = 'team-info-section';

    if (isAdmin) {
        infoSection.innerHTML = `
            <div class="form-group">
                <label>Team Name</label>
                <input type="text" class="form-input" id="team-name-input" value="${escapeHtml(team.name)}">
            </div>
            <div class="form-group">
                <label>Description</label>
                <input type="text" class="form-input" id="team-desc-input" value="${escapeHtml(team.description || '')}">
            </div>
            <button class="btn btn-sm btn-primary" id="save-team-btn">Save Changes</button>
        `;
    } else {
        infoSection.innerHTML = `
            <h3 class="team-name">${escapeHtml(team.name)}</h3>
            <p class="team-desc">${escapeHtml(team.description || '')}</p>
        `;
    }
    content.appendChild(infoSection);

    // Save team info
    if (isAdmin) {
        setTimeout(() => {
            const saveBtn = div.querySelector('#save-team-btn');
            if (saveBtn) {
                saveBtn.onclick = () => {
                    const name = div.querySelector('#team-name-input').value.trim();
                    const description = div.querySelector('#team-desc-input').value.trim();
                    if (name) {
                        updateTeam(teamId, { name, description });
                        onUpdate();
                    }
                };
            }
        }, 0);
    }

    // Invite section (admin only)
    if (isAdmin) {
        const inviteSection = document.createElement('div');
        inviteSection.className = 'invite-section';
        inviteSection.innerHTML = `
            <h4 class="subsection-title">Invite Member</h4>
            <div class="invite-row">
                <input type="email" class="form-input" id="invite-email" placeholder="Enter email address">
                <button class="btn btn-sm btn-primary" id="invite-btn">Invite</button>
            </div>
        `;
        content.appendChild(inviteSection);

        setTimeout(() => {
            const inviteBtn = div.querySelector('#invite-btn');
            if (inviteBtn) {
                inviteBtn.onclick = () => {
                    const emailInput = div.querySelector('#invite-email');
                    const email = emailInput.value.trim();
                    if (!email) return;

                    // Check if user exists in system
                    const existingUser = getUsers().find(u => u.email === email);
                    if (existingUser) {
                        // Directly add to team
                        addMemberToTeam(teamId, existingUser.id, 'member', email);
                        notifyTeamInvite(team.name, existingUser.id);
                    } else {
                        // Create invite
                        createInvite(teamId, email, user.id);
                    }
                    emailInput.value = '';
                    showToast('Invitation sent', 'success');
                    onUpdate();
                };
            }
        }, 0);
    }

    // Pending invites for current user
    const pendingInvites = getInvitesForUser(user.email);
    if (pendingInvites.length > 0) {
        const invitesDiv = document.createElement('div');
        invitesDiv.className = 'pending-invites';
        invitesDiv.innerHTML = `<h4 class="subsection-title">Pending Invitations</h4>`;
        pendingInvites.forEach(inv => {
            const invTeam = getTeamById(inv.teamId);
            const row = document.createElement('div');
            row.className = 'invite-item';
            row.innerHTML = `
                <span>${escapeHtml(invTeam?.name || 'Unknown Team')}</span>
                <div class="invite-actions">
                    <button class="btn btn-sm btn-primary accept-inv">Accept</button>
                    <button class="btn btn-sm btn-secondary decline-inv">Decline</button>
                </div>
            `;
            row.querySelector('.accept-inv').onclick = () => { acceptInvite(inv.id, user.id); onUpdate(); };
            row.querySelector('.decline-inv').onclick = () => { declineInvite(inv.id); onUpdate(); };
            invitesDiv.appendChild(row);
        });
        content.appendChild(invitesDiv);
    }

    // Members list
    const membersSection = document.createElement('div');
    membersSection.className = 'members-section';
    membersSection.innerHTML = `<h4 class="subsection-title">Members (${team.members.length})</h4>`;

    const membersList = document.createElement('div');
    membersList.className = 'members-list';

    team.members.forEach(member => {
        const memberUser = getUserById(member.userId);
        if (!memberUser) return;

        const row = document.createElement('div');
        row.className = 'member-row';

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

        // Admin controls
        if (isAdmin && member.userId !== user.id) {
            const actions = row.querySelector('.member-actions');

            const roleBtn = document.createElement('button');
            roleBtn.className = 'btn btn-sm btn-secondary';
            roleBtn.textContent = member.role === 'admin' ? 'Set Member' : 'Set Admin';
            roleBtn.onclick = () => {
                updateMemberRole(teamId, member.userId, member.role === 'admin' ? 'member' : 'admin');
                onUpdate();
            };
            actions.insertBefore(roleBtn, actions.firstChild);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'btn btn-sm btn-danger';
            removeBtn.textContent = 'Remove';
            removeBtn.onclick = () => {
                showConfirmModal(
                    'Remove Member',
                    `Remove ${memberUser.name} from team?`,
                    () => {
                        removeMemberFromTeam(teamId, member.userId);
                        showToast('Member removed', 'success');
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
    container.appendChild(div);
}

// Team selector dropdown for header
export function renderTeamSelector(headerEl, onTeamChange) {
    const user = getCurrentUser();
    if (!user) return;

    const teams = getTeamsForUser(user.id);
    const currentTeamId = getCurrentTeamId();

    const selector = document.createElement('select');
    selector.className = 'team-selector';

    if (teams.length === 0) {
        selector.innerHTML = '<option value="">No teams</option>';
    } else {
        teams.forEach(t => {
            const opt = document.createElement('option');
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

    // Auto-select first team if none selected
    if (!currentTeamId && teams.length > 0) {
        setCurrentTeamId(teams[0].id);
    }

    headerEl.appendChild(selector);
}

// Create team modal
export function showCreateTeamModal(onCreated) {
    const root = document.getElementById('modal-root');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal-content';
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
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
    modal.querySelector('.modal-close-btn').onclick = close;
    modal.querySelector('.modal-cancel-btn').onclick = close;

    modal.querySelector('#create-team-submit').onclick = () => {
        const name = modal.querySelector('#new-team-name').value.trim();
        if (!name) return;
        const user = getCurrentUser();
        const team = createTeam({
            name,
            description: modal.querySelector('#new-team-desc').value.trim(),
            members: [{ userId: user.id, role: 'admin', email: user.email, joinedAt: new Date().toISOString() }],
        });
        setCurrentTeamId(team.id);
        close();
        onCreated();
    };

    overlay.appendChild(modal);
    root.appendChild(overlay);
}
