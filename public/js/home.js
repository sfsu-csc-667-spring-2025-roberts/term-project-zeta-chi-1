document.addEventListener('DOMContentLoaded', () => {
    // Socket.io setup
    const socket = io({
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
    });

    // Username for lobby chat
    let lobbyUsername = sessionStorage.getItem("username") || "";

    // DOM elements
    const createGameBtn = document.getElementById('create-game-btn');
    const gameNameInput = document.getElementById('game-name-input');
    const maxPlayersSelect = document.getElementById('max-players-select');
    const statusMessage = document.getElementById('status-message');
    const lobbyList = document.getElementById('lobby-list');
    const activeGamesList = document.getElementById('games-list');
    const winsSpan = document.getElementById('user-wins');
    const lossesSpan = document.getElementById('user-losses');

    const accountIcon = document.getElementById('account-icon');
    const dropdownMenu = document.getElementById('dropdown-menu');
    const logoutLink = document.getElementById('logout-link');

    // Account dropdown
    if (accountIcon && dropdownMenu) {
        accountIcon.addEventListener('click', (event) => {
            event.stopPropagation();
            dropdownMenu.classList.toggle('hidden');
        });

        document.addEventListener('click', (event) => {
            if (!dropdownMenu.contains(event.target) && !accountIcon.contains(event.target)) {
                if (!dropdownMenu.classList.contains('hidden')) {
                    dropdownMenu.classList.add('hidden');
                }
            }
        });
    }

    // Logout
    if (logoutLink) {
        logoutLink.addEventListener('click', async (event) => {
            event.preventDefault();
            try {
                const response = await fetch('/api/auth/logout', { method: 'POST' });
                if (response.ok) {
                    window.location.href = '/index?loggedout=true';
                } else {
                    showMessage('Logout failed. Please try again.', 'error');
                }
            } catch (err) {
                showMessage('An error occurred during logout.', 'error');
            }
        });
    }

    // On socket connect
    socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
        statusMessage.textContent = 'Connected to server. Create a game or join one!';
        if (createGameBtn) createGameBtn.disabled = false;

        // Set up username for chat
        if (!lobbyUsername) {
            lobbyUsername = `Guest-${socket.id}`;
            sessionStorage.setItem("username", lobbyUsername);
        }

        socket.emit("joinLobby", { username: lobbyUsername });
        socket.emit('getLobbies');
        socket.emit('getActiveGames');
    });

    socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
        statusMessage.textContent = 'Error connecting to server. Trying to reconnect...';
        if (createGameBtn) createGameBtn.disabled = true;
    });

    socket.on('disconnect', (reason) => {
        console.warn('Socket disconnected:', reason);
        statusMessage.textContent = 'Disconnected. Please refresh.';
        if (createGameBtn) createGameBtn.disabled = true;
    });

    // Lobby/game list rendering
    socket.on('lobbiesUpdate', renderLobbies);
    socket.on('activeGamesList', (data) => renderActiveGames(data.activeGames));
    socket.on('gameStarting', (data) => {
        statusMessage.textContent = `Joining game ${data.gameId}...`;
        if (createGameBtn) createGameBtn.disabled = true;
        setTimeout(() => {
            window.location.href = `/game?gameId=${data.gameId}`;
        }, 1500);
    });

    socket.on('gameError', (data) => showMessage(data.message, 'error'));

    if (createGameBtn) {
        createGameBtn.addEventListener('click', () => {
            const gameName = gameNameInput.value.trim();
            const maxPlayers = parseInt(maxPlayersSelect.value);
            if (!gameName) return showMessage('Please enter a game name', 'error');
            socket.emit('createLobby', { name: gameName, maxPlayers });
            statusMessage.textContent = 'Creating game...';
        });
    }

    function renderLobbies(lobbies) {
        if (!lobbyList) return;
        lobbyList.innerHTML = '';
        if (lobbies.length === 0) {
            lobbyList.innerHTML = '<li class="no-lobbies">No game lobbies available. Create one!</li>';
            return;
        }
        lobbies.forEach(lobby => {
            const li = document.createElement('li');
            li.className = 'lobby-item';
            li.innerHTML = `
                <div class="lobby-info">
                    <span class="lobby-name">${lobby.name}</span>
                    <span class="lobby-players">${lobby.playerCount}/${lobby.maxPlayers} players</span>
                </div>
                <button class="join-lobby-btn" data-id="${lobby.id}">Join Game</button>
            `;
            li.querySelector('.join-lobby-btn').addEventListener('click', () => {
                socket.emit('joinLobby', lobby.id);
                statusMessage.textContent = `Joining game: ${lobby.name}...`;
            });
            lobbyList.appendChild(li);
        });
    }

    function renderActiveGames(games) {
        if (!activeGamesList) return;
        activeGamesList.innerHTML = '';
        if (!games || games.length === 0) {
            activeGamesList.innerHTML = '<li>No active games.</li>';
            return;
        }
        games.forEach(game => {
            const li = document.createElement('li');
            const players = game.players.map(p => p.email).join(', ');
            const statusClass = game.isParticipant ? 'your-game' : '';
            const statusLabel = game.isParticipant ? '(Your Game)' : '';
            li.innerHTML = `
                <div class="game-info ${statusClass}">
                    <span>Game ID: ${game.gameId} ${statusLabel}</span>
                    <span>Players: ${players}</span>
                </div>
                <button class="join-game-btn" data-id="${game.gameId}">Join Game</button>
            `;
            li.querySelector('.join-game-btn').addEventListener('click', () => {
                socket.emit('checkGameStatus', game.gameId);
                statusMessage.textContent = `Checking game ${game.gameId} status...`;
            });
            activeGamesList.appendChild(li);
        });
    }

    async function fetchStats() {
        if (!winsSpan || !lossesSpan) return;
        try {
            const response = await fetch('/api/auth/me');
            const { user } = await response.json();
            winsSpan.textContent = user.wins ?? 0;
            lossesSpan.textContent = user.losses ?? 0;
        } catch (err) {
            winsSpan.textContent = 'Error';
            lossesSpan.textContent = 'Error';
        }
    }

    function showMessage(message, type = 'info') {
        const msgDiv = document.createElement('div');
        msgDiv.textContent = message;
        msgDiv.className = `message ${type}`;
        document.querySelector('.container')?.appendChild(msgDiv);
        setTimeout(() => msgDiv.remove(), 3000);
    }

    setInterval(() => {
        if (socket.connected) {
            socket.emit('getLobbies');
            socket.emit('getActiveGames');
        }
    }, 5000);

    fetchStats();

    // ==== LOBBY CHAT ====
    const chatIcon = document.getElementById('chat-icon');
    const chatContainer = document.getElementById('chat-container');
    const closeChat = document.getElementById('close-chat');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const chatMessages = document.getElementById('chat-messages');

    if (chatContainer) {
        chatContainer.style.display = 'none';
    }

    chatIcon?.addEventListener('click', () => {
        chatContainer.style.display = chatContainer.style.display === 'flex' ? 'none' : 'flex';
        chatInput.focus();
    });

    closeChat?.addEventListener('click', () => {
        chatContainer.style.display = 'none';
    });

    function sendLobbyMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        const messageElement = document.createElement('div');
        messageElement.className = 'message player-message';
        messageElement.textContent = message;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        socket.emit("lobbyMessage", { username: lobbyUsername, message });
        chatInput.value = '';
    }

    sendButton?.addEventListener("click", sendLobbyMessage);
    chatInput?.addEventListener("keypress", (e) => {
        if (e.key === 'Enter') sendLobbyMessage();
    });

    socket.on("lobbyMessage", (data) => {
        if (data.username === lobbyUsername) return;

        const messageElement = document.createElement('div');
        messageElement.className = 'message opponent-message';
        messageElement.textContent = data.username && data.message
            ? `${data.username}: ${data.message}`
            : data.message || '';

        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
});
