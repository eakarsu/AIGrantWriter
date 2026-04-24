require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ==================== SECURITY MIDDLEWARE ====================

// Helmet security headers
app.use(helmet());

// CORS
app.use(cors());

// JSON parsing
app.use(express.json());

// Global rate limiter: 200 requests per 15 minutes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Auth rate limiter: 10 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// AI rate limiter: 30 requests per 15 minutes
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many AI requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ==================== VALIDATION HELPERS ====================

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
};

// Password strength check
function checkPasswordStrength(password) {
  const checks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
  const passed = Object.values(checks).filter(Boolean).length;
  return { checks, strong: passed >= 4, score: passed };
}

// ==================== TOKEN BLACKLIST ====================

const tokenBlacklist = new Set();

// Cleanup expired tokens every hour
setInterval(() => {
  tokenBlacklist.forEach((token) => {
    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      tokenBlacklist.delete(token);
    }
  });
}, 60 * 60 * 1000);

// ==================== AUTH MIDDLEWARE ====================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  if (tokenBlacklist.has(token)) {
    return res.status(403).json({ error: 'Token has been invalidated' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    req.token = token;
    next();
  });
};

// RBAC middleware
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', authLimiter, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], validate, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check password strength
    const strength = checkPasswordStrength(password);
    if (!strength.strong) {
      return res.status(400).json({ error: 'Password must include uppercase, lowercase, number, and special character' });
    }

    // Check email uniqueness
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, email_verified, email_verification_token, email_verification_expires)
       VALUES ($1, $2, $3, 'user', false, $4, $5) RETURNING id, email, name, role`,
      [name, email, hashedPassword, verificationToken, verificationExpires]
    );

    const user = result.rows[0];
    res.status(201).json({
      message: 'Registration successful. Please verify your email.',
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      verificationToken // In dev mode, return token directly
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Email verification
app.post('/api/auth/verify-email', [
  body('token').notEmpty().withMessage('Verification token is required'),
], validate, async (req, res) => {
  try {
    const { token } = req.body;
    const result = await pool.query(
      `UPDATE users SET email_verified = true, email_verification_token = NULL, email_verification_expires = NULL
       WHERE email_verification_token = $1 AND email_verification_expires > NOW()
       RETURNING id, email, name`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    res.json({ message: 'Email verified successfully', user: result.rows[0] });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Forgot password
app.post('/api/auth/forgot-password', authLimiter, [
  body('email').isEmail().withMessage('Valid email is required'),
], validate, async (req, res) => {
  try {
    const { email } = req.body;
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const result = await pool.query(
      `UPDATE users SET password_reset_token = $1, password_reset_expires = $2
       WHERE email = $3 RETURNING id`,
      [resetToken, resetExpires, email]
    );

    // Always return success to prevent email enumeration
    if (result.rows.length > 0) {
      // In production, send email. In dev, return token.
      res.json({ message: 'If that email exists, a reset link has been sent.', resetToken });
    } else {
      res.json({ message: 'If that email exists, a reset link has been sent.' });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset password
app.post('/api/auth/reset-password', authLimiter, [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], validate, async (req, res) => {
  try {
    const { token, password } = req.body;

    const strength = checkPasswordStrength(password);
    if (!strength.strong) {
      return res.status(400).json({ error: 'Password must include uppercase, lowercase, number, and special character' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `UPDATE users SET password = $1, password_reset_token = NULL, password_reset_expires = NULL
       WHERE password_reset_token = $2 AND password_reset_expires > NOW()
       RETURNING id, email, name`,
      [hashedPassword, token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Change password (authenticated)
app.post('/api/auth/change-password', authenticateToken, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
], validate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const userResult = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const strength = checkPasswordStrength(newPassword);
    if (!strength.strong) {
      return res.status(400).json({ error: 'Password must include uppercase, lowercase, number, and special character' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, req.user.id]);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', authLimiter, [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
], validate, async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role || 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role || 'user' }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  tokenBlacklist.add(req.token);
  res.json({ message: 'Logged out successfully' });
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, name, role FROM users WHERE id = $1', [req.user.id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== DASHBOARD STATS ====================

app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM organizations) as organizations,
        (SELECT COUNT(*) FROM grants) as grants,
        (SELECT COUNT(*) FROM proposals) as proposals,
        (SELECT COUNT(*) FROM templates) as templates,
        (SELECT COUNT(*) FROM documents) as documents,
        (SELECT COUNT(*) FROM budgets) as budgets,
        (SELECT COUNT(*) FROM impact_metrics) as impact_metrics,
        (SELECT COUNT(*) FROM deadlines) as deadlines,
        (SELECT COUNT(*) FROM funders) as funders
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== PAGINATED LIST HELPER ====================

function buildPaginatedQuery({ baseQuery, searchColumns, defaultSort, defaultOrder, req }) {
  const { search, page = 1, limit = 50, sort, order } = req.query;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
  const offset = (pageNum - 1) * limitNum;

  let whereClause = '';
  const params = [];
  let paramIndex = 1;

  if (search && searchColumns.length > 0) {
    const searchConditions = searchColumns.map((col) => {
      params.push(`%${search}%`);
      return `${col} ILIKE $${paramIndex++}`;
    });
    whereClause = `WHERE ${searchConditions.join(' OR ')}`;
  }

  const allowedSort = sort || defaultSort;
  const allowedOrder = (order || defaultOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const countQuery = `SELECT COUNT(*) FROM (${baseQuery}) sub ${whereClause}`;
  const dataQuery = `${baseQuery} ${whereClause} ORDER BY ${allowedSort} ${allowedOrder} LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  const dataParams = [...params, limitNum, offset];

  return { countQuery, dataQuery, countParams: params, dataParams, pageNum, limitNum };
}

// ==================== ORGANIZATIONS ROUTES ====================

// Get all organizations (paginated)
app.get('/api/organizations', authenticateToken, async (req, res) => {
  try {
    const baseQuery = 'SELECT * FROM organizations';
    const { countQuery, dataQuery, countParams, dataParams, pageNum, limitNum } = buildPaginatedQuery({
      baseQuery,
      searchColumns: ['name', 'mission', 'contact_email', 'description'],
      defaultSort: 'created_at',
      defaultOrder: 'DESC',
      req,
    });

    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, countParams),
      pool.query(dataQuery, dataParams),
    ]);

    const total = parseInt(countResult.rows[0].count);
    res.json({ data: dataResult.rows, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single organization
app.get('/api/organizations/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM organizations WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create organization
app.post('/api/organizations', authenticateToken, [
  body('name').trim().notEmpty().withMessage('Organization name is required'),
  body('contact_email').optional({ values: 'falsy' }).isEmail().withMessage('Invalid email format'),
  body('website').optional({ values: 'falsy' }).isURL().withMessage('Invalid website URL'),
], validate, async (req, res) => {
  try {
    const { name, mission, description, website, contact_email, phone, address, tax_id, annual_budget, staff_count } = req.body;
    const result = await pool.query(
      `INSERT INTO organizations (name, mission, description, website, contact_email, phone, address, tax_id, annual_budget, staff_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [name, mission, description, website, contact_email, phone, address, tax_id, annual_budget, staff_count]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update organization
app.put('/api/organizations/:id', authenticateToken, [
  body('name').trim().notEmpty().withMessage('Organization name is required'),
  body('contact_email').optional({ values: 'falsy' }).isEmail().withMessage('Invalid email format'),
  body('website').optional({ values: 'falsy' }).isURL().withMessage('Invalid website URL'),
], validate, async (req, res) => {
  try {
    const { name, mission, description, website, contact_email, phone, address, tax_id, annual_budget, staff_count } = req.body;
    const result = await pool.query(
      `UPDATE organizations SET name=$1, mission=$2, description=$3, website=$4, contact_email=$5, phone=$6, address=$7, tax_id=$8, annual_budget=$9, staff_count=$10, updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [name, mission, description, website, contact_email, phone, address, tax_id, annual_budget, staff_count, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Bulk delete organizations
app.delete('/api/organizations/bulk', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs array is required' });
    }
    const result = await pool.query('DELETE FROM organizations WHERE id = ANY($1) RETURNING id', [ids]);
    res.json({ message: `${result.rowCount} organizations deleted`, deleted: result.rowCount });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete organization
app.delete('/api/organizations/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM organizations WHERE id = $1', [req.params.id]);
    res.json({ message: 'Organization deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== GRANTS ROUTES ====================

app.get('/api/grants', authenticateToken, async (req, res) => {
  try {
    const baseQuery = 'SELECT * FROM grants';
    const { countQuery, dataQuery, countParams, dataParams, pageNum, limitNum } = buildPaginatedQuery({
      baseQuery,
      searchColumns: ['title', 'funder_name', 'focus_areas', 'description'],
      defaultSort: 'deadline',
      defaultOrder: 'ASC',
      req,
    });

    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, countParams),
      pool.query(dataQuery, dataParams),
    ]);

    const total = parseInt(countResult.rows[0].count);
    res.json({ data: dataResult.rows, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/grants/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM grants WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Grant not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/grants', authenticateToken, [
  body('title').trim().notEmpty().withMessage('Grant title is required'),
], validate, async (req, res) => {
  try {
    const { title, funder_name, amount_min, amount_max, deadline, eligibility, focus_areas, description, requirements, website } = req.body;
    const result = await pool.query(
      `INSERT INTO grants (title, funder_name, amount_min, amount_max, deadline, eligibility, focus_areas, description, requirements, website)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [title, funder_name, amount_min, amount_max, deadline, eligibility, focus_areas, description, requirements, website]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create grant error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/grants/:id', authenticateToken, [
  body('title').trim().notEmpty().withMessage('Grant title is required'),
], validate, async (req, res) => {
  try {
    const { title, funder_name, amount_min, amount_max, deadline, eligibility, focus_areas, description, requirements, website } = req.body;
    const result = await pool.query(
      `UPDATE grants SET title=$1, funder_name=$2, amount_min=$3, amount_max=$4, deadline=$5, eligibility=$6, focus_areas=$7, description=$8, requirements=$9, website=$10, updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [title, funder_name, amount_min, amount_max, deadline, eligibility, focus_areas, description, requirements, website, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/grants/bulk', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs array is required' });
    }
    const result = await pool.query('DELETE FROM grants WHERE id = ANY($1) RETURNING id', [ids]);
    res.json({ message: `${result.rowCount} grants deleted`, deleted: result.rowCount });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/grants/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM grants WHERE id = $1', [req.params.id]);
    res.json({ message: 'Grant deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== PROPOSALS ROUTES ====================

app.get('/api/proposals', authenticateToken, async (req, res) => {
  try {
    const baseQuery = `SELECT p.*, o.name as organization_name, g.title as grant_title
      FROM proposals p
      LEFT JOIN organizations o ON p.organization_id = o.id
      LEFT JOIN grants g ON p.grant_id = g.id`;
    const { countQuery, dataQuery, countParams, dataParams, pageNum, limitNum } = buildPaginatedQuery({
      baseQuery,
      searchColumns: ['p.title', 'o.name', 'g.title', 'p.content'],
      defaultSort: 'p.created_at',
      defaultOrder: 'DESC',
      req,
    });

    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, countParams),
      pool.query(dataQuery, dataParams),
    ]);

    const total = parseInt(countResult.rows[0].count);
    res.json({ data: dataResult.rows, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/proposals/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, o.name as organization_name, g.title as grant_title
      FROM proposals p
      LEFT JOIN organizations o ON p.organization_id = o.id
      LEFT JOIN grants g ON p.grant_id = g.id
      WHERE p.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/proposals', authenticateToken, [
  body('title').trim().notEmpty().withMessage('Proposal title is required'),
], validate, async (req, res) => {
  try {
    const { title, organization_id, grant_id, status, content, amount_requested, submission_date } = req.body;
    const result = await pool.query(
      `INSERT INTO proposals (title, organization_id, grant_id, status, content, amount_requested, submission_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, organization_id, grant_id, status || 'draft', content, amount_requested, submission_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create proposal error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/proposals/:id', authenticateToken, [
  body('title').trim().notEmpty().withMessage('Proposal title is required'),
], validate, async (req, res) => {
  try {
    const { title, organization_id, grant_id, status, content, amount_requested, submission_date } = req.body;
    const result = await pool.query(
      `UPDATE proposals SET title=$1, organization_id=$2, grant_id=$3, status=$4, content=$5, amount_requested=$6, submission_date=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [title, organization_id, grant_id, status, content, amount_requested, submission_date, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Bulk update proposals
app.put('/api/proposals/bulk', authenticateToken, async (req, res) => {
  try {
    const { ids, updates } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs array is required' });
    }
    if (updates.status) {
      await pool.query('UPDATE proposals SET status = $1, updated_at = NOW() WHERE id = ANY($2)', [updates.status, ids]);
    }
    res.json({ message: `${ids.length} proposals updated`, updated: ids.length });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/proposals/bulk', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs array is required' });
    }
    const result = await pool.query('DELETE FROM proposals WHERE id = ANY($1) RETURNING id', [ids]);
    res.json({ message: `${result.rowCount} proposals deleted`, deleted: result.rowCount });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/proposals/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM proposals WHERE id = $1', [req.params.id]);
    res.json({ message: 'Proposal deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== TEMPLATES ROUTES ====================

app.get('/api/templates', authenticateToken, async (req, res) => {
  try {
    const baseQuery = 'SELECT * FROM templates';
    const { countQuery, dataQuery, countParams, dataParams, pageNum, limitNum } = buildPaginatedQuery({
      baseQuery,
      searchColumns: ['name', 'category', 'description'],
      defaultSort: 'created_at',
      defaultOrder: 'DESC',
      req,
    });

    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, countParams),
      pool.query(dataQuery, dataParams),
    ]);

    const total = parseInt(countResult.rows[0].count);
    res.json({ data: dataResult.rows, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/templates/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM templates WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/templates', authenticateToken, [
  body('name').trim().notEmpty().withMessage('Template name is required'),
], validate, async (req, res) => {
  try {
    const { name, category, description, content, fields } = req.body;
    const result = await pool.query(
      `INSERT INTO templates (name, category, description, content, fields)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, category, description, content, fields]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/templates/:id', authenticateToken, [
  body('name').trim().notEmpty().withMessage('Template name is required'),
], validate, async (req, res) => {
  try {
    const { name, category, description, content, fields } = req.body;
    const result = await pool.query(
      `UPDATE templates SET name=$1, category=$2, description=$3, content=$4, fields=$5, updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [name, category, description, content, fields, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/templates/bulk', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs array is required' });
    }
    const result = await pool.query('DELETE FROM templates WHERE id = ANY($1) RETURNING id', [ids]);
    res.json({ message: `${result.rowCount} templates deleted`, deleted: result.rowCount });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/templates/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM templates WHERE id = $1', [req.params.id]);
    res.json({ message: 'Template deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== DOCUMENTS ROUTES ====================

app.get('/api/documents', authenticateToken, async (req, res) => {
  try {
    const baseQuery = `SELECT d.*, o.name as organization_name
      FROM documents d
      LEFT JOIN organizations o ON d.organization_id = o.id`;
    const { countQuery, dataQuery, countParams, dataParams, pageNum, limitNum } = buildPaginatedQuery({
      baseQuery,
      searchColumns: ['d.title', 'd.doc_type', 'o.name'],
      defaultSort: 'd.created_at',
      defaultOrder: 'DESC',
      req,
    });

    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, countParams),
      pool.query(dataQuery, dataParams),
    ]);

    const total = parseInt(countResult.rows[0].count);
    res.json({ data: dataResult.rows, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/documents/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, o.name as organization_name
      FROM documents d
      LEFT JOIN organizations o ON d.organization_id = o.id
      WHERE d.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/documents', authenticateToken, [
  body('title').trim().notEmpty().withMessage('Document title is required'),
], validate, async (req, res) => {
  try {
    const { title, doc_type, content, organization_id } = req.body;
    const result = await pool.query(
      `INSERT INTO documents (title, doc_type, content, organization_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [title, doc_type, content, organization_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/documents/:id', authenticateToken, [
  body('title').trim().notEmpty().withMessage('Document title is required'),
], validate, async (req, res) => {
  try {
    const { title, doc_type, content, organization_id } = req.body;
    const result = await pool.query(
      `UPDATE documents SET title=$1, doc_type=$2, content=$3, organization_id=$4, updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [title, doc_type, content, organization_id, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/documents/bulk', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs array is required' });
    }
    const result = await pool.query('DELETE FROM documents WHERE id = ANY($1) RETURNING id', [ids]);
    res.json({ message: `${result.rowCount} documents deleted`, deleted: result.rowCount });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/documents/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM documents WHERE id = $1', [req.params.id]);
    res.json({ message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== BUDGETS ROUTES ====================

app.get('/api/budgets', authenticateToken, async (req, res) => {
  try {
    const baseQuery = `SELECT b.*, o.name as organization_name, p.title as proposal_title
      FROM budgets b
      LEFT JOIN organizations o ON b.organization_id = o.id
      LEFT JOIN proposals p ON b.proposal_id = p.id`;
    const { countQuery, dataQuery, countParams, dataParams, pageNum, limitNum } = buildPaginatedQuery({
      baseQuery,
      searchColumns: ['b.title', 'o.name', 'p.title', 'b.narrative'],
      defaultSort: 'b.created_at',
      defaultOrder: 'DESC',
      req,
    });

    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, countParams),
      pool.query(dataQuery, dataParams),
    ]);

    const total = parseInt(countResult.rows[0].count);
    res.json({ data: dataResult.rows, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/budgets/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*, o.name as organization_name, p.title as proposal_title
      FROM budgets b
      LEFT JOIN organizations o ON b.organization_id = o.id
      LEFT JOIN proposals p ON b.proposal_id = p.id
      WHERE b.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/budgets', authenticateToken, [
  body('title').trim().notEmpty().withMessage('Budget title is required'),
], validate, async (req, res) => {
  try {
    const { title, organization_id, proposal_id, total_amount, personnel, equipment, supplies, travel, contractual, other, indirect, status, narrative } = req.body;
    const result = await pool.query(
      `INSERT INTO budgets (title, organization_id, proposal_id, total_amount, personnel, equipment, supplies, travel, contractual, other, indirect, status, narrative)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [title, organization_id, proposal_id, total_amount, personnel, equipment, supplies, travel, contractual, other, indirect, status || 'draft', narrative]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create budget error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/budgets/:id', authenticateToken, [
  body('title').trim().notEmpty().withMessage('Budget title is required'),
], validate, async (req, res) => {
  try {
    const { title, organization_id, proposal_id, total_amount, personnel, equipment, supplies, travel, contractual, other, indirect, status, narrative } = req.body;
    const result = await pool.query(
      `UPDATE budgets SET title=$1, organization_id=$2, proposal_id=$3, total_amount=$4, personnel=$5, equipment=$6, supplies=$7, travel=$8, contractual=$9, other=$10, indirect=$11, status=$12, narrative=$13, updated_at=NOW()
       WHERE id=$14 RETURNING *`,
      [title, organization_id, proposal_id, total_amount, personnel, equipment, supplies, travel, contractual, other, indirect, status, narrative, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/budgets/bulk', authenticateToken, async (req, res) => {
  try {
    const { ids, updates } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs array is required' });
    }
    if (updates.status) {
      await pool.query('UPDATE budgets SET status = $1, updated_at = NOW() WHERE id = ANY($2)', [updates.status, ids]);
    }
    res.json({ message: `${ids.length} budgets updated`, updated: ids.length });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/budgets/bulk', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs array is required' });
    }
    const result = await pool.query('DELETE FROM budgets WHERE id = ANY($1) RETURNING id', [ids]);
    res.json({ message: `${result.rowCount} budgets deleted`, deleted: result.rowCount });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/budgets/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM budgets WHERE id = $1', [req.params.id]);
    res.json({ message: 'Budget deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== IMPACT METRICS ROUTES ====================

app.get('/api/impact-metrics', authenticateToken, async (req, res) => {
  try {
    const baseQuery = `SELECT im.*, o.name as organization_name, p.title as proposal_title
      FROM impact_metrics im
      LEFT JOIN organizations o ON im.organization_id = o.id
      LEFT JOIN proposals p ON im.proposal_id = p.id`;
    const { countQuery, dataQuery, countParams, dataParams, pageNum, limitNum } = buildPaginatedQuery({
      baseQuery,
      searchColumns: ['im.title', 'o.name', 'im.description', 'im.metric_type'],
      defaultSort: 'im.created_at',
      defaultOrder: 'DESC',
      req,
    });

    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, countParams),
      pool.query(dataQuery, dataParams),
    ]);

    const total = parseInt(countResult.rows[0].count);
    res.json({ data: dataResult.rows, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/impact-metrics/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT im.*, o.name as organization_name, p.title as proposal_title
      FROM impact_metrics im
      LEFT JOIN organizations o ON im.organization_id = o.id
      LEFT JOIN proposals p ON im.proposal_id = p.id
      WHERE im.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Impact metric not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/impact-metrics', authenticateToken, [
  body('title').trim().notEmpty().withMessage('Impact metric title is required'),
], validate, async (req, res) => {
  try {
    const { title, organization_id, proposal_id, metric_type, target_value, current_value, unit, description, measurement_method, reporting_frequency, start_date, end_date, status } = req.body;
    const result = await pool.query(
      `INSERT INTO impact_metrics (title, organization_id, proposal_id, metric_type, target_value, current_value, unit, description, measurement_method, reporting_frequency, start_date, end_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [title, organization_id, proposal_id, metric_type, target_value, current_value, unit, description, measurement_method, reporting_frequency, start_date, end_date, status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create impact metric error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/impact-metrics/:id', authenticateToken, [
  body('title').trim().notEmpty().withMessage('Impact metric title is required'),
], validate, async (req, res) => {
  try {
    const { title, organization_id, proposal_id, metric_type, target_value, current_value, unit, description, measurement_method, reporting_frequency, start_date, end_date, status } = req.body;
    const result = await pool.query(
      `UPDATE impact_metrics SET title=$1, organization_id=$2, proposal_id=$3, metric_type=$4, target_value=$5, current_value=$6, unit=$7, description=$8, measurement_method=$9, reporting_frequency=$10, start_date=$11, end_date=$12, status=$13, updated_at=NOW()
       WHERE id=$14 RETURNING *`,
      [title, organization_id, proposal_id, metric_type, target_value, current_value, unit, description, measurement_method, reporting_frequency, start_date, end_date, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/impact-metrics/bulk', authenticateToken, async (req, res) => {
  try {
    const { ids, updates } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs array is required' });
    }
    if (updates.status) {
      await pool.query('UPDATE impact_metrics SET status = $1, updated_at = NOW() WHERE id = ANY($2)', [updates.status, ids]);
    }
    res.json({ message: `${ids.length} impact metrics updated`, updated: ids.length });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/impact-metrics/bulk', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs array is required' });
    }
    const result = await pool.query('DELETE FROM impact_metrics WHERE id = ANY($1) RETURNING id', [ids]);
    res.json({ message: `${result.rowCount} impact metrics deleted`, deleted: result.rowCount });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/impact-metrics/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM impact_metrics WHERE id = $1', [req.params.id]);
    res.json({ message: 'Impact metric deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== DEADLINES ROUTES ====================

app.get('/api/deadlines', authenticateToken, async (req, res) => {
  try {
    const baseQuery = `SELECT d.*, g.title as grant_title, g.funder_name, o.name as organization_name
      FROM deadlines d
      LEFT JOIN grants g ON d.grant_id = g.id
      LEFT JOIN organizations o ON d.organization_id = o.id`;
    const { countQuery, dataQuery, countParams, dataParams, pageNum, limitNum } = buildPaginatedQuery({
      baseQuery,
      searchColumns: ['d.title', 'g.title', 'o.name', 'd.notes'],
      defaultSort: 'd.due_date',
      defaultOrder: 'ASC',
      req,
    });

    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, countParams),
      pool.query(dataQuery, dataParams),
    ]);

    const total = parseInt(countResult.rows[0].count);
    res.json({ data: dataResult.rows, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/deadlines/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, g.title as grant_title, g.funder_name, o.name as organization_name
      FROM deadlines d
      LEFT JOIN grants g ON d.grant_id = g.id
      LEFT JOIN organizations o ON d.organization_id = o.id
      WHERE d.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deadline not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/deadlines', authenticateToken, [
  body('title').trim().notEmpty().withMessage('Deadline title is required'),
  body('due_date').notEmpty().withMessage('Due date is required'),
], validate, async (req, res) => {
  try {
    const { title, grant_id, organization_id, due_date, reminder_date, priority, status, notes, task_type } = req.body;
    const result = await pool.query(
      `INSERT INTO deadlines (title, grant_id, organization_id, due_date, reminder_date, priority, status, notes, task_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [title, grant_id, organization_id, due_date, reminder_date, priority || 'medium', status || 'pending', notes, task_type]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create deadline error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/deadlines/:id', authenticateToken, [
  body('title').trim().notEmpty().withMessage('Deadline title is required'),
], validate, async (req, res) => {
  try {
    const { title, grant_id, organization_id, due_date, reminder_date, priority, status, notes, task_type } = req.body;
    const result = await pool.query(
      `UPDATE deadlines SET title=$1, grant_id=$2, organization_id=$3, due_date=$4, reminder_date=$5, priority=$6, status=$7, notes=$8, task_type=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [title, grant_id, organization_id, due_date, reminder_date, priority, status, notes, task_type, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/deadlines/bulk', authenticateToken, async (req, res) => {
  try {
    const { ids, updates } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs array is required' });
    }
    if (updates.status) {
      await pool.query('UPDATE deadlines SET status = $1, updated_at = NOW() WHERE id = ANY($2)', [updates.status, ids]);
    }
    res.json({ message: `${ids.length} deadlines updated`, updated: ids.length });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/deadlines/bulk', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs array is required' });
    }
    const result = await pool.query('DELETE FROM deadlines WHERE id = ANY($1) RETURNING id', [ids]);
    res.json({ message: `${result.rowCount} deadlines deleted`, deleted: result.rowCount });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/deadlines/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM deadlines WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deadline deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== FUNDERS ROUTES ====================

app.get('/api/funders', authenticateToken, async (req, res) => {
  try {
    const baseQuery = 'SELECT * FROM funders';
    const { countQuery, dataQuery, countParams, dataParams, pageNum, limitNum } = buildPaginatedQuery({
      baseQuery,
      searchColumns: ['name', 'funder_type', 'focus_areas', 'geographic_focus'],
      defaultSort: 'name',
      defaultOrder: 'ASC',
      req,
    });

    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, countParams),
      pool.query(dataQuery, dataParams),
    ]);

    const total = parseInt(countResult.rows[0].count);
    res.json({ data: dataResult.rows, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/funders/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM funders WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Funder not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/funders', authenticateToken, [
  body('name').trim().notEmpty().withMessage('Funder name is required'),
], validate, async (req, res) => {
  try {
    const { name, funder_type, website, contact_email, contact_phone, address, focus_areas, geographic_focus, funding_range_min, funding_range_max, application_process, deadline_info, requirements, past_grants, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO funders (name, funder_type, website, contact_email, contact_phone, address, focus_areas, geographic_focus, funding_range_min, funding_range_max, application_process, deadline_info, requirements, past_grants, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [name, funder_type, website, contact_email, contact_phone, address, focus_areas, geographic_focus, funding_range_min, funding_range_max, application_process, deadline_info, requirements, past_grants, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create funder error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/funders/:id', authenticateToken, [
  body('name').trim().notEmpty().withMessage('Funder name is required'),
], validate, async (req, res) => {
  try {
    const { name, funder_type, website, contact_email, contact_phone, address, focus_areas, geographic_focus, funding_range_min, funding_range_max, application_process, deadline_info, requirements, past_grants, notes } = req.body;
    const result = await pool.query(
      `UPDATE funders SET name=$1, funder_type=$2, website=$3, contact_email=$4, contact_phone=$5, address=$6, focus_areas=$7, geographic_focus=$8, funding_range_min=$9, funding_range_max=$10, application_process=$11, deadline_info=$12, requirements=$13, past_grants=$14, notes=$15, updated_at=NOW()
       WHERE id=$16 RETURNING *`,
      [name, funder_type, website, contact_email, contact_phone, address, focus_areas, geographic_focus, funding_range_min, funding_range_max, application_process, deadline_info, requirements, past_grants, notes, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/funders/bulk', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs array is required' });
    }
    const result = await pool.query('DELETE FROM funders WHERE id = ANY($1) RETURNING id', [ids]);
    res.json({ message: `${result.rowCount} funders deleted`, deleted: result.rowCount });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/funders/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM funders WHERE id = $1', [req.params.id]);
    res.json({ message: 'Funder deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== AI ROUTES (OpenRouter) ====================

// Helper function to call OpenRouter API
async function callOpenRouter(prompt, maxTokens = 3000) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'AI Grant Writer'
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: maxTokens
    })
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'AI request failed');
  }

  return data;
}

// Save AI result to database
async function saveAiResult({ userId, toolType, title, content, inputData, metadata, organizationId, model, tokensUsed }) {
  try {
    const result = await pool.query(
      `INSERT INTO ai_results (user_id, tool_type, title, content, input_data, metadata, organization_id, model, tokens_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [userId, toolType, title, content,
       JSON.stringify(inputData || {}),
       JSON.stringify(metadata || {}),
       organizationId || null, model, tokensUsed || null]
    );
    return result.rows[0].id;
  } catch (error) {
    console.error('Failed to save AI result:', error);
    return null;
  }
}

// Generate grant proposal with AI
app.post('/api/ai/generate-proposal', authenticateToken, aiLimiter, async (req, res) => {
  try {
    const { organization_id, grant_id, additional_context } = req.body;

    const orgResult = await pool.query('SELECT * FROM organizations WHERE id = $1', [organization_id]);
    if (orgResult.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    const organization = orgResult.rows[0];

    const grantResult = await pool.query('SELECT * FROM grants WHERE id = $1', [grant_id]);
    if (grantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Grant not found' });
    }
    const grant = grantResult.rows[0];

    const prompt = `You are an expert grant writer. Generate a compelling grant proposal for the following:

ORGANIZATION DETAILS:
- Name: ${organization.name}
- Mission: ${organization.mission}
- Description: ${organization.description}
- Annual Budget: $${organization.annual_budget?.toLocaleString() || 'N/A'}
- Staff Count: ${organization.staff_count || 'N/A'}

GRANT OPPORTUNITY:
- Title: ${grant.title}
- Funder: ${grant.funder_name}
- Amount Range: $${grant.amount_min?.toLocaleString() || 'N/A'} - $${grant.amount_max?.toLocaleString() || 'N/A'}
- Focus Areas: ${grant.focus_areas}
- Requirements: ${grant.requirements}
- Description: ${grant.description}

${additional_context ? `ADDITIONAL CONTEXT: ${additional_context}` : ''}

Please generate a professional grant proposal with the following sections:
1. Executive Summary
2. Statement of Need
3. Project Description
4. Goals and Objectives
5. Methods/Approach
6. Evaluation Plan
7. Budget Justification
8. Organizational Capacity
9. Sustainability Plan

Format the proposal in a clear, professional manner using markdown formatting.`;

    const data = await callOpenRouter(prompt, 4000);
    const content = data.choices[0]?.message?.content || 'No content generated';

    const savedId = await saveAiResult({
      userId: req.user.id,
      toolType: 'generate-proposal',
      title: `Proposal: ${organization.name} - ${grant.title}`,
      content,
      inputData: { organization_id, grant_id, additional_context },
      metadata: { organization: organization.name, grant: grant.title },
      organizationId: organization_id,
      model: data.model,
      tokensUsed: data.usage?.total_tokens
    });

    res.json({
      proposal: content,
      model: data.model,
      usage: data.usage,
      organization: organization.name,
      grant: grant.title,
      savedId
    });
  } catch (error) {
    console.error('AI generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate proposal' });
  }
});

// Improve text with AI
app.post('/api/ai/improve-text', authenticateToken, aiLimiter, async (req, res) => {
  try {
    const { text, improvement_type } = req.body;

    const prompts = {
      'clarity': `You are a grant writing expert specializing in making complex proposals accessible to diverse review panels. Improve the clarity and readability of the following grant proposal text.

Guidelines:
- Use active voice and strong, direct sentences
- Replace jargon with plain language, or define technical terms on first use
- Break long, compound sentences into shorter ones (aim for 15-25 words per sentence)
- Ensure each paragraph has a clear topic sentence and logical flow
- Use concrete examples and specific numbers instead of vague language (e.g., "served 2,400 youth" not "served many youth")
- Maintain all factual content and key arguments — do not remove substance
- Ensure transitions between ideas are smooth and logical
- Target audience: professional grant reviewers who may not be subject-matter experts`,

      'persuasive': `You are a grant writing strategist who has helped organizations win millions in funding. Make the following grant proposal text more persuasive and compelling for grant reviewers.

Guidelines:
- Lead with impact — open with the most compelling outcome or statistic
- Use evidence-based language: cite data, outcomes, and measurable results wherever possible
- Frame the problem as urgent and solvable, showing why action is needed now
- Emphasize alignment between the project goals and typical funder priorities (community impact, sustainability, innovation)
- Include social proof: reference partnerships, endorsements, or track record of success
- Use emotional resonance balanced with data — tell a human story backed by numbers
- Add strong action verbs (deliver, transform, accelerate) instead of passive language
- End sections with forward-looking statements that inspire confidence in the project's success
- Target audience: competitive grant review panels evaluating dozens of proposals`,

      'concise': `You are a grant writing editor who specializes in tightening proposals to meet strict word limits. Make the following grant proposal text more concise while preserving all critical information.

Guidelines:
- Eliminate redundant phrases, filler words, and unnecessary qualifiers (e.g., "very," "in order to," "it is important to note that")
- Combine sentences that repeat the same idea
- Replace wordy constructions with direct alternatives (e.g., "utilize" to "use," "in the event that" to "if")
- Remove throat-clearing introductions — get to the point immediately
- Keep all key arguments, data points, evidence, and specific commitments
- Aim to reduce word count by 25-40% without losing substance
- Preserve the original tone and level of formality
- Every sentence must earn its place — if it doesn't advance the argument, cut it
- Target audience: grant reviewers with limited time who value brevity`,

      'professional': `You are a senior grant writer with 20+ years of experience in nonprofit and government funding. Enhance the professional tone of the following grant proposal text.

Guidelines:
- Use formal but accessible language — authoritative without being stiff or bureaucratic
- Replace casual expressions with professional equivalents (e.g., "a lot of" to "significant," "get" to "obtain" or "achieve")
- Ensure consistent voice and register throughout — no tonal shifts
- Use precise, field-appropriate terminology where it strengthens credibility
- Remove first-person opinions and subjective claims; replace with evidence-based statements
- Structure sentences for maximum authority: lead with the key point, support with evidence
- Ensure proper parallel construction in lists and series
- Maintain confidence without overstatement — avoid superlatives unless backed by data
- Target audience: institutional funders, government agencies, and foundation review committees`,

      'expand': `You are a grant writing specialist who helps organizations strengthen thin proposal sections. Expand the following grant proposal text with substantive details and supporting information.

Guidelines:
- Add specific, realistic examples that illustrate key claims
- Include relevant data points, statistics, or research citations that support the arguments
- Elaborate on methodology — explain HOW activities will be carried out, not just WHAT
- Add context about the target population, geographic area, or community need
- Strengthen the logic model: connect activities to outputs to outcomes to impact
- Include implementation details: timelines, responsible parties, resources needed
- Add evaluation or measurement language showing how success will be tracked
- Aim to expand content by 50-75% while keeping every addition substantive and relevant
- Do not pad with filler — every new sentence must add value
- Target audience: grant reviewers who need sufficient detail to assess feasibility and impact`
    };

    const prompt = `${prompts[improvement_type] || prompts['clarity']}

TEXT TO IMPROVE:
${text}

Provide the improved version only, without any preamble, explanations, or commentary. Use markdown formatting. Maintain approximately the same length unless the improvement type specifically calls for expansion or reduction.`;

    const maxTokens = improvement_type === 'expand' ? 3500 : 2500;
    const data = await callOpenRouter(prompt, maxTokens);
    const content = data.choices[0]?.message?.content || 'No content generated';

    const savedId = await saveAiResult({
      userId: req.user.id,
      toolType: 'improve-text',
      title: `Text Improvement (${improvement_type})`,
      content,
      inputData: { text: text.substring(0, 500), improvement_type },
      metadata: { improvement_type },
      model: data.model,
      tokensUsed: data.usage?.total_tokens
    });

    res.json({
      improved_text: content,
      model: data.model,
      usage: data.usage,
      improvement_type,
      savedId
    });
  } catch (error) {
    console.error('AI improvement error:', error);
    res.status(500).json({ error: error.message || 'Failed to improve text' });
  }
});

// Generate executive summary
app.post('/api/ai/generate-summary', authenticateToken, aiLimiter, async (req, res) => {
  try {
    const { proposal_content, max_words } = req.body;

    const prompt = `Generate a compelling executive summary (maximum ${max_words || 300} words) for the following grant proposal:

${proposal_content}

The executive summary should:
1. Capture the essence of the project
2. Highlight the key objectives
3. Emphasize the expected impact
4. Be compelling and professional

Use markdown formatting.`;

    const data = await callOpenRouter(prompt, 1000);
    const content = data.choices[0]?.message?.content || 'No content generated';

    const savedId = await saveAiResult({
      userId: req.user.id,
      toolType: 'executive-summary',
      title: `Executive Summary (${max_words || 300} words)`,
      content,
      inputData: { proposal_content: proposal_content.substring(0, 500), max_words },
      metadata: { max_words: max_words || 300 },
      model: data.model,
      tokensUsed: data.usage?.total_tokens
    });

    res.json({
      summary: content,
      model: data.model,
      usage: data.usage,
      savedId
    });
  } catch (error) {
    console.error('AI summary error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate summary' });
  }
});

// Match organization to grants
app.post('/api/ai/match-grants', authenticateToken, aiLimiter, async (req, res) => {
  try {
    const { organization_id } = req.body;

    const orgResult = await pool.query('SELECT * FROM organizations WHERE id = $1', [organization_id]);
    if (orgResult.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    const organization = orgResult.rows[0];

    const grantsResult = await pool.query('SELECT * FROM grants WHERE deadline > NOW() ORDER BY deadline ASC');
    const grants = grantsResult.rows;

    const prompt = `You are a grant matching expert. Analyze the following organization and available grants, then provide a detailed match analysis.

ORGANIZATION:
- Name: ${organization.name}
- Mission: ${organization.mission}
- Description: ${organization.description}
- Annual Budget: $${organization.annual_budget?.toLocaleString() || 'N/A'}
- Staff Count: ${organization.staff_count || 'N/A'}

AVAILABLE GRANTS:
${grants.map((g, i) => `
${i + 1}. ${g.title}
   - Funder: ${g.funder_name}
   - Amount: $${g.amount_min?.toLocaleString() || 'N/A'} - $${g.amount_max?.toLocaleString() || 'N/A'}
   - Focus Areas: ${g.focus_areas}
   - Eligibility: ${g.eligibility}
   - Deadline: ${g.deadline}
`).join('\n')}

For each grant, provide:
1. **Match Score** (1-100 with visual indicator)
2. **Key Alignment Points** - Why this is a good fit
3. **Potential Challenges** - What to be aware of
4. **Recommendation** - Apply, Consider, or Skip with reasoning

Format as a clear, professional analysis using markdown. Include a summary table at the top.`;

    const data = await callOpenRouter(prompt, 3000);
    const content = data.choices[0]?.message?.content || 'No content generated';

    const savedId = await saveAiResult({
      userId: req.user.id,
      toolType: 'match-grants',
      title: `Grant Matching: ${organization.name}`,
      content,
      inputData: { organization_id },
      metadata: { organization: organization.name, grants_analyzed: grants.length },
      organizationId: organization_id,
      model: data.model,
      tokensUsed: data.usage?.total_tokens
    });

    res.json({
      analysis: content,
      model: data.model,
      usage: data.usage,
      organization: organization.name,
      grants_analyzed: grants.length,
      savedId
    });
  } catch (error) {
    console.error('AI matching error:', error);
    res.status(500).json({ error: error.message || 'Failed to match grants' });
  }
});

// Review and critique proposal
app.post('/api/ai/review-proposal', authenticateToken, aiLimiter, async (req, res) => {
  try {
    const { proposal_content } = req.body;

    const prompt = `You are an experienced grant reviewer. Critically review the following grant proposal and provide detailed feedback.

PROPOSAL:
${proposal_content}

Please provide a comprehensive review with:

## Overall Assessment
- Score: X/10
- Summary of strengths and weaknesses

## Detailed Review

### Strengths
- List 3-5 key strengths

### Areas for Improvement
- List 3-5 specific areas that need work

### Section-by-Section Feedback
Provide feedback on each major section

### Compliance Check
- Does it address typical grant requirements?
- What's missing?

### Impact Assessment
- How compelling is the case for funding?
- Suggestions for improvement

### Recommended Actions
- Priority list of changes to make

Format using markdown for clear presentation.`;

    const data = await callOpenRouter(prompt, 3000);
    const content = data.choices[0]?.message?.content || 'No content generated';

    const savedId = await saveAiResult({
      userId: req.user.id,
      toolType: 'review-proposal',
      title: 'Proposal Review & Critique',
      content,
      inputData: { proposal_content: proposal_content.substring(0, 500) },
      metadata: {},
      model: data.model,
      tokensUsed: data.usage?.total_tokens
    });

    res.json({
      review: content,
      model: data.model,
      usage: data.usage,
      savedId
    });
  } catch (error) {
    console.error('AI review error:', error);
    res.status(500).json({ error: error.message || 'Failed to review proposal' });
  }
});

// Generate budget narrative
app.post('/api/ai/generate-budget', authenticateToken, aiLimiter, async (req, res) => {
  try {
    const { project_description, total_amount, categories } = req.body;

    const prompt = `You are a grant budget expert. Create a detailed budget narrative for a grant proposal.

PROJECT DESCRIPTION:
${project_description}

TOTAL BUDGET REQUESTED: $${total_amount?.toLocaleString() || 'TBD'}

${categories ? `BUDGET CATEGORIES TO INCLUDE: ${categories}` : ''}

Please generate a comprehensive budget with:

## Budget Summary Table
| Category | Amount | % of Total |
|----------|--------|------------|
(Include all relevant categories)

## Detailed Budget Breakdown

### Personnel
- Staff positions with salaries and justification
- Fringe benefits calculation

### Direct Costs
- Equipment with specific items and costs
- Supplies breakdown
- Travel (if applicable)

### Contractual/Consultants
- Any external services needed

### Other Direct Costs
- Miscellaneous items

### Indirect Costs
- Overhead rate and calculation

## Budget Narrative
Comprehensive explanation of how funds will be used and why each cost is necessary.

## Cost-Effectiveness Statement
Why this budget represents good value for the funder.

Format using markdown with clear tables and sections.`;

    const data = await callOpenRouter(prompt, 2500);
    const content = data.choices[0]?.message?.content || 'No content generated';

    const savedId = await saveAiResult({
      userId: req.user.id,
      toolType: 'budget-narrative',
      title: `Budget Narrative ($${total_amount?.toLocaleString() || 'TBD'})`,
      content,
      inputData: { project_description: project_description.substring(0, 500), total_amount, categories },
      metadata: { total_amount, categories },
      model: data.model,
      tokensUsed: data.usage?.total_tokens
    });

    res.json({
      budget: content,
      model: data.model,
      usage: data.usage,
      savedId
    });
  } catch (error) {
    console.error('AI budget error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate budget' });
  }
});

// AI Impact Measurement
app.post('/api/ai/measure-impact', authenticateToken, aiLimiter, async (req, res) => {
  try {
    const { organization_id, project_description, current_metrics } = req.body;

    let organization = null;
    if (organization_id) {
      const orgResult = await pool.query('SELECT * FROM organizations WHERE id = $1', [organization_id]);
      organization = orgResult.rows[0];
    }

    const prompt = `You are an impact measurement expert for nonprofit organizations. Analyze the following and create a comprehensive impact measurement framework.

${organization ? `
ORGANIZATION:
- Name: ${organization.name}
- Mission: ${organization.mission}
- Description: ${organization.description}
` : ''}

PROJECT DESCRIPTION:
${project_description}

${current_metrics ? `CURRENT METRICS: ${current_metrics}` : ''}

Please provide:

## Impact Measurement Framework

### Theory of Change
Visual representation of how activities lead to impact

### Key Performance Indicators (KPIs)

| Indicator | Type | Target | Measurement Method | Frequency |
|-----------|------|--------|-------------------|-----------|
(Include 8-10 relevant indicators)

### Output Metrics
- Direct, quantifiable outputs from activities

### Outcome Metrics
- Short-term and medium-term changes

### Impact Metrics
- Long-term societal changes

### Data Collection Methods
- Surveys, interviews, observations, etc.
- Tools and templates recommended

### Evaluation Timeline
- When to measure what

### Reporting Framework
- How to report results to funders

### Success Benchmarks
- Industry standards to compare against

### Recommendations
- Specific actions to improve impact measurement

Format using markdown with clear tables and sections.`;

    const data = await callOpenRouter(prompt, 3000);
    const content = data.choices[0]?.message?.content || 'No content generated';

    const savedId = await saveAiResult({
      userId: req.user.id,
      toolType: 'impact-measurement',
      title: `Impact Framework${organization ? ': ' + organization.name : ''}`,
      content,
      inputData: { organization_id, project_description: project_description.substring(0, 500), current_metrics },
      metadata: { organization: organization?.name },
      organizationId: organization_id || null,
      model: data.model,
      tokensUsed: data.usage?.total_tokens
    });

    res.json({
      impact_analysis: content,
      model: data.model,
      usage: data.usage,
      organization: organization?.name,
      savedId
    });
  } catch (error) {
    console.error('AI impact error:', error);
    res.status(500).json({ error: error.message || 'Failed to measure impact' });
  }
});

// AI Deadline Analysis
app.post('/api/ai/analyze-deadlines', authenticateToken, aiLimiter, async (req, res) => {
  try {
    const { organization_id } = req.body;

    let organization = null;
    if (organization_id) {
      const orgResult = await pool.query('SELECT * FROM organizations WHERE id = $1', [organization_id]);
      organization = orgResult.rows[0];
    }

    const deadlinesResult = await pool.query(`
      SELECT d.*, g.title as grant_title, g.funder_name, g.amount_max
      FROM deadlines d
      LEFT JOIN grants g ON d.grant_id = g.id
      WHERE d.status != 'completed'
      ORDER BY d.due_date ASC
    `);
    const deadlines = deadlinesResult.rows;

    const grantsResult = await pool.query(`
      SELECT * FROM grants
      WHERE deadline > NOW()
      ORDER BY deadline ASC
    `);
    const grants = grantsResult.rows;

    const prompt = `You are a grant deadline management expert. Analyze the following deadlines and create a strategic timeline.

${organization ? `
ORGANIZATION: ${organization.name}
MISSION: ${organization.mission}
` : ''}

CURRENT DEADLINES:
${deadlines.map((d, i) => `
${i + 1}. ${d.title}
   - Due: ${d.due_date}
   - Grant: ${d.grant_title || 'N/A'}
   - Priority: ${d.priority}
   - Status: ${d.status}
`).join('\n')}

UPCOMING GRANT DEADLINES:
${grants.map((g, i) => `
${i + 1}. ${g.title} (${g.funder_name})
   - Deadline: ${g.deadline}
   - Amount: $${g.amount_min?.toLocaleString()} - $${g.amount_max?.toLocaleString()}
`).join('\n')}

Please provide:

## Deadline Dashboard

### Critical (Next 7 Days)
| Task | Due Date | Priority | Action Required |
|------|----------|----------|-----------------|

### Upcoming (Next 30 Days)
| Task | Due Date | Grant | Preparation Time |
|------|----------|-------|------------------|

### Planning Horizon (Next 90 Days)
| Opportunity | Deadline | Amount | Readiness |
|-------------|----------|--------|-----------|

## Strategic Recommendations

### Prioritization Matrix
- What to focus on first and why

### Resource Allocation
- How to distribute effort across deadlines

### Risk Assessment
- Deadlines at risk and mitigation strategies

### Preparation Timeline
- Key milestones for each major deadline

### Quick Wins
- Opportunities that require minimal effort

### Capacity Warnings
- Potential overload periods

Format using markdown with clear tables and actionable recommendations.`;

    const data = await callOpenRouter(prompt, 3000);
    const content = data.choices[0]?.message?.content || 'No content generated';

    const savedId = await saveAiResult({
      userId: req.user.id,
      toolType: 'deadline-analysis',
      title: `Deadline Analysis${organization ? ': ' + organization.name : ''}`,
      content,
      inputData: { organization_id },
      metadata: { organization: organization?.name, deadlines_analyzed: deadlines.length, grants_analyzed: grants.length },
      organizationId: organization_id || null,
      model: data.model,
      tokensUsed: data.usage?.total_tokens
    });

    res.json({
      deadline_analysis: content,
      model: data.model,
      usage: data.usage,
      deadlines_analyzed: deadlines.length,
      grants_analyzed: grants.length,
      savedId
    });
  } catch (error) {
    console.error('AI deadline error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze deadlines' });
  }
});

// AI Funder Research
app.post('/api/ai/research-funder', authenticateToken, aiLimiter, async (req, res) => {
  try {
    const { funder_name, organization_id, additional_info } = req.body;

    let organization = null;
    if (organization_id) {
      const orgResult = await pool.query('SELECT * FROM organizations WHERE id = $1', [organization_id]);
      organization = orgResult.rows[0];
    }

    const prompt = `You are a funder research expert. Provide comprehensive research and analysis on the following funder.

FUNDER TO RESEARCH: ${funder_name}

${organization ? `
FOR ORGANIZATION:
- Name: ${organization.name}
- Mission: ${organization.mission}
- Focus: ${organization.description}
` : ''}

${additional_info ? `ADDITIONAL CONTEXT: ${additional_info}` : ''}

Please provide comprehensive funder research including:

## Funder Profile

### Overview
- Type of funder (Foundation, Corporate, Government, etc.)
- Geographic focus
- Annual giving estimate
- Key personnel

### Funding Priorities
| Priority Area | Typical Amount | Competition Level |
|---------------|----------------|-------------------|

### Giving History
- Notable recent grants
- Trends in funding

### Application Process
- Timeline
- Requirements
- Key dates

## Strategic Analysis

### Alignment Assessment
${organization ? `How well does ${organization.name} align with this funder?` : 'General alignment factors'}

### Approach Recommendations
- Best way to approach this funder
- What they look for in proposals
- Red flags to avoid

### Relationship Building
- How to cultivate a relationship
- Key contacts to identify

### Success Factors
- What makes proposals successful with this funder

### Potential Challenges
- Common reasons for rejection
- Competition level

### Similar Funders
- Other funders with similar priorities

## Action Items
- Specific next steps to pursue funding

Format using markdown with clear sections and actionable insights.`;

    const data = await callOpenRouter(prompt, 3000);
    const content = data.choices[0]?.message?.content || 'No content generated';

    const savedId = await saveAiResult({
      userId: req.user.id,
      toolType: 'funder-research',
      title: `Funder Research: ${funder_name}`,
      content,
      inputData: { funder_name, organization_id, additional_info },
      metadata: { funder_name, organization: organization?.name },
      organizationId: organization_id || null,
      model: data.model,
      tokensUsed: data.usage?.total_tokens
    });

    res.json({
      funder_research: content,
      model: data.model,
      usage: data.usage,
      funder_name,
      organization: organization?.name,
      savedId
    });
  } catch (error) {
    console.error('AI funder research error:', error);
    res.status(500).json({ error: error.message || 'Failed to research funder' });
  }
});

// ==================== AI RESULTS ROUTES ====================

app.get('/api/ai/results', authenticateToken, async (req, res) => {
  try {
    const { search, tool_type, page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    let whereClause = 'WHERE user_id = $1';
    const params = [req.user.id];
    let paramIndex = 2;

    if (search) {
      whereClause += ` AND title ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (tool_type) {
      whereClause += ` AND tool_type = $${paramIndex}`;
      params.push(tool_type);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM ai_results ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT id, tool_type, title, content, metadata, model, tokens_used, organization_id, created_at
       FROM ai_results
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limitNum, offset]
    );

    res.json({
      results: result.rows,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    console.error('Error fetching AI results:', error);
    res.status(500).json({ error: 'Failed to fetch AI results' });
  }
});

app.get('/api/ai/results/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM ai_results WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'AI result not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching AI result:', error);
    res.status(500).json({ error: 'Failed to fetch AI result' });
  }
});

app.delete('/api/ai/results/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM ai_results WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'AI result not found' });
    }
    res.json({ message: 'AI result deleted' });
  } catch (error) {
    console.error('Error deleting AI result:', error);
    res.status(500).json({ error: 'Failed to delete AI result' });
  }
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
