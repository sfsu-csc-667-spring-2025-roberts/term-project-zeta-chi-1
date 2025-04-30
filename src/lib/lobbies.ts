// src/lib/lobbies.ts
export interface Lobby {
    id: string;
    host: string;
    players: number;
    status: 'waiting' | 'playing';
  }
  
  let lobbies: Lobby[] = [];
  
  export const listLobbies = (): Lobby[] => lobbies;
  
  export const createLobby = (host: string): Lobby => {
    const id = Math.random().toString(36).slice(2, 6) + '-uno';
    const lobby: Lobby = { id, host, players: 1, status: 'waiting' };
    lobbies.push(lobby);
    return lobby;
  };
  
  export const joinLobby = (id: string): Lobby | undefined => {
    const lobby = lobbies.find(l => l.id === id && l.status === 'waiting');
    if (!lobby) return;
    lobby.players += 1;
    lobby.status = 'playing';
    return lobby;
  };
  