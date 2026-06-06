import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@campaignhub.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme123';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password required' });
  }

  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const token = jwt.sign({ email, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });

  res.json({
    success: true,
    data: { token, email, role: 'admin' },
  });
}

export async function verifyToken(req, res) {
  res.json({
    success: true,
    data: { email: req.admin.email, role: req.admin.role },
  });
}

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyJwt(token) {
  return jwt.verify(token, JWT_SECRET);
}
