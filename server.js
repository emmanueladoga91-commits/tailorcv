'use strict';
// ═══════════════════════════════════════════════════════════════
//  TailorCV — Express Backend
//  Auth · Claude AI Proxy · Stripe Subscriptions · PostgreSQL
// ═══════════════════════════════════════════════════════════════
const express    = require('express');
const path       = require('path');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const { Pool }   = require('pg');
const Stripe     = require('stripe');
const rateLimit  = require('express-rate-limit');
const cors       = require('cors');

// ── Load env ───────────────────────────────────────────────────
try { require('dotenv').config(); } catch(e) {}

const PORT         = process.env.PORT          || 3000;
const JWT_SECRET   = process.env.JWT_SECRET    || 'CHANGE_THIS_SECRET_IN_PRODUCTION';
const CLAUDE_KEY   = process.env.CLAUDE_API_KEY;
const APP_URL      = process.env.APP_URL       || `http://localhost:${PORT}`;
const ADMIN_SECRET = process.env.ADMIN_SECRET  || '';
const OWNER_EMAIL  = (process.env.OWNER_EMAIL  || '').toLowerCase();
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
  console.log('Database ready.');
})().catch(err => { console.error('DB init error:', err); process.exit(1); });

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
    const { email, password, betaCode } = req.body || {};
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

    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, plan, subscription_status) VALUES ($1, $2, $3, $4) RETURNING *',
      [normalEmail, hash, plan, subscriptionStatus]
    );
    const user = result.rows[0];
    const token = signToken(user.id);
    res.json({ token, user: safeUser(user) });
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
  if (type === 'score') {
    // no gating — everyone can check their match score
  } else if (type === 'tailor') {
    if (!isPro && user.tailoring_count >= 1) {
      return res.status(402).json({
        error: 'upgrade_required',
        message: 'You have used your free resume tailoring. Upgrade to Pro for unlimited tailoring.',
      });
    }
  } else {
    if (!isPro) {
      return res.status(402).json({
        error: 'upgrade_required',
        message: 'This feature requires a TailorCV Pro subscription.',
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
    }

    res.json({ text });
  } catch (err) {
    console.error('Claude proxy error:', err);
    res.status(502).json({ error: 'AI request failed. Please try again.' });
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
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/?(h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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
          if (item.title)           parts.push('Job Title: ' + item.title);
          if (item.hiringOrganization?.name) parts.push('Company: ' + item.hiringOrganization.name);
          if (item.jobLocation)     parts.push('Location: ' + JSON.stringify(item.jobLocation));
          if (item.employmentType)  parts.push('Type: ' + item.employmentType);
          if (item.description)     parts.push('\n' + htmlToText(item.description));
          if (item.responsibilities) parts.push('Responsibilities:\n' + item.responsibilities);
          if (item.qualifications)   parts.push('Qualifications:\n' + item.qualifications);
          if (item.skills)           parts.push('Skills: ' + item.skills);
          if (item.baseSalary)       parts.push('Salary: ' + JSON.stringify(item.baseSalary));
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
  };
}

app.listen(PORT, () => console.log(`TailorCV running on port ${PORT}`));
