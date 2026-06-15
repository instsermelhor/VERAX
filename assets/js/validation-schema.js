/**
 * VERAX ORGANIZAÇÃO CONTÁBIL
 * Lead Form Validation Schema — Backend / Server-side
 *
 * Stack: Node.js + Zod (primary) + Joi (alternative)
 * Security: OWASP Input Validation, XSS Prevention, Injection Defense
 *
 * Usage (Express.js example):
 *   import { validateLead, validatePortalLogin } from './validation-schema.js';
 *
 *   router.post('/api/leads', validateLead, async (req, res) => { ... });
 */

// ─── OPTION A: ZOD SCHEMA ────────────────────────────────────
// Install: npm install zod
// import { z } from 'zod';
// import { fromZodError } from 'zod-validation-error';

/**
 * Regex patterns for strict validation
 * Prevents SQLi, XSS, path traversal and similar patterns
 */
const PATTERNS = {
  // Allows only letters (including accented), spaces, hyphens, apostrophes
  name: /^[A-Za-zÀ-ÿ\s'\-]{2,100}$/,
  // Email: RFC 5322 simplified
  email: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/,
  // Brazilian phone: allows digits, spaces, parens, hyphens, plus
  phone: /^[\d\s\(\)\-\+]{8,20}$/,
  // Company name: alphanumeric, spaces, common punctuation
  company: /^[A-Za-z0-9À-ÿ\s'.\-&/,]{2,150}$/,
  // Freeform message: blocks script tags, SQL keywords, etc.
  safeText: /^[^<>'"`;\\*{}\[\]]{10,1000}$/,
};

const ALLOWED_SERVICES = [
  'contabilidade-consultiva',
  'planejamento-tributario',
  'bpo-financeiro',
  'auditoria-compliance',
  'outros',
  '',  // Optional field — allow empty
];

// ─────────────────────────────────────────────────────────────
// ZOD SCHEMA DEFINITION
// ─────────────────────────────────────────────────────────────
/*
const leadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Nome deve ter no mínimo 2 caracteres.')
    .max(100, 'Nome deve ter no máximo 100 caracteres.')
    .regex(PATTERNS.name, 'Nome contém caracteres inválidos.'),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(5, 'E-mail inválido.')
    .max(254, 'E-mail deve ter no máximo 254 caracteres.')
    .regex(PATTERNS.email, 'Formato de e-mail inválido.')
    .email('Formato de e-mail inválido.'),

  phone: z
    .string()
    .trim()
    .min(8, 'Telefone inválido.')
    .max(20, 'Telefone deve ter no máximo 20 caracteres.')
    .regex(PATTERNS.phone, 'Telefone contém caracteres inválidos.'),

  company: z
    .string()
    .trim()
    .min(2, 'Nome da empresa deve ter no mínimo 2 caracteres.')
    .max(150, 'Nome da empresa deve ter no máximo 150 caracteres.')
    .regex(PATTERNS.company, 'Nome da empresa contém caracteres inválidos.'),

  service: z
    .string()
    .optional()
    .refine(val => !val || ALLOWED_SERVICES.includes(val), {
      message: 'Serviço inválido.',
    }),

  message: z
    .string()
    .trim()
    .min(10, 'Mensagem deve ter no mínimo 10 caracteres.')
    .max(1000, 'Mensagem deve ter no máximo 1000 caracteres.')
    .refine(
      val => !/<[^>]*script/i.test(val) && !/(DROP|INSERT|SELECT|DELETE|UPDATE|EXEC)\s/i.test(val),
      'Mensagem contém conteúdo inválido.'
    ),

  consent: z
    .boolean()
    .refine(val => val === true, 'Aceite da política de privacidade é obrigatório.'),

  // Honeypot field — should always be empty (bots fill it)
  website: z
    .string()
    .max(0, 'Bot detectado.')
    .optional(),
});

// Portal login schema
const portalLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .email('E-mail inválido.'),

  password: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres.')
    .max(128, 'Senha muito longa.'),
});
*/

// ─────────────────────────────────────────────────────────────
// JOI SCHEMA DEFINITION (Alternative)
// Install: npm install joi
// ─────────────────────────────────────────────────────────────
/*
const Joi = require('joi');

const leadSchemaJoi = Joi.object({
  name: Joi.string()
    .pattern(PATTERNS.name)
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.pattern.base': 'Nome contém caracteres inválidos.',
      'string.min': 'Nome deve ter no mínimo 2 caracteres.',
      'string.max': 'Nome deve ter no máximo 100 caracteres.',
      'any.required': 'Nome é obrigatório.',
    }),

  email: Joi.string()
    .email({ tlds: { allow: false } })
    .max(254)
    .required()
    .messages({
      'string.email': 'E-mail inválido.',
      'any.required': 'E-mail é obrigatório.',
    }),

  phone: Joi.string()
    .pattern(PATTERNS.phone)
    .min(8)
    .max(20)
    .required()
    .messages({
      'string.pattern.base': 'Telefone contém caracteres inválidos.',
    }),

  company: Joi.string()
    .pattern(PATTERNS.company)
    .min(2)
    .max(150)
    .required()
    .messages({
      'string.pattern.base': 'Nome da empresa contém caracteres inválidos.',
    }),

  service: Joi.string()
    .valid(...ALLOWED_SERVICES)
    .optional()
    .allow(''),

  message: Joi.string()
    .min(10)
    .max(1000)
    .required()
    .custom((val, helpers) => {
      if (/<[^>]*script/i.test(val) || /(DROP|INSERT|SELECT|DELETE|UPDATE|EXEC)\s/i.test(val)) {
        return helpers.error('any.invalid');
      }
      return val;
    })
    .messages({
      'any.invalid': 'Mensagem contém conteúdo inválido.',
    }),

  consent: Joi.boolean().valid(true).required().messages({
    'any.only': 'Aceite da política de privacidade é obrigatório.',
  }),

  website: Joi.string().max(0).optional(), // Honeypot
});
*/


// ─────────────────────────────────────────────────────────────
// EXPRESS MIDDLEWARE EXAMPLES
// ─────────────────────────────────────────────────────────────
/*
const express  = require('express');
const rateLimit = require('express-rate-limit');
const helmet   = require('helmet');
const { z }    = require('zod');

const app = express();

// ── Security Headers (Helmet) ──────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "https://fonts.googleapis.com"],
      styleSrc:    ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc:     ["'self'", "https://fonts.gstatic.com"],
      imgSrc:      ["'self'", "data:", "blob:"],
      connectSrc:  ["'self'"],
      frameSrc:    ["'none'"],
      objectSrc:   ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000,       // 1 year
    includeSubDomains: true,
    preload: true,
  },
  xFrameOptions: { action: 'deny' },         // Clickjacking prevention
  noSniff: true,                              // X-Content-Type-Options
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permissionsPolicy: {
    features: {
      camera:      [],
      microphone:  [],
      geolocation: [],
    },
  },
}));

// ── Rate Limiting (prevent brute force / spam) ─────────────
const leadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // 5 requests per window
  message: { error: 'Muitas tentativas. Aguarde 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
});

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Conta bloqueada temporariamente. Tente em 15 minutos.' },
  skipSuccessfulRequests: true,
});

// ── Lead form endpoint ─────────────────────────────────────
app.post('/api/leads', leadRateLimiter, async (req, res) => {
  try {
    // Detect honeypot (bots fill hidden "website" field)
    if (req.body.website) {
      return res.status(200).json({ ok: true }); // Silently discard
    }

    const data = leadSchema.parse(req.body);

    // Sanitize for DB storage (parameterized queries REQUIRED — never interpolate)
    // Example: await db.query('INSERT INTO leads (name, email, ...) VALUES ($1, $2, ...)', [...])

    // Send notification email (Nodemailer / SendGrid / Resend)
    // await sendLeadNotification(data);

    return res.status(201).json({ ok: true, message: 'Lead recebido com sucesso.' });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(422).json({
        ok: false,
        errors: fromZodError(err).toString(),
      });
    }
    console.error('[Verax API] Lead error:', err.message); // Never log req.body
    return res.status(500).json({ ok: false, message: 'Erro interno. Tente novamente.' });
  }
});

// ── Portal login endpoint ──────────────────────────────────
app.post('/api/auth/login', loginRateLimiter, async (req, res) => {
  try {
    const { email, password } = portalLoginSchema.parse(req.body);

    // NEVER compare passwords in plaintext — use bcrypt
    // const user = await db.getUserByEmail(email);
    // const match = await bcrypt.compare(password, user.passwordHash);
    // if (!match) return res.status(401).json({ ok: false, message: 'Credenciais inválidas.' });

    // Issue JWT (short-lived access token + HttpOnly refresh token)
    // const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    // res.cookie('refresh_token', refreshToken, { httpOnly: true, secure: true, sameSite: 'strict' });

    return res.status(200).json({ ok: true });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(422).json({ ok: false, message: 'Credenciais inválidas.' });
    }
    return res.status(500).json({ ok: false });
  }
});
*/

// Export schemas for use in tests
module.exports = { PATTERNS, ALLOWED_SERVICES };
