import { Router } from 'express';
import { listLobbies, createLobby, joinLobby } from '../lib/lobbies';
import { ensureAuthenticated } from '../server/middleware/authMiddleware';

const router = Router();

/* ---------- static page ---------- */
router.get('/play', ensureAuthenticated, (_req, res) => {
  res.render('pages/play', { title: 'Play' });
});

/* ---------- JSON API ---------- */
router.get('/api/lobbies', ensureAuthenticated, (_req, res) => {
  res.json(listLobbies());
});

router.post('/api/lobbies', ensureAuthenticated, (req, res) => {
  const host = req.session.user?.email ?? 'Anonymous';   // <- email, not username
  const lobby = createLobby(host);
  res.status(201).json(lobby);
});

router.post('/api/lobbies/:id/join', ensureAuthenticated, (req, res) => {
  const lobby = joinLobby(req.params.id);
  if (!lobby) {
    res.status(404).json({ error: 'Lobby unavailable' });
    return;                        // <-- no Response value is returned
  }
  res.json(lobby);                 // <-- just send JSON
});

export default router;
