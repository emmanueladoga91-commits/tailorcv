'use strict';
// ═══════════════════════════════════════════════════════════════
//  ApplyStack Express Backend
//  Auth · Claude AI Proxy · Stripe Subscriptions · PostgreSQL
// ═══════════════════════════════════════════════════════════════
const express    = require('express');
const path       = require('path');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const crypto     = require('crypto');
const { Pool }   = require('pg');
const Stripe     = require('stripe');
const rateLimit  = require('express-rate-limit');
const cors       = require('cors');

// ── Referral code generator ────────────────────────────────────
function genReferralCode() {
  // 8-char alphanumeric, URL-safe, case-insensitive
  return crypto.randomBytes(5).toString('base64url').toUpperCase().slice(0, 8).replace(/[^A-Z0-9]/g, 'X');
}

// ── Load env ───────────────────────────────────────────────────
try { require('dotenv').config(); } catch(e) {}

const PORT         = process.env.PORT          || 3000;
const JWT_SECRET   = process.env.JWT_SECRET    || 'CHANGE_THIS_SECRET_IN_PRODUCTION';
const CLAUDE_KEY   = process.env.CLAUDE_API_KEY;
const APP_URL      = process.env.APP_URL       || `http://localhost:${PORT}`;
const ADMIN_SECRET = process.env.ADMIN_SECRET  || '';
const OWNER_EMAIL  = (process.env.OWNER_EMAIL  || '').toLowerCase();
const RESEND_KEY   = process.env.RESEND_API_KEY || '';
const CRON_SECRET  = process.env.CRON_SECRET   || '';
const stripe       = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

// ── PostgreSQL pool ────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// ── Create tables on startup ───────────────────────────────────
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id                     SERIAL PRIMARY KEY,
      email                  TEXT   UNIQUE NOT NULL,
      password_hash          TEXT   NOT NULL,
      plan                   TEXT   NOT NULL DEFAULT 'free',
      stripe_customer_id     TEXT,
      stripe_subscription_id TEXT,
      subscription_status    TEXT,
      tailoring_count        INTEGER NOT NULL DEFAULT 0,
      created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS beta_codes (
      id         SERIAL PRIMARY KEY,
      code       TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      used_by    TEXT,
      used_at    TIMESTAMPTZ
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS saved_resumes (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL,
      name       TEXT NOT NULL,
      content    TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  // Onboarding email stage tracker (0=none,1=welcome sent,2=day-2 sent,3=day-7 sent)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_stage INTEGER NOT NULL DEFAULT 0;`);
  // Referral columns (idempotent — ADD COLUMN IF NOT EXISTS)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_credits INTEGER NOT NULL DEFAULT 0;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by INTEGER;`);
  // Back-fill referral codes for existing users who don't have one
  await pool.query(`
    UPDATE users SET referral_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8))
    WHERE referral_code IS NULL;
  `);
  // Unique index (idempotent)
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS users_referral_code_idx ON users(referral_code);`);
  // Career Data Vault — JSONB column on users (stored alongside the user row)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS career_vault JSONB;`);
  console.log('Database ready.');
})().catch(err => { console.error('DB init error:', err); process.exit(1); });

// ══════════════════════════════════════════════════════════════
//  EMAIL — Resend HTTP API (no SDK needed)
// ══════════════════════════════════════════════════════════════
async function sendEmail(to, subject, html) {
  if (!RESEND_KEY) return; // silently skip if not configured
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    'ApplyStack <hello@applystack.ai>',
        to:      [to],
        subject,
        html,
      }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      console.error('Resend error:', err);
    }
  } catch (e) {
    console.error('Email send error:', e.message);
  }
}

// ── Email wrapper ─────────────────────────────────────────────
function emailBase(content) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;background:#f8fafc;margin:0;padding:40px 20px;}
  .wrap{max-width:560px;margin:0 auto;}
  .card{background:#fff;border-radius:16px;padding:40px 36px;border:1px solid #e2e8f0;}
  .logo{font-size:1.4rem;font-weight:900;color:#1a2744;margin-bottom:28px;}
  .logo span{color:#4f6ef7;}
  h2{font-size:1.4rem;font-weight:800;color:#1a2744;margin:0 0 14px;}
  p{font-size:.95rem;color:#475569;line-height:1.7;margin:0 0 16px;}
  .btn{display:inline-block;background:#4f6ef7;color:#fff;text-decoration:none;padding:14px 28px;border-radius:50px;font-weight:700;font-size:.95rem;margin:8px 0 20px;}
  .tip{background:#f0f4ff;border-left:3px solid #4f6ef7;padding:14px 16px;border-radius:0 8px 8px 0;margin:18px 0;}
  .tip p{margin:0;font-size:.88rem;color:#1a2744;}
  ul{padding-left:20px;} li{font-size:.9rem;color:#475569;margin-bottom:8px;line-height:1.6;}
  .footer{margin-top:24px;font-size:.78rem;color:#94a3b8;text-align:center;line-height:1.7;}
  .footer a{color:#94a3b8;}
</style></head><body><div class="wrap"><div class="card">
<div class="logo">Apply<span>Stack</span></div>
${content}
</div>
<div class="footer">ApplyStack · <a href="${APP_URL}">applystack.ai</a><br>
You are receiving this because you signed up at ApplyStack.<br>
<a href="${APP_URL}/account.html">Manage preferences</a></div>
</div></body></html>`;
}

function emailWelcome() {
  return emailBase(`
<h2>Welcome to ApplyStack 👋</h2>
<p>You're all set. Here's how to get the best result from your first resume build:</p>
<ul>
  <li><strong>Upload your current resume</strong> — .docx or PDF both work. The more complete it is, the better the output.</li>
  <li><strong>Paste the full job description</strong> — not just the title. The AI reads every requirement and aligns your resume to it.</li>
  <li><strong>Check your ATS score</strong> — aim for 75+. The score shows which keywords are matched and which you're missing.</li>
  <li><strong>Download your .docx</strong> — edit it in Word or Google Docs if you want to tweak anything before applying.</li>
</ul>
<div class="tip"><p>💡 <strong>Pro tip:</strong> Use the Interview Coach after building your resume — it generates role-specific questions based on the same job description.</p></div>
<a href="${APP_URL}/app.html" class="btn">Build my first resume →</a>
<p>Most users finish their first tailored resume in under 4 minutes. You've got this.</p>
<p style="color:#94a3b8;font-size:.85rem">The ApplyStack team</p>`);
}

function emailDay2() {
  return emailBase(`
<h2>Most users finish in under 4 minutes ⏱️</h2>
<p>We noticed you haven't built your first tailored resume yet. That's okay — here's a quick-start so it takes less than 5 minutes:</p>
<ul>
  <li>Find a job posting you want to apply for</li>
  <li>Copy the full job description text</li>
  <li>Upload your current resume (any .pdf or .docx works)</li>
  <li>Hit <strong>Build Resume</strong> and ApplyStack does the rest</li>
</ul>
<a href="${APP_URL}/app.html" class="btn">Start my first resume</a>
<div class="tip"><p>💡 Don't have a polished resume yet? Upload whatever you have, even a rough draft. ApplyStack will restructure and rewrite it to match the role.</p></div>
<p>Your first resume is completely free, no credit card, no strings.</p>
<p style="color:#94a3b8;font-size:.85rem">The ApplyStack team</p>`);
}

function emailDay7() {
  return emailBase(`
<h2>You have 1 free tailoring left 🎯</h2>
<p>You have tried ApplyStack. Here is what Pro users do differently:</p>
<ul>
  <li>They tailor a <strong>different resume for every role</strong> they apply to (not one generic version)</li>
  <li>They use the <strong>ATS score to hit 80+</strong> before submitting — recruiters use filters that cut off below 70</li>
  <li>They generate a <strong>matching cover letter</strong> in the same session, so the tone is consistent</li>
  <li>They practice with the <strong>Interview Coach</strong> right after, using questions from the same JD</li>
</ul>
<a href="${APP_URL}/account.html" class="btn">Upgrade to Pro — $9/month →</a>
<p>Pro is $9/month or $79/year. Cancel anytime. 30-day money-back guarantee.</p>
<div class="tip"><p>💡 <strong>Referral deal:</strong> Invite a friend — you both get a free bonus tailoring when they complete their first resume. Find your link in <a href="${APP_URL}/account.html">your account</a>.</p></div>
<p style="color:#94a3b8;font-size:.85rem">The ApplyStack team</p>`);
}

// ── JWT helpers ────────────────────────────────────────────────
function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '30d' });
}
function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET); } catch(e) { return null; }
}

// ── Auth middleware ────────────────────────────────────────────
function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid or expired token' });
  pool.query('SELECT * FROM users WHERE id = $1', [payload.sub])
    .then(result => {
      const user = result.rows[0];
      if (!user) return res.status(401).json({ error: 'User not found' });
      // Owner always gets Pro regardless of what's in the DB
      if (OWNER_EMAIL && user.email === OWNER_EMAIL) {
        user.plan = 'pro';
        user.subscription_status = 'active';
      }
      req.user = user;
      next();
    })
    .catch(err => {
      console.error('Auth DB error:', err);
      res.status(500).json({ error: 'Authentication error' });
    });
}

// ── Express app ────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Stripe webhook needs raw body — mount BEFORE express.json()
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(express.json({ limit: '4mb' }));

// Rate limiting
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many requests, please try again later.' } });
const aiLimiter   = rateLimit({ windowMs:  1 * 60 * 1000, max: 10, message: { error: 'Too many AI requests. Please slow down.' } });

// ══════════════════════════════════════════════════════════════
//  AUTH ROUTES
// ══════════════════════════════════════════════════════════════
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { email, password, betaCode, referredBy } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email address.' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const normalEmail = email.toLowerCase();
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normalEmail]);
    if (existing.rows.length) return res.status(409).json({ error: 'An account with this email already exists.' });

    // Determine plan — owner always gets Pro; valid beta code grants 24h Pro
    let plan = 'free';
    let subscriptionStatus = null;
    const isOwner = OWNER_EMAIL && normalEmail === OWNER_EMAIL;

    if (isOwner) {
      plan = 'pro';
      subscriptionStatus = 'active';
    } else if (betaCode) {
      const codeRow = await pool.query(
        `SELECT * FROM beta_codes WHERE code = $1 AND used_by IS NULL AND expires_at > NOW()`,
        [betaCode.trim().toUpperCase()]
      );
      if (!codeRow.rows.length) return res.status(400).json({ error: 'Invalid or expired beta code.' });
      plan = 'pro';
      subscriptionStatus = 'beta';
      // Mark code as used
      await pool.query(
        'UPDATE beta_codes SET used_by = $1, used_at = NOW() WHERE code = $2',
        [normalEmail, betaCode.trim().toUpperCase()]
      );
    }

    // Resolve referrer (if a valid referral code was passed)
    let referrerId = null;
    if (referredBy) {
      const refRow = await pool.query(
        'SELECT id FROM users WHERE referral_code = $1',
        [referredBy.trim().toUpperCase()]
      );
      if (refRow.rows.length) referrerId = refRow.rows[0].id;
    }

    const hash = await bcrypt.hash(password, 12);
    // Generate a unique referral code for the new user
    let newCode = genReferralCode();
    // Retry on collision (extremely unlikely but safe)
    for (let i = 0; i < 5; i++) {
      const chk = await pool.query('SELECT id FROM users WHERE referral_code = $1', [newCode]);
      if (!chk.rows.length) break;
      newCode = genReferralCode();
    }
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, plan, subscription_status, referral_code, referred_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [normalEmail, hash, plan, subscriptionStatus, newCode, referrerId]
    );
    const user = result.rows[0];
    const token = signToken(user.id);
    res.json({ token, user: safeUser(user) });
    // Send welcome email (async — don't block response)
    sendEmail(normalEmail, 'Welcome to ApplyStack 👋', emailWelcome()).then(async () => {
      await pool.query('UPDATE users SET onboarding_stage = 1 WHERE id = $1', [user.id]);
    }).catch(() => {});
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password.' });
    if (OWNER_EMAIL && user.email === OWNER_EMAIL) {
      user.plan = 'pro';
      user.subscription_status = 'active';
    }
    const token = signToken(user.id);
    res.json({ token, user: safeUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: safeUser(req.user) });
});

app.delete('/api/auth/account', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    // Prevent owner account from being deleted
    if (OWNER_EMAIL && req.user.email === OWNER_EMAIL) {
      return res.status(403).json({ error: 'The owner account cannot be deleted.' });
    }
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Could not delete account. Please try again.' });
  }
});

// ══════════════════════════════════════════════════════════════
//  RESUME LIBRARY ROUTES
// ══════════════════════════════════════════════════════════════

// List saved resumes for current user
app.get('/api/resumes', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, created_at FROM saved_resumes WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ resumes: result.rows });
  } catch (err) {
    console.error('List resumes error:', err);
    res.status(500).json({ error: 'Could not load saved resumes.' });
  }
});

// Save a resume to the library
app.post('/api/resumes', requireAuth, async (req, res) => {
  try {
    const { name, content } = req.body || {};
    if (!name || !content) return res.status(400).json({ error: 'Name and content are required.' });
    if (content.length > 50000) return res.status(400).json({ error: 'Resume text too long (max 50,000 chars).' });

    const isOwner = OWNER_EMAIL && req.user.email === OWNER_EMAIL;
    const isPro   = isOwner || (req.user.plan === 'pro' && ['active','beta'].includes(req.user.subscription_status));

    // Free users: max 1 saved resume; Pro: max 10
    const limit = isPro ? 10 : 1;
    const existing = await pool.query(
      'SELECT COUNT(*) FROM saved_resumes WHERE user_id = $1', [req.user.id]
    );
    if (parseInt(existing.rows[0].count) >= limit) {
      if (!isPro) return res.status(402).json({ error: 'upgrade_required', message: 'Free plan allows 1 saved resume. Upgrade to Pro to save up to 10.' });
      return res.status(400).json({ error: 'You have reached the 10-resume library limit.' });
    }

    const result = await pool.query(
      'INSERT INTO saved_resumes (user_id, name, content) VALUES ($1, $2, $3) RETURNING id, name, created_at',
      [req.user.id, name.trim().slice(0, 80), content]
    );
    res.json({ resume: result.rows[0] });
  } catch (err) {
    console.error('Save resume error:', err);
    res.status(500).json({ error: 'Could not save resume.' });
  }
});

// Load full content of a saved resume
app.get('/api/resumes/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, content, created_at FROM saved_resumes WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Resume not found.' });
    res.json({ resume: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Could not load resume.' });
  }
});

// Delete a saved resume
app.delete('/api/resumes/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM saved_resumes WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Resume not found.' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not delete resume.' });
  }
});

// ══════════════════════════════════════════════════════════════
//  CLAUDE AI PROXY
// ══════════════════════════════════════════════════════════════
app.post('/api/claude', requireAuth, aiLimiter, async (req, res) => {
  const { type, system, userMsg, maxTokens, model } = req.body || {};
  const user = req.user;

  // ── Gating logic ───────────────────────────────────────────
  // Owner always has unlimited access; beta testers treated as Pro
  const isOwner = OWNER_EMAIL && user.email === OWNER_EMAIL;
  const isPro = isOwner || (user.plan === 'pro' && ['active', 'beta'].includes(user.subscription_status));

  // 'score' type (pre-tailoring match preview) is free for all users
  // 'jobs'  type (job match engine keyword extraction) — free with 3 searches/day limit
  if (type === 'score') {
    // no gating — everyone can check their match score
  } else if (type === 'jobs') {
    // Free users get 3 job searches per day; Pro users are unlimited
    if (!isPro) {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const jobSearchKey = `job_searches_${today}`;
      const dailyCount = user[jobSearchKey] || 0;
      const FREE_JOB_SEARCH_LIMIT = 3;
      if (dailyCount >= FREE_JOB_SEARCH_LIMIT) {
        return res.status(402).json({
          error: 'upgrade_required',
          message: `You have used your ${FREE_JOB_SEARCH_LIMIT} free job searches for today. Upgrade to Pro for unlimited searches.`,
        });
      }
      // Increment daily counter (best-effort — don't fail if DB update fails)
      pool.query(
        `UPDATE users SET "${jobSearchKey}" = COALESCE("${jobSearchKey}", 0) + 1 WHERE id = $1`,
        [user.id]
      ).catch(() => {});
    }
  } else if (type === 'tailor') {
    const freeLimit = 1 + (user.referral_credits || 0);
    if (!isPro && user.tailoring_count >= freeLimit) {
      return res.status(402).json({
        error: 'upgrade_required',
        message: 'You have used your free resume tailoring. Upgrade to Pro for unlimited tailoring.',
      });
    }
  } else {
    if (!isPro) {
      return res.status(402).json({
        error: 'upgrade_required',
        message: 'This feature requires a ApplyStack Pro subscription.',
      });
    }
  }

  if (!CLAUDE_KEY) {
    return res.status(503).json({ error: 'AI service not configured. Please contact support.' });
  }

  // ── Call Claude ────────────────────────────────────────────
  try {
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-6',
        max_tokens: maxTokens || 8000,
        system,
        messages: [{ role: 'user', content: userMsg }],
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.json().catch(() => ({}));
      const msg = (err.error && err.error.message) ? err.error.message : `AI error ${claudeRes.status}`;
      return res.status(502).json({ error: msg });
    }

    const json = await claudeRes.json();
    const text = json.content[0].text.trim();

    // Increment tailor count after successful tailor call
    if (type === 'tailor') {
      await pool.query(
        'UPDATE users SET tailoring_count = tailoring_count + 1, updated_at = NOW() WHERE id = $1',
        [user.id]
      );
      // On first build — award referral credit to both referrer and this user
      const freshUser = await pool.query(
        'SELECT tailoring_count, referred_by FROM users WHERE id = $1', [user.id]
      );
      const fu = freshUser.rows[0];
      if (fu && fu.tailoring_count === 1 && fu.referred_by) {
        await pool.query(
          'UPDATE users SET referral_credits = referral_credits + 1, updated_at = NOW() WHERE id = $1',
          [fu.referred_by]
        );
        await pool.query(
          'UPDATE users SET referral_credits = referral_credits + 1, updated_at = NOW() WHERE id = $1',
          [user.id]
        );
      }
    }

    res.json({ text });
  } catch (err) {
    console.error('Claude proxy error:', err);
    res.status(502).json({ error: 'AI request failed. Please try again.' });
  }
});

// ══════════════════════════════════════════════════════════════
//  FREE SCORE PREVIEW  — no auth, IP rate-limited (5/hour/IP)
// ══════════════════════════════════════════════════════════════
const scorePreviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour
  max: 5,
  keyGenerator: (req) => req.ip,
  message: { error: 'You have used all 5 free previews for this hour. Create a free account for unlimited scoring.' },
});

app.post('/api/score-preview', scorePreviewLimiter, async (req, res) => {
  const { resumeText, jd } = req.body || {};
  if (!resumeText || typeof resumeText !== 'string' || resumeText.trim().length < 50) {
    return res.status(400).json({ error: 'Please provide your resume text.' });
  }
  if (!jd || typeof jd !== 'string' || jd.trim().length < 30) {
    return res.status(400).json({ error: 'Please provide the job description.' });
  }
  if (!CLAUDE_KEY) {
    return res.status(503).json({ error: 'AI service not configured.' });
  }
  try {
    const sys = 'You are a resume ATS specialist. Assess how well a resume matches a job description. Return ONLY valid JSON, no markdown.';
    const prompt = [
      'Score how well this resume matches this job description on a 0-100 scale.',
      '',
      'JOB DESCRIPTION:', jd.slice(0, 3000),
      '',
      'RESUME:', resumeText.slice(0, 3000),
      '',
      'Return exactly this JSON:',
      '{"score":42,"label":"Fair Match","summary":"1 sentence on overall fit","matched":["up to 5 keywords already present"],"missing":["up to 5 important missing keywords"],"verdict":"One action sentence on the biggest improvement opportunity."}',
    ].join('\n');

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system: sys,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!claudeRes.ok) throw new Error('AI error ' + claudeRes.status);
    const raw = (await claudeRes.json()).content[0].text.trim();

    // Extract JSON robustly
    let jsonStr = null;
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) { jsonStr = fenced[1].trim(); }
    else { const s = raw.indexOf('{'); if (s !== -1) jsonStr = raw.slice(s, raw.lastIndexOf('}') + 1); }
    if (!jsonStr) throw new Error('Invalid AI response.');

    res.json(JSON.parse(jsonStr));
  } catch (err) {
    console.error('score-preview error:', err);
    res.status(502).json({ error: 'Could not compute score. Please try again.' });
  }
});

// ══════════════════════════════════════════════════════════════
//  JD URL SCRAPER  — multi-strategy job description extractor
//  Strategy order:
//    1. Board-specific JSON APIs (Greenhouse, Lever, Ashby, Workday)
//    2. JSON-LD structured data embedded in HTML
//    3. Open Graph / meta description tags
//    4. Raw HTML stripping
// ══════════════════════════════════════════════════════════════

// ── Helpers ────────────────────────────────────────────────────
async function timedFetch(url, options = {}, ms = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { ...options, signal: ctrl.signal });
    clearTimeout(t);
    return r;
  } catch (e) { clearTimeout(t); throw e; }
}

function htmlToText(html) {
  if (!html) return '';
  // Step 1: remove script/style blocks entirely
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<style[\s\S]*?<\/style>/gi, '');
  // Step 2: convert block/line elements to whitespace BEFORE stripping tags
  html = html.replace(/<br\s*\/?>/gi, '\n');
  html = html.replace(/<\/p>/gi, '\n\n');
  html = html.replace(/<p[^>]*>/gi, '');
  html = html.replace(/<\/h[1-6]>/gi, '\n\n');
  html = html.replace(/<h[1-6][^>]*>/gi, '\n');
  html = html.replace(/<\/div>/gi, '\n');
  html = html.replace(/<\/tr>/gi, '\n');
  html = html.replace(/<\/td>/gi, ' ');
  // Step 3: list items → bullet points
  html = html.replace(/<li[^>]*>/gi, '\n• ');
  html = html.replace(/<\/li>/gi, '');
  html = html.replace(/<\/ul>/gi, '\n');
  html = html.replace(/<\/ol>/gi, '\n');
  // Step 4: strip ALL remaining HTML tags (catches <strong>, <em>, <a>, <span>, etc.)
  html = html.replace(/<[^>]+>/g, '');
  // Step 5: decode HTML entities
  html = html
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&[a-z0-9#]+;/gi, ' ');
  // Step 6: normalise whitespace
  html = html.replace(/[ \t]{2,}/g, ' ');
  html = html.replace(/\n[ \t]+/g, '\n');
  html = html.replace(/\n{3,}/g, '\n\n');
  return html.trim();
}

// Format a JSON-LD jobLocation value into a readable string
function formatJobLocation(loc) {
  if (!loc) return '';
  if (typeof loc === 'string') return loc;
  if (Array.isArray(loc)) return loc.map(formatJobLocation).filter(Boolean).join(', ');
  // Schema.org Place / PostalAddress
  const addr = loc.address || loc;
  const parts = [
    addr.streetAddress,
    addr.addressLocality,
    addr.addressRegion,
    addr.addressCountry,
  ].filter(Boolean);
  return parts.join(', ');
}

// Format a JSON-LD MonetaryAmount / baseSalary value into a readable string
function formatSalary(sal) {
  if (!sal) return '';
  if (typeof sal === 'string' || typeof sal === 'number') return String(sal);
  const val = sal.value || sal;
  if (val && typeof val === 'object') {
    const min = val.minValue || val.min;
    const max = val.maxValue || val.max;
    const cur = sal.currency || val.currency || '';
    if (min && max) return `${cur}${min} – ${cur}${max}`.trim();
    if (min || max) return `${cur}${min || max}`.trim();
  }
  return '';
}

function extractJsonLd(html) {
  // Pull all JSON-LD blocks and look for JobPosting schema
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of blocks) {
    try {
      const data = JSON.parse(m[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const type = (item['@type'] || '').toLowerCase();
        if (type === 'jobposting' || type.includes('job')) {
          const parts = [];
          if (item.title)                    parts.push('Job Title: ' + item.title);
          if (item.hiringOrganization?.name) parts.push('Company: ' + item.hiringOrganization.name);
          const loc = formatJobLocation(item.jobLocation);
          if (loc)                           parts.push('Location: ' + loc);
          if (item.employmentType)           parts.push('Type: ' + item.employmentType);
          const sal = formatSalary(item.baseSalary);
          if (sal)                           parts.push('Salary: ' + sal);
          if (item.description)              parts.push('\n' + htmlToText(item.description));
          if (item.responsibilities)         parts.push('Responsibilities:\n' + htmlToText(String(item.responsibilities)));
          if (item.qualifications)           parts.push('Qualifications:\n' + htmlToText(String(item.qualifications)));
          if (item.skills)                   parts.push('Skills: ' + (Array.isArray(item.skills) ? item.skills.join(', ') : item.skills));
          const text = parts.join('\n').replace(/\n{3,}/g, '\n\n').trim();
          if (text.length > 200) return text;
        }
      }
    } catch (_) {}
  }
  return null;
}

// ── Board-specific API strategies ──────────────────────────────

async function tryGreenhouseApi(url) {
  // https://boards.greenhouse.io/COMPANY/jobs/JOB_ID
  // https://COMPANY.greenhouse.io/jobs/JOB_ID
  const m1 = url.match(/boards\.greenhouse\.io\/([^/]+)\/jobs\/(\d+)/i);
  const m2 = url.match(/([^./]+)\.greenhouse\.io\/jobs\/(\d+)/i);
  const m = m1 || m2;
  if (!m) return null;
  const [, company, jobId] = m;
  const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs/${jobId}`;
  const r = await timedFetch(apiUrl, { headers: { Accept: 'application/json' } });
  if (!r.ok) return null;
  const d = await r.json();
  const parts = [];
  if (d.title)    parts.push('Job Title: ' + d.title);
  if (d.location?.name) parts.push('Location: ' + d.location.name);
  if (d.content)  parts.push(htmlToText(d.content));
  return parts.join('\n').trim() || null;
}

async function tryLeverApi(url) {
  // https://jobs.lever.co/COMPANY/UUID
  const m = url.match(/jobs\.lever\.co\/([^/]+)\/([a-f0-9-]{36})/i);
  if (!m) return null;
  const [, company, jobId] = m;
  const apiUrl = `https://api.lever.co/v0/postings/${company}/${jobId}?mode=json`;
  const r = await timedFetch(apiUrl, { headers: { Accept: 'application/json' } });
  if (!r.ok) return null;
  const d = await r.json();
  const parts = [];
  if (d.text)      parts.push('Job Title: ' + d.text);
  if (d.categories?.location) parts.push('Location: ' + d.categories.location);
  if (d.categories?.team)     parts.push('Team: ' + d.categories.team);
  if (d.descriptionPlain)     parts.push(d.descriptionPlain);
  else if (d.description)     parts.push(htmlToText(d.description));
  if (d.lists) {
    for (const list of d.lists) {
      if (list.text) parts.push('\n' + list.text + ':');
      if (list.content) parts.push(htmlToText(list.content));
    }
  }
  return parts.join('\n').trim() || null;
}

async function tryAshbyApi(url) {
  // https://jobs.ashbyhq.com/COMPANY/UUID
  const m = url.match(/jobs\.ashbyhq\.com\/([^/]+)\/([a-f0-9-]{36})/i);
  if (!m) return null;
  const [, , jobId] = m;
  const apiUrl = `https://api.ashbyhq.com/posting-public/job-posting/${jobId}`;
  const r = await timedFetch(apiUrl, { headers: { Accept: 'application/json' } });
  if (!r.ok) return null;
  const d = await r.json();
  const job = d.jobPosting || d;
  const parts = [];
  if (job.title)          parts.push('Job Title: ' + job.title);
  if (job.locationName)   parts.push('Location: '  + job.locationName);
  if (job.employmentType) parts.push('Type: '      + job.employmentType);
  if (job.descriptionHtml) parts.push(htmlToText(job.descriptionHtml));
  else if (job.description) parts.push(job.description);
  return parts.join('\n').trim() || null;
}

async function tryWorkdayApi(url) {
  // https://TENANT.wd{N}.myworkdayjobs.com/SITE/job/LOCATION/TITLE_JOBID
  const m = url.match(/^https?:\/\/([^.]+)\.(wd\d+)\.myworkdayjobs\.com\/([^/]+)\/job\/[^/]+\/[^_]+_([A-Z0-9]+)/i);
  if (!m) return null;
  const [, tenant, wdInst, site, jobId] = m;
  // Workday CXS API endpoint
  const apiUrl = `https://${tenant}.${wdInst}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs/${jobId}/jobPostingDetails`;
  try {
    const r = await timedFetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    if (!r.ok) return null;
    const d = await r.json();
    const parts = [];
    const job = d.jobPostingInfo || d;
    if (job.title)        parts.push('Job Title: ' + job.title);
    if (job.jobReqId)     parts.push('Job ID: '    + job.jobReqId);
    if (job.locationsText) parts.push('Location: ' + job.locationsText);
    if (job.timeType)     parts.push('Type: '      + job.timeType);
    const desc = job.jobDescription || job.jobPostingDescription || '';
    if (desc) parts.push(htmlToText(desc));
    const additional = job.additionalJobDescription || '';
    if (additional) parts.push(htmlToText(additional));
    const text = parts.join('\n').trim();
    return text.length > 100 ? text : null;
  } catch (_) { return null; }
}

async function tryIndeedEmbed(url) {
  // Indeed URLs sometimes have a viewjob page with clean HTML
  // Try fetching with a full browser UA
  if (!/indeed\.com/i.test(url)) return null;
  const r = await timedFetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
  });
  if (!r.ok) return null;
  const html = await r.text();
  const jsonLd = extractJsonLd(html);
  if (jsonLd) return jsonLd;
  return null;
}

// ── Main route ─────────────────────────────────────────────────
app.post('/api/fetch-jd', requireAuth, async (req, res) => {
  const { url } = req.body || {};
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' });
  }
  const cleanUrl = url.trim();
  if (!/^https?:\/\//i.test(cleanUrl)) {
    return res.status(400).json({ error: 'Only http/https URLs are supported.' });
  }

  try {
    // ── Strategy 1: Board-specific JSON APIs ──────────────────
    const boardStrategies = [
      tryGreenhouseApi,
      tryLeverApi,
      tryAshbyApi,
      tryWorkdayApi,
      tryIndeedEmbed,
    ];
    for (const strategy of boardStrategies) {
      try {
        const text = await strategy(cleanUrl);
        if (text && text.length > 150) {
          const trimmed = text.length > 8000 ? text.slice(0, 8000) + '\n[…truncated]' : text;
          return res.json({ text: trimmed });
        }
      } catch (_) {}
    }

    // ── Strategy 2: Fetch HTML + JSON-LD extraction ────────────
    const r = await timedFetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!r.ok) {
      return res.status(502).json({ error: `Page returned ${r.status}. Please copy and paste the job description manually.` });
    }

    const html = await r.text();

    // Try JSON-LD first (most reliable for JS-heavy boards)
    const jsonLdText = extractJsonLd(html);
    if (jsonLdText && jsonLdText.length > 150) {
      const trimmed = jsonLdText.length > 8000 ? jsonLdText.slice(0, 8000) + '\n[…truncated]' : jsonLdText;
      return res.json({ text: trimmed });
    }

    // ── Strategy 3: Raw HTML strip ─────────────────────────────
    let text = htmlToText(html);

    if (text.length < 200) {
      // Likely a JS-rendered SPA — give a helpful, specific message
      const isKnownSpa = /workday|icims|taleo|successfactors|smartrecruiters|jobvite|brassring/i.test(cleanUrl);
      const hint = isKnownSpa
        ? 'This job board loads content with JavaScript which our server cannot run. Open the posting in your browser, select all text (Ctrl/Cmd+A), copy, and paste it into the text box below.'
        : 'This page does not contain enough readable text. Try copying the job description directly from your browser and pasting it below.';
      return res.status(422).json({ error: hint });
    }

    if (text.length > 8000) text = text.slice(0, 8000) + '\n[…truncated]';
    res.json({ text });

  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'The page took too long to load. Please paste the job description manually.' });
    }
    console.error('fetch-jd error:', err);
    res.status(502).json({ error: 'Could not fetch the URL. Please paste the job description manually.' });
  }
});

// ══════════════════════════════════════════════════════════════
//  ADMIN ROUTES (beta code management)
// ══════════════════════════════════════════════════════════════
function requireAdmin(req, res, next) {
  const secret = req.headers['x-admin-secret'] || '';
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

// Generate a new beta code (24h expiry)
app.post('/api/admin/generate-code', requireAdmin, async (req, res) => {
  try {
    const code = [
      Math.random().toString(36).slice(2,6),
      Math.random().toString(36).slice(2,6),
      Math.random().toString(36).slice(2,6),
    ].join('-').toUpperCase();

    const result = await pool.query(
      `INSERT INTO beta_codes (code, expires_at) VALUES ($1, NOW() + INTERVAL '24 hours') RETURNING *`,
      [code]
    );
    res.json({ code: result.rows[0] });
  } catch (err) {
    console.error('Generate code error:', err);
    res.status(500).json({ error: 'Failed to generate code.' });
  }
});

// List all beta codes
app.get('/api/admin/codes', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM beta_codes ORDER BY created_at DESC'
    );
    res.json({ codes: result.rows });
  } catch (err) {
    console.error('List codes error:', err);
    res.status(500).json({ error: 'Failed to fetch codes.' });
  }
});

// List all users
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, plan, subscription_status, tailoring_count, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// ══════════════════════════════════════════════════════════════
//  BILLING ROUTES (Stripe)
// ══════════════════════════════════════════════════════════════
app.post('/api/billing/create-checkout', requireAuth, async (req, res) => {
  try {
    const { plan } = req.body || {};
    const priceId = plan === 'annual'
      ? process.env.STRIPE_PRICE_ANNUAL
      : process.env.STRIPE_PRICE_MONTHLY;

    if (!priceId) return res.status(503).json({ error: 'Billing not configured. Please contact support.' });

    const user = req.user;
    let customerId = user.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { userId: String(user.id) } });
      customerId = customer.id;
      await pool.query(
        'UPDATE users SET stripe_customer_id = $1, updated_at = NOW() WHERE email = $2',
        [customerId, user.email]
      );
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${APP_URL}/account.html?success=1`,
      cancel_url:  `${APP_URL}/account.html?canceled=1`,
      allow_promotion_codes: true,
      metadata: { userId: String(user.id) },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Could not create checkout session.' });
  }
});

app.post('/api/billing/portal', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    if (!user.stripe_customer_id) return res.status(400).json({ error: 'No billing account found.' });
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${APP_URL}/account.html`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Portal error:', err);
    res.status(500).json({ error: 'Could not open billing portal.' });
  }
});

// ── Stripe Webhook ─────────────────────────────────────────────
async function handleStripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription' && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          const userId = session.metadata && session.metadata.userId;
          if (userId) {
            await pool.query(
              'UPDATE users SET plan = $1, stripe_customer_id = $2, stripe_subscription_id = $3, subscription_status = $4, updated_at = NOW() WHERE id = $5',
              ['pro', session.customer, sub.id, sub.status, parseInt(userId)]
            );
          }
        }
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        if (sub.status === 'active') {
          await pool.query(
            'UPDATE users SET plan = $1, subscription_status = $2, updated_at = NOW() WHERE stripe_subscription_id = $3',
            ['pro', 'active', sub.id]
          );
        } else if (['past_due', 'unpaid'].includes(sub.status)) {
          await pool.query(
            'UPDATE users SET subscription_status = $1, updated_at = NOW() WHERE stripe_subscription_id = $2',
            [sub.status, sub.id]
          );
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await pool.query(
          "UPDATE users SET plan = 'free', subscription_status = $1, updated_at = NOW() WHERE stripe_subscription_id = $2",
          ['canceled', sub.id]
        );
        break;
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object;
        if (inv.subscription) {
          await pool.query(
            'UPDATE users SET subscription_status = $1, updated_at = NOW() WHERE stripe_subscription_id = $2',
            ['past_due', inv.subscription]
          );
        }
        break;
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
  }

  res.json({ received: true });
}

// ══════════════════════════════════════════════════════════════
//  CRON — Onboarding email scheduler
//  Call daily from Render's cron service or any HTTP scheduler:
//    GET /api/cron/onboarding?secret=CRON_SECRET
// ══════════════════════════════════════════════════════════════
app.get('/api/cron/onboarding', async (req, res) => {
  // Validate cron secret (skip check if CRON_SECRET not configured)
  if (CRON_SECRET && req.query.secret !== CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    let sent2 = 0, sent3 = 0;

    // Email 2 — day 2, zero builds done, welcome email already sent
    const day2 = await pool.query(`
      SELECT id, email FROM users
      WHERE onboarding_stage = 1
        AND tailoring_count = 0
        AND created_at <= NOW() - INTERVAL '2 days'
        AND created_at >= NOW() - INTERVAL '5 days'
    `);
    for (const u of day2.rows) {
      await sendEmail(u.email, 'Most users finish in under 4 minutes ⏱️', emailDay2());
      await pool.query('UPDATE users SET onboarding_stage = 2 WHERE id = $1', [u.id]);
      sent2++;
    }

    // Email 3 — day 7, still on free plan, at least one build done or not
    const day7 = await pool.query(`
      SELECT id, email FROM users
      WHERE onboarding_stage < 3
        AND plan = 'free'
        AND subscription_status IS DISTINCT FROM 'active'
        AND created_at <= NOW() - INTERVAL '7 days'
        AND created_at >= NOW() - INTERVAL '10 days'
    `);
    for (const u of day7.rows) {
      await sendEmail(u.email, 'You have 1 free tailoring left 🎯', emailDay7());
      await pool.query('UPDATE users SET onboarding_stage = 3 WHERE id = $1', [u.id]);
      sent3++;
    }

    res.json({ ok: true, sent2, sent3 });
  } catch (err) {
    console.error('Onboarding cron error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Referral API ───────────────────────────────────────────────
app.get('/api/referral', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const countRes = await pool.query(
      'SELECT COUNT(*) AS cnt FROM users WHERE referred_by = $1', [user.id]
    );
    res.json({
      referral_code:    user.referral_code || '',
      referral_count:   parseInt(countRes.rows[0].cnt, 10),
      referral_credits: user.referral_credits || 0,
    });
  } catch (err) {
    console.error('Referral API error:', err);
    res.status(500).json({ error: 'Could not load referral info.' });
  }
});

// ══════════════════════════════════════════════════════════════
//  INTERVIEW PREP ENDPOINT
// ══════════════════════════════════════════════════════════════
app.post('/api/interview-prep', requireAuth, aiLimiter, async (req, res) => {
  const { company, role, jd, resumeSummary } = req.body || {};

  if (!company || !role) {
    return res.status(400).json({ error: 'Company and role are required.' });
  }

  const serperKey = process.env.SERPER_API_KEY;
  const user = req.user;

  // Gating: interview prep requires Pro
  const isOwner = OWNER_EMAIL && user.email === OWNER_EMAIL;
  const isPro = isOwner || (user.plan === 'pro' && ['active', 'beta'].includes(user.subscription_status));
  if (!isPro) {
    return res.status(402).json({
      error: 'upgrade_required',
      message: 'Interview Prep requires a ApplyStack Pro subscription.',
    });
  }

  if (!CLAUDE_KEY) {
    return res.status(503).json({ error: 'AI service not configured. Please contact support.' });
  }

  try {
    // Parallel execution: Company Brief + Interview Questions
    const results = await Promise.all([
      // Task 1: Company Brief
      (async () => {
        try {
          let briefContext = '';

          // Try Serper search if available
          if (serperKey) {
            try {
              const searches = [
                `"${company}" company culture values`,
                `"${company}" ${role} interview`
              ];

              for (const query of searches) {
                const sresp = await fetch('https://google.serper.dev/search', {
                  method: 'POST',
                  headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ q: query, num: 5 }),
                  signal: AbortSignal.timeout(8000),
                });

                if (sresp.ok) {
                  const sdata = await sresp.json();
                  const snippets = (sdata.organic || []).slice(0, 5).map(r => r.snippet || '').filter(Boolean);
                  briefContext += snippets.join('\n') + '\n';
                }
              }
            } catch (e) {
              console.error('Serper search error:', e.message);
              // Continue with Claude-only fallback
            }
          }

          // Call Claude to generate company brief
          const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': CLAUDE_KEY,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-6',
              max_tokens: 1000,
              system: 'You are an expert recruiter. Generate a JSON object for a company brief. Return ONLY valid JSON, no markdown.',
              messages: [{
                role: 'user',
                content: [
                  `Generate a company brief for "${company}" applying for a "${role}" role.`,
                  briefContext ? `Use this research context:\n${briefContext}` : 'Use your training knowledge.',
                  `Return exactly this JSON structure:`,
                  `{`,
                  `  "about": "2-3 sentence company overview",`,
                  `  "culture": ["value 1", "value 2", "value 3", "value 4"],`,
                  `  "recentNews": ["news point 1", "news point 2", "news point 3"],`,
                  `  "lookingFor": ["trait/skill 1", "trait/skill 2", "trait/skill 3", "trait/skill 4"],`,
                  `  "questionsToAsk": ["Smart question 1?", "Smart question 2?", "Smart question 3?"]`,
                  `}`
                ].join('\n')
              }],
            }),
          });

          if (!claudeRes.ok) {
            console.error('Claude brief error:', claudeRes.status);
            // Return fallback brief
            return {
              about: 'Unable to generate company brief. Please research the company before your interview.',
              culture: ['Innovation', 'Collaboration', 'Excellence', 'Growth'],
              recentNews: ['Check LinkedIn for recent company news.', 'Review their latest press releases.', 'Browse their social media.'],
              lookingFor: ['Technical skills', 'Problem-solving', 'Team collaboration', 'Communication'],
              questionsToAsk: ['What does success look like in this role?', 'How does the team measure impact?', 'What are the key priorities for the next quarter?']
            };
          }

          const json = await claudeRes.json();
          let text = json.content[0].text.trim();

          // Extract JSON robustly
          let briefData = null;
          const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (fenced) { text = fenced[1].trim(); }
          const s = text.indexOf('{');
          if (s !== -1) text = text.slice(s, text.lastIndexOf('}') + 1);

          briefData = JSON.parse(text);
          return briefData;
        } catch (err) {
          console.error('Company brief error:', err.message);
          // Return fallback brief
          return {
            about: 'Unable to generate company brief. Please research the company before your interview.',
            culture: ['Innovation', 'Collaboration', 'Excellence', 'Growth'],
            recentNews: ['Check LinkedIn for recent company news.', 'Review their latest press releases.', 'Browse their social media.'],
            lookingFor: ['Technical skills', 'Problem-solving', 'Team collaboration', 'Communication'],
            questionsToAsk: ['What does success look like in this role?', 'How does the team measure impact?', 'What are the key priorities for the next quarter?']
          };
        }
      })(),

      // Task 2: Interview Questions
      (async () => {
        try {
          const jdExcerpt = (jd || '').slice(0, 1500);
          const summaryText = resumeSummary ? `Resume summary:\n${resumeSummary}\n\n` : '';

          const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': CLAUDE_KEY,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-6',
              max_tokens: 2500,
              system: 'You are an expert interview coach. Generate interview questions and STAR-framework answers. Return ONLY valid JSON, no markdown.',
              messages: [{
                role: 'user',
                content: [
                  `Generate 12 interview questions for a "${role}" position at "${company}".`,
                  `Job description excerpt:\n${jdExcerpt}`,
                  summaryText,
                  `Categories: 3 Behavioural, 3 Technical, 3 Situational, 3 Culture-fit.`,
                  `Return a JSON array of objects:`,
                  `[`,
                  `  {`,
                  `    "question": "The interview question?",`,
                  `    "type": "Behavioural|Technical|Situational|Culture-fit",`,
                  `    "suggestedAnswer": "3-4 sentence STAR-framework answer personalised to the candidate's background"`,
                  `  },`,
                  `  ...`,
                  `]`
                ].join('\n')
              }],
            }),
          });

          if (!claudeRes.ok) {
            console.error('Claude questions error:', claudeRes.status);
            return [];
          }

          const json = await claudeRes.json();
          let text = json.content[0].text.trim();

          // Extract JSON robustly
          let questions = [];
          const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (fenced) { text = fenced[1].trim(); }
          const s = text.indexOf('[');
          if (s !== -1) text = text.slice(s, text.lastIndexOf(']') + 1);

          questions = JSON.parse(text);
          return Array.isArray(questions) ? questions : [];
        } catch (err) {
          console.error('Interview questions error:', err.message);
          return [];
        }
      })(),
    ]);

    const [brief, questions] = results;
    res.json({ brief, questions });

  } catch (err) {
    console.error('Interview prep error:', err);
    res.status(502).json({ error: 'Could not generate interview prep. Please try again.' });
  }
});

// ══════════════════════════════════════════════════════════════
//  CAREER DATA VAULT
//  Persistent store for a user's complete career history.
//  Stored as a JSONB blob on the users table (no separate tables
//  needed — keeps the schema simple and the data portable).
//
//  Shape of career_vault JSON:
//  {
//    name, email, phone, location, linkedin, website, summary,
//    skills: [string, …],
//    jobs: [{ id, title, company, location, start, end, current, bullets:[…] }, …],
//    education: [{ id, degree, school, year, gpa }, …],
//    certs: [{ id, name, issuer, year }, …],
//    updatedAt: ISO string
//  }
// ══════════════════════════════════════════════════════════════

// GET /api/career — return the user's vault (null if empty)
app.get('/api/career', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT career_vault FROM users WHERE id = $1',
      [req.user.id]
    );
    const vault = result.rows[0]?.career_vault || null;
    res.json({ vault });
  } catch (err) {
    console.error('Career vault GET error:', err);
    res.status(500).json({ error: 'Could not load career vault.' });
  }
});

// POST /api/career — save/update the vault (full upsert)
app.post('/api/career', requireAuth, async (req, res) => {
  try {
    const vault = req.body?.vault;
    if (!vault || typeof vault !== 'object') {
      return res.status(400).json({ error: 'vault object is required.' });
    }
    // Stamp the update time server-side
    vault.updatedAt = new Date().toISOString();
    // Basic size guard (~500 KB raw)
    const raw = JSON.stringify(vault);
    if (raw.length > 500000) {
      return res.status(400).json({ error: 'Career vault data is too large (max 500 KB).' });
    }
    await pool.query(
      'UPDATE users SET career_vault = $1, updated_at = NOW() WHERE id = $2',
      [vault, req.user.id]
    );
    res.json({ ok: true, vault });
  } catch (err) {
    console.error('Career vault POST error:', err);
    res.status(500).json({ error: 'Could not save career vault.' });
  }
});

// ── Jobs API diagnostic endpoint ────────────────────────────────
// Visit /api/jobs-test in browser (while logged in) to check config + live call.
app.get('/api/jobs-test', requireAuth, async (req, res) => {
  const serperKey = process.env.SERPER_API_KEY;
  const rapidKey  = process.env.RAPIDAPI_KEY;
  const result = {
    keys: {
      SERPER_API_KEY: serperKey ? `set (${serperKey.slice(0,6)}…)` : 'NOT SET',
      RAPIDAPI_KEY:   rapidKey  ? `set (${rapidKey.slice(0,6)}…)`  : 'NOT SET',
    },
    tests: {}
  };

  if (serperKey) {
    // Test /jobs endpoint
    try {
      const r = await fetch('https://google.serper.dev/jobs', {
        method: 'POST',
        headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: 'business analyst canada', gl: 'ca', num: 3 }),
        signal: AbortSignal.timeout(10000),
      });
      const d = await r.json();
      result.tests.serper_jobs = r.ok
        ? { ok: true, status: r.status, jobCount: (d.jobs || []).length, rawKeys: Object.keys(d), firstJob: (d.jobs||[])[0]?.title || 'none', rawSnippet: JSON.stringify(d).slice(0, 400) }
        : { ok: false, status: r.status, rawSnippet: JSON.stringify(d).slice(0, 400) };
    } catch(e) { result.tests.serper_jobs = { ok: false, error: e.message }; }

    // Also test /search endpoint (backup strategy)
    try {
      const r = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: 'business analyst jobs canada', gl: 'ca', num: 3 }),
        signal: AbortSignal.timeout(10000),
      });
      const d = await r.json();
      result.tests.serper_search = r.ok
        ? { ok: true, status: r.status, organicCount: (d.organic||[]).length, rawKeys: Object.keys(d) }
        : { ok: false, status: r.status, rawSnippet: JSON.stringify(d).slice(0, 200) };
    } catch(e) { result.tests.serper_search = { ok: false, error: e.message }; }
  }

  if (rapidKey) {
    try {
      const r = await fetch('https://jsearch.p.rapidapi.com/search?query=software+engineer+canada&page=1&num_pages=1', {
        headers: { 'x-rapidapi-key': rapidKey, 'x-rapidapi-host': 'jsearch.p.rapidapi.com' },
        signal: AbortSignal.timeout(10000),
      });
      const d = await r.json();
      result.tests.jsearch = r.ok
        ? { ok: true, jobCount: (d.data || []).length, firstJob: (d.data||[])[0]?.job_title || 'none' }
        : { ok: false, status: r.status, body: JSON.stringify(d).slice(0, 200) };
    } catch(e) { result.tests.jsearch = { ok: false, error: e.message }; }
  }

  // Always test Remotive (free, no auth)
  try {
    const r = await fetch('https://remotive.com/api/remote-jobs?search=software+engineer&limit=2', { signal: AbortSignal.timeout(8000) });
    const d = await r.json();
    result.tests.remotive = r.ok
      ? { ok: true, jobCount: (d.jobs||[]).length }
      : { ok: false, status: r.status };
  } catch(e) { result.tests.remotive = { ok: false, error: e.message }; }

  res.json(result);
});

// ── Real Job Listings ───────────────────────────────────────────
// Priority: Serper.dev Google Jobs → JSearch (RapidAPI) → Remotive fallback
// Supports pagination via `start` param (0, 10, 20…).
app.post('/api/jobs-search', requireAuth, async (req, res) => {
  const { query, location, workType, datePosted = 'any', exp = 'any', start = 0 } = req.body || {};
  if (!query) return res.status(400).json({ error: 'query is required' });

  // Map date filter to Serper values
  const dateMap = { today: 'today', '3days': 'today', week: 'week', month: 'month' }; // Serper /jobs uses 'today' as closest for 3-day
  const tbsMap  = { today: 'qdr:d', '3days': 'qdr:d3', week: 'qdr:w', month: 'qdr:m' }; // for /search tbs param

  // Map experience level to query suffix
  const expSuffix = { entry: ' entry level junior', mid: ' mid level', senior: ' senior' }[exp] || '';

  const serperKey  = process.env.SERPER_API_KEY;
  const rapidKey   = process.env.RAPIDAPI_KEY;
  const errors     = []; // collect errors from each source for debugging

  // Detect ISO country code from a plain-text location string.
  // Canadian provinces and major cities are explicitly mapped to 'ca' so that
  // Serper uses the correct Google country and returns Canadian results.
  function countryCode(loc) {
    if (!loc) return null;
    const l = loc.toLowerCase().trim();
    const map = {
      // Canada — country, provinces, territories
      'canada':'ca','ontario':'ca','alberta':'ca','british columbia':'ca','bc':'ca',
      'quebec':'ca','manitoba':'ca','saskatchewan':'ca','nova scotia':'ca',
      'new brunswick':'ca','newfoundland':'ca','labrador':'ca','prince edward island':'ca',
      'pei':'ca','yukon':'ca','northwest territories':'ca','nwt':'ca','nunavut':'ca',
      // Canada — major cities
      'toronto':'ca','vancouver':'ca','calgary':'ca','edmonton':'ca','ottawa':'ca',
      'montreal':'ca','winnipeg':'ca','halifax':'ca','victoria':'ca','saskatoon':'ca',
      'regina':'ca','st. john\'s':'ca','kitchener':'ca','london ontario':'ca',
      'hamilton':'ca','brampton':'ca','mississauga':'ca','surrey':'ca','burnaby':'ca',
      // UK
      'uk':'gb','united kingdom':'gb','england':'gb','scotland':'gb','wales':'gb',
      'london':'gb','manchester':'gb','birmingham':'gb','edinburgh':'gb','glasgow':'gb',
      // Others
      'australia':'au','sydney':'au','melbourne':'au','brisbane':'au',
      'india':'in','germany':'de','france':'fr','netherlands':'nl',
      'usa':'us','united states':'us','america':'us','new york':'us','chicago':'us',
      'los angeles':'us','san francisco':'us','seattle':'us','austin':'us',
      'nigeria':'ng','lagos':'ng','abuja':'ng','south africa':'za','johannesburg':'za',
      'kenya':'ke','nairobi':'ke','ghana':'gh','accra':'gh',
      'ireland':'ie','dublin':'ie','new zealand':'nz','auckland':'nz',
      'singapore':'sg','pakistan':'pk','karachi':'pk','brazil':'br','sao paulo':'br',
      'mexico':'mx','uae':'ae','dubai':'ae','abu dhabi':'ae',
    };
    for (const [k, v] of Object.entries(map)) {
      if (l.includes(k)) return v;
    }
    return null;
  }

  // ── 1. Serper.dev ─────────────────────────────────────────────
  if (serperKey) {
    const gl = countryCode(location);

    // Known job board hostnames → display label
    // Priority sites (eluta, hiring.cafe, linkedin) are listed first for easy reference
    const BOARD_LABELS = {
      'eluta.ca':           'Eluta',
      'hiring.cafe':        'Hiring.cafe',
      'linkedin.com':       'LinkedIn',
      'indeed.com':         'Indeed', 'ca.indeed.com': 'Indeed',
      'glassdoor.com':      'Glassdoor', 'lever.co': 'Lever', 'greenhouse.io': 'Greenhouse',
      'workday.com':        'Workday', 'ashbyhq.com': 'Ashby', 'smartrecruiters.com': 'SmartRecruiters',
      'dover.com':          'Dover', 'jobs.google.com': 'Google Careers', 'careers.google.com': 'Google Careers',
      'ziprecruiter.com':   'ZipRecruiter', 'wellfound.com': 'Wellfound', 'monster.ca': 'Monster',
    };

    // Pick the best direct URL from a Serper job object.
    // Priority: non-Google applyOptions link → applyLink → link
    function pickBestUrl(j) {
      const opts = j.applyOptions || [];
      const direct = opts.find(o => o.link && !o.link.includes('google.com') && !o.link.includes('goo.gl'));
      return (direct && direct.link) || j.applyLink || j.link || null;
    }

    // Derive a readable board/platform label from a URL
    function platformLabel(url) {
      if (!url) return null;
      try {
        const host = new URL(url).hostname.replace('www.', '');
        for (const [k, v] of Object.entries(BOARD_LABELS)) { if (host.includes(k)) return v; }
        return host;
      } catch (e) { return null; }
    }

    // Detect aggregator/search-results pages masquerading as job postings.
    // Checks both title AND snippet because the snippet always betrays them
    // (e.g. "Browse 157 Costco, Business Analyst job openings from Remote").
    function isAggregatorResult(title, snippet) {
      const t = (title   || '');
      const s = (snippet || '');
      return (
        // Title patterns
        /\bjobs? (in|at|near|now available|available)\b/i.test(t) ||
        /\d[\d,]* .+ jobs?\b/i.test(t)                           ||
        /^(search|browse) \d/i.test(t)                           ||
        /\bjob listings?\b/i.test(t)                             ||
        // Snippet patterns — the dead giveaway
        /browse \d[\d,]* .+ jobs?/i.test(s)                      ||
        /search \d[\d,]* .+ jobs?/i.test(s)                      ||
        /\d[\d,]* .+ jobs? (now available|available in|in )/i.test(s) ||
        /discover .+ jobs? (in|at|near)/i.test(s)                ||
        /job openings? (from|in|at|on) /i.test(s)                ||
        /apply (now|today) for .+ jobs?/i.test(s)
      );
    }

    // Normalise a Serper /jobs result into a standard job object
    function normaliseSerperJob(j) {
      const ext  = j.detectedExtensions || j.detected_extensions || {};
      const opts = (j.applyOptions || []).map(o => ({ title: o.title, link: o.link }));
      const applyUrl = pickBestUrl(j);
      const via  = j.via || platformLabel(applyUrl);
      return {
        id:             j.jobId || j.job_id || (j.companyName + '|' + j.title),
        title:          j.title,
        company:        j.companyName || j.company_name || '',
        companyLogo:    null,
        location:       j.location || '',
        isRemote:       (j.location || '').toLowerCase().includes('remote') || workType === 'remote',
        applyUrl,
        applyOptions:   opts.filter(o => o.link && !o.link.includes('google.com')), // only direct links
        description:    (j.description || j.snippet || '').replace(/\s+/g, ' ').slice(0, 500),
        salary:         ext.salary || ext.salaryInfo || null,
        employmentType: ext.scheduleType || ext.schedule_type || null,
        posted:         ext.postedAt || ext.posted_at || null,
        source:         'Google Jobs',
        via,
      };
    }

    // Normalise a Serper /search organic result into a standard job object
    function normaliseOrganicResult(r, i) {
      const url = r.link || '';
      const via = platformLabel(url);
      // Strip "- LinkedIn" / "| Indeed" / "- Company Name" from end of title
      const cleanTitle = (r.title || '')
        .replace(/\s*[|\-–]\s*(LinkedIn|Indeed|Glassdoor|Workday|Lever|Greenhouse|Ashby|SmartRecruiters|ZipRecruiter|Monster).*$/i, '')
        .trim();
      // Google snippet format: "Company · Location · Full-time\nDescription…"
      let company = '';
      const snippetMeta = (r.snippet || '').match(/^([^·\n\|]+)\s*·/);
      if (snippetMeta) company = snippetMeta[1].trim();
      return {
        id:             'org-' + i + '-' + url.slice(-10),
        title:          cleanTitle || r.title || 'Job Opening',
        company,
        companyLogo:    null,
        location:       location || '',
        isRemote:       workType === 'remote' || (r.snippet || '').toLowerCase().includes('remote'),
        applyUrl:       url,
        applyOptions:   [],
        description:    (r.snippet || '').replace(/^[^·\n]+·[^·\n]+·[^·\n]*\n?/, '').trim(), // skip meta prefix
        salary:         null,
        employmentType: null,
        posted:         null,
        source:         'Google Jobs',
        via,
      };
    }

    // Helper: build common Serper /search body
    function serperSearchBody(q, extra = {}) {
      const body = { q, num: 10, ...extra };
      const glCode = gl || (location ? null : 'us');
      if (glCode) body.gl = glCode;
      if (!body.gl) delete body.gl;
      if (start > 0) body.start = start;
      if (tbsMap[datePosted]) body.tbs = tbsMap[datePosted];
      return body;
    }

    async function serperSearch(q, extraBody = {}) {
      const resp = await fetch('https://google.serper.dev/search', {
        method:  'POST',
        headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
        body:    JSON.stringify(serperSearchBody(q, extraBody)),
        signal:  AbortSignal.timeout(11000),
      });
      if (!resp.ok) throw new Error(`Serper /search HTTP ${resp.status}`);
      return resp.json();
    }

    // Build base query parts
    const baseQ   = query.trim() + expSuffix + (workType === 'remote' ? ' remote' : '') + (location ? ' ' + location.trim() : '');

    // ── Run all three Serper searches in PARALLEL ─────────────────
    // P1: Priority sites — Eluta + Hiring.cafe + LinkedIn
    // P2: Google Jobs panel (structured job data, best quality)
    // P3: Broader boards fallback — Indeed, Glassdoor, Greenhouse, etc.
    const [p1Result, p2Result, p3Result] = await Promise.allSettled([

      // P1 — Priority: eluta.ca, hiring.cafe, linkedin.com/jobs
      serperSearch(`${baseQ} (site:eluta.ca OR site:hiring.cafe OR site:linkedin.com/jobs)`),

      // P2 — Google Jobs panel (Serper /jobs endpoint)
      fetch('https://google.serper.dev/jobs', {
        method:  'POST',
        headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
        body:    JSON.stringify((() => {
          const b = { q: baseQ, num: 10 };
          if (start > 0) b.start = start;
          if (gl) b.gl = gl;
          if (dateMap[datePosted]) b.datePosted = dateMap[datePosted];
          return b;
        })()),
        signal: AbortSignal.timeout(10000),
      }).then(r => r.ok ? r.json() : Promise.reject(new Error(`/jobs HTTP ${r.status}`))),

      // P3 — Broader boards: Indeed, Glassdoor, Greenhouse, ZipRecruiter, etc.
      serperSearch(`${baseQ} (site:indeed.com OR site:glassdoor.com/job-listing OR site:jobs.lever.co OR site:boards.greenhouse.io OR site:ziprecruiter.com/jobs)`),
    ]);

    // ── Extract jobs from each result ─────────────────────────────
    // Dedup key: normalised title+company
    const seen = new Set();
    function dedup(jobs) {
      return jobs.filter(j => {
        const k = ((j.title || '') + '|' + (j.company || '')).toLowerCase().replace(/\s+/g, ' ').trim();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    }

    let priorityJobs = [];
    // Helper: normalise + filter aggregators in one step
    const cleanJobs = arr => arr.filter(j => !isAggregatorResult(j.title, j.description));

    if (p1Result.status === 'fulfilled') {
      const d = p1Result.value;
      const organic   = (d.organic || []).map(normaliseOrganicResult).filter(j => j.applyUrl);
      const jobsBlock = (d.jobs    || []).map(normaliseSerperJob);
      // Tag P1 jobs so app.js can hoist them above gov/ATS results
      priorityJobs = cleanJobs([...organic, ...jobsBlock]).map(j => ({ ...j, _tier: 1 }));
      console.log(`Serper priority (eluta/hiring.cafe/linkedin) → ${priorityJobs.length} results`);
    } else {
      errors.push('Serper priority: ' + p1Result.reason?.message);
    }

    let googleJobs = [];
    if (p2Result.status === 'fulfilled') {
      // Tag LinkedIn jobs from the Google Jobs panel as tier-1 (priority source)
      googleJobs = cleanJobs((p2Result.value.jobs || []).map(normaliseSerperJob)).map(j => {
        const via = (j.via || '').toLowerCase();
        const url = (j.applyUrl || '').toLowerCase();
        if (via.includes('linkedin') || url.includes('linkedin.com')) return { ...j, _tier: 1 };
        return j;
      });
      console.log(`Serper /jobs (Google Jobs panel) → ${googleJobs.length} results`);
    } else {
      errors.push('Serper /jobs: ' + p2Result.reason?.message);
    }

    let boardJobs = [];
    if (p3Result.status === 'fulfilled') {
      const d = p3Result.value;
      const organic   = (d.organic || []).map(normaliseOrganicResult).filter(j => j.applyUrl);
      const jobsBlock = (d.jobs    || []).map(normaliseSerperJob);
      boardJobs = cleanJobs([...jobsBlock, ...organic]);
      console.log(`Serper boards (Indeed/Glassdoor/etc) → ${boardJobs.length} results`);
    } else {
      errors.push('Serper boards: ' + p3Result.reason?.message);
    }

    // ── Merge with priority order: Eluta/Hiring.cafe/LinkedIn → Google Jobs → Other boards ──
    const merged = dedup([...priorityJobs, ...googleJobs, ...boardJobs]);
    if (merged.length > 0) {
      return res.json({ jobs: merged, source: 'google', hasMore: merged.length >= 10 });
    }
    errors.push('Serper: all strategies returned 0 results');
  }

  // ── 2. JSearch (RapidAPI) ─────────────────────────────────────
  if (rapidKey) {
    try {
      let searchQ = query.trim();
      if (workType === 'remote') searchQ += ' remote';
      if (location) searchQ += ' ' + location.trim(); // always include location for specificity

      const jDateMap = { today: 'today', '3days': 'today', week: 'week', month: 'month' };
      const params = new URLSearchParams({
        query:       searchQ + expSuffix,
        page:        String(Math.floor(start / 10) + 1),
        num_pages:   '1',
        date_posted: jDateMap[datePosted] || 'month',
      });
      if (workType === 'remote') params.set('remote_jobs_only', 'true');

      const jresp = await fetch(`https://jsearch.p.rapidapi.com/search?${params}`, {
        headers: { 'x-rapidapi-key': rapidKey, 'x-rapidapi-host': 'jsearch.p.rapidapi.com' },
        signal:  AbortSignal.timeout(10000),
      });
      if (!jresp.ok) throw new Error(`JSearch HTTP ${jresp.status}`);
      const jdata = await jresp.json();

      const jobs = (jdata.data || []).map(j => ({
        id:             j.job_id,
        title:          j.job_title,
        company:        j.employer_name,
        companyLogo:    j.employer_logo || null,
        location:       [j.job_city, j.job_state, j.job_country].filter(Boolean).join(', '),
        isRemote:       j.job_is_remote,
        applyUrl:       j.job_apply_link,
        applyOptions:   [],
        description:    (j.job_description || '').replace(/\s+/g, ' ').slice(0, 400),
        salary:         j.job_min_salary ? `$${Math.round(j.job_min_salary/1000)}k–$${Math.round(j.job_max_salary/1000)}k` : null,
        employmentType: j.job_employment_type || null,
        posted:         j.job_posted_at_datetime_utc || null,
        source:         'LinkedIn / Indeed',
        via:            null,
      }));

      return res.json({ jobs, source: 'jsearch', hasMore: jobs.length >= 10 });
    } catch (err) {
      console.error('JSearch error:', err.message);
      errors.push('JSearch: ' + err.message);
    }
  }

  // ── 3. Remotive (free, no-auth — remote jobs only) ────────────
  try {
    const rurl = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=20`;
    const rresp = await fetch(rurl, { signal: AbortSignal.timeout(8000) });
    if (!rresp.ok) throw new Error(`Remotive HTTP ${rresp.status}`);
    const rdata = await rresp.json();

    let jobs = rdata.jobs || [];
    if (location) {
      const ll = location.toLowerCase();
      const filtered = jobs.filter(j =>
        (j.candidate_required_location || '').toLowerCase().includes(ll) ||
        ['worldwide', ''].includes((j.candidate_required_location || '').toLowerCase())
      );
      if (filtered.length >= 3) jobs = filtered;
    }

    const mapped = jobs.slice(start, start + 10).map(j => ({
      id:             String(j.id),
      title:          j.title,
      company:        j.company_name,
      companyLogo:    j.company_logo || null,
      location:       j.candidate_required_location || 'Remote',
      isRemote:       true,
      applyUrl:       j.url,
      applyOptions:   [],
      description:    (j.description || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').slice(0, 400),
      salary:         j.salary || null,
      employmentType: null,
      posted:         j.publication_date || null,
      source:         'Remotive',
      via:            null,
    }));

    return res.json({ jobs: mapped, source: 'remotive', hasMore: jobs.length > start + 10, _debug: errors.length ? errors : undefined });
  } catch (err) {
    console.error('Remotive error:', err.message);
    errors.push('Remotive: ' + err.message);
    // All sources failed — return empty with full debug info
    return res.json({ jobs: [], source: 'none', hasMore: false, _errors: errors });
  }
});

// ══════════════════════════════════════════════════════════════
//  AUTHENTIC JOBS — Direct ATS company job boards
//  Only returns results hosted on verified ATS platforms
//  (Greenhouse, Lever, Ashby, Workday, etc.) so every listing
//  is live and posted directly by the hiring company.
// ══════════════════════════════════════════════════════════════
app.post('/api/jobs-authentic', requireAuth, async (req, res) => {
  const { query, location, workType } = req.body || {};
  if (!query) return res.status(400).json({ error: 'query is required' });

  const serperKey = process.env.SERPER_API_KEY;
  if (!serperKey) return res.json({ jobs: [], source: 'none', reason: 'no-serper-key' });

  // Known ATS platforms whose public job boards are authoritative sources.
  // If a job lives here, it came directly from the company's hiring system.
  const VERIFIED_ATS_HOSTS = {
    'boards.greenhouse.io': 'Greenhouse',
    'jobs.lever.co': 'Lever',
    'apply.lever.co': 'Lever',
    'app.ashbyhq.com': 'Ashby',
    'jobs.ashbyhq.com': 'Ashby',
    'smartrecruiters.com': 'SmartRecruiters',
    'myworkdayjobs.com': 'Workday',
    'apply.workable.com': 'Workable',
    'jobs.workable.com': 'Workable',
    'bamboohr.com': 'BambooHR',
    'icims.com': 'iCIMS',
    'taleo.net': 'Taleo',
    'jobvite.com': 'Jobvite',
    'dover.com': 'Dover',
    'recruitee.com': 'Recruitee',
    'teamtailor.com': 'Teamtailor',
    'breezy.hr': 'Breezy HR',
    'pinpointhq.com': 'Pinpoint',
    'workday.com': 'Workday',
    'successfactors.com': 'SAP SuccessFactors',
    'hireez.com': 'HireEZ',
    'hiring.cafe': 'Hiring.cafe',
  };

  function detectATS(url) {
    if (!url) return null;
    try {
      const host = new URL(url).hostname.replace('www.', '');
      for (const [k, v] of Object.entries(VERIFIED_ATS_HOSTS)) {
        if (host.includes(k)) return v;
      }
    } catch {}
    return null;
  }

  // Build site: query targeting only ATS domains
  const atsSites = [
    'site:boards.greenhouse.io',
    'site:jobs.lever.co',
    'site:app.ashbyhq.com',
    'site:jobs.ashbyhq.com',
    'site:myworkdayjobs.com',
    'site:apply.workable.com',
    'site:smartrecruiters.com/jobs',
    'site:bamboohr.com/jobs',
    'site:dover.com/jobs',
    'site:recruitee.com',
    'site:teamtailor.com/jobs',
    'site:hiring.cafe',
  ].join(' OR ');

  let q = `${query.trim()} (${atsSites})`;
  if (workType === 'remote') q += ' remote';
  if (location) q += ' ' + location.trim();

  try {
    const sresp = await fetch('https://google.serper.dev/search', {
      method:  'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ q, num: 20 }),
      signal:  AbortSignal.timeout(12000),
    });
    if (!sresp.ok) throw new Error(`Serper HTTP ${sresp.status}`);
    const sdata = await sresp.json();

    const organic = sdata.organic || [];
    const jobs = organic
      .filter(r => r.link && detectATS(r.link))
      .map((r, i) => {
        const url  = r.link || '';
        const ats  = detectATS(url) || 'Direct';

        // Strip ATS/platform suffixes from title
        const cleanTitle = (r.title || '')
          .replace(/\s*[|\-–]\s*(Greenhouse|Lever|Ashby|Workday|SmartRecruiters|Workable|BambooHR|Jobvite|Recruitee|Teamtailor|Dover|iCIMS|Taleo).*$/i, '')
          .replace(/\s*\|\s*[^|]{1,60}$/, '') // strip trailing "| Company Name"
          .trim();

        // Derive company name from snippet or URL slug
        let company = '';
        const snippetMeta = (r.snippet || '').match(/^([^·•|\n]{3,50})\s*[·•|]/);
        if (snippetMeta) company = snippetMeta[1].trim();

        // Fallback: parse company slug from known URL patterns
        if (!company) {
          const ghMatch = url.match(/greenhouse\.io\/([^\/]+)/);
          if (ghMatch) company = ghMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        }
        if (!company) {
          const lvMatch = url.match(/lever\.co\/([^\/]+)/);
          if (lvMatch) company = lvMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        }
        if (!company) {
          const ashMatch = url.match(/ashbyhq\.com\/([^\/]+)/);
          if (ashMatch) company = ashMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        }
        if (!company) {
          const wdMatch = url.match(/([^.]+)\.myworkdayjobs\.com/);
          if (wdMatch) company = wdMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        }
        if (!company) {
          const hcMatch = url.match(/hiring\.cafe\/companies\/([^\/]+)/);
          if (hcMatch) company = hcMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        }

        const isRemote =
          workType === 'remote' ||
          (r.snippet || '').toLowerCase().includes('remote') ||
          (r.title   || '').toLowerCase().includes('remote');

        return {
          id:             'auth-' + i + '-' + url.slice(-10),
          title:          cleanTitle || r.title || 'Job Opening',
          company,
          companyLogo:    null,
          location:       location || (isRemote ? 'Remote' : ''),
          isRemote,
          applyUrl:       url,
          applyOptions:   [],
          description:    (r.snippet || '').replace(/\s+/g, ' ').trim(),
          salary:         null,
          employmentType: null,
          posted:         null,
          source:         ats,
          via:            ats,
          verified:       true,   // ← confirmed direct ATS source
        };
      });

    console.log(`Authentic /jobs → ${jobs.length} verified ATS listings for "${q.slice(0, 60)}"`);
    res.json({ jobs, source: 'authentic' });

  } catch (err) {
    console.error('Authentic jobs error:', err.message);
    res.json({ jobs: [], source: 'none', error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  CANADIAN GOVERNMENT & PROVINCIAL JOB BOARDS
//  Uses verified direct posting URLs (not aggregators).
//  Two focused Serper calls: federal + province-specific.
//  Results tagged gov:true, surfaced first in the UI.
// ══════════════════════════════════════════════════════════════
app.post('/api/jobs-gov-canada', requireAuth, async (req, res) => {
  const { query, location, workType } = req.body || {};
  if (!query) return res.status(400).json({ error: 'query is required' });

  const serperKey = process.env.SERPER_API_KEY;
  if (!serperKey) return res.json({ jobs: [], source: 'none', reason: 'no-serper-key' });

  // ── Verified direct posting domains — provinces + major cities ──────────
  const BOARD_LABELS = {
    // Federal
    'emploisfp-psjobs.cfp-psc.gc.ca': 'Government of Canada (GC Jobs)',
    'psjobs-emploisfp.psc-cfp.gc.ca': 'Government of Canada (GC Jobs)',
    'jobbank.gc.ca':                   'Job Bank Canada',
    // Ontario — Province
    'gojobs.gov.on.ca':                'Ontario Public Service',
    // Ontario — Cities
    'jobs.toronto.ca':                 'City of Toronto',
    'eos.toronto.ca':                  'City of Toronto',
    'jobs-emplois.ottawa.ca':          'City of Ottawa',
    'jobs.mississauga.ca':             'City of Mississauga',
    'brampton.ca':                     'City of Brampton',
    'hamilton.ca':                     'City of Hamilton',
    'kitchener.ca':                    'City of Kitchener',
    // Alberta — Province
    'jobpostings.alberta.ca':          'Government of Alberta',
    // Alberta — Cities
    'recruiting.calgary.ca':           'City of Calgary',
    'recruitment.edmonton.ca':         'City of Edmonton',
    'edmonton.taleo.net':              'City of Edmonton',
    // BC — Province
    'www2.gov.bc.ca':                  'BC Public Service',
    'bcpublicservice.hua.hrsmart.com': 'BC Public Service',
    // BC — Cities
    'jobs.vancouver.ca':               'City of Vancouver',
    'surrey.ca':                       'City of Surrey',
    'burnaby.ca':                      'City of Burnaby',
    // Quebec — Province
    'recrutement.carrieres.gouv.qc.ca':'Québec Public Service',
    'carrieres.gouv.qc.ca':            'Québec Public Service',
    // Quebec — Cities
    'montreal.ca':                     'City of Montreal',
    // Manitoba — Province
    'jobsearch.gov.mb.ca':             'Manitoba Government Jobs',
    // Manitoba — Cities
    'winnipeg.ca':                     'City of Winnipeg',
    // Saskatchewan — Province + Cities
    'govskpsc.taleo.net':              'Government of Saskatchewan',
    'saskjobs.ca':                     'Saskatchewan Jobs',
    'saskatoon.ca':                    'City of Saskatoon',
    'regina.ca':                       'City of Regina',
    // Nova Scotia — Province + City
    'jobs.novascotia.ca':              'Nova Scotia Government',
    'halifax.ca':                      'Halifax Regional Municipality',
    // New Brunswick
    'ere.gnb.ca':                      'Government of New Brunswick',
    // Newfoundland
    'careers.gov.nl.ca':               'Government of Newfoundland',
    // PEI
    'jobs.princeedwardisland.ca':      'PEI Government',
    // Yukon
    'jobs.yukon.ca':                   'Yukon Government',
    // NWT
    'nwtjobs.ca':                      'NWT Government',
    // Nunavut
    'recruitmentnu.ca':                'Government of Nunavut',
  };

  function detectBoard(url) {
    if (!url) return null;
    const u = url.toLowerCase();
    for (const [k, v] of Object.entries(BOARD_LABELS)) {
      if (u.includes(k)) return v;
    }
    return null;
  }

  // ── City/Province → site: operators (province + city combined when city detected)
  // Format: 'site:X OR site:Y' — keeps each query to max 2-3 operators so Google doesn't choke
  const locLower = (location || '').toLowerCase();
  const PROVINCE_SITE_MAP = [
    // Ontario — city-specific combos first, then province fallback
    { keys: ['toronto'],
      site: 'site:gojobs.gov.on.ca OR site:jobs.toronto.ca' },
    { keys: ['ottawa'],
      site: 'site:gojobs.gov.on.ca OR site:jobs-emplois.ottawa.ca' },
    { keys: ['mississauga'],
      site: 'site:gojobs.gov.on.ca OR site:jobs.mississauga.ca' },
    { keys: ['brampton'],
      site: 'site:gojobs.gov.on.ca OR site:brampton.ca' },
    { keys: ['hamilton'],
      site: 'site:gojobs.gov.on.ca OR site:hamilton.ca' },
    { keys: ['ontario','london, on','kitchener','windsor','barrie','kingston','sudbury'],
      site: 'site:gojobs.gov.on.ca' },
    // Alberta — city-specific combos first
    { keys: ['calgary'],
      site: 'site:jobpostings.alberta.ca OR site:recruiting.calgary.ca' },
    { keys: ['edmonton'],
      site: 'site:jobpostings.alberta.ca OR site:recruitment.edmonton.ca' },
    { keys: ['alberta','red deer','lethbridge','medicine hat','grande prairie'],
      site: 'site:jobpostings.alberta.ca' },
    // BC — city-specific combos first
    { keys: ['vancouver'],
      site: 'site:www2.gov.bc.ca OR site:jobs.vancouver.ca' },
    { keys: ['surrey'],
      site: 'site:www2.gov.bc.ca OR site:surrey.ca' },
    { keys: ['burnaby'],
      site: 'site:www2.gov.bc.ca OR site:burnaby.ca' },
    { keys: ['british columbia','bc','victoria','kelowna','abbotsford','coquitlam','richmond'],
      site: 'site:www2.gov.bc.ca' },
    // Quebec — city-specific combos first
    { keys: ['montreal'],
      site: 'site:recrutement.carrieres.gouv.qc.ca OR site:montreal.ca' },
    { keys: ['quebec','québec','laval','gatineau','longueuil','sherbrooke'],
      site: 'site:recrutement.carrieres.gouv.qc.ca' },
    // Manitoba — city-specific combos first
    { keys: ['winnipeg'],
      site: 'site:jobsearch.gov.mb.ca OR site:winnipeg.ca' },
    { keys: ['manitoba','brandon'],
      site: 'site:jobsearch.gov.mb.ca' },
    // Saskatchewan — city-specific combos first
    { keys: ['saskatoon'],
      site: 'site:govskpsc.taleo.net OR site:saskatoon.ca' },
    { keys: ['regina'],
      site: 'site:govskpsc.taleo.net OR site:regina.ca' },
    { keys: ['saskatchewan','prince albert'],
      site: 'site:govskpsc.taleo.net' },
    // Nova Scotia — city-specific combos first
    { keys: ['halifax'],
      site: 'site:jobs.novascotia.ca OR site:halifax.ca' },
    { keys: ['nova scotia','sydney','truro'],
      site: 'site:jobs.novascotia.ca' },
    { keys: ['new brunswick','fredericton','moncton','saint john','miramichi'],
      site: 'site:ere.gnb.ca' },
    { keys: ['newfoundland','labrador','st. john','corner brook','gander'],
      site: 'site:careers.gov.nl.ca' },
    { keys: ['prince edward island','pei','charlottetown','summerside'],
      site: 'site:jobs.princeedwardisland.ca' },
    { keys: ['yukon','whitehorse','watson lake'],
      site: 'site:jobs.yukon.ca' },
    { keys: ['northwest territories','nwt','yellowknife','hay river'],
      site: 'site:nwtjobs.ca' },
    { keys: ['nunavut','iqaluit','rankin inlet'],
      site: 'site:recruitmentnu.ca' },
  ];

  let provinceSite = null;
  for (const entry of PROVINCE_SITE_MAP) {
    if (entry.keys.some(k => locLower.includes(k))) {
      provinceSite = entry.site;
      break;
    }
  }

  // ── Build queries ────────────────────────────────────────────────────────
  // Federal: GC Jobs (direct public service postings) is the primary federal source
  const locSuffix = location ? ' ' + location.trim() : ' Canada';
  const remoteSuffix = workType === 'remote' ? ' remote' : '';
  // Restrict jobbank to /jobsearch/jobposting/* to avoid news/market-info pages
  const federalQuery    = `${query.trim()} (site:emploisfp-psjobs.cfp-psc.gc.ca OR site:jobbank.gc.ca/jobsearch/jobposting)${locSuffix}${remoteSuffix}`;
  const provincialQuery = provinceSite
    ? `${query.trim()} ${provinceSite}${locSuffix}${remoteSuffix}`
    : null;

  function serperFetch(q) {
    return fetch('https://google.serper.dev/search', {
      method:  'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ q, num: 10, gl: 'ca', hl: 'en' }),
      signal:  AbortSignal.timeout(12000),
    });
  }

  // Titles that indicate non-job content (news, info pages, guides)
  const NON_JOB_TITLE_RE = /^search\b|^browse\b|^all jobs\b|^job listings\b|^careers home\b|^jobs at\b|search in\.\.\.|search results|\b(labour market (information|news|report|bulletin)|market news|market report|employment insurance|ei benefits|lmi insight|job bank news|news release|program guide|about us|contact us|accessibility|privacy policy|terms of (use|service)|current (openings|opportunities)$|job search portal|job board)\b/i;

  // URL patterns that indicate category/search pages rather than individual postings
  const NON_JOB_URL_RE = /\/(search|browse|careers\/?$|jobs\/?$|all-jobs\/?$|current-opportunities\/?$|job-listings\/?$|jobsearch\/?$|jobsearch\?(?!.*jobid)|en\/jobs\/?$)(\?|#|$)/i;

  function mapResults(organic, offset) {
    return (organic || [])
      .filter(r => r.link && detectBoard(r.link))
      .filter(r => !NON_JOB_TITLE_RE.test(r.title || ''))
      .filter(r => !NON_JOB_URL_RE.test(r.link || ''))
      .map((r, i) => {
        const url   = r.link || '';
        const board = detectBoard(url) || 'Canadian Government';
        const cleanTitle = (r.title || '')
          .replace(/\s*[|\-–]\s*(Job Bank|Government of Canada|GC Jobs|Ontario|Alberta|BC|Quebec|Manitoba|Saskatchewan|Nova Scotia|New Brunswick|Newfoundland|Yukon|Public Service|Canada\.ca|Jobs with the).*$/i, '')
          .replace(/\s*\|\s*[^|]{1,60}$/, '')
          .trim();
        const isRemote = workType === 'remote' ||
          (r.snippet || '').toLowerCase().includes('remote') ||
          (r.title   || '').toLowerCase().includes('remote');
        return {
          id:             'gov-' + (i + offset) + '-' + url.slice(-8),
          title:          cleanTitle || r.title || 'Government Position',
          company:        board,
          companyLogo:    null,
          location:       location || (isRemote ? 'Remote' : 'Canada'),
          isRemote,
          applyUrl:       url,
          applyOptions:   [],
          description:    (r.snippet || '').replace(/\s+/g, ' ').trim(),
          salary:         null,
          employmentType: null,
          posted:         null,
          source:         board,
          via:            board,
          verified:       true,
          gov:            true,
        };
      });
  }

  try {
    // Run federal + provincial in parallel
    const fetches = [serperFetch(federalQuery)];
    if (provincialQuery) fetches.push(serperFetch(provincialQuery));

    const responses = await Promise.all(fetches);
    let allJobs = [];

    for (let i = 0; i < responses.length; i++) {
      if (responses[i].ok) {
        const data = await responses[i].json();
        allJobs = allJobs.concat(mapResults(data.organic || [], allJobs.length));
      }
    }

    // Deduplicate by URL
    const seen = new Set();
    const jobs = allJobs.filter(j => {
      if (seen.has(j.applyUrl)) return false;
      seen.add(j.applyUrl);
      return true;
    });

    console.log(`GovCA → ${jobs.length} listings | federal: "${federalQuery.slice(0,60)}"${provincialQuery ? ` | provincial: "${provincialQuery.slice(0,50)}"` : ''}`);
    res.json({ jobs, source: 'gov-canada' });

  } catch (err) {
    console.error('Gov Canada jobs error:', err.message);
    res.json({ jobs: [], source: 'none', error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  SALARY NEGOTIATION
// ══════════════════════════════════════════════════════════════
app.post('/api/salary-negotiate', requireAuth, async (req, res) => {
  const { jobTitle, location, offeredSalary, currency, yearsExperience, jd } = req.body || {};

  // Input validation
  if (!jobTitle || !location || !offeredSalary || !currency) {
    return res.status(400).json({ error: 'jobTitle, location, offeredSalary, and currency are required.' });
  }

  const serperKey = process.env.SERPER_API_KEY;
  const year = new Date().getFullYear();
  let marketSnippets = [];

  // Step 1: Use Serper to search for market rates (optional — fail gracefully)
  if (serperKey) {
    try {
      const searchQuery = `"${jobTitle}" average salary ${location} ${year}`;
      const sresp = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: searchQuery, num: 5 }),
        signal: AbortSignal.timeout(8000),
      });

      if (sresp.ok) {
        const sdata = await sresp.json();
        marketSnippets = (sdata.organic || []).slice(0, 5).map(r => r.snippet || '').filter(Boolean);
      }
    } catch (err) {
      console.error('Serper search error in salary-negotiate:', err.message);
      // Continue without market data
    }
  }

  // Step 2: Call Claude with all inputs + snippets
  if (!CLAUDE_KEY) {
    return res.status(503).json({ error: 'AI service not configured. Please contact support.' });
  }

  try {
    const marketContext = marketSnippets.length
      ? `Market research data:\n${marketSnippets.join('\n')}`
      : 'No live market data available; use your training knowledge.';

    const userMsg = [
      `Job Title: ${jobTitle}`,
      `Location: ${location}`,
      `Offered Salary: ${offeredSalary} ${currency}`,
      `Years of Experience: ${yearsExperience || '(not specified)'}`,
      `Currency: ${currency}`,
      jd ? `Job Description:\n${jd}` : '(Job description not provided)',
      '',
      marketContext,
      '',
      `Analyze this salary offer and provide a comprehensive negotiation strategy. Return ONLY valid JSON, no markdown, with this exact structure:`,
      `{`,
      `  "marketRate": { "low": NUMBER, "mid": NUMBER, "high": NUMBER, "currency": "${currency}" },`,
      `  "assessment": "Below Market" | "At Market" | "Above Market",`,
      `  "assessmentDetail": "2-3 sentence explanation of the assessment",`,
      `  "counterOffer": NUMBER,`,
      `  "counterOfferRationale": "2-3 sentence justification for this counter-offer",`,
      `  "negotiationScript": {`,
      `    "opening": "Exact opening sentence to start negotiation",`,
      `    "counterStatement": "Exact words to state counter-offer",`,
      `    "valueStatement": "How to articulate unique value based on the JD",`,
      `    "handlePushback": "Response if they say budget is fixed",`,
      `    "acceptance": "Graceful acceptance if they meet halfway"`,
      `  },`,
      `  "additionalLeverage": ["option 1", "option 2", "option 3", "option 4"],`,
      `  "redFlags": []`,
      `}`
    ].join('\n');

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: 'You are an expert salary negotiation coach with 20+ years of HR and career coaching experience. Provide data-driven, strategic negotiation advice.',
        messages: [{ role: 'user', content: userMsg }],
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.json().catch(() => ({}));
      const msg = (err.error && err.error.message) ? err.error.message : `AI error ${claudeRes.status}`;
      return res.status(502).json({ error: msg });
    }

    const json = await claudeRes.json();
    let text = json.content[0].text.trim();

    // Extract JSON robustly
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) { text = fenced[1].trim(); }
    const s = text.indexOf('{');
    if (s !== -1) text = text.slice(s, text.lastIndexOf('}') + 1);

    const negotiationData = JSON.parse(text);
    res.json(negotiationData);
  } catch (err) {
    console.error('Salary negotiation error:', err);
    res.status(502).json({ error: 'Failed to generate negotiation strategy. Please try again.' });
  }
});

// ── SPA fallback ───────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Helpers ────────────────────────────────────────────────────
function safeUser(u) {
  const isOwner = OWNER_EMAIL && u.email && u.email.toLowerCase() === OWNER_EMAIL;
  return {
    id:                  u.id,
    email:               u.email,
    plan:                u.plan,
    tailoring_count:     u.tailoring_count,
    subscription_status: u.subscription_status,
    is_owner:            isOwner || false,
    referral_code:       u.referral_code || null,
    referral_credits:    u.referral_credits || 0,
  };
}

app.listen(PORT, () => console.log(`ApplyStack running on port ${PORT}`));
