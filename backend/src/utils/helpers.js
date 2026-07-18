const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

function generateReferenceId(prefix = 'SA') {
  const year = new Date().getUTCFullYear();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${year}-${rand}`;
}

function generateVisaNumber() {
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `AFV-${new Date().getUTCFullYear()}-${rand}`;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parsePagination(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function buildDateRangeFilter(query, field = 'createdAt') {
  const filter = {};
  if (query.from || query.to) {
    filter[field] = {};
    if (query.from) filter[field].$gte = new Date(query.from);
    if (query.to) filter[field].$lte = new Date(query.to);
  }

  if (query.period) {
    const now = new Date();
    let start;
    if (query.period === 'monthly') {
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    } else if (query.period === 'quarterly') {
      const q = Math.floor(now.getUTCMonth() / 3) * 3;
      start = new Date(Date.UTC(now.getUTCFullYear(), q, 1));
    } else if (query.period === 'yearly') {
      start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    }
    if (start) {
      filter[field] = { ...(filter[field] || {}), $gte: start, $lte: now };
    }
  }

  return filter;
}

/** Normalize an IP string: strip IPv6-mapped IPv4 prefix, map loopback. */
function normalizeIp(ip) {
  if (!ip) return '';
  let value = String(ip).trim();
  if (value.startsWith('::ffff:')) value = value.slice(7);
  if (value === '::1') value = '127.0.0.1';
  return value;
}

function isLocalOrPrivate(ip) {
  if (!ip) return true;
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    ip.startsWith('169.254.') ||
    ip.startsWith('fc') ||
    ip.startsWith('fd')
  );
}

const IP_RX = /^(?:\d{1,3}\.){3}\d{1,3}$|^[0-9a-fA-F:]+$/;

/**
 * Best client IP for audit/activity logs.
 * Prefers the true network IP (X-Forwarded-For / req.ip). When the server only
 * sees a loopback/private address (typical in local dev or behind some proxies),
 * falls back to the public IP the client detected and sent via `X-Client-IP`.
 */
function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  const forwarded = Array.isArray(xff) ? xff[0] : xff ? xff.split(',')[0] : '';
  const serverIp = normalizeIp(forwarded || req.ip || req.connection?.remoteAddress || '');

  const clientHeaderRaw = req.headers['x-client-ip'];
  const clientHeader = normalizeIp(
    Array.isArray(clientHeaderRaw) ? clientHeaderRaw[0] : clientHeaderRaw || ''
  );
  const clientValid = clientHeader && IP_RX.test(clientHeader) ? clientHeader : '';

  if (isLocalOrPrivate(serverIp) && clientValid) return clientValid;
  return serverIp || clientValid || '';
}

function toCsv(rows, columns) {
  const header = columns.map((c) => c.label).join(',');
  const lines = rows.map((row) =>
    columns
      .map((c) => {
        const raw = typeof c.value === 'function' ? c.value(row) : row[c.value];
        const str = raw == null ? '' : String(raw);
        return `"${str.replace(/"/g, '""')}"`;
      })
      .join(',')
  );
  return [header, ...lines].join('\n');
}

module.exports = {
  uuidv4,
  generateReferenceId,
  generateVisaNumber,
  sha256,
  randomToken,
  escapeRegex,
  parsePagination,
  buildDateRangeFilter,
  toCsv,
  normalizeIp,
  getClientIp,
};
