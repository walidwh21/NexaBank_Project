// Zero-dependency stand-in for the NexaBank API.
// Mirrors the contract of backend/ so the console can be developed and demoed without Java or a database.
//   node mock-api/server.mjs            -> http://localhost:8080
// If a production build exists in dist/, it is also served from the same origin (SPA fallback included).
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT ?? 8080);
const API = '/api/v1';
const STATIC_DIR = join(fileURLToPath(new URL('..', import.meta.url)), 'dist', 'nexabank-console', 'browser');

// ---------- seeded data (seeded PRNG keeps screenshots reproducible) ----------
let seed = 2024;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const money = (min, max) => Math.round((min + rnd() * (max - min)) * 100) / 100;
const DAY = 86_400_000;
const now = Date.now();

const users = {
  admin: { password: 'admin123', roles: ['ADMIN'] },
  teller: { password: 'teller123', roles: ['TELLER'] },
};

const customers = [];
const accounts = [];
const ledger = [];
let nextCustomer = 1;
let nextEntry = 1;

const accountNumber = () => 'NX' + String(Math.floor(rnd() * 1e12)).padStart(12, '0');

function post(account, type, amount, description, at = Date.now()) {
  const credit = type === 'DEPOSIT' || type === 'TRANSFER_IN';
  account.balance = Math.round((account.balance + (credit ? amount : -amount)) * 100) / 100;
  const entry = { id: nextEntry++, accountId: account.id, type, amount, balanceAfter: account.balance, description, postedAt: new Date(at).toISOString() };
  ledger.push(entry);
  return entry;
}

function addCustomer(fullName, email) {
  const c = { id: nextCustomer++, fullName, email, createdAt: new Date(now - 90 * DAY).toISOString() };
  customers.push(c);
  return c;
}

function addAccount(kind, customer, opening, extra, openedAt = Date.now()) {
  const a = {
    id: accountNumber(), kind, status: 'ACTIVE', balance: 0, openedAt: new Date(openedAt).toISOString(),
    customerId: customer.id, customerName: customer.fullName,
    overdraftLimit: kind === 'CHECKING' ? (extra ?? 0) : null,
    annualRate: kind === 'SAVINGS' ? (extra ?? 2.5) : null,
  };
  accounts.push(a);
  if (opening > 0) post(a, 'DEPOSIT', opening, 'Opening deposit', openedAt);
  return a;
}

const CREDITS = ['Salary', 'Invoice payment', 'Refund', 'Interest adjustment', 'Cash deposit'];
const DEBITS = ['Groceries', 'Rent', 'Utilities', 'Online order', 'Subscription', 'Fuel'];

for (const [name, mail] of [
  ['Amelia Hart', 'amelia.hart@example.com'], ['Liam Okafor', 'liam.okafor@example.com'],
  ['Sofia Marin', 'sofia.marin@example.com'], ['Noah Lindqvist', 'noah.lindqvist@example.com'],
  ['Aiko Tanaka', 'aiko.tanaka@example.com'], ['Mateo Silva', 'mateo.silva@example.com'],
]) {
  const c = addCustomer(name, mail);
  for (const [kind, opening, extra] of [['CHECKING', money(1800, 6000), 1500], ['SAVINGS', money(8000, 40000), 3.1]]) {
    const a = addAccount(kind, c, opening, extra, now - 60 * DAY);
    for (let i = 0; i < 9; i++) {
      const at = now - (55 - i * 6) * DAY - Math.floor(rnd() * 600) * 60_000;
      const amount = money(40, 900);
      if (rnd() < 0.45) post(a, 'DEPOSIT', amount, CREDITS[Math.floor(rnd() * CREDITS.length)], at);
      else post(a, 'WITHDRAWAL', amount, DEBITS[Math.floor(rnd() * DEBITS.length)], at);
    }
  }
}

// ---------- helpers ----------
const sessions = new Map(); // token -> { username, roles, exp }

function send(res, status, body, extra = {}) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    ...extra,
  };
  if (body === undefined) { res.writeHead(status, headers); return res.end(); }
  res.writeHead(status, { ...headers, 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}
const problem = (res, status, title, detail, fields) =>
  send(res, status, { title, status, detail, ...(fields ? { fields } : {}) }, { 'Content-Type': 'application/problem+json' });

const readBody = (req) => new Promise((resolve) => {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); } });
});

const withCount = (c) => ({ ...c, accountCount: accounts.filter((a) => a.customerId === c.id).length });
const findAccount = (id) => accounts.find((a) => a.id === id?.trim());
const spendable = (a) => a.balance + (a.kind === 'CHECKING' ? a.overdraftLimit ?? 0 : 0);
const validEmail = (s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s ?? '');

function checkCustomer(res, b) {
  const fields = {};
  if (!b.fullName || b.fullName.trim().length < 2) fields.fullName = 'size must be between 2 and 120';
  if (!validEmail(b.email)) fields.email = 'must be a well-formed email address';
  if (Object.keys(fields).length) { problem(res, 400, 'Validation failed', 'One or more fields are invalid', fields); return false; }
  return true;
}

function cash(res, account, body, type) {
  const amount = Number(body.amount);
  if (!(amount >= 0.01)) return problem(res, 400, 'Validation failed', 'One or more fields are invalid', { amount: 'must be greater than or equal to 0.01' });
  if (type === 'WITHDRAWAL' && spendable(account) < amount)
    return problem(res, 422, 'Insufficient funds', `Account ${account.id} cannot cover ${amount} (spendable: ${spendable(account).toFixed(2)})`);
  const entry = post(account, type, amount, body.description?.trim() || (type === 'DEPOSIT' ? 'Cash deposit' : 'Cash withdrawal'));
  return send(res, 201, entry);
}

// ---------- routing ----------
async function handleApi(req, res, url) {
  const path = url.pathname.slice(API.length) || '/';
  const method = req.method;

  if (method === 'POST' && path === '/auth/login') {
    const { username, password } = await readBody(req);
    const u = users[username];
    if (!u || u.password !== password) return problem(res, 401, 'Authentication failed', 'Invalid username or password');
    const token = 'mock.' + Buffer.from(`${username}:${Date.now()}`).toString('base64url');
    const exp = Date.now() + 60 * 60_000;
    sessions.set(token, { username, roles: u.roles, exp });
    return send(res, 200, { token, expiresAt: new Date(exp).toISOString(), username, roles: u.roles });
  }

  const session = sessions.get((req.headers.authorization ?? '').replace(/^Bearer /, ''));
  if (!session || session.exp < Date.now()) return problem(res, 401, 'Unauthorized', 'Full authentication is required');
  if (method === 'DELETE' && !session.roles.includes('ADMIN')) return problem(res, 403, 'Forbidden', 'Access Denied');

  let m;
  // dashboard
  if (method === 'GET' && path === '/dashboard') {
    const sum = (k) => Math.round(accounts.filter((a) => a.kind === k).reduce((s, a) => s + a.balance, 0) * 100) / 100;
    const checking = sum('CHECKING'), savings = sum('SAVINGS');
    const recent = [...ledger].sort((a, b) => b.postedAt.localeCompare(a.postedAt) || b.id - a.id).slice(0, 8);
    return send(res, 200, {
      customers: customers.length,
      checkingAccounts: accounts.filter((a) => a.kind === 'CHECKING').length,
      savingsAccounts: accounts.filter((a) => a.kind === 'SAVINGS').length,
      checkingBalance: checking, savingsBalance: savings, totalBalance: Math.round((checking + savings) * 100) / 100,
      recentActivity: recent,
    });
  }

  // customers
  if (path === '/customers' && method === 'GET') {
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    return send(res, 200, customers
      .filter((c) => !q || c.fullName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
      .sort((a, b) => a.fullName.localeCompare(b.fullName)).map(withCount));
  }
  if (path === '/customers' && method === 'POST') {
    const b = await readBody(req);
    if (!checkCustomer(res, b)) return;
    if (customers.some((c) => c.email.toLowerCase() === b.email.toLowerCase()))
      return problem(res, 409, 'Business rule violated', `A customer with e-mail ${b.email} already exists`);
    return send(res, 201, withCount(addCustomer(b.fullName.trim(), b.email.trim())));
  }
  if ((m = path.match(/^\/customers\/(\d+)$/))) {
    const c = customers.find((x) => x.id === Number(m[1]));
    if (!c) return problem(res, 404, 'Resource not found', `Customer '${m[1]}' does not exist`);
    if (method === 'GET') return send(res, 200, withCount(c));
    if (method === 'PUT') {
      const b = await readBody(req);
      if (!checkCustomer(res, b)) return;
      Object.assign(c, { fullName: b.fullName.trim(), email: b.email.trim() });
      accounts.filter((a) => a.customerId === c.id).forEach((a) => (a.customerName = c.fullName));
      return send(res, 200, withCount(c));
    }
    if (method === 'DELETE') {
      const owned = accounts.filter((a) => a.customerId === c.id).length;
      if (owned) return problem(res, 409, 'Business rule violated', `Customer still owns ${owned} account(s); close or delete them first`);
      customers.splice(customers.indexOf(c), 1);
      return send(res, 204);
    }
  }

  // accounts
  if (path === '/accounts' && method === 'GET') {
    const cid = url.searchParams.get('customerId');
    return send(res, 200, accounts.filter((a) => !cid || a.customerId === Number(cid)).sort((a, b) => b.openedAt.localeCompare(a.openedAt)));
  }
  if (path === '/accounts' && method === 'POST') {
    const b = await readBody(req);
    const c = customers.find((x) => x.id === Number(b.customerId));
    if (!c) return problem(res, 404, 'Resource not found', `Customer '${b.customerId}' does not exist`);
    if (!['CHECKING', 'SAVINGS'].includes(b.kind) || !(Number(b.initialDeposit) >= 0))
      return problem(res, 400, 'Validation failed', 'One or more fields are invalid');
    const a = addAccount(b.kind, c, Number(b.initialDeposit), b.kind === 'CHECKING' ? Number(b.overdraftLimit ?? 0) : Number(b.annualRate ?? 2.5));
    return send(res, 201, a);
  }
  if (path === '/transfers' && method === 'POST') {
    const b = await readBody(req);
    const from = findAccount(b.fromAccountId), to = findAccount(b.toAccountId);
    if (!from) return problem(res, 404, 'Resource not found', `Account '${b.fromAccountId}' does not exist`);
    if (!to) return problem(res, 404, 'Resource not found', `Account '${b.toAccountId}' does not exist`);
    if (from === to) return problem(res, 409, 'Business rule violated', 'Source and destination accounts must be different');
    const amount = Number(b.amount);
    if (!(amount >= 0.01)) return problem(res, 400, 'Validation failed', 'One or more fields are invalid', { amount: 'must be greater than or equal to 0.01' });
    if (spendable(from) < amount) return problem(res, 422, 'Insufficient funds', `Account ${from.id} cannot cover ${amount}`);
    const note = b.description?.trim() || 'Transfer';
    post(from, 'TRANSFER_OUT', amount, `${note} to ${to.id}`);
    post(to, 'TRANSFER_IN', amount, `${note} from ${from.id}`);
    return send(res, 201, { fromAccountId: from.id, toAccountId: to.id, amount, executedAt: new Date().toISOString() });
  }
  if ((m = path.match(/^\/accounts\/([^/]+)(?:\/(statement|deposits|withdrawals))?$/))) {
    const a = findAccount(decodeURIComponent(m[1]));
    if (!a) return problem(res, 404, 'Resource not found', `Account '${m[1]}' does not exist`);
    const sub = m[2];
    if (!sub && method === 'GET') return send(res, 200, a);
    if (!sub && method === 'DELETE') {
      if (a.balance !== 0) return problem(res, 409, 'Business rule violated', 'Only accounts with a zero balance can be deleted');
      accounts.splice(accounts.indexOf(a), 1);
      return send(res, 204);
    }
    if (sub === 'statement' && method === 'GET') {
      const page = Math.max(0, Number(url.searchParams.get('page') ?? 0));
      const size = Math.min(100, Math.max(1, Number(url.searchParams.get('size') ?? 8)));
      const all = ledger.filter((e) => e.accountId === a.id).sort((x, y) => y.postedAt.localeCompare(x.postedAt) || y.id - x.id);
      return send(res, 200, {
        accountId: a.id, balance: a.balance, page, size, totalPages: Math.ceil(all.length / size),
        totalEntries: all.length, entries: all.slice(page * size, page * size + size),
      });
    }
    if (sub === 'deposits' && method === 'POST') return cash(res, a, await readBody(req), 'DEPOSIT');
    if (sub === 'withdrawals' && method === 'POST') return cash(res, a, await readBody(req), 'WITHDRAWAL');
  }
  return problem(res, 404, 'Resource not found', `No route for ${method} ${url.pathname}`);
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon', '.json': 'application/json' };

function serveStatic(req, res, url) {
  if (!existsSync(STATIC_DIR)) { res.writeHead(404); return res.end('Run "npm run build" to serve the console from here.'); }
  let file = normalize(join(STATIC_DIR, decodeURIComponent(url.pathname)));
  if (!file.startsWith(STATIC_DIR) || !existsSync(file) || statSync(file).isDirectory()) file = join(STATIC_DIR, 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'OPTIONS') return send(res, 204);
  if (url.pathname.startsWith(API)) return handleApi(req, res, url).catch((e) => problem(res, 500, 'Server error', String(e)));
  return serveStatic(req, res, url);
}).listen(PORT, () => console.log(`NexaBank mock API listening on http://localhost:${PORT}${API}`));
