document.addEventListener('DOMContentLoaded', () => {
    // Socket.io setup
    const socket = io({
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
    });

    // DOM elements
    const createGameBtn = document.getElementById('create-game-btn');
    const gameNameInput = document.getElementById('game-name-input');
    const maxPlayersSelect = document.getElementById('max-players-select');
    const statusMessage = document.getElementById('status-message');
    const lobbyList = document.getElementById('lobby-list');
    const activeGamesList = document.getElementById('games-list');
    const winsSpan = document.getElementById('user-wins');
    const lossesSpan = document.getElementById('user-losses');

    // Account dropdown menu functionality
    const accountIcon = document.getElementById('account-icon');
    const dropdownMenu = document.getElementById('dropdown-menu');
    const logoutLink = document.getElementById('logout-link');

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

    // logout functionality
    if (logoutLink) {
        logoutLink.addEventListener('click', async (event) => {
            event.preventDefault();

            try {
                const response = await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                });

                if (response.ok) {
                    window.location.href = '/index?loggedout=true';
                } else {
                    console.error('Logout failed:', response.statusText);
                    showMessage('Logout failed. Please try again.', 'error');
                }
            } catch (error) {
                console.error('Error during logout:', error);
                showMessage('An error occurred during logout.', 'error');
            }
        });
    }

    // Socket event handlers
    socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
        statusMessage.textContent = 'Error connecting to game server. Trying to reconnect...';
        if (createGameBtn) createGameBtn.disabled = true;
    });

    socket.on('connect', () => {
        console.log('Socket connected successfully:', socket.id);
        statusMessage.textContent = 'Connected to server. Create a game or join an existing one!';
        if (createGameBtn) createGameBtn.disabled = false;

        // Request initial lobbies and active games lists
        socket.emit('getLobbies');
        socket.emit('getActiveGames');
    });

    socket.on('disconnect', (reason) => {
        console.warn('Socket disconnected:', reason);
        statusMessage.textContent = 'Disconnected from server. Please refresh.';
        if (createGameBtn) createGameBtn.disabled = true;
    });

    // Game lobby updates
    socket.on('lobbiesUpdate', (lobbies) => {
        console.log('Received lobbies update:', lobbies);
        renderLobbies(lobbies);
    });

    // Active games updates
    socket.on('activeGamesList', (data) => {
        console.log('Received active games update:', data);
        renderActiveGames(data.activeGames);
    });

    // Game starting notification
    socket.on('gameStarting', (data) => {
        console.log('Game starting!', data);
        statusMessage.textContent = `Game found! Joining game ${data.gameId}...`;
        if (createGameBtn) createGameBtn.disabled = true;

        setTimeout(() => {
            window.location.href = `/game?gameId=${data.gameId}`;
        }, 1500);
    });

    // Game error handling
    socket.on('gameError', (data) => {
        console.error('Game Error:', data.message);
        showMessage(data.message, 'error');
    });

    // Create game button event listener
    if (createGameBtn) {
        createGameBtn.addEventListener('click', () => {
            if (!socket.connected) {
                statusMessage.textContent = 'Not connected to server. Please wait or refresh.';
                return;
            }

            const gameName = gameNameInput.value.trim();
            if (!gameName) {
                showMessage('Please enter a game name', 'error');
                return;
            }

            const maxPlayers = parseInt(maxPlayersSelect.value);
            socket.emit('createLobby', { name: gameName, maxPlayers: maxPlayers });
            statusMessage.textContent = 'Creating game...';
        });
    }

    // Function to render lobbies list
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

            const joinBtn = li.querySelector('.join-lobby-btn');
            joinBtn.addEventListener('click', () => {
                socket.emit('joinLobby', lobby.id);
                statusMessage.textContent = `Joining game: ${lobby.name}...`;
            });

            lobbyList.appendChild(li);
        });
    }

    // Function to render active games
    function renderActiveGames(games) {
        if (!activeGamesList) return;

        activeGamesList.innerHTML = '';

        if (!games || games.length === 0) {
            activeGamesList.innerHTML = '<li>No active games at the moment.</li>';
            return;
        }

        games.forEach(game => {
            const li = document.createElement('li');
            const players = game.players.map(p => p.email).join(', ');

            // Add a status indicator based on whether the user is in this game
            const statusClass = game.isParticipant ? 'your-game' : '';
            const statusLabel = game.isParticipant ? '(Your Game)' : '';

            li.innerHTML = `
            <div class="game-info ${statusClass}">
                <span>Game ID: ${game.gameId} ${statusLabel}</span>
                <span>Players: ${players}</span>
            </div>
            <button class="join-game-btn" data-id="${game.gameId}">Join Game</button>
        `;

            const joinBtn = li.querySelector('.join-game-btn');
            joinBtn.addEventListener('click', () => {
                // Check game status before redirecting
                statusMessage.textContent = `Checking game ${game.gameId} status...`;
                socket.emit('checkGameStatus', game.gameId);
            });

            activeGamesList.appendChild(li);
        });
    }


    // Fetch user stats
    async function fetchStats() {
        if (!winsSpan || !lossesSpan) return;

        try {
            const response = await fetch('/api/auth/me');
            if (response.ok) {
                const { user } = await response.json();
                winsSpan.textContent = user.wins ?? 0;
                lossesSpan.textContent = user.losses ?? 0;
            } else {
                winsSpan.textContent = 'Error';
                lossesSpan.textContent = 'Error';
                console.error("Failed to fetch stats:", response.statusText);
            }
        } catch (err) {
            winsSpan.textContent = 'Error';
            lossesSpan.textContent = 'Error';
            console.error("Failed to fetch stats:", err);
        }
    }

    // Helper function to show messages
    function showMessage(message, type = 'info') {
        const msgDiv = document.createElement('div');
        msgDiv.textContent = message;
        msgDiv.className = `message ${type}`;
        document.querySelector('.container')?.appendChild(msgDiv);
        setTimeout(() => msgDiv.remove(), 3000);
    }

    // Setup polling for lobbies and games updates
    setInterval(() => {
        if (socket.connected) {
            socket.emit('getLobbies');
            socket.emit('getActiveGames');
        }
    }, 5000); // Update every 5 seconds

    // Initial fetch
    fetchStats();
});