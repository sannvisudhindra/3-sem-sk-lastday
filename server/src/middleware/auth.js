import { getSupabaseAdmin } from '../services/supabaseAdmin.js';
import { AppError } from './errorHandler.js';

// 30-second in-memory token cache (PRD §7.1)
const tokenCache = new Map();
const CACHE_TTL_MS = 30 * 1000;

function parseJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

/**
 * Verifies Bearer JWT using Supabase Auth with 30s in-memory caching.
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('UNAUTHENTICATED', 'Missing or invalid Authorization header'));
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return next(new AppError('UNAUTHENTICATED', 'Missing authentication token'));
  }

  const now = Date.now();
  const cached = tokenCache.get(token);
  if (cached && cached.expiresAt > now) {
    req.user = cached.user;
    req.token = token;
    req.jwtPayload = cached.jwtPayload;
    return next();
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return next(new AppError('UNAUTHENTICATED', 'Invalid or expired session token'));
    }

    const jwtPayload = parseJwtPayload(token) || {};
    const role = user.user_metadata?.role || jwtPayload.role || 'customer';

    const normalizedUser = {
      id: user.id,
      email: user.email,
      role,
      username: user.user_metadata?.username || user.email?.split('@')[0],
      fullName: user.user_metadata?.fullName || user.user_metadata?.full_name || '',
    };

    tokenCache.set(token, {
      user: normalizedUser,
      jwtPayload,
      expiresAt: now + CACHE_TTL_MS,
    });

    req.user = normalizedUser;
    req.token = token;
    req.jwtPayload = jwtPayload;
    next();
  } catch (err) {
    next(new AppError('UNAUTHENTICATED', 'Authentication verification failed'));
  }
}

/**
 * Validates single-device session against user_sessions table (PRD R20).
 * If user has claimed another session on a different device, returns 401 SESSION_REVOKED.
 */
export async function requireActiveSession(req, res, next) {
  if (!req.user) {
    return next(new AppError('UNAUTHENTICATED', 'Authentication required'));
  }

  // Get session_id from JWT payload claims or X-Session-Id header
  const sessionId =
    req.headers['x-session-id'] ||
    req.jwtPayload?.session_id ||
    req.jwtPayload?.user_metadata?.session_id;

  if (!sessionId) {
    // If no session_id is associated yet, allow through
    return next();
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: activeSession, error } = await supabase
      .from('user_sessions')
      .select('session_id, is_active')
      .eq('user_id', req.user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      // If table doesn't exist yet or query fails before migrations, don't crash
      req.log?.warn?.({ err: error }, 'Could not verify active session in DB');
      return next();
    }

    if (activeSession && activeSession.session_id !== sessionId) {
      return next(
        new AppError('SESSION_REVOKED', 'You have been signed out because you signed in on another device.')
      );
    }

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Role-based authorization middleware.
 * @param {'customer' | 'organiser' | Array<'customer' | 'organiser'>} allowedRoles
 */
export function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('UNAUTHENTICATED', 'Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError('FORBIDDEN', `Forbidden: requires ${roles.join(' or ')} role`));
    }
    next();
  };
}

