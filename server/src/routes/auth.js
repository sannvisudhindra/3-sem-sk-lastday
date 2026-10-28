import express from 'express';
import { z } from 'zod';
import { getSupabaseAdmin } from '../services/supabaseAdmin.js';
import { AppError } from '../middleware/errorHandler.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimiters.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const signupSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Alphanumeric and underscores only'),
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1),
  role: z.enum(['customer', 'organiser']).default('customer'),
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const roleSchema = z.object({
  role: z.enum(['customer', 'organiser']),
});

// POST /auth/signup (PRD §7.3)
router.post('/signup', authLimiter, validate(signupSchema), async (req, res, next) => {
  try {
    const { username, email, password, fullName, role } = req.body;
    const supabase = getSupabaseAdmin();

    // Check if username already exists in profiles
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', username)
      .maybeSingle();

    if (existingUser) {
      throw new AppError('VALIDATION_ERROR', 'Username is already taken', { field: 'username' });
    }

    // Create user via admin API with email confirmed
    const { data: created, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        role,
        fullName,
      },
    });

    if (error) {
      throw new AppError('VALIDATION_ERROR', error.message);
    }

    res.status(201).json({ ok: true, userId: created.user.id });
  } catch (err) {
    next(err);
  }
});

// POST /auth/username-login (PRD §7.3)
router.post('/username-login', authLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const supabase = getSupabaseAdmin();

    // Resolve username -> email
    let email = username;
    if (!username.includes('@')) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('email')
        .ilike('username', username)
        .maybeSingle();

      if (error || !profile?.email) {
        throw new AppError('UNAUTHENTICATED', 'Invalid username or password');
      }
      email = profile.email;
    }

    // Sign in with password
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      throw new AppError('UNAUTHENTICATED', 'Invalid username or password');
    }

    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: {
        id: data.user.id,
        role: data.user.user_metadata?.role || 'customer',
        username: data.user.user_metadata?.username,
        fullName: data.user.user_metadata?.fullName,
        email: data.user.email,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /auth/role (PRD §7.3: One-time role pick for OAuth sign-ups)
router.post('/role', requireAuth, validate(roleSchema), async (req, res, next) => {
  try {
    const { role } = req.body;
    const supabase = getSupabaseAdmin();

    // Update user metadata in auth
    await supabase.auth.admin.updateUserById(req.user.id, {
      user_metadata: { ...req.jwtPayload?.user_metadata, role },
    });

    // Update profiles table
    const { data: profile, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) {
      throw new AppError('INTERNAL_ERROR', 'Failed to update user role');
    }

    req.user.role = role;
    res.json({ profile });
  } catch (err) {
    next(err);
  }
});

// GET /me (PRD §7.3)
router.get('/me', requireAuth, (req, res) => {
  res.json({
    id: req.user.id,
    role: req.user.role,
    username: req.user.username,
    fullName: req.user.fullName,
    email: req.user.email,
  });
});

export default router;

