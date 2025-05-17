"use strict";
// src/game/unoGame.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnoGame = void 0;
const COLORS = ['red', 'green', 'blue', 'yellow'];
const VALUES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'];
const WILD_VALUES = ['wild', 'draw4'];
class UnoGame {
    constructor(playerUsers, gameId) {
        this.players = [];
        this.currentColor = 'red';
        this.deck = [];
        this.discardPile = [];
        this.currentPlayerIndex = 0;
        this.direction = 1; // 1 is cw, -1 is ccw
        this.drawPileEmpty = false;
        this.isGameOver = false;
        this.winnerId = null;
        this.actionPending = false; // Prevents rapid actions
        this.id = gameId;
        this.players = playerUsers.map(p => ({
            id: p.user.id,
            email: p.user.email,
            socketId: p.socketId,
            hand: [],
            cardCount: 0, // default
            hasCalledUno: false,
        }));
        this.initializeGame();
    }
    createDeck() {
        const newDeck = [];
        let cardIdCounter = 0;
        // Number cards (one 0, two of 1-9 per color)
        COLORS.forEach(color => {
            newDeck.push({ id: `card-${cardIdCounter++}`, color, value: '0' });
            for (let i = 0; i < 2; i++) {
                VALUES.slice(1, 10).forEach(value => newDeck.push({ id: `card-${cardIdCounter++}`, color, value }));
                ['skip', 'reverse', 'draw2'].forEach(value => newDeck.push({ id: `card-${cardIdCounter++}`, color, value: value }));
            }
        });
        // Wild cards (4 of each)
        for (let i = 0; i < 4; i++) {
            newDeck.push({ id: `card-${cardIdCounter++}`, color: 'wild', value: 'wild' });
            newDeck.push({ id: `card-${cardIdCounter++}`, color: 'wild', value: 'draw4' });
        }
        return newDeck;
    }
    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]]; // Swap
        }
    }
    dealCards() {
        for (let i = 0; i < 7; i++) {
            this.players.forEach(player => {
                const card = this.drawCardFromDeck();
                if (card)
                    player.hand.push(card);
            });
        }
        this.players.forEach(p => p.cardCount = p.hand.length); // Update counts
        console.log(`[Game ${this.id} DEBUG] Hand sizes after deal:`);
        this.players.forEach(p => console.log(`  - ${p.email}: ${p.hand.length} cards`));
    }
    drawCardFromDeck() {
        if (this.deck.length === 0) {
            if (this.discardPile.length <= 1) { // No cards left
                this.drawPileEmpty = true;
                console.warn(`[Game ${this.id}] Draw pile and discard pile empty!`);
                return null;
            }
            // Reshuffle discard pile into deck (leave top card)
            const topCard = this.discardPile.pop();
            this.deck = this.discardPile.filter(card => card != null); // Remove nulls
            this.discardPile = [topCard]; // Reset discard pile with only the top card
            this.shuffleDeck();
            console.log(`[Game ${this.id}] Reshuffled discard pile into deck. New deck size: ${this.deck.length}`);
            if (this.deck.length === 0) { // Used if still empty after reshuffle
                this.drawPileEmpty = true;
                console.warn(`[Game ${this.id}] Deck still empty after reshuffle!`);
                return null;
            }
        }
        this.drawPileEmpty = false;
        return this.deck.pop();
    }
    initializeGame() {
        var _a, _b, _c;
        this.deck = this.createDeck();
        this.shuffleDeck();
        this.dealCards();
        // Starting card cannot be Wd4
        let topCard = this.drawCardFromDeck();
        while (topCard && topCard.value === 'draw4') {
            console.log(`[Game ${this.id}] First card was Wild Draw 4, putting back and reshuffling.`);
            this.deck.push(topCard);
            this.shuffleDeck();
            topCard = this.drawCardFromDeck();
        }
        if (!topCard) { // Runs if no cards from dealing first card, unlikely to happen
            console.error(`[Game ${this.id}] Could not draw initial card! Game cannot start.`);
            this.isGameOver = true;
            return;
        }
        console.log(`[Game ${this.id}] Initial card: ${topCard.color} ${topCard.value}`);
        this.discardPile.push(topCard);
        this.currentColor = topCard.color === 'wild' ? 'wild' : topCard.color; // Set initial color or wild if wild
        let initialActionApplied = false;
        // Handle special starting cards
        if (topCard.color !== 'wild') { // Non-wild action cards
            switch (topCard.value) {
                case 'skip':
                    console.log(`[Game ${this.id}] First card Skip, player 0 skipped.`);
                    this.currentPlayerIndex = (this.currentPlayerIndex + this.direction + this.players.length) % this.players.length;
                    initialActionApplied = true;
                    break;
                case 'reverse':
                    console.log(`[Game ${this.id}] First card Reverse.`);
                    if (this.players.length > 1) {
                        this.direction *= -1;
                        if (this.players.length === 2) { // Reverse acts like skip in 2p game
                            this.currentPlayerIndex = (this.currentPlayerIndex + this.direction + this.players.length) % this.players.length;
                            console.log(`[Game ${this.id}] Reverse in 2P game acts as Skip.`);
                        }
                    }
                    initialActionApplied = true;
                    break;
                case 'draw2':
                    console.log(`[Game ${this.id}] First card Draw 2, player 0 draws 2 and is skipped.`);
                    this.applyDraw(this.players[0], 2);
                    this.currentPlayerIndex = (this.currentPlayerIndex + this.direction + this.players.length) % this.players.length;
                    initialActionApplied = true;
                    break;
            }
        }
        else if (topCard.value === 'wild') { // Regular Wild card
            console.log(`[Game ${this.id}] First card Wild, player 0 must choose color.`);
            this.currentColor = 'wild';
            this.actionPending = true; // Wait for player 0 to choose color
            initialActionApplied = true;
        }
        if (!initialActionApplied) {
            this.currentPlayerIndex = 0; // First player starts if no initial action done
        }
        console.log(`[Game ${this.id}] Initialized. Starting player: ${(_a = this.players[this.currentPlayerIndex]) === null || _a === void 0 ? void 0 : _a.email}. Top card: ${(_b = this.getTopCard()) === null || _b === void 0 ? void 0 : _b.color} ${(_c = this.getTopCard()) === null || _c === void 0 ? void 0 : _c.value}. Current color: ${this.currentColor}`);
    }
    // State getters
    getGameState(playerId) {
        var _a;
        return {
            gameId: this.id,
            players: this.getPublicPlayerInfo(),
            currentPlayerId: this.isGameOver ? null : (_a = this.players[this.currentPlayerIndex]) === null || _a === void 0 ? void 0 : _a.id,
            topCard: this.getTopCard(),
            currentTurnPlayerIndex: this.currentPlayerIndex,
            direction: this.direction,
            currentColor: this.currentColor,
            isGameOver: this.isGameOver,
            winnerId: this.winnerId,
            drawPileSize: this.deck.length,
        };
    }
    // Used to send only public info + player hand
    getPersonalizedGameState(playerId) {
        const state = this.getGameState(playerId);
        const player = this.players.find(p => p.id === playerId);
        return Object.assign(Object.assign({}, state), { yourHand: player ? [...player.hand] : [] });
    }
    getPublicPlayerInfo() {
        return this.players.map(p => ({
            id: p.id,
            email: p.email,
            cardCount: p.hand.length,
        }));
    }
    getTopCard() {
        return this.discardPile.length > 0 ? this.discardPile[this.discardPile.length - 1] : null;
    }
    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex] || null;
    }
    // Game actions
    isValidMove(cardToPlay, player) {
        const topCard = this.getTopCard();
        if (!topCard)
            return false; // Shouldn't happen if running normally
        if (cardToPlay.color === 'wild') { // wild doesn't apply here
            return true;
        }
        // Must match color or value of the current color or top card value
        return cardToPlay.color === this.currentColor || cardToPlay.value === topCard.value;
    }
    // WD4 validity check
    canPlayWildDraw4(player) {
        const topCard = this.getTopCard();
        if (!topCard)
            return false; // Cannot play if no card down?
        // Player cannot play if they have card matching current top color
        const hasMatchingColorCard = player.hand.some(card => card.color === this.currentColor && card.color !== 'wild');
        // Player cannot play if they have card matching current top value
        const hasMatchingValueCard = player.hand.some(card => card.value === topCard.value && card.color !== 'wild');
        return !hasMatchingColorCard && !hasMatchingValueCard; // WD4 is only valid if both are true
    }
    playCard(playerId, cardId, chosenColor) {
        var _a;
        if (this.isGameOver || this.actionPending)
            return { success: false, message: 'Invalid move. Game over or action pending.' };
        const player = this.getCurrentPlayer();
        if (!player || player.id !== playerId) {
            return { success: false, message: 'Not your turn.' };
        }
        const cardIndex = player.hand.findIndex(c => c.id === cardId);
        if (cardIndex === -1) {
            return { success: false, message: 'Card not in hand.' };
        }
        const cardToPlay = player.hand[cardIndex];
        if (cardToPlay.value === 'draw4' && !this.canPlayWildDraw4(player)) { // Prevents illegal WD4 plays
            return { success: false, message: 'Invalid move. Cannot play Wild Draw 4 when you have other playable cards matching color or value.' };
        }
        if (!this.isValidMove(cardToPlay, player)) {
            return { success: false, message: `Invalid move. Must match ${this.currentColor} or ${(_a = this.getTopCard()) === null || _a === void 0 ? void 0 : _a.value}.` };
        }
        // Runs if play is valid
        this.actionPending = true; // Lock actions until this completes
        player.hand.splice(cardIndex, 1); // Remove card from hand
        player.cardCount = player.hand.length;
        this.discardPile.push(cardToPlay); // Add to discard pile
        // Check for uno call
        // Player must call Uno before playing their second-to-last card
        if (player.hand.length === 1 && !player.hasCalledUno) {
            console.log(`[Game ${this.id}] Player ${player.email} forgot to call Uno! Drawing penalty.`);
            this.applyDraw(player, 2); // penalty applied
        }
        // Check uno call on next turn for >1 cards
        if (player.hand.length > 1) {
            player.hasCalledUno = false;
        }
        // Win check
        if (player.hand.length === 0) {
            this.isGameOver = true;
            this.winnerId = player.id;
            console.log(`[Game ${this.id}] Player ${player.email} wins!`);
            this.actionPending = false;
            return { success: true, message: 'Player wins!', cardPlayed: cardToPlay };
        }
        // Card fx, color matches played card
        this.currentColor = cardToPlay.color;
        let skipTurn = false;
        let needsColorChoice = false;
        let advanceTurn = true; // Standard cards lead to next turn
        switch (cardToPlay.value) {
            case 'skip':
                console.log(`[Game ${this.id}] ${player.email} played Skip.`);
                skipTurn = true;
                break;
            case 'reverse':
                console.log(`[Game ${this.id}] ${player.email} played Reverse.`);
                if (this.players.length > 1) {
                    this.direction *= -1;
                    if (this.players.length === 2) { // Skip in 2P game
                        skipTurn = true;
                    }
                }
                break;
            case 'draw2':
                console.log(`[Game ${this.id}] ${player.email} played Draw 2.`);
                const nextPlayerD2 = this.peekNextPlayer();
                if (nextPlayerD2)
                    this.applyDraw(nextPlayerD2, 2);
                skipTurn = true;
                break;
            case 'wild':
                console.log(`[Game ${this.id}] ${player.email} played Wild.`);
                this.currentColor = 'wild';
                if (!chosenColor || !COLORS.includes(chosenColor)) { // color not provided
                    needsColorChoice = true; // ask player to choose color
                    advanceTurn = false; // Don't advance turn until color is chosen
                }
                else { // color provided
                    this.currentColor = chosenColor;
                    console.log(`[Game ${this.id}] Color chosen: ${chosenColor}`);
                }
                break;
            case 'draw4':
                console.log(`[Game ${this.id}] ${player.email} played Wild Draw 4.`);
                const nextPlayerD4 = this.peekNextPlayer();
                if (nextPlayerD4)
                    this.applyDraw(nextPlayerD4, 4);
                skipTurn = true; // WD4 skips next player
                this.currentColor = 'wild';
                if (!chosenColor || !COLORS.includes(chosenColor)) { // color not provided
                    needsColorChoice = true; // ask player to choose color
                    advanceTurn = false; // Don't advance turn until color is chosen
                }
                else { // color provided
                    this.currentColor = chosenColor;
                    console.log(`[Game ${this.id}] Color chosen: ${chosenColor}`);
                }
                break;
        }
        if (advanceTurn) {
            this.nextTurn(skipTurn);
        }
        if (!needsColorChoice) {
            this.actionPending = false;
        }
        return { success: true, message: 'Card played.', cardPlayed: cardToPlay, needsColorChoice };
    }
    // Called after player responds to needsColorChoice
    setColorChoice(playerId, color) {
        console.log(`[UnoGame ${this.id} setColorChoice] Attempt by User=${playerId}, Color=${color}`);
        const player = this.players.find(p => p.id === playerId); // Find player by ID
        const topCard = this.getTopCard();
        // Determine whose turn it is when wild is played
        if (!this.actionPending || !topCard || topCard.color !== 'wild') {
            console.warn(`[UnoGame ${this.id} setColorChoice] Failed: No action pending, top card not wild, or other state issue.`);
            // Game state related so don't reset actionPending
            if (!this.actionPending)
                return { success: false, message: "No action pending for color choice." };
            return { success: false, message: 'Cannot choose color now.' };
        }
        // Validate color
        if (!COLORS.includes(color)) {
            console.warn(`[UnoGame ${this.id} setColorChoice] Failed: Invalid color '${color}'`);
            // Keep action pending to force player to choose again
            return { success: false, message: 'Invalid color chosen.' };
        }
        // Success path
        this.currentColor = color;
        console.log(`[UnoGame ${this.id} setColorChoice] Color chosen: ${color} by ${player === null || player === void 0 ? void 0 : player.email}`);
        // Check if turn is skipped based on WD4 played
        let skipTurn = false;
        if (topCard.value === 'draw4')
            skipTurn = true;
        console.log(`[UnoGame ${this.id} setColorChoice] Advancing turn. Skip flag: ${skipTurn}`);
        this.nextTurn(skipTurn);
        this.actionPending = false; // Reset actionPending because it was successful
        console.log(`[UnoGame ${this.id} setColorChoice] Action lock released.`);
        return { success: true, message: `Color set to ${color}.` };
    }
    drawCard(playerId) {
        console.log(`[UnoGame ${this.id} drawCard] Called by User=${playerId}`);
        // Initial checks
        if (this.isGameOver || this.actionPending) {
            const reason = this.isGameOver ? 'Game Over' : 'Action Pending';
            console.log(`[UnoGame ${this.id} drawCard] Blocked (${reason})`);
            return { success: false, message: 'Game over or action pending.' };
        }
        const player = this.getCurrentPlayer();
        if (!player || player.id !== playerId) {
            console.log(`[UnoGame ${this.id} drawCard] Blocked (Not player's turn)`);
            return { success: false, message: 'Not your turn.' };
        }
        // Check if draw is allowed, player must play if possible
        const canPlay = player.hand.some(card => this.isValidMove(card, player));
        if (canPlay) {
            console.log(`[UnoGame ${this.id} drawCard] Blocked (Player has a playable card)`);
            return { success: false, message: 'You have a playable card, you must play it instead of drawing.' };
        }
        // Set action pending, attempt drawCard
        console.log(`[UnoGame ${this.id} drawCard] Player ${player.email} has no playable cards. Drawing...`);
        this.actionPending = true;
        const drawnCard = this.drawCardFromDeck();
        // Draw handler
        if (drawnCard) { // Card was drawn successfully
            player.hand.push(drawnCard);
            player.cardCount = player.hand.length;
            player.hasCalledUno = false; // Drawing resets Uno call
            console.log(`[UnoGame ${this.id} drawCard] ${player.email} drew ${drawnCard.color} ${drawnCard.value} (ID: ${drawnCard.id})`);
            // Check if drawn card can be played
            if (this.isValidMove(drawnCard, player)) {
                console.log(`[UnoGame ${this.id} drawCard] Drawn card IS playable.`);
                // Handle draw card wild or wd4 needs color choice
                if (drawnCard.color === 'wild') {
                    console.log(`[UnoGame ${this.id} drawCard] Drawn card is Wild/WD4. Moving to discard, requesting color choice.`);
                    // Move card hand -> discard
                    const cardIndexDC = player.hand.findIndex(c => c.id === drawnCard.id);
                    if (cardIndexDC > -1)
                        player.hand.splice(cardIndexDC, 1);
                    player.cardCount = player.hand.length;
                    this.discardPile.push(drawnCard);
                    drawnCard.playedById = player.id; // Save who played card
                    this.currentColor = 'wild'; // Set color needed for wild
                    // Apply WD4 draw effect
                    if (drawnCard.value === 'draw4') {
                        console.log(`[UnoGame ${this.id} drawCard] Applying Wild Draw 4 effect.`);
                        const nextPlayer = this.peekNextPlayer();
                        if (nextPlayer)
                            this.applyDraw(nextPlayer, 4); // apply penalty
                    }
                    // Action lock remains + turn does not advance
                    return {
                        success: true,
                        message: `Drew ${drawnCard.value === 'wild' ? 'a Wild' : 'a Wild Draw 4'}. Choose a color.`,
                        drawnCard: null, // Card is now on discard, not just drawn
                        autoPlayedCard: drawnCard, // Indicates card was played
                        needsColorChoice: true
                    };
                }
                // Auto-play drawn non-wild card
                console.log(`[UnoGame ${this.id} drawCard] Auto-playing drawn card: ${drawnCard.color} ${drawnCard.value}`);
                // Move from hand to discard
                const cardIndexAP = player.hand.findIndex(c => c.id === drawnCard.id);
                if (cardIndexAP > -1)
                    player.hand.splice(cardIndexAP, 1);
                else
                    console.error(`[UnoGame ${this.id} drawCard] CRITICAL: Could not find drawn card in hand for auto-play!`);
                player.cardCount = player.hand.length;
                this.discardPile.push(drawnCard);
                drawnCard.playedById = player.id; // Mark who played
                this.currentColor = drawnCard.color; // Set color
                // No cards left Win check
                if (player.hand.length === 0) {
                    this.isGameOver = true;
                    this.winnerId = player.id;
                    console.log(`[UnoGame ${this.id} drawCard] *** PLAYER ${player.email} WINS (auto-play)! ***`);
                    this.actionPending = false;
                    return { success: true, message: 'Drew and auto-played final card! Player wins!', autoPlayedCard: drawnCard };
                }
                /*  UNO CHECK IF CARD IS AUTO-PLAYED
                    If auto-play results in 1 card, dont penalize immediately
                    Player never had a chance to call Uno, just ensure flag is false
                    The check in nextTurn handles penalties on the next player's turn if they haven't called it still */
                if (player.hand.length === 1) {
                    console.log(`[UnoGame ${this.id} drawCard] Auto-play resulted in 1 card. Setting hasCalledUno=false.`);
                    player.hasCalledUno = false;
                }
                else {
                    player.hasCalledUno = false; // Reset if > 1 card
                }
                // Apply effects (Skip, Reverse, Draw2)
                let skipTurn = false;
                switch (drawnCard.value) {
                    case 'skip':
                        console.log(`[UnoGame ${this.id} drawCard] Auto-played Skip.`);
                        skipTurn = true;
                        break;
                    case 'reverse':
                        console.log(`[UnoGame ${this.id} drawCard] Auto-played Reverse.`);
                        if (this.players.length > 1)
                            this.direction *= -1;
                        if (this.players.length === 2)
                            skipTurn = true;
                        break;
                    case 'draw2':
                        console.log(`[UnoGame ${this.id} drawCard] Auto-played Draw 2.`);
                        const nextPlayer = this.peekNextPlayer();
                        if (nextPlayer)
                            this.applyDraw(nextPlayer, 2);
                        skipTurn = true;
                        break;
                }
                // Advance turn, release locks
                this.nextTurn(skipTurn);
                this.actionPending = false;
                return {
                    success: true,
                    message: `Drew and auto-played ${drawnCard.color} ${drawnCard.value}.`,
                    autoPlayedCard: drawnCard, // Indicates card was played
                    drawnCard: null, // Not just drawn and held
                    turnPassed: false
                };
            }
            else { // Runs if drawn card is not playable
                console.log(`[UnoGame ${this.id} drawCard] Drawn card (${drawnCard.color} ${drawnCard.value}) is not playable. Turn passes.`);
                this.nextTurn(); // Turn ends
                this.actionPending = false; // Release locks
                return {
                    success: true,
                    message: 'Drew a card (not playable). Turn ended.',
                    drawnCard: drawnCard, // Let user know what was drawn
                    turnPassed: true
                };
            }
        }
        else { // Deck is empty when attempting drawCard
            console.log(`[UnoGame ${this.id} drawCard] Draw pile empty, turn passes.`);
            this.nextTurn(); // Next turn, cannot draw
            this.actionPending = false; // Release locks
            return {
                success: true,
                message: 'Draw pile is empty. Turn passed.',
                turnPassed: true
            };
        }
    }
    callUno(playerId) {
        var _a;
        const player = this.players.find(p => p.id === playerId);
        if (!player)
            return { success: false, message: 'Player not found.' };
        // Uno check, can only call on your turn with 1-2 cards left
        const isMyTurn = ((_a = this.getCurrentPlayer()) === null || _a === void 0 ? void 0 : _a.id) === playerId;
        if ((player.hand.length === 1 || player.hand.length === 2) && isMyTurn) {
            if (!player.hasCalledUno) {
                console.log(`[Game ${this.id}] ${player.email} called Uno!`);
                player.hasCalledUno = true;
                return { success: true, message: 'Uno called!' };
            }
            else {
                return { success: false, message: 'Already called Uno.' };
            }
        }
        else if (player.hand.length !== 1 && player.hand.length !== 2) {
            return { success: false, message: 'Must have 1 or 2 cards to call Uno.' };
        }
        else {
            return { success: false, message: 'Cannot call Uno right now (not your turn?).' };
        }
    }
    // Manage turns
    applyDraw(player, count) {
        console.log(`[Game ${this.id}] Applying draw ${count} to ${player.email}`);
        for (let i = 0; i < count; i++) {
            const card = this.drawCardFromDeck();
            if (card) { // Deck has cards left
                player.hand.push(card);
                console.log(`[Game ${this.id}]   Drew ${card.color} ${card.value}`);
            }
            else { // deck has no cards left
                console.warn(`[Game ${this.id}] Could not draw card ${i + 1}/${count} for ${player.email} - deck empty.`);
                break;
            }
        }
        player.cardCount = player.hand.length;
        player.hasCalledUno = false; // player is forced to draw so reset uno call
    }
    // Peek who is next w/o changing index
    peekNextPlayer() {
        const playersCount = this.players.length;
        if (playersCount === 0)
            return null;
        let nextIndex = (this.currentPlayerIndex + this.direction + playersCount) % playersCount;
        return this.players[nextIndex];
    }
    nextTurn(skipNextPlayer = false) {
        var _a, _b, _c;
        const playersCount = this.players.length;
        if (playersCount === 0 || this.isGameOver)
            return;
        const prevPlayerIndex = this.currentPlayerIndex;
        // Get index delta based on direction and skip
        let effectiveDirection = this.direction;
        let indexChange = effectiveDirection;
        if (skipNextPlayer) {
            indexChange += effectiveDirection; // Moves 2 steps in current direction
        }
        this.currentPlayerIndex = (this.currentPlayerIndex + indexChange + playersCount) % playersCount;
        // Uno penalty check, check that turn ended
        const previousPlayer = this.players[prevPlayerIndex];
        if (previousPlayer && previousPlayer.hand.length === 1 && !previousPlayer.hasCalledUno) {
            /*  This is essentially to fix the draw error auto-play with UNO
                Call with 2 cards remaining to avoid penalties              */
            console.log(`[Game ${this.id} nextTurn] Player ${previousPlayer.email} has 1 card but did not call Uno! Penalty.`);
            this.applyDraw(previousPlayer, 2); // Apply penalty
        }
        // Check for UNO calls that were missed by other players
        this.players.forEach((p, index) => {
            if (index !== this.currentPlayerIndex && p.hand.length === 1 && !p.hasCalledUno) {
                console.log(`[Game ${this.id}] Player ${p.email} forgot Uno on previous turn! Penalty.`);
                this.applyDraw(p, 2); // Apply penalty
            }
        });
        // Reset Uno call status for current player if they have > 1 card
        const currentPlayer = this.getCurrentPlayer();
        if (currentPlayer && currentPlayer.hand.length > 1) {
            currentPlayer.hasCalledUno = false;
        }
        console.log(`[Game ${this.id}] Turn advanced. Current player: ${(_a = this.players[this.currentPlayerIndex]) === null || _a === void 0 ? void 0 : _a.email} (Index: ${this.currentPlayerIndex})`);
        // Current player needs to choose color (usually this means game started with wild)
        if (this.currentColor === 'wild' && ((_b = this.getCurrentPlayer()) === null || _b === void 0 ? void 0 : _b.id)) {
            console.log(`[Game ${this.id}] Current player ${(_c = this.getCurrentPlayer()) === null || _c === void 0 ? void 0 : _c.email} needs to choose color.`);
            this.actionPending = true;
            // chooseColorRequest is handled by matchmaking.ts
        }
    }
    // Get player IDs for socket room
    getPlayerSocketIds() {
        return this.players.map(p => p.socketId);
    }
}
exports.UnoGame = UnoGame;
