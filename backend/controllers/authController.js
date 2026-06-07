import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

function getAuthConfig() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const jwtSecret = process.env.JWT_SECRET;

  if (!email || !password || !jwtSecret) {
    return null;
  }

  return { email, password, jwtSecret };
}

export async function login(req, res) {
  const authConfig = getAuthConfig();
  if (!authConfig) {
    return res.status(503).json({
      success: false,
      message: 'Admin login is not configured. Set ADMIN_EMAIL, ADMIN_PASSWORD, and JWT_SECRET.',
    });
  }

  const { email, password, jwtSecret } = authConfig;
  const { email: bodyEmail, password: bodyPassword } = req.body;

  if (!bodyEmail || !bodyPassword) {
    return res.status(400).json({ success: false, message: 'Email and password required' });
  }

  if (bodyEmail !== email || bodyPassword !== password) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const token = jwt.sign({ email, role: 'admin' }, jwtSecret, { expiresIn: '24h' });

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
  const authConfig = getAuthConfig();
  if (!authConfig) {
    throw new Error('JWT auth is not configured');
  }
  return jwt.sign(payload, authConfig.jwtSecret, { expiresIn: '24h' });
}

export function verifyJwt(token) {
  const authConfig = getAuthConfig();
  if (!authConfig) {
    throw new Error('JWT auth is not configured');
  }
  return jwt.verify(token, authConfig.jwtSecret);
}
