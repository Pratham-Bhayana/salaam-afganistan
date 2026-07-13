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
};
