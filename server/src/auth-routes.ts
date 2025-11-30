import express from 'express';
import db from './db.js';
import { hashPassword, verifyPassword, generateToken, requireAuth, AuthRequest } from './auth.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email und Passwort erforderlich' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user || !(await verifyPassword(password, user.password))) {
    return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
  }
  const token = generateToken(user.id, user.email);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

router.get('/me', requireAuth, (req: AuthRequest, res) => {
  const user = db.prepare('SELECT id, email, name, createdAt FROM users WHERE id = ?').get(req.userId) as any;
  if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
  res.json(user);
});

router.put('/me', requireAuth, async (req: AuthRequest, res) => {
  const { name, email } = req.body;
  try {
    const updates: string[] = [];
    const params: any[] = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (email !== undefined) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, req.userId) as any;
      if (existing) return res.status(400).json({ error: 'Email bereits vergeben' });
      updates.push('email = ?'); params.push(email);
    }
    if (updates.length > 0) {
      params.push(req.userId);
      const sql = 'UPDATE users SET ' + updates.join(', ') + ' WHERE id = ?';
      db.prepare(sql).run(...params);
    }
    const user = db.prepare('SELECT id, email, name, createdAt FROM users WHERE id = ?').get(req.userId) as any;
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Fehler' });
  }
});

router.post('/change-password', requireAuth, async (req: AuthRequest, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Aktuelles und neues Passwort erforderlich' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Neues Passwort muss mindestens 8 Zeichen lang sein' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId) as any;
  if (!user || !(await verifyPassword(currentPassword, user.password))) {
    return res.status(401).json({ error: 'Aktuelles Passwort ist falsch' });
  }
  const hashedPassword = await hashPassword(newPassword);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.userId);
  res.json({ success: true, message: 'Passwort erfolgreich geändert' });
});

router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Erfolgreich abgemeldet' });
});

export default router;
