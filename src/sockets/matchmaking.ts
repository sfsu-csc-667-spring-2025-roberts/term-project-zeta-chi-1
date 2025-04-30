// src/sockets/matchmaking.ts

import { Server as SocketIOServer, Socket } from 'socket.io';
import { User } from '../types/user';
import { UnoGame } from '../game/unoGame';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db';

interface QueuedPlayer {
    user: User;
    socket: Socket;
    socketId: string;
}

const gameQueue: QueuedPlayer[] = [];
const activeGames: Map<string, UnoGame> = new Map(); // Store active games by gameId
const playerGameMap: Map<string, string> = new Map(); // Map player userId to gameId

const PLAYERS_PER_GAME = 2; // HOW MANY PLAYERS IN QUEUE TO START GAME WITH
                            // Need to increase if want more than 2 players in game
                                                            // Track which sockets expected to join games next
const pendingGameJoins: Map<string, string> = new Map();    // Map socketId to gameId

export function setupMatchmaking(io: SocketIOServer) {

    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id}`);
        const session = (socket.request as any).session;

        if (!session || !session.user) {
            console.log(`Socket ${socket.id} connection rejected - No user session.`);
            socket.disconnect(true);
            return;
        }

        const user: User = session.user;
        if (!user || !user.id) {
            console.log(`Socket ${socket.id} connection rejected - Invalid user session data.`);
             socket.disconnect(true);
             return;
        }
        console.log(`[Server Socket] User ${user.email} (${user.id}) associated with socket ${socket.id}`);


        socket.on('requestMyInfo', () => {
             const currentSession = (socket.request as any).session;
            if (currentSession && currentSession.user) {
                socket.emit('myInfo', { userId: currentSession.user.id, email: currentSession.user.email });
                console.log(`[Server Socket] Sent myInfo to: ${socket.id}`);
            } else {
                socket.emit('gameError', { message: 'Session expired or invalid. Cannot retrieve user info.'});
                console.warn(`[Server Socket] Session mismatch or missing for requestMyInfo. Socket: ${socket.id}, 
                    Expected UserID: ${user.id}, Session User: ${currentSession?.user?.id}`);
            }
        });


        // Queue logic
        socket.on('joinQueue', () => {
            // Check if already in game using userId map
            if (gameQueue.some(p => p.user.id === user.id) || playerGameMap.has(user.id)) {
                 console.log(`User ${user.email} already in queue or game.`);
                 socket.emit('queueUpdate', { message: 'Already in queue or game.' });
                 return;
             }

            console.log(`[Server Socket] User ${user.email} joining queue.`);
            gameQueue.push({ user, socket, socketId: socket.id });
            socket.emit('queueUpdate', { message: 'Joined queue. Waiting for players...', inQueue: true });

            if (gameQueue.length >= PLAYERS_PER_GAME) {
                console.log(`Queue full (${gameQueue.length}). Starting game...`);
                const playersForGame = gameQueue.splice(0, PLAYERS_PER_GAME);
                const gameId = `game-${uuidv4()}`;

                try {
                     // Store socketIDs incase needed
                     const game = new UnoGame(playersForGame.map(p => ({ user: p.user, socketId: p.socketId })), gameId);
                     activeGames.set(gameId, game);

                     console.log(`[Game ${gameId}] Created with players: ${playersForGame.map(p => p.user.email).join(', ')}`);

                     // Map userIds to gameId, tell clients where to navigate to
                     playersForGame.forEach(p => {
                         playerGameMap.set(p.user.id, gameId); // Map userId to gameId
                         pendingGameJoins.set(p.socketId, gameId); // Mark original socket as expecting join
                         p.socket.emit('gameStarting', { gameId });
                         console.log(`User ${p.user.email} mapped to game ${gameId}. Socket ${p.socketId} told to join.`);
                            // Don't join old socket to room here
                     });    // State is sent when client connects to game page and emits playerReadyForGame
                     

                 } catch (error) {
                    console.error(`[Game ${gameId}] Error creating game:`, error);
                    playersForGame.forEach(p => { // Check if added to playerGameMap to remove
                         playerGameMap.delete(p.user.id);
                         pendingGameJoins.delete(p.socketId);
                        p.socket.emit('gameError', { message: 'Failed to start game. Please try again.'});
                    });
                    activeGames.delete(gameId);
                 }
            } else {
                socket.emit('queueUpdate', { message: `Waiting for ${PLAYERS_PER_GAME - gameQueue.length} more player(s).`, inQueue: true });
            }
        });

        socket.on('leaveQueue', () => {
            const index = gameQueue.findIndex(p => p.user.id === user.id);
            if (index !== -1) {
                gameQueue.splice(index, 1);
                console.log(`User ${user.email} left queue.`);
                socket.emit('queueUpdate', { message: 'Left queue.', inQueue: false });
            }
        });

        // Handle if client is ready on game page
        socket.on('playerReadyForGame', ({ gameId }) => {
             console.log(`Socket ${socket.id} (User ${user.email}) signals ready for game ${gameId}`);
             const game = activeGames.get(gameId);
             const expectedGameId = playerGameMap.get(user.id); // Check user vs gameId, see if they can be in this game

             if (game && expectedGameId === gameId) {
                 // Find player in game instance by userId
                 const playerInGame = game.players.find(p => p.id === user.id);

                 if (playerInGame) {
                     // Update player socket ID in game state
                     console.log(`Updating socket ID for ${user.email} from ${playerInGame.socketId} to ${socket.id}`);
                     playerInGame.socketId = socket.id;

                     // Add new socket to game room
                     socket.join(gameId);
                     console.log(`Socket ${socket.id} successfully joined room ${gameId}`);

                     // Send personalized game state to specific client
                     socket.emit('gameState', game.getPersonalizedGameState(user.id));

                     // If this was player 0 getting ready, check if next player needs color choice
                     if (game.actionPending && game.getCurrentPlayer()?.id === user.id && game.currentColor === 'wild') {
                         console.log(`[Game ${gameId}] Requesting color choice from rejoining player ${user.email}`);
                         socket.emit('chooseColorRequest');
                     }

                 } else {
                     console.warn(`User ${user.email} sent ready for game ${gameId}, but not found in game players array.`);
                     socket.emit('gameNotFound', { message: `Error joining game ${gameId}: Player data not found.` });
                 }
             } else if (!game) {
                 console.warn(`User ${user.email} sent ready for game ${gameId}, but game instance not found.`);
                 socket.emit('gameNotFound', { message: `Game ${gameId} not found or has ended.` });
                 playerGameMap.delete(user.id); // Clean up map if game is gone
             } else {
                  console.warn(`User ${user.email} sent ready for game ${gameId}, but expected game was ${expectedGameId}.`);
                  socket.emit('gameError', { message: `Mismatch in game joining process.` });
             }
             pendingGameJoins.delete(socket.id); // Clean up by removing from pending list
        });


        // Game Actions handler
        socket.on('playCard', ({ gameId, cardId, chosenColor }) => {
            console.log(`[Server Socket] Received "playCard": User=${user?.email}, Socket=${socket.id}, Data=`, { gameId, cardId, chosenColor });

            // Game validation (user mapping, active sockets)
            const game = activeGames.get(gameId);
             if (!game || playerGameMap.get(user.id) !== gameId) {
                 console.warn(`[Server playCard] Error: Game ${gameId} not found or user ${user.email} not mapped.`);
                 socket.emit('gameError', { message: 'Game not found or you are not in it.' });
                 return;
             }
             const playerInGame = game.players.find(p => p.id === user.id);
             if (!playerInGame || playerInGame.socketId !== socket.id) {
                  console.warn(`[Server playCard] Error: Request from wrong/stale socket. User=${user.email}, ExpectedSocket=${playerInGame?.socketId}, ReceivedSocket=${socket.id}`);
                  socket.emit('gameError', { message: 'Outdated connection. Refresh may be needed.'});
                  return;
             }

            // playCard emitter
            console.log(`[Server playCard] Calling game.playCard for User=${user.id}, Card=${cardId}, Color=${chosenColor}`);
            const result = game.playCard(user.id, cardId, chosenColor);
            console.log(`[Server playCard] game.playCard result for User=${user.email}:`, result);

             if (result.success) {
                console.log(`[Server playCard] Play SUCCESS. Broadcasting gameState for Game=${gameId}. NeedsColor=${result.needsColorChoice}, GameOver=${game.isGameOver}`);
                emitGameState(io, game); // broadcast updated game state

                // Follow up actions handler (based on result)
                if (result.needsColorChoice) { // Wild card played needs color
                    console.log(`[Server playCard] Requesting color choice from Socket=${socket.id}`);
                    socket.emit('chooseColorRequest');
                } else if(game.isGameOver) { // Playing card results in win
                    console.log(`[Server playCard] Game is OVER. Calling handleGameOver for Game=${gameId}`);
                    handleGameOver(io, game); // Handle game over immediately
                }

            } else { // game.playCard returned false
                console.warn(`[Server playCard] Play FAILED for User=${user.email}. Reason: ${result.message}`);
                socket.emit('invalidMove', { message: result.message }); // Send specific error back
            }
        });

        socket.on('drawCard', ({ gameId }) => {
            console.log(`[Server Socket] Received "drawCard": User=${user?.email}, Socket=${socket.id}, GameID=${gameId}`);
            const game = activeGames.get(gameId);
             if (!game || playerGameMap.get(user.id) !== gameId) { // Validation (game, user mapping, active sockets)
                 console.warn(`[Server drawCard] Error: Game ${gameId} not found or user ${user.email} not mapped.`);
                 socket.emit('gameError', { message: 'Game not found or you are not in it.' });
                 return;
             }
             const playerInGame = game.players.find(p => p.id === user.id);
             if (!playerInGame || playerInGame.socketId !== socket.id) {
                  console.warn(`[Server drawCard] Error: Request from wrong/stale socket. User=${user.email}, ExpectedSocket=${playerInGame?.socketId}, ReceivedSocket=${socket.id}`);
                  socket.emit('gameError', { message: 'Outdated connection. Refresh may be needed.'});
                  return;
             }

            // Call game drawCard
            const result = game.drawCard(user.id);
            console.log(`[Server drawCard] game.drawCard result for User=${user.email}:`, result);

            if (result.success) {
                // Emit updated game state
                console.log(`[Server drawCard] Draw success for ${user.email}. Broadcasting gameState.`);
                emitGameState(io, game);

                // Specific outcomes of drawing cards

                if (result.needsColorChoice) { // Auto played Wild/WD4, needs color
                    console.log(`[Server drawCard] Requesting color choice from Socket=${socket.id} after drawing Wild.`);
                    socket.emit('chooseColorRequest');
                    socket.emit('actionResult', { message: result.message });
                } else if (result.autoPlayedCard) { // Non-wild auto played card
                    console.log(`[Server drawCard] Auto-play occurred for ${user.email}. Sending result message.`);
                    socket.emit('actionResult', { message: result.message });
                    if (game.isGameOver) { // check if this results in a win
                        console.log(`[Server drawCard] Game is OVER after auto-play. Calling handleGameOver.`);
                        handleGameOver(io, game);
                    }
                } else if (result.drawnCard && result.turnPassed) { // Drew a non-playable card
                    console.log(`[Server drawCard] Drawn non-playable card for ${user.email}. Sending result message.`);
                    socket.emit('actionResult', { message: result.message });
                } else if (result.turnPassed) { // Empty deck
                    console.log(`[Server drawCard] Turn passed for ${user.email} (empty deck?). Sending result message.`);
                    socket.emit('actionResult', { message: result.message });
                }
            } else { // user had playable card, drawCard returned false
                console.warn(`[Server drawCard] Draw FAILED for User=${user.email}. Reason: ${result.message}`);
                socket.emit('invalidMove', { message: result.message });
           }
        });

        socket.on('chooseColor', ({ gameId, color }) => {
            console.log(`[Server Socket] Received "chooseColor": User=${user?.email}, Socket=${socket.id}, Data=`, { gameId, color });
            const game = activeGames.get(gameId);
            // Validation (game, user mapping, active sockets)
            if (!game || playerGameMap.get(user.id) !== gameId) { /* ... emit gameError ... */ return; }
            const playerInGame = game.players.find(p => p.id === user.id);
            if (!playerInGame || playerInGame.socketId !== socket.id) { /* ... emit gameError ... */ return; }

            const result = game.setColorChoice(user.id, color);
            console.log(`[Server chooseColor] game.setColorChoice result for User=${user.email}:`, result);

            if (result.success) {
                console.log(`[Server chooseColor] Success. Broadcasting gameState for Game=${gameId}.`);
                emitGameState(io, game);
                if (game.isGameOver) { // check if color choice ended game
                    console.log(`[Server chooseColor] Game is OVER after color choice. Calling handleGameOver for Game=${gameId}`);
                    handleGameOver(io, game);
                }
            }
            else { // Color choice fail
                console.warn(`[Server chooseColor] FAILED for User=${user.email}. Reason: ${result.message}`);
                socket.emit('invalidMove', { message: result.message });
            }
        });

        socket.on('callUno', ({ gameId }) => {
            const game = activeGames.get(gameId);
             if (!game || playerGameMap.get(user.id) !== gameId) { return; }
             const playerInGame = game.players.find(p => p.id === user.id);
             if (!playerInGame || playerInGame.socketId !== socket.id) { return; }

             const result = game.callUno(user.id);
             console.log(`[Game ${gameId}] callUno attempt by ${user.email}: ${result.message}`);

             if (result.success) {
                 io.to(gameId).except(socket.id).emit('playerCalledUno', { playerId: user.id, email: user.email });
                 socket.emit('actionResult', { message: result.message });
             } else { // calling uno was not successful
                  socket.emit('invalidMove', { message: result.message });
             }
        });


        // Disconnect handler
        socket.on('disconnect', (reason) => {
            const disconnectedUser = user; // Use user, captured at connection time
            console.log(`[Server Socket] Disconnect Event: Socket=${socket.id}, User=${disconnectedUser?.email}, Reason=${reason}`);

            // Remove pending
            if (pendingGameJoins.has(socket.id)) {
                const pendingGameId = pendingGameJoins.get(socket.id);
                console.log(`[Server Disconnect] Socket ${socket.id} (User ${disconnectedUser?.email}) disconnected while pending join for game ${pendingGameId}. Removed.`);
                pendingGameJoins.delete(socket.id);
                return; // Do not end game in case of reconnect with a new socketId
            }           // Stop disconnect processing for this socketId

            // Check queue
            const queueIndex = gameQueue.findIndex(p => p.socketId === socket.id);
            if (queueIndex !== -1) {
                 console.log(`[Server Disconnect] User ${disconnectedUser?.email} removed from queue.`);
            }

            // Check active games using userId
            if (!disconnectedUser || !disconnectedUser.id) {
                 console.log(`[Server Disconnect] Cannot process game disconnect for socket ${socket.id} - User info unavailable.`);
                 return;
            }
            const gameId = playerGameMap.get(disconnectedUser.id); // Find game from userId
            console.log(`[Server Disconnect] Checking active game for User ${disconnectedUser.email}. Found GameID: ${gameId}`);

            if (gameId) {
                const game = activeGames.get(gameId);
                if (!game) { // check if game instance exists
                    console.warn(`[Server Disconnect] Game ${gameId} found in map for User ${disconnectedUser.email}, but not in activeGames. Cleaning map.`);
                    playerGameMap.delete(disconnectedUser.id);
                    return;
                }

                const playerInGame = game.players.find(p => p.id === disconnectedUser.id);

                if (!playerInGame) { // Check for player data found in game
                    console.warn(`[Server Disconnect] Game ${gameId} found, User ${disconnectedUser.email} in map, but player data missing in game instance! Cleaning map.`);
                    playerGameMap.delete(disconnectedUser.id);
                    return;
                }

                console.log(`[Server Disconnect] Player ${disconnectedUser.email} found in Game ${gameId}. Current Socket in Game: ${playerInGame.socketId}. Disconnecting Socket: ${socket.id}`);

                // Check to end game, only if disconnected socket is currently active for this player and game isn't over
                if (!game.isGameOver && playerInGame.socketId === socket.id) {
                    console.log(`[Server Disconnect] *** ACTIVE socket disconnected for ${disconnectedUser.email} in running game ${gameId}. Ending game. ***`);
                    game.isGameOver = true; // Mark game as over
                    const remainingPlayers = game.players.filter(p => p.id !== disconnectedUser.id);
                    if (remainingPlayers.length === 1) {
                        game.winnerId = remainingPlayers[0].id;
                        console.log(`[Server Disconnect] Winner by disconnect: ${remainingPlayers[0].email}`);
                    } else {
                        game.winnerId = null; // No winner if !1 remain
                        console.log(`[Server Disconnect] No winner assigned for game ${gameId}`);
                    }

                    // Call game over, pass disconnected player as loser
                    handleGameOver(io, game, disconnectedUser.id);

                    // Notify players about opponent disconnect
                    remainingPlayers.forEach(p => {
                         const playerSocket = io.sockets.sockets.get(p.socketId);
                         if (playerSocket) {
                             console.log(`[Server Disconnect] Notifying ${p.email} about disconnect.`);
                             playerSocket.emit('playerDisconnected', {
                                 email: disconnectedUser.email ?? 'A player',
                                 message: `Game ended because ${disconnectedUser.email ?? 'a player'} disconnected.`
                             });
                         } else {
                              console.warn(`[Server Disconnect] Could not find socket ${p.socketId} to notify player ${p.email}`);
                         }
                     });
                } else if (game.isGameOver && playerInGame.socketId === socket.id) {
                     console.log(`[Server Disconnect] Active socket ${socket.id} for ${disconnectedUser.email} disconnected after game ${gameId} was already over.`);
                } else if (playerInGame.socketId !== socket.id) { // Runs if stale/old socket
                     console.log(`[Server Disconnect] Stale/Old socket ${socket.id} for ${disconnectedUser.email} disconnected. Active socket is ${playerInGame.socketId}. Ignoring for game state.`);
                } else {
                     console.log(`[Server Disconnect] Disconnect condition not met for game action. Game Over: ${game.isGameOver}, Socket Match: ${playerInGame.socketId === socket.id}`);
                }

            } else {
                 console.log(`[Server Disconnect] User ${disconnectedUser.email} not found in playerGameMap.`);
            }
        });
    });
}

function emitGameState(io: SocketIOServer, game: UnoGame | undefined) {
    if (!game || game.isGameOver) {
        console.log(`[Game ${game?.id}] Skipping emitGameState (game over or doesn't exist).`);
        return;
    }

    game.players.forEach(player => {
         const playerSocket = io.sockets.sockets.get(player.socketId); // Get player from stored socketId
         if (playerSocket) {
             playerSocket.emit('gameState', game.getPersonalizedGameState(player.id));
         } else {
             console.warn(`[Game ${game.id}] Socket not found for player ${player.email} (ID: ${player.socketId}) during gameState broadcast.`);
         }
     });

    console.log(`[Game ${game.id}] Broadcasted game state to ${game.players.length} players.`);
}

async function handleGameOver(io: SocketIOServer, game: UnoGame | undefined, LoserId?: string | null) { 
    if (!game || !game.isGameOver) return;

    const gameId = game.id; // Store game id before deleted
    console.log(`[Game ${gameId}] handleGameOver called. Winner ID: ${game.winnerId}, Loser ID: ${LoserId}`);


    const winner = game.players.find(p => p.id === game.winnerId);
    const loserIds = LoserId
        ? [LoserId]
        : game.players.filter(p => p.id !== game.winnerId).map(p => p.id);

    try { // Update DB with W/L
         if (winner) {
             await pool.query('UPDATE users SET wins = wins + 1 WHERE id = $1', [winner.id]);
             console.log(`[DB] Incremented wins for ${winner.email} (${winner.id})`);
         }
         const validLoserIds = loserIds.filter(id => id != null);
         if (validLoserIds.length > 0) {
             const placeholders = validLoserIds.map((_, i) => `$${i + 1}`).join(',');
             await pool.query(`UPDATE users SET losses = losses + 1 WHERE id IN (${placeholders})`, validLoserIds);
             console.log(`[DB] Incremented losses for IDs: ${validLoserIds.join(', ')}`);
         }
     } catch (dbError) { // Couldn't update DB with W/L
         console.error(`[Game ${gameId}] Failed to update win/loss stats in DB:`, dbError);
     }

     const gameOverMessage = `GAME OVER! ${winner ? `${winner.email}` : (LoserId ? 'Ended by disconnect.' : 'Draw?')}`;
     const playerSocketsToNotify = [...game.players];

     playerSocketsToNotify.forEach(player => {
         const playerSocket = io.sockets.sockets.get(player.socketId);
         playerSocket?.emit('gameOver', {
             winnerId: game.winnerId,
             winnerEmail: winner?.email,
             message: gameOverMessage,
         });
     });


    // Clean up game rsc on 5sec delay
    setTimeout(() => {
        // Check if game instance already deleted in case of concurrent call
        const gameToDelete = activeGames.get(gameId);
        if (!gameToDelete) {
             console.log(`[Game ${gameId}] Already cleaned up.`);
             return;
        }
        console.log(`[Game ${gameId}] Cleaning up resources after delay...`);
        // Use copied list of players for cleanup
        playerSocketsToNotify.forEach(player => {
            const sock = io.sockets.sockets.get(player.socketId);
            sock?.leave(gameId); // Clean socket from room
            playerGameMap.delete(player.id); // Clean user from game map
            pendingGameJoins.delete(player.socketId); // Clean pending joins
        });
        activeGames.delete(gameId); // Clean game instance
         console.log(`[Game ${gameId}] Removed after completion/disconnect cleanup.`);
    }, 5000);
}