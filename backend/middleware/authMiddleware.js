import admin, { isFirebaseConfigured } from '../config/firebaseConfig.js';
import { verifyJwt } from '../controllers/authController.js';

/**
 * Verify Firebase ID token and check admin role in Firestore.
 */
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'daakukwaku7@gmail.com').toLowerCase();

async function verifyFirebaseAdmin(token) {
  if (!isFirebaseConfigured()) return null;

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    if (decoded.email?.toLowerCase() === ADMIN_EMAIL) {
      return { uid: decoded.uid, email: decoded.email, role: 'admin', source: 'firebase' };
    }
  } catch {
    // Not a valid Firebase token
  }
  return null;
}

/**
 * Try JWT first, then Firebase ID token.
 */
async function resolveAdmin(token) {
  try {
    const decoded = verifyJwt(token);
    if (decoded.role === 'admin') return { ...decoded, source: 'jwt' };
  } catch {
    // Not a JWT — try Firebase
  }
  return verifyFirebaseAdmin(token);
}

/**
 * Optional admin auth — sets req.isAdmin if valid token present.
 */
export async function optionalAuth(req, _res, next) {
  req.isAdmin = false;
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const adminUser = await resolveAdmin(token);
    if (adminUser) {
      req.isAdmin = true;
      req.admin = adminUser;
    }
  }

  next();
}

/**
 * Required admin auth — JWT or Firebase token with admin role.
 */
export async function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  const adminUser = await resolveAdmin(token);

  if (!adminUser) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }

  req.isAdmin = true;
  req.admin = adminUser;
  next();
}
