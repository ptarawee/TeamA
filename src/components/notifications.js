import { getNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead } from '../data/store.js';
import { escapeHtml } from '../utils/sanitize.js';
import { relativeTime } from '../utils/date.js';

const TYPE_ICONS = {
    assignment: '\u{1F4CB}',
    team_invite: '\u{1F465}',
    deadline: '\u{23F0}',
    status_change: '\u{1F504}',
};

export function renderNotificationBell(headerEl, userId) {
    const wrapper = document.createElement('div');
    wrapper.className = 'notification-bell-wrapper';
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';

    const bellBtn = document.createElement('button');
    bellBtn.className = 'btn btn-sm btn-secondary notification-bell-btn';
    bellBtn.setAttribute('aria-label', 'Notifications');

    const unreadCount = getUnreadCount(userId);

    bellBtn.innerHTML = '\u{1F514}';
    if (unreadCount > 0) {
        const badge = document.createElement('span');
        badge.className = 'notification-badge';
        badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
        badge.style.cssText = 'position:absolute;top:-4px;right:-4px;background:#EF4444;color:#fff;border-radius:50%;min-width:18px;height:18px;font-size:11px;display:flex;align-items:center;justify-content:center;padding:0 4px;font-weight:600;';
        bellBtn.style.position = 'relative';
        bellBtn.appendChild(badge);
    }

    let panelOpen = false;

    bellBtn.onclick = (e) => {
        e.stopPropagation();
        panelOpen = !panelOpen;
        const existing = wrapper.querySelector('.notification-panel');
        if (existing) {
            existing.remove();
            panelOpen = false;
            return;
        }
        const panel = buildPanel(userId, wrapper);
        wrapper.appendChild(panel);
        panelOpen = true;

        // Close panel when clicking outside
        const closeHandler = (evt) => {
            if (!wrapper.contains(evt.target)) {
                const p = wrapper.querySelector('.notification-panel');
                if (p) p.remove();
                panelOpen = false;
                document.removeEventListener('click', closeHandler);
            }
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 0);
    };

    wrapper.appendChild(bellBtn);
    headerEl.appendChild(wrapper);
}

function buildPanel(userId, wrapper) {
    const panel = document.createElement('div');
    panel.className = 'notification-panel';
    panel.style.cssText = 'position:absolute;top:100%;right:0;width:340px;max-height:420px;overflow-y:auto;background:#fff;border:1px solid #E5E7EB;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.12);z-index:1000;margin-top:8px;';

    // Header
    const panelHeader = document.createElement('div');
    panelHeader.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #E5E7EB;';

    const title = document.createElement('span');
    title.style.cssText = 'font-weight:600;font-size:14px;color:#111827;';
    title.textContent = 'Notifications';

    const markAllBtn = document.createElement('button');
    markAllBtn.className = 'btn btn-sm btn-secondary';
    markAllBtn.textContent = 'Mark all read';
    markAllBtn.style.cssText = 'font-size:12px;padding:4px 8px;';
    markAllBtn.onclick = (e) => {
        e.stopPropagation();
        markAllNotificationsRead(userId);
        refreshPanel(panel, userId, wrapper);
        refreshBadge(wrapper, userId);
    };

    panelHeader.appendChild(title);
    panelHeader.appendChild(markAllBtn);
    panel.appendChild(panelHeader);

    // Notification list
    renderNotificationList(panel, userId, wrapper);

    return panel;
}

function renderNotificationList(panel, userId, wrapper) {
    const existing = panel.querySelector('.notification-list');
    if (existing) existing.remove();

    const list = document.createElement('div');
    list.className = 'notification-list';

    const notifications = getNotifications(userId);

    if (notifications.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'padding:24px 16px;text-align:center;color:#9CA3AF;font-size:14px;';
        empty.textContent = 'No notifications';
        list.appendChild(empty);
    } else {
        notifications.forEach(notif => {
            const item = document.createElement('div');
            item.className = 'notification-item';
            item.style.cssText = `display:flex;align-items:flex-start;gap:10px;padding:10px 16px;cursor:pointer;border-bottom:1px solid #F3F4F6;transition:background 0.15s;${notif.read ? 'opacity:0.6;' : 'background:#F0F9FF;'}`;

            item.onmouseenter = () => { item.style.background = notif.read ? '#F9FAFB' : '#E0F2FE'; };
            item.onmouseleave = () => { item.style.background = notif.read ? 'transparent' : '#F0F9FF'; };

            const icon = document.createElement('span');
            icon.style.cssText = 'font-size:18px;flex-shrink:0;margin-top:2px;';
            icon.textContent = TYPE_ICONS[notif.type] || '\u{1F514}';

            const content = document.createElement('div');
            content.style.cssText = 'flex:1;min-width:0;';

            const msg = document.createElement('div');
            msg.style.cssText = `font-size:13px;color:#111827;line-height:1.4;${notif.read ? '' : 'font-weight:500;'}`;
            msg.innerHTML = escapeHtml(notif.message);

            const time = document.createElement('div');
            time.style.cssText = 'font-size:11px;color:#9CA3AF;margin-top:2px;';
            time.textContent = relativeTime(notif.timestamp);

            content.appendChild(msg);
            content.appendChild(time);

            if (!notif.read) {
                const dot = document.createElement('span');
                dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:#3B82F6;flex-shrink:0;margin-top:6px;';
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
    const btn = wrapper.querySelector('.notification-bell-btn');
    if (!btn) return;
    const existingBadge = btn.querySelector('.notification-badge');
    if (existingBadge) existingBadge.remove();

    const count = getUnreadCount(userId);
    if (count > 0) {
        const badge = document.createElement('span');
        badge.className = 'notification-badge';
        badge.textContent = count > 99 ? '99+' : String(count);
        badge.style.cssText = 'position:absolute;top:-4px;right:-4px;background:#EF4444;color:#fff;border-radius:50%;min-width:18px;height:18px;font-size:11px;display:flex;align-items:center;justify-content:center;padding:0 4px;font-weight:600;';
        btn.style.position = 'relative';
        btn.appendChild(badge);
    }
}
