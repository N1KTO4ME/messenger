document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    // --- Theme Switcher ---
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.body.classList.toggle('dark-theme', currentTheme === 'dark');
    themeToggleBtn.textContent = currentTheme === 'dark' ? '☀️' : '🌙';

    themeToggleBtn.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark-theme');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        themeToggleBtn.textContent = isDark ? '☀️' : '🌙';
    });

    // --- DOM Elements ---
    const chatListEl = document.getElementById('chatList');
    const messagesAreaEl = document.getElementById('messagesArea');
    const messageInputAreaEl = document.getElementById('messageInputArea');
    const messageInputEl = document.getElementById('messageInput');
    const sendButtonEl = document.getElementById('sendButton');
    const chatHeaderEl = document.getElementById('chatHeader');

    let currentChatId = null;
    let websocket = null;

    // --- Modal Logic (Personal/Group) ---
    const createChatModal = document.getElementById('createChatModal');
    const createChatBtn = document.getElementById('createChatBtn');
    const closeChatModalBtn = createChatModal.querySelector('.close-button');
    const confirmCreateChatBtn = document.getElementById('confirmCreateChatBtn');
    const userListEl = document.getElementById('userList');
    const groupNameInput = document.getElementById('groupNameInput');

    createChatBtn.onclick = () => { loadUsersForModal(); createChatModal.style.display = 'block'; };
    closeChatModalBtn.onclick = () => { createChatModal.style.display = 'none'; };

    async function loadUsersForModal() {
        try {
            const [usersResponse, meResponse] = await Promise.all([
                fetch('/api/users/', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/users/me', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            if (!usersResponse.ok || !meResponse.ok) throw new Error('Failed to fetch users');

            const users = await usersResponse.json();
            const me = await meResponse.json();

            userListEl.innerHTML = '';
            users.forEach(user => {
                if (user.user_id !== me.user_id) {
                    userListEl.innerHTML += `<div><input type="checkbox" id="user-${user.user_id}" value="${user.user_id}"><label for="user-${user.user_id}">${user.full_name} (${user.role})</label></div>`;
                }
            });
        } catch (error) {
            console.error(error);
            alert('Не удалось загрузить список пользователей.');
        }
    }

    confirmCreateChatBtn.onclick = async () => {
        const selectedUsers = Array.from(userListEl.querySelectorAll('input:checked')).map(input => parseInt(input.value));
        if (selectedUsers.length === 0) {
            alert('Выберите хотя бы одного участника.');
            return;
        }
        const payload = { name: groupNameInput.value || null, member_ids: selectedUsers };
        await createNewChat(payload, '/api/chats/');
    };

    // --- Modal Logic (Role Chat) ---
    const createRoleChatModal = document.getElementById('createRoleChatModal');
    const createRoleChatBtn = document.getElementById('createRoleChatBtn');
    const closeRoleModalBtn = createRoleChatModal.querySelector('.close-button');
    const confirmCreateRoleChatBtn = document.getElementById('confirmCreateRoleChatBtn');

    createRoleChatBtn.onclick = () => { createRoleChatModal.style.display = 'block'; };
    closeRoleModalBtn.onclick = () => { createRoleChatModal.style.display = 'none'; };

    confirmCreateRoleChatBtn.onclick = async () => {
        const role = document.getElementById('roleSelect').value;
        const name = document.getElementById('roleGroupNameInput').value;
        if (!name) {
            alert('Введите название чата.');
            return;
        }
        const payload = { role, name };
        await createNewChat(payload, '/api/chats/role-chat');
    };

    // --- Universal Chat Creation Function ---
    async function createNewChat(payload, url) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                createChatModal.style.display = 'none';
                createRoleChatModal.style.display = 'none';
                loadChats(); // Reload chat list
            } else {
                const error = await response.json();
                alert(`Не удалось создать чат: ${error.detail}`);
            }
        } catch (error) {
            alert('Ошибка сети при создании чата.');
        }
    }

    // --- WebSocket and Chat Loading ---
    function connectWebSocket(chatId) {
        if (websocket) websocket.close();
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        websocket = new WebSocket(`${wsProtocol}//${window.location.host}/ws/${chatId}?token=${token}`);
        websocket.onmessage = (event) => addMessageToUI(JSON.parse(event.data));
    }

    async function selectChat(chatId, chatName) {
        currentChatId = chatId;
        document.querySelectorAll('.chat-list-item').forEach(item => item.classList.remove('active'));
        document.getElementById(`chat-${chatId}`).classList.add('active');
        chatHeaderEl.textContent = chatName;
        messagesAreaEl.innerHTML = '';

        try {
            const response = await fetch(`/api/chats/${chatId}/messages`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Failed to load messages');
            const messages = await response.json();
            messages.forEach(addMessageToUI);
            messageInputAreaEl.style.display = 'flex';
            connectWebSocket(chatId);
        } catch (error) {
            messagesAreaEl.innerHTML = 'Не удалось загрузить сообщения.';
        }
    }

    async function loadChats() {
        try {
            const response = await fetch('/api/chats/', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) {
                // Если токен невалиден, сервер вернет 401, и мы выходим
                if (response.status === 401) {
                    localStorage.removeItem('accessToken');
                    window.location.href = '/login';
                }
                throw new Error('Failed to load chats');
            }
            const chats = await response.json();
            chatListEl.innerHTML = '';
            chats.forEach(chat => {
                const chatDiv = document.createElement('div');
                chatDiv.className = 'chat-list-item';
                chatDiv.id = `chat-${chat.chat_id}`;
                chatDiv.textContent = chat.name || 'Безымянный чат';
                chatDiv.onclick = () => selectChat(chat.chat_id, chat.name);
                chatListEl.appendChild(chatDiv);
            });
        } catch (error) {
            console.error('Chat loading error:', error);
        }
    }

    function addMessageToUI(messageData) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        messageDiv.innerHTML = `<span class="message-sender">${messageData.user}:</span><p>${messageData.text}</p>`;
        messagesAreaEl.appendChild(messageDiv);
        messagesAreaEl.scrollTop = messagesAreaEl.scrollHeight;
    }

    sendButtonEl.addEventListener('click', () => {
        if (messageInputEl.value && websocket?.readyState === WebSocket.OPEN) {
            websocket.send(messageInputEl.value);
            messageInputEl.value = '';
        }
    });
    messageInputEl.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendButtonEl.click(); });

    // --- Initial Load ---
    loadChats();
});