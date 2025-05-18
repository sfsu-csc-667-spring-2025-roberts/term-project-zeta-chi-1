// public/js/game.js

document.addEventListener('DOMContentLoaded', () => {
    console.log('[Game Client] DOMContentLoaded');

    const socket = io({ // Connect to the server, enable auto-reconnect
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
    });

    console.log('[Game Client] Socket IO Initialized');

    // DOM Elements
    const gameIdDisplay = document.getElementById('game-id-display');
    const playersArea = document.getElementById('players-area');
    const deckElement = document.getElementById('deck');
    const deckCountSpan = document.getElementById('deck-count');
    const discardPileElement = document.getElementById('discard-pile');
    const topCardDisplay = document.getElementById('top-card-display');
    const playerHandElement = document.getElementById('player-hand');
    const drawButton = document.getElementById('draw-button');
    const unoButton = document.getElementById('uno-button');
    const messageArea = document.getElementById('message-area');
    const colorPicker = document.getElementById('color-picker');
    const handh2 = document.getElementById('handh2');


    // Game State Vars
    let myPlayerId = null;
    let currentGameState = null;
    let gameId = null;
    let cardToPlayAfterColorChoice = null; // Stores card if wild needs a color
    let isMyTurn = false;
    let hasSentReady = false;

     // Get gameId from URL query param
    const urlParams = new URLSearchParams(window.location.search);
    gameId = urlParams.get('gameId');
    console.log(`[Game Client] URL Game ID: ${gameId}`);
    if (gameId) {
        if (gameIdDisplay) gameIdDisplay.textContent = `Game ID: ${gameId}`;
    } else {
        if(messageArea) messageArea.textContent = 'Error: No Game ID specified!';
        setTimeout(() => { window.location.href = '/home'; }, 3000);
        return; // Stop if no gameId
    }


    // Helper Functions
    function renderCard(card, isTopCard = false) {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card', card.color);
         if (isTopCard) {
             cardDiv.classList.add('discard-pile-card');
             cardDiv.style.cursor = 'default'; // Disable Click
         } else {
             cardDiv.dataset.cardId = card.id; // Card ID for click actions
         }

        let displayValue = card.value; //special cards
         if (card.value === 'skip') displayValue = '🚫';
         if (card.value === 'reverse') displayValue = '🔄';
         if (card.value === 'draw2') displayValue = '+2';
         if (card.value === 'wild') displayValue = 'Wild';
         if (card.value === 'draw4') displayValue = 'W +4';

        cardDiv.textContent = displayValue;
        cardDiv.title = `${card.color} ${card.value}`;

        return cardDiv;
    }

    function updateUI(state) {
        console.log('[Game Client] updateUI called with state:', state);
        if (!state || !state.players) {
            console.warn("Received invalid state:", state);
            if(messageArea) messageArea.textContent = "Waiting for valid game state...";
            return;
         }
        currentGameState = state; // Stores current state
    
        // See if it's my turn or not
        isMyTurn = myPlayerId === state.currentPlayerId && !state.isGameOver;
    
        // Player Renderer
        if (playersArea) {
            playersArea.innerHTML = ''; // Clear prev players
            state.players.forEach(player => {
                const playerDiv = document.createElement('div');
                playerDiv.classList.add('player-info');
                playerDiv.id = `player-${player.id}`;

                const name = player.firstName || player.email || 'Player';
                const nameText = `${name} (${player.cardCount} cards)`;

                if (player.avatarData?.icon) {
                    const avatarSpan = document.createElement('span');
                    avatarSpan.textContent = `${player.avatarData.icon} `;
                    playerDiv.appendChild(avatarSpan);
                }

                const nameSpan = document.createElement('span');
                nameSpan.textContent = nameText;
                playerDiv.appendChild(nameSpan);


     
                if (player.id === state.currentPlayerId && !state.isGameOver) {
                    playerDiv.classList.add('current-turn'); // Highlight current turn
                }
                playersArea.appendChild(playerDiv);
            });
        }
    
        // Turn Update Messages
         if (messageArea && !state.isGameOver) { // Avoids overwrite of game over
             if (isMyTurn) {
                 messageArea.textContent = "Your Turn!";
                 messageArea.style.color = 'green';
             } else {
                 const currentPlayerInfo = state.players.find(p => p.id === state.currentPlayerId);
                 messageArea.textContent = `Waiting for ${currentPlayerInfo?.firstName ?? 'opponent'}...`;
                  messageArea.style.color = '#555';
             }
         }
    
    
        // Discard pile
        if (topCardDisplay) {
            topCardDisplay.innerHTML = ''; // Clears prev
            if (state.topCard) {
                const topCardEl = renderCard(state.topCard, true);
                topCardDisplay.appendChild(topCardEl);
            } else {
                topCardDisplay.textContent = '(Empty)';
            }
        }

        // Set current player's hand info
        if (handh2) { 
            const currPlayerInfo = state.players.find(p => p.id === myPlayerId);
            let curr_email = "";
            if (currPlayerInfo) {
                curr_email = currPlayerInfo.email;
            }
            if (curr_email != "") {
                handh2.textContent = curr_email.concat("'s ✋🏼");
            }
        }

        if (deckCountSpan) deckCountSpan.textContent = state.drawPileSize; // Renders the deck
    
        // Check if player has playable cards on their turn
        let hasPlayableCard = false; // Assumed
        if (isMyTurn && state.yourHand) {
            const topCard = state.topCard;
            hasPlayableCard = state.yourHand.some(card => {
                // Check standard validity
                const isStandardPlayable = card.color === 'wild' ||
                                           (topCard && (card.color === state.currentColor || card.value === topCard.value));
                // Check Wild Draw 4 validity
                if (card.value === 'draw4') return true;
    
                return isStandardPlayable;
            });
            console.log(`[Game Client updateUI] Is my turn. Has playable card? ${hasPlayableCard}`);
        }
    
    
        // Player Hand Renderer
        if (playerHandElement && state.yourHand) {
            playerHandElement.innerHTML = ''; // Clear prev hand
            state.yourHand.sort((a, b) => { // Auto hand sort
                if (a.color < b.color) return -1;
                if (a.color > b.color) return 1;
                const valueOrder = ['0','1','2','3','4','5','6','7','8','9','skip','reverse','draw2','wild','draw4'];
                return valueOrder.indexOf(a.value) - valueOrder.indexOf(b.value); // Basic value sort
            }).forEach(card => {
                const cardEl = renderCard(card);
                 let isCardPlayableThisTurn = false; // Check if card can be played on this turn
                 let isDisabled = true; // Assumed
    
                 if (isMyTurn) {
                     const topCard = state.topCard;
                     isCardPlayableThisTurn =
                        card.color === 'wild' ||
                        (topCard && (card.color === state.currentColor || card.value === topCard.value));
                     // WD4 always marked playable client-side
                     if (card.value === 'draw4') isCardPlayableThisTurn = true;
    
                     isDisabled = !isCardPlayableThisTurn;
                 } // Card is always disabled if not my turn
    
                // Apply classes and styles
                if (isCardPlayableThisTurn && !isDisabled) cardEl.classList.add('playable');
                if (isDisabled) {
                    cardEl.classList.add('disabled');
                    cardEl.style.cursor = 'not-allowed';
                } else {
                    cardEl.classList.remove('disabled');
                    cardEl.style.cursor = 'pointer';
                }
    
                playerHandElement.appendChild(cardEl);
            });
        } else if (playerHandElement) {
             console.warn("No hand data received for this player.");
             playerHandElement.innerHTML = 'Waiting for hand...';
        }
    
    
        // Draw button enable/disable (dont change this)
        if (drawButton) {
            drawButton.disabled = !isMyTurn || hasPlayableCard || state.drawPileSize === 0;
            console.log(`[Game Client updateUI] Draw Button Disabled: ${drawButton.disabled} (isMyTurn: ${isMyTurn}, hasPlayableCard: ${hasPlayableCard}, drawPileSize: ${state.drawPileSize})`);
        }
    
        // Uno button
        if (unoButton) unoButton.disabled = !isMyTurn || !state.yourHand || state.yourHand.length > 2 || state.isGameOver;
    
        // Color picker hidden unless needed by chooseColorRequest
        if (colorPicker) colorPicker.style.display = 'none';
    
    
        // Game over
        if (state.isGameOver) {
            if(messageArea) {
                messageArea.classList.add('game-over-message');
                const winnerInfo = state.players.find(p => p.id === state.winnerId);
                messageArea.textContent = `${state.message ?? 'GAME OVER!'} ${(winnerInfo?.firstName || winnerInfo?.email || '')} Wins!`;


                // Show back to home button
                if (!document.getElementById('back-to-home-btn')) {
                    const homeButton = document.createElement('button');
                    homeButton.textContent = 'Back to Home';
                    homeButton.id = 'back-to-home-btn';
                    homeButton.onclick = () => window.location.href = '/home';
                    messageArea.appendChild(document.createElement('br'));
                    messageArea.appendChild(homeButton);
                }
            }
            // Disable actions
            if (drawButton) drawButton.disabled = true;
            if (unoButton) unoButton.disabled = true;
            if (playerHandElement) playerHandElement.querySelectorAll('.card').forEach(c => {
                c.classList.add('disabled');
                c.style.cursor = 'not-allowed';
            });
        } else {    // Runs if game isn't over
             if(messageArea) messageArea.classList.remove('game-over-message');
             const existingHomeButton = document.getElementById('back-to-home-btn');
             if (existingHomeButton) existingHomeButton.remove();
        }

        const otherPlayersHandsContainer = document.getElementById('other-players-hands');
        if (otherPlayersHandsContainer) {
            otherPlayersHandsContainer.innerHTML = ''; // Clear previous

            state.players.forEach(player => {
                if (player.id !== myPlayerId) {
                    const handDiv = document.createElement('div');
                    handDiv.classList.add('opponent-hand');

                    const label = document.createElement('div');
                    label.textContent = `${player.firstName}'s Cards (${player.cardCount})`;
                    handDiv.appendChild(label);

                    const cardsDiv = document.createElement('div');
                    cardsDiv.classList.add('opponent-cards');

                    for (let i = 0; i < player.cardCount; i++) {
                        const cardBack = document.createElement('div');
                        cardBack.classList.add('card-back');
                        cardsDiv.appendChild(cardBack);
                    }

                    handDiv.appendChild(cardsDiv);
                    otherPlayersHandsContainer.appendChild(handDiv);
                }
            });
        }

    }

     function showTemporaryMessage(msg, type = 'info') {
         if (!messageArea) return;
         const oldMessage = messageArea.textContent;
         const oldColor = messageArea.style.color;

         messageArea.textContent = msg;
         if (type === 'error') {
             messageArea.style.color = 'red';
         } else if (type === 'success') {
              messageArea.style.color = 'blue';
         } else {
             messageArea.style.color = '#555';
         }

         setTimeout(() => {
             // Check message for update before restore
             if (messageArea.textContent === msg) {
                if (isMyTurn && !currentGameState?.isGameOver) {
                    messageArea.textContent = "Your Turn!";
                    messageArea.style.color = 'green';
                } else if (!currentGameState?.isGameOver) {
                     const currentPlayerInfo = currentGameState?.players.find(p => p.id === currentGameState?.currentPlayerId);
                    messageArea.textContent = `Waiting for ${currentPlayerInfo?.email ?? 'opponent'}...`;
                    messageArea.style.color = '#555';
                }
             }
         }, 2500);
     }


    // Socket Event handlers

    socket.on('connect', () => {
        console.log(`[Game Client] Socket Connected: ${socket.id}`);
        console.log('Connected to server socket:', socket.id);
        console.log('[Game Client] Emitted requestMyInfo');
        socket.emit('requestMyInfo'); // Request our user ID after connection
        hasSentReady = false;
    });

    socket.on('myInfo', (data) => {
        console.log(`[Game Client] Received myInfo: UserID=${data.userId}`);
        myPlayerId = data.userId;
        if (gameId && !hasSentReady) { // Tell server we are ready for game with userId
            console.log(`[Game Client] Emitting playerReadyForGame for GameID=${gameId}, UserID=${myPlayerId}`);
            socket.emit('playerReadyForGame', { gameId });
            hasSentReady = true; // Mark as sent for this connection
        } else {
            console.warn(`[Game Client] Did not emit playerReadyForGame. gameId=${gameId}, hasSentReady=${hasSentReady}`);
        }
        // Re-render UI if state arrived before ID was known
        if (currentGameState) {
            console.log('[Game Client] Re-rendering UI after receiving myInfo');
            updateUI(currentGameState);
        }
    });


    socket.on('gameState', (state) => {
        console.log(`[Game Client] Received gameState for GameID=${state?.gameId}`);
        if (state && state.gameId === gameId) { // Safety check for gameId match
             updateUI(state);
        } else if (state) {
            console.warn(`Received gameState for wrong game? Expected ${gameId}, Got ${state.gameId}`);
        }
    });

    socket.on('invalidMove', (data) => {
        console.warn('Invalid Move:', data.message);
        showTemporaryMessage(`Invalid Move: ${data.message}`, 'error');

        // This shows up the first time you select a wild color if you have it but it works after so idk
        if (colorPicker && currentGameState && currentGameState.topCard?.color === 'wild' && currentGameState.currentColor === 'wild' ) {
            colorPicker.style.display = 'block';
            if(messageArea) messageArea.textContent = `Try selecting a color again.`;
        } else { // Color choice issues
            if (isMyTurn && currentGameState && !currentGameState.isGameOver) {
                if(drawButton) drawButton.disabled = false;
                if(unoButton) unoButton.disabled = (currentGameState.yourHand.length > 2);
                if(playerHandElement) { // Enable playable cards if disabled
                    playerHandElement.querySelectorAll('.card').forEach(cardEl => { // Start playability logic on current state
                        const cardId = cardEl.dataset.cardId;
                        const cardData = currentGameState.yourHand.find(c => c.id === cardId);
                        if(cardData) {
                            const topCard = currentGameState.topCard;
                            const isPlayable = cardData.color === 'wild' || (topCard && (cardData.color === currentGameState.currentColor || 
                                cardData.value === topCard.value));
                            if(isPlayable) {
                                cardEl.classList.remove('disabled');
                                cardEl.style.cursor = 'pointer';
                            }
                        }
                    });
                }
            }
        }
    });

    socket.on('actionResult', (data) => {
         console.log('Action Result:', data.message);
         showTemporaryMessage(data.message, 'success');
    });

     socket.on('playerCalledUno', (data) => {
         console.log(`${data.email} called Uno!`);
         const playerDiv = document.getElementById(`player-${data.playerId}`);
         if (playerDiv) {
             const unoText = document.createElement('span');
             unoText.textContent = ' UNO!';
             unoText.style.color = 'orange';
             unoText.style.fontWeight = 'bold';
             playerDiv.appendChild(unoText);
             setTimeout(() => unoText.remove(), 3000); // Remove UNO notif
         }
          // Send msg to other player
          showTemporaryMessage(`${data.email} called UNO!`, 'info');
     });


    socket.on('chooseColorRequest', () => {
        console.log("Server requests color choice.");
        if(messageArea) messageArea.textContent = 'Choose the next color:';
        if(colorPicker) colorPicker.style.display = 'block';
        if (drawButton) drawButton.disabled = true;     // disable actions when choosing colors
        if (unoButton) unoButton.disabled = true;
        if (playerHandElement) playerHandElement.querySelectorAll('.card').forEach(c => c.classList.add('disabled'));
    });

    socket.on('cardDrawn', (data) => {
         console.log("Drew a card:", data.card);
         showTemporaryMessage(data.message, 'info');
         // UI should update via next gameState emission to show new hand
     });

    socket.on('gameOver', (data) => {
        console.log("Game Over!", data);
        // Update UI handles displaying the final msg and disable controls based on state.isGameOver
        if (currentGameState) {
             currentGameState.isGameOver = true;
             currentGameState.winnerId = data.winnerId;
             currentGameState.message = data.message;
             updateUI(currentGameState);
        } else {
             if(messageArea) { // State fallback
                  messageArea.textContent = data.message;
                  messageArea.classList.add('game-over-message');
             }
        }
    });

    socket.on('gameError', (data) => {
        console.error('Game Error:', data.message);
         if(messageArea) messageArea.textContent = `Error: ${data.message}`;
         if(messageArea) messageArea.style.color = 'red';
    });

    // Handle case where server tells us the game doesn't exist or we can't join
    socket.on('gameNotFound', (data) => {
        console.error(`[Game Client] Socket Connection Error: ${err.message}`, err);
         if(messageArea) messageArea.textContent = `Error: ${data.message}. Redirecting home...`;
         if(drawButton) drawButton.disabled = true;     // Disable actions
         if(unoButton) unoButton.disabled = true;
         if(colorPicker) colorPicker.style.display = 'none';
         if(playerHandElement) playerHandElement.innerHTML = '';
         setTimeout(() => { window.location.href = '/home'; }, 3000);
    });

    socket.on('playerDisconnected', (data) => {
         console.warn('Player Disconnected:', data.email);
         // Disconnect is handled by server
    });

    socket.on('disconnect', (reason) => {
        console.error('Disconnected from server:', reason);
        if(messageArea && !currentGameState?.isGameOver) {
             messageArea.textContent = 'Disconnected from server. Trying to reconnect now.';
             messageArea.style.color = 'red';
        }
        hasSentReady = false;
    });


    // Event Listeners

    // Click on a card in hand
    if (playerHandElement) {
        playerHandElement.addEventListener('click', (event) => {
            console.log('[Client CLICK] Hand clicked.');
            if (!isMyTurn || !gameId) return; // Only allow clicks if it's our turn

            const cardElement = event.target.closest('.card');
            if (!cardElement) {
                console.log('[Client CLICK] Click was not on a card element.');
                return;
            } 
            console.log('[Client CLICK] Card element found:', cardElement);

            if (!isMyTurn) {
                console.log('[Client CLICK] Blocked: Not my turn.');
                return;
            }
            if (cardElement.classList.contains('disabled')) {
                console.log('[Client CLICK] Blocked: Card has "disabled" class.');
                return;
            }
            if (!gameId) {
                console.log('[Client CLICK] Blocked: gameId is null.');
                return;
           }
           if (!currentGameState || currentGameState.isGameOver) {
               console.log('[Client CLICK] Blocked: Game state invalid or game over.');
                return;
           }

            const cardId = cardElement.dataset.cardId;
            const cardData = currentGameState?.yourHand?.find(c => c.id === cardId);
            if (!cardId) {
                console.error('[Client CLICK] CRITICAL: cardId not found in dataset!', cardElement);
                 return;
            }
            if (!cardData) {
                console.error("Clicked card data not found in state!");
                return;
            }
            console.log(`[Client CLICK] Card ID: ${cardId}, Card Data:`, cardData);
            console.log(`[Client CLICK] Emitting "playCard" for CardID=${cardId}, GameID=${gameId}`);

            // Disable actions to prevent double clicks
            drawButton.disabled = true;
            unoButton.disabled = true;
            playerHandElement.querySelectorAll('.card').forEach(c => c.classList.add('disabled'));

            console.log(">>> Emitting playCard from HAND CLICK <<<");
            if (cardData.color === 'wild') { // Sent data for wild card
                socket.emit('playCard', { gameId, cardId });
                cardToPlayAfterColorChoice = cardData;
            } else {
                socket.emit('playCard', { gameId, cardId }); // Sent data for standard cards
                cardToPlayAfterColorChoice = null;
            }
        });
    }

    // Draw button
    if (drawButton) {
        drawButton.addEventListener('click', () => {
            if (drawButton.disabled || !gameId || !isMyTurn) return;
            console.log("Attempting to draw card");

            // Disable actions
            drawButton.disabled = true;
            unoButton.disabled = true;
            playerHandElement.querySelectorAll('.card').forEach(c => c.classList.add('disabled'));

            console.log(">>> Emitting drawCard from DRAW BUTTON CLICK <<<");
            socket.emit('drawCard', { gameId });
        });
    }

    // Uno button
    if (unoButton) {
        unoButton.addEventListener('click', () => {
            if (unoButton.disabled || !gameId || !isMyTurn) return;
            console.log("Calling UNO!");
            socket.emit('callUno', { gameId });
            // Disable button temporarily after clicking to prevent spam
            unoButton.disabled = true;
            setTimeout(() => { // Enable button again based on next game state if still relevant
                 if (isMyTurn && currentGameState && currentGameState.yourHand && currentGameState.yourHand.length <= 2) {
                     unoButton.disabled = false;
                 }
             }, 1500);
        });
    }

    // Color Picker buttons
    if (colorPicker) {
        colorPicker.addEventListener('click', (event) => {
            const targetButton = event.target.closest('button');
            if (targetButton && targetButton.dataset.color) {
                const chosenColor = targetButton.dataset.color;
                console.log(`Color chosen: ${chosenColor}`);
                colorPicker.style.display = 'none';

                if (cardToPlayAfterColorChoice) { // Wild was played by user
                    socket.emit('playCard', {
                        gameId,
                        cardId: cardToPlayAfterColorChoice.id,
                        chosenColor: chosenColor
                    });
                    cardToPlayAfterColorChoice = null; // Clear stored card
                } else { // Wild was top card
                    socket.emit('chooseColor', { gameId, color: chosenColor });
                }
            }
        });
    }
    // ======== CHAT FEATURE ========
//     const chatBox = document.getElementById("chat-box");
//     const chatInput = document.getElementById("chat-input");
//     const chatSend = document.getElementById("chat-send");
//
// // Get username and use gameId as room
//     const username = sessionStorage.getItem("username") || prompt("Enter your name:");
//     sessionStorage.setItem("username", username);
//     sessionStorage.setItem("roomId", gameId); // Store room if not already
//
//     const room = sessionStorage.getItem("roomId");
//
//     if (room && username) {
//         socket.emit("joinRoom", { room, username });
//     }
//
// // Receive messages
//     socket.on("chatMessage", (msg) => {
//         if (chatBox) {
//             chatBox.innerHTML += `<p>${msg}</p>`;
//             chatBox.scrollTop = chatBox.scrollHeight;
//         }
//     });
//
// // Send messages
//     if (chatSend && chatInput) {
//         chatSend.addEventListener("click", () => {
//             const message = chatInput.value;
//             if (message.trim()) {
//                 socket.emit("chatMessage", { room, username, message });
//                 chatInput.value = "";
//             }
//         });
//     }

        const chatIcon = document.getElementById('chat-icon');
        const chatContainer = document.getElementById('chat-container');
        const closeChat = document.getElementById('close-chat');
        const chatInput = document.getElementById('chat-input');
        const sendButton = document.getElementById('send-button');
        const chatMessages = document.getElementById('chat-messages');

        // Toggle chat window
        chatIcon.addEventListener('click', function() {
            if (chatContainer.style.display === 'flex') {
                chatContainer.style.display = 'none';
            } else {
                chatContainer.style.display = 'flex';
                chatInput.focus();
            }
        });

        // close chat window
        closeChat.addEventListener('click', function() {
            chatContainer.style.display = 'none';
        });

        // send message function
        function sendMessage() {
            const message = chatInput.value.trim();
            if (message) {
                // create message element
                const messageElement = document.createElement('div');
                messageElement.className = 'message player-message';
                messageElement.textContent = message;

                // add to chat
                chatMessages.appendChild(messageElement);

                // clear input
                chatInput.value = '';

                // Scroll to bottom
                chatMessages.scrollTop = chatMessages.scrollHeight;

                // Here you would also send the message via socket.io
                // socket.emit('chat message', message);

                // Mock response (in a real app, this would come from socket.io)
                setTimeout(() => {
                    const responseElement = document.createElement('div');
                    responseElement.className = 'message opponent-message';
                    responseElement.textContent = "I'm thinking about my next move...";
                    chatMessages.appendChild(responseElement);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }, 1000);
            }
        }

        // send button click
        sendButton.addEventListener('click', sendMessage);

        // enter key press in input
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });

    const avatarDiv = document.getElementById('player-avatar');

    fetch('/api/auth/me')
        .then(res => res.json())
        .then(data => {
            const avatarData = data.user?.avatarData;
            if (!avatarData || typeof avatarData !== 'object') {
                console.warn('No valid avatar data.');
                return;
            }

            const parts = ['skin', 'clothes', 'eyes', 'head', 'mouth'];

            parts.forEach(part => {
                if (avatarData[part]) {
                    const img = document.createElement('img');
                    img.src = avatarData[part];
                    img.alt = part;
                    avatarDiv.appendChild(img);
                }
            });
        })
        .catch(err => {
            console.error('Failed to load avatar:', err);
        });
});