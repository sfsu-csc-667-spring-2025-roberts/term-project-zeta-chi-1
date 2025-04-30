// import { Router } from 'express';
// import { ensureAuthenticated } from '../server/middleware/authMiddleware'; // ← adjust path if needed
// import { User } from '../types/user'; 

// const router = Router();

// /* ---------- view pages ---------- */
// router.get('/login',  (_req, res) => res.render('auth/login',    { title: 'Login'   }));
// router.get('/register', (_req, res) => res.render('auth/register', { title: 'Register' }));
// router.get('/signedin', (_req, res) => res.render('pages/signedin', { title: 'Dashboard', username: 'User' }));

// /* ---------- account page ---------- */
// router.get('/account', ensureAuthenticated, (req, res) => {
//   const user = req.session.user as User | undefined;

//   // runtime safety (should never fire because of middleware)
//   if (!user) return res.redirect('/login');

//   const { email, wins = 0, losses = 0 } = user;

//   res.render('pages/account', {
//     title: 'Account',
//     username: email.split('@')[0],
//     email,
//     wins,
//     losses,
//     played: wins + losses,
//     timePlayed: '—',
//   });
// });

// /* ---------- auth POST actions (stub) ---------- */
// router.post('/login', (req, res) => {
//   // TODO real login logic
//   console.log(req.body);
//   res.redirect('/signedin');
// });

// router.post('/register', (req, res) => {
//   // TODO save user
//   console.log(req.body);
//   res.redirect('/signedin');
// });

// /* ---------- logout ---------- */
// router.get('/logout', (req, res) => {
//   req.session?.destroy(() => {
//     res.clearCookie('connect.sid');
//     res.redirect('/');          // back to home page
//   });
// });

// export default router;

// routes/authentication.ts
import { Router } from 'express';
import { ensureAuthenticated } from '../server/middleware/authMiddleware';
import { User } from '../types/user';

const router = Router();

/* ←––– INSERT the two GET handlers right here –––– */
router.get('/login', (_req, res) =>
  res.render('auth/login', { title: 'Login' })
);

router.get('/register', (_req, res) =>
  res.render('auth/register', { title: 'Register' })
);

/* ---------- POST /login ---------- */
router.post('/login', (req, res) => { /* … */ });

/* ---------- POST /register ---------- */
router.post('/register', (req, res) => { /* … */ });

/* ---------- signed-in dashboard ---------- */
router.get('/signedin', ensureAuthenticated, (req, res) => { /* … */ });

/* ---------- account overview ---------- */
router.get('/account', ensureAuthenticated, (req, res) => { /* … */ });

export default router;