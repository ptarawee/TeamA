import { GoogleGenerativeAI } from "@google/generative-ai";

const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

let currentDate = new Date();
let selectedDate = new Date();

function renderDashboard() {
    const app = document.getElementById('app');
    app.innerHTML = ''; // Clear previous content

    renderCalendar(app);
    renderTaskList(app);
    renderChatBox(app);
}

// Simple Task Database using localStorage
const TaskDB = {
    getTasks: function(dateStr) {
        const data = localStorage.getItem('pyrio_tasks');
        const tasks = data ? JSON.parse(data) : {};
        return tasks[dateStr] || [];
    },
    getAllTasks: function() {
        const data = localStorage.getItem('pyrio_tasks');
        return data ? JSON.parse(data) : {};
    },
    addTask: function(dateStr, taskText, timeStr = '') {
        const data = localStorage.getItem('pyrio_tasks');
        const tasks = data ? JSON.parse(data) : {};
        if (!tasks[dateStr]) tasks[dateStr] = [];
        
        tasks[dateStr].push({
            id: Date.now().toString(),
            text: taskText,
            time: timeStr,
            completed: false
        });
        
        localStorage.setItem('pyrio_tasks', JSON.stringify(tasks));
    },
    toggleTask: function(dateStr, taskId) {
        const data = localStorage.getItem('pyrio_tasks');
        if (!data) return;
        const tasks = JSON.parse(data);
        if (tasks[dateStr]) {
            const task = tasks[dateStr].find(t => t.id === taskId);
            if (task) {
                task.completed = !task.completed;
                localStorage.setItem('pyrio_tasks', JSON.stringify(tasks));
            }
        }
    },
    deleteTask: function(dateStr, taskId) {
        const data = localStorage.getItem('pyrio_tasks');
        if (!data) return;
        const tasks = JSON.parse(data);
        if (tasks[dateStr]) {
            tasks[dateStr] = tasks[dateStr].filter(t => t.id !== taskId);
            if (tasks[dateStr].length === 0) {
                delete tasks[dateStr];
            }
            localStorage.setItem('pyrio_tasks', JSON.stringify(tasks));
        }
    },
    hasTasks: function(dateStr) {
        const tasks = this.getTasks(dateStr);
        return tasks.length > 0;
    },
    getUpcoming: function(limit = 5) {
        const allData = this.getAllTasks();
        let upcoming = [];
        const now = new Date();
        
        Object.keys(allData).forEach(dateStr => {
            const dayTasks = allData[dateStr];
            dayTasks.forEach(task => {
                if (!task.completed) {
                    // Create Date object for comparison
                    let taskDate = new Date(`${dateStr}T00:00:00`);
                    if (task.time && task.time.includes(':')) {
                        const [hours, minutes] = task.time.split(':');
                        taskDate = new Date(taskDate.setHours(parseInt(hours), parseInt(minutes), 0));
                    } else {
                        // Push dateless tasks to end of their day for sorting purposes
                        taskDate = new Date(taskDate.setHours(23, 59, 59));
                    }
                    
                    // Only include tasks that are in the future or today
                    if (taskDate >= now || dateStr === formatDate(now)) {
                         upcoming.push({
                             ...task,
                             dateStr: dateStr,
                             sortDate: taskDate
                         });
                    }
                }
            });
        });
        
        upcoming.sort((a, b) => a.sortDate - b.sortDate);
        return upcoming.slice(0, limit);
    }
};

function formatDate(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function renderCalendar(container) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Container
    const calendarDiv = document.createElement('div');
    calendarDiv.className = 'card calendar-section';

    // Header
    const headerDiv = document.createElement('div');
    headerDiv.className = 'calendar-header';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'nav-btn';
    prevBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>';
    prevBtn.onclick = () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderDashboard();
    };

    const nextBtn = document.createElement('button');
    nextBtn.className = 'nav-btn';
    nextBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>';
    nextBtn.onclick = () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderDashboard();
    };

    const titleDiv = document.createElement('h2');
    titleDiv.textContent = `${monthNames[month]} ${year}`;

    headerDiv.appendChild(prevBtn);
    headerDiv.appendChild(titleDiv);
    headerDiv.appendChild(nextBtn);

    // Body
    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'calendar-body';

    // Weekdays
    const weekdaysDiv = document.createElement('div');
    weekdaysDiv.className = 'weekdays';
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    weekdays.forEach(day => {
        const span = document.createElement('span');
        span.textContent = day;
        weekdaysDiv.appendChild(span);
    });
    bodyDiv.appendChild(weekdaysDiv);

    // Days grid
    const daysDiv = document.createElement('div');
    daysDiv.className = 'days';

    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const prevLastDay = new Date(year, month, 0).getDate();

    // Previous month's trailing days
    for (let x = firstDayIndex; x > 0; x--) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'day other-month empty';
        dayDiv.textContent = prevLastDay - x + 1;
        daysDiv.appendChild(dayDiv);
    }

    // Current month's days
    const today = new Date();
    for (let i = 1; i <= lastDay; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'day';
        dayDiv.textContent = i;
        
        // Highlight today
        if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayDiv.classList.add('today');
        }
        
        // Highlight selected
        if (i === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear()) {
            dayDiv.classList.add('selected');
        }

        const iterDateStr = formatDate(new Date(year, month, i));
        
        // Render Task Pill UI inside the cell
        const dayTasks = TaskDB.getTasks(iterDateStr);
        if (dayTasks.length > 0) {
            const taskContainer = document.createElement('div');
            taskContainer.className = 'day-task-container';
            
            // Show max 3 tasks to avoid overflow, or indicate more
            const displayLimit = 3;
            for (let t = 0; t < Math.min(dayTasks.length, displayLimit); t++) {
                const taskPill = document.createElement('div');
                taskPill.className = `day-task-pill ${dayTasks[t].completed ? 'completed' : ''}`;
                taskPill.textContent = dayTasks[t].text;
                taskContainer.appendChild(taskPill);
            }
            
            if (dayTasks.length > displayLimit) {
                const morePill = document.createElement('div');
                morePill.className = 'day-task-pill more';
                morePill.textContent = `+${dayTasks.length - displayLimit} more`;
                taskContainer.appendChild(morePill);
            }
            
            dayDiv.appendChild(taskContainer);
        }

        dayDiv.onclick = () => {
            selectedDate = new Date(year, month, i);
            renderDashboard(); // Re-render to update Tasks and Calendar Selection
        };

        daysDiv.appendChild(dayDiv);
    }

    // Next month's leading days to fill grid
    const totalCells = firstDayIndex + lastDay;
    const nextDays = Math.ceil(totalCells / 7) * 7 - totalCells;
    
    for(let j = 1; j <= nextDays; j++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'day other-month empty';
        dayDiv.textContent = j;
        daysDiv.appendChild(dayDiv);
    }

    bodyDiv.appendChild(daysDiv);
    calendarDiv.appendChild(headerDiv);
    calendarDiv.appendChild(bodyDiv);
    container.appendChild(calendarDiv);
}

function renderUpcomingTasks(container) {
    const upcomingDiv = document.createElement('div');
    upcomingDiv.className = 'card upcoming-section';
    
    const upcomingTasks = TaskDB.getUpcoming(5);
    
    let tasksHtml = '';
    if (upcomingTasks.length === 0) {
         tasksHtml = `<div class="empty-state">No upcoming reminders.</div>`;
    } else {
         tasksHtml = upcomingTasks.map(task => {
             // Nicely format the date and time for display
             const d = new Date(`${task.dateStr}T00:00:00`);
             const displayDate = `${monthNames[d.getMonth()].substring(0,3)} ${d.getDate()}`;
             
             let displayTime = '';
             if (task.time && task.time.includes(':')) {
                 const [h, m] = task.time.split(':');
                 const ampm = h >= 12 ? 'PM' : 'AM';
                 const hours12 = h % 12 || 12;
                 displayTime = `${hours12}:${m} ${ampm}`;
             }

             return `
             <div class="upcoming-item">
                 <div class="upcoming-details">
                     <p class="upcoming-title">${task.text}</p>
                     <p class="upcoming-meta">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        ${displayDate} ${displayTime ? `at ${displayTime}` : ''}
                     </p>
                 </div>
             </div>`
         }).join('');
    }

    upcomingDiv.innerHTML = `
        <div class="section-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            Upcoming Reminders
        </div>
        <div class="upcoming-content">
            ${tasksHtml}
        </div>
    `;
    container.appendChild(upcomingDiv);
}

function renderTaskList(container) {
    const taskDiv = document.createElement('div');
    taskDiv.className = 'card task-section';
    
    const selectedDateStr = formatDate(selectedDate);
    const displayDate = `${monthNames[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`;
    const dateTasks = TaskDB.getTasks(selectedDateStr);

    let tasksHtml = '';
    if (dateTasks.length === 0) {
        tasksHtml = `<div class="empty-state">No tasks for this day.</div>`;
    } else {
        tasksHtml = dateTasks.map(task => {
            let displayTime = '';
            if (task.time && task.time.includes(':')) {
                 const [h, m] = task.time.split(':');
                 const ampm = h >= 12 ? 'PM' : 'AM';
                 const hours12 = h % 12 || 12;
                 displayTime = `<span class="task-time-badge">${hours12}:${m} ${ampm}</span>`;
            }
            
            return `
            <div class="task-item ${task.completed ? 'completed' : ''}">
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTaskStatus('${selectedDateStr}', '${task.id}')">
                <div class="task-text-container">
                    <span class="task-text">${task.text}</span>
                    ${displayTime}
                </div>
                <button class="delete-btn" onclick="deleteTaskItem('${selectedDateStr}', '${task.id}')">×</button>
            </div>
            `
        }).join('');
    }

    taskDiv.innerHTML = `
        <div class="section-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Tasks for ${displayDate}
        </div>
        <div class="task-content">
            ${tasksHtml}
        </div>
    `;
    
    container.appendChild(taskDiv);
}

window.toggleTaskStatus = function(dateStr, taskId) {
    TaskDB.toggleTask(dateStr, taskId);
    renderDashboard();
};

window.deleteTaskItem = function(dateStr, taskId) {
    TaskDB.deleteTask(dateStr, taskId);
    renderDashboard();
};

function renderChatBox(container) {
    const chatDiv = document.createElement('div');
    chatDiv.className = 'card chat-section';
    
    chatDiv.innerHTML = `
        <div class="section-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Pyrio AI Assistant
        </div>
        <div class="chat-content" id="chat-messages">
            <div class="message incoming">Hello! I am your Pyrio AI Assistant powered by Google Gemini. How can I help you manage your schedule today?</div>
        </div>
        <div class="chat-input-area">
            <input type="text" class="chat-input" id="chat-input-field" placeholder="Ask the AI...">
            <button class="chat-send-btn" onclick="sendMessage()">
                <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
        </div>
    `;
    
    container.appendChild(chatDiv);
}

let geminiApiKey = 'AIzaSyBqZYednnTzdHX_rcONo5FdJ6OvqszUEss';

window.sendMessage = async function() {
    const input = document.getElementById('chat-input-field');
    const msgText = input.value.trim();
    if (!msgText) return;
    
    // Check for API Key first
    if (!geminiApiKey) {
        geminiApiKey = prompt("Welcome! Please enter your Google Gemini API Key to enable the AI Chatbot.\n(Your key will be saved in your browser's local storage for future use).");
        if (geminiApiKey) {
            localStorage.setItem('pyrio_gemini_key', geminiApiKey);
        } else {
            alert("An API key is required to talk to the AI.");
            return;
        }
    }

    const chatContent = document.getElementById('chat-messages');
    
    // 1. Add User Message
    const userMsgDiv = document.createElement('div');
    userMsgDiv.className = 'message outgoing';
    userMsgDiv.textContent = msgText;
    chatContent.appendChild(userMsgDiv);
    
    input.value = '';
    chatContent.scrollTop = chatContent.scrollHeight; // Scroll down
    
    // 2. Add Loading Indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message incoming';
    typingDiv.style.fontStyle = 'italic';
    typingDiv.style.opacity = '0.7';
    typingDiv.textContent = 'AI is thinking...';
    chatContent.appendChild(typingDiv);
    chatContent.scrollTop = chatContent.scrollHeight;
    
    // 3. Call Gemini API
    try {
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        const systemPrompt = `You are a helpful calendar assistant. The current date is ${formatDate(new Date())}. 
If the user asks to schedule, remind, or add a task, output a JSON block wrapped in \`\`\`json ... \`\`\` containing the tasks.
Format: {"tasks": [{"date": "YYYY-MM-DD", "time": "HH:MM", "task": "Task name"}]}
(Note: Use 24-hour time for "HH:MM", and leave time empty string if no time is specified).
Also include a conversational response before or after the JSON. If they aren't adding tasks, just reply normally.`;

        const fullPrompt = systemPrompt + "\n\nUser: " + msgText;
        
        const result = await model.generateContent(fullPrompt);
        const responseText = result.response.text();

        // Check for extraction
        const jsonMatch = responseText.match(/```json([\s\S]*?)```/);
        let tasksAdded = false;
        
        if (jsonMatch && jsonMatch[1]) {
            try {
                const parsed = JSON.parse(jsonMatch[1].trim());
                if (parsed && parsed.tasks && Array.isArray(parsed.tasks)) {
                    parsed.tasks.forEach(t => {
                        if (t.date && t.task) {
                            TaskDB.addTask(t.date, t.task, t.time || '');
                            tasksAdded = true;
                        }
                    });
                }
            } catch (e) {
                console.error("Failed to parse JSON from AI response", e);
            }
        }

        // Remove typing indicator
        chatContent.removeChild(typingDiv);

        // Add AI response
        const aiMsgDiv = document.createElement('div');
        aiMsgDiv.className = 'message incoming';
        
        // Strip the JSON block from the text shown to the user
        let aiText = responseText.replace(/```json[\s\S]*?```/g, '').trim();
        
        // Clean up basic markdown to plain text/HTML
        aiText = aiText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        aiText = aiText.replace(/\n/g, '<br>');
        
        aiMsgDiv.innerHTML = aiText;
        chatContent.appendChild(aiMsgDiv);
        
        if (tasksAdded) {
            renderDashboard(); // Re-render to show new tasks immediately
        }
    } catch (error) {
        if (chatContent.contains(typingDiv)) chatContent.removeChild(typingDiv);
        console.error("SDK Error:", error);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message incoming';
        errorDiv.style.color = 'red';
        errorDiv.textContent = `Error: ${error.message || 'Failed to get a response from AI.'} (If your API key is invalid, type "/resetkey")`;
        chatContent.appendChild(errorDiv);
    }
    
    chatContent.scrollTop = chatContent.scrollHeight; // Final scroll down
    
    // Hidden feature to easily reset the key during development
    if (msgText === "/resetkey") {
        localStorage.removeItem('pyrio_gemini_key');
        geminiApiKey = null;
        alert("API Key cleared from local storage.");
    }
};

// Listen for enter key in chat
document.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        const input = document.getElementById('chat-input-field');
        if (input === document.activeElement) {
            window.sendMessage();
        }
    }
});

document.addEventListener('DOMContentLoaded', renderDashboard);
