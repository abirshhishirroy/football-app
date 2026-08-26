import { Router } from 'express';
import { generateToken, registerUser, loginUser, authMiddleware, AuthRequest } from '../auth';

const router = Router();

router.post('/register', (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields required' });
    }
    const user = registerUser(email, password, name);
    const token = generateToken(user);
    res.json({ user, token });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const user = loginUser(email, password);
    const token = generateToken(user);
    res.json({ user, token });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

router.get('/me', authMiddleware, (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

export default router;
