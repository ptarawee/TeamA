import { getActivitiesByDate, getUserById, getCategories, getCurrentTeamId } from '../data/store.js';
import { monthNames, weekdays, formatDate, getWeekStart } from '../utils/date.js';
import { escapeHtml } from '../utils/sanitize.js';

let calendarViewMode = 'month'; // 'month' | 'week'

export function renderCalendar(container, currentDate, selectedDate, onDateSelect) {
    const teamId = getCurrentTeamId();
    const categories = getCategories(teamId);
    const catMap = {};
    categories.forEach(c => { catMap[c.id] = c; });

    const calendarDiv = document.createElement('div');
    calendarDiv.className = 'card calendar-section';

    // Header
    const headerDiv = document.createElement('div');
    headerDiv.className = 'calendar-header';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'nav-btn';
    prevBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>';
    prevBtn.onclick = () => {
        if (calendarViewMode === 'month') {
            currentDate.setMonth(currentDate.getMonth() - 1);
        } else {
            currentDate.setDate(currentDate.getDate() - 7);
        }
        onDateSelect(selectedDate, true);
    };

    const nextBtn = document.createElement('button');
    nextBtn.className = 'nav-btn';
    nextBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>';
    nextBtn.onclick = () => {
        if (calendarViewMode === 'month') {
            currentDate.setMonth(currentDate.getMonth() + 1);
        } else {
            currentDate.setDate(currentDate.getDate() + 7);
        }
        onDateSelect(selectedDate, true);
    };

    const titleDiv = document.createElement('h2');
    if (calendarViewMode === 'month') {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        titleDiv.textContent = `${monthNames[month]} ${year}`;
    } else {
        const weekStart = getWeekStart(currentDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const startLabel = `${monthNames[weekStart.getMonth()]} ${weekStart.getDate()}`;
        const endLabel = weekEnd.getMonth() !== weekStart.getMonth()
            ? `${monthNames[weekEnd.getMonth()]} ${weekEnd.getDate()}`
            : `${weekEnd.getDate()}`;
        titleDiv.textContent = `${startLabel} - ${endLabel}, ${weekEnd.getFullYear()}`;
    }

    headerDiv.appendChild(prevBtn);
    headerDiv.appendChild(titleDiv);

    // View toggle
    const toggleDiv = document.createElement('div');
    toggleDiv.className = 'calendar-view-toggle';

    const monthBtn = document.createElement('button');
    monthBtn.className = `view-toggle-btn ${calendarViewMode === 'month' ? 'active' : ''}`;
    monthBtn.textContent = 'Month';
    monthBtn.onclick = () => {
        calendarViewMode = 'month';
        onDateSelect(selectedDate, true);
    };

    const weekBtn = document.createElement('button');
    weekBtn.className = `view-toggle-btn ${calendarViewMode === 'week' ? 'active' : ''}`;
    weekBtn.textContent = 'Week';
    weekBtn.onclick = () => {
        calendarViewMode = 'week';
        onDateSelect(selectedDate, true);
    };

    toggleDiv.appendChild(monthBtn);
    toggleDiv.appendChild(weekBtn);
    headerDiv.appendChild(toggleDiv);

    headerDiv.appendChild(nextBtn);

    // Body
    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'calendar-body';

    if (calendarViewMode === 'month') {
        renderMonthView(bodyDiv, currentDate, selectedDate, onDateSelect, teamId, catMap);
    } else {
        renderWeekView(bodyDiv, currentDate, selectedDate, onDateSelect, teamId, catMap);
    }

    calendarDiv.appendChild(headerDiv);
    calendarDiv.appendChild(bodyDiv);
    container.appendChild(calendarDiv);
}

function renderActivityPill(act, catMap) {
    const pill = document.createElement('div');
    pill.className = `day-task-pill ${act.status === 'done' ? 'completed' : ''}`;

    const cat = catMap[act.categoryId];
    const assignee = getUserById(act.assigneeId);
    if (cat) {
        pill.style.backgroundColor = cat.color + '20';
        pill.style.color = cat.color;
        pill.style.borderLeft = `3px solid ${cat.color}`;
    } else if (assignee) {
        pill.style.backgroundColor = assignee.color + '20';
        pill.style.color = assignee.color;
        pill.style.borderLeft = `3px solid ${assignee.color}`;
    }

    pill.textContent = act.title;
    return pill;
}

function renderMonthView(bodyDiv, currentDate, selectedDate, onDateSelect, teamId, catMap) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const weekdaysDiv = document.createElement('div');
    weekdaysDiv.className = 'weekdays';
    weekdays.forEach(day => {
        const span = document.createElement('span');
        span.textContent = day;
        weekdaysDiv.appendChild(span);
    });
    bodyDiv.appendChild(weekdaysDiv);

    const daysDiv = document.createElement('div');
    daysDiv.className = 'days';

    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const prevLastDay = new Date(year, month, 0).getDate();
    const today = new Date();

    for (let x = firstDayIndex; x > 0; x--) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'day other-month empty';
        dayDiv.textContent = prevLastDay - x + 1;
        daysDiv.appendChild(dayDiv);
    }

    for (let i = 1; i <= lastDay; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'day';

        const dayNumber = document.createElement('span');
        dayNumber.className = 'day-number';
        dayNumber.textContent = i;
        dayDiv.appendChild(dayNumber);

        if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayDiv.classList.add('today');
        }
        if (i === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear()) {
            dayDiv.classList.add('selected');
        }

        const iterDateStr = formatDate(new Date(year, month, i));
        const dayActivities = getActivitiesByDate(teamId, iterDateStr);

        if (dayActivities.length > 0) {
            const taskContainer = document.createElement('div');
            taskContainer.className = 'day-task-container';

            const displayLimit = 3;
            for (let t = 0; t < Math.min(dayActivities.length, displayLimit); t++) {
                taskContainer.appendChild(renderActivityPill(dayActivities[t], catMap));
            }

            if (dayActivities.length > displayLimit) {
                const morePill = document.createElement('div');
                morePill.className = 'day-task-pill more';
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
        const dayDiv = document.createElement('div');
        dayDiv.className = 'day other-month empty';
        dayDiv.textContent = j;
        daysDiv.appendChild(dayDiv);
    }

    bodyDiv.appendChild(daysDiv);
}

function renderWeekView(bodyDiv, currentDate, selectedDate, onDateSelect, teamId, catMap) {
    const weekStart = getWeekStart(currentDate);
    const today = new Date();

    // Column headers with day name + date number
    const weekHeaderDiv = document.createElement('div');
    weekHeaderDiv.className = 'week-view-header';

    const weekDaysDiv = document.createElement('div');
    weekDaysDiv.className = 'week-view-days';

    for (let i = 0; i < 7; i++) {
        const dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() + i);

        const dayYear = dayDate.getFullYear();
        const dayMonth = dayDate.getMonth();
        const dayNum = dayDate.getDate();

        // Header column
        const colHeader = document.createElement('div');
        colHeader.className = 'week-col-header';
        const isToday = dayNum === today.getDate() && dayMonth === today.getMonth() && dayYear === today.getFullYear();
        const isSelected = dayNum === selectedDate.getDate() && dayMonth === selectedDate.getMonth() && dayYear === selectedDate.getFullYear();
        if (isToday) colHeader.classList.add('today');
        if (isSelected) colHeader.classList.add('selected');

        const dayLabel = document.createElement('span');
        dayLabel.className = 'week-col-day-name';
        dayLabel.textContent = weekdays[i];

        const dateLabel = document.createElement('span');
        dateLabel.className = 'week-col-date-num';
        dateLabel.textContent = dayNum;

        colHeader.appendChild(dayLabel);
        colHeader.appendChild(dateLabel);
        weekHeaderDiv.appendChild(colHeader);

        // Day column body
        const colBody = document.createElement('div');
        colBody.className = 'week-col-body';
        if (isToday) colBody.classList.add('today');
        if (isSelected) colBody.classList.add('selected');

        const dateStr = formatDate(dayDate);
        const dayActivities = getActivitiesByDate(teamId, dateStr);

        dayActivities.forEach(act => {
            colBody.appendChild(renderActivityPill(act, catMap));
        });

        if (dayActivities.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'week-col-empty';
            emptyMsg.textContent = 'No activities';
            colBody.appendChild(emptyMsg);
        }

        colBody.onclick = () => onDateSelect(new Date(dayYear, dayMonth, dayNum));
        weekDaysDiv.appendChild(colBody);
    }

    bodyDiv.appendChild(weekHeaderDiv);
    bodyDiv.appendChild(weekDaysDiv);
}
