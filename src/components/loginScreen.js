import { getUsers } from '../data/store.js';
import { setCurrentUser } from '../auth/auth.js';
import { escapeHtml } from '../utils/sanitize.js';

export function renderLoginScreen(container, onLogin) {
    const users = getUsers();
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'login-screen';

    const card = document.createElement('div');
    card.className = 'login-card';

    card.innerHTML = `
        <div class="login-header">
            <h1 class="login-title">Pyrio</h1>
            <p class="login-subtitle">Team Activity & Time Tracking</p>
        </div>
        <p class="login-prompt">Select your profile to continue</p>
        <div class="login-users"></div>
    `;

    const usersDiv = card.querySelector('.login-users');
    users.forEach(user => {
        const btn = document.createElement('button');
        btn.className = 'login-user-btn';
        btn.innerHTML = `
            <div class="login-avatar" style="background-color: ${escapeHtml(user.color)}">${escapeHtml(user.avatarInitials)}</div>
            <div class="login-user-info">
                <span class="login-user-name">${escapeHtml(user.name)}</span>
                <span class="login-user-role">${escapeHtml(user.email)}</span>
            </div>
        `;
        btn.onclick = () => { setCurrentUser(user.id); onLogin(); };
        usersDiv.appendChild(btn);
    });

    wrapper.appendChild(card);
    container.appendChild(wrapper);
}
