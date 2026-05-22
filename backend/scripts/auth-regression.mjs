const API_BASE = process.env.API_BASE_URL || process.env.BASE_URL || 'http://localhost:4000';
const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@local.test';
const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'LocalStrongPass123!';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(route, options = {}) {
  const response = await fetch(`${API_BASE}${route}`, options);
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (error) {
    json = null;
  }
  return { response, text, json };
}

function extractCsrf(html) {
  const token = String(html || '').match(/name="_csrf"\s+value="([^"]+)"/i)?.[1] || '';
  assert(token, 'Missing CSRF token on /admin/login');
  return token;
}

function extractSessionCookie(response) {
  const raw = response.headers.get('set-cookie') || '';
  return raw.split(';')[0] || '';
}

async function run() {
  const checks = [];

  async function test(name, fn) {
    try {
      await fn();
      checks.push({ name, ok: true });
    } catch (error) {
      checks.push({ name, ok: false, error: error.message });
    }
  }

  await test('api auth rejects invalid credentials', async () => {
    const { response, json } = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password: `${adminPassword}__invalid`
      })
    });
    assert(response.status === 401, `Expected 401, got ${response.status}`);
    assert(json?.error === 'Unauthorized', `Expected Unauthorized payload, got ${json?.error || 'none'}`);
  });

  await test('api auth accepts valid credentials', async () => {
    const { response, json } = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword
      })
    });
    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(json?.data?.user?.email, 'Expected user payload from api auth login');
    const cookie = response.headers.get('set-cookie') || '';
    assert(cookie.includes('oco.sid='), 'Expected session cookie from api auth login');
  });

  await test('admin web login page renders with csrf', async () => {
    const { response, text } = await request('/admin/login');
    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(text.includes('<form') && text.includes('name="_csrf"'), 'Expected login form with csrf token');
  });

  await test('admin web login invalid credentials returns 401 UI state', async () => {
    const form = await request('/admin/login');
    const cookie = extractSessionCookie(form.response);
    const csrf = extractCsrf(form.text);
    const body = new URLSearchParams({
      _csrf: csrf,
      email: adminEmail,
      password: `${adminPassword}__invalid`
    }).toString();
    const { response, text } = await request('/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookie
      },
      body,
      redirect: 'manual'
    });
    assert(response.status === 401, `Expected 401, got ${response.status}`);
    assert(text.includes('Invalid credentials'), 'Expected inline invalid credentials message');
  });

  await test('admin web login valid credentials redirects to admin', async () => {
    const form = await request('/admin/login');
    const cookie = extractSessionCookie(form.response);
    const csrf = extractCsrf(form.text);
    const body = new URLSearchParams({
      _csrf: csrf,
      email: adminEmail,
      password: adminPassword
    }).toString();
    const { response } = await request('/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookie
      },
      body,
      redirect: 'manual'
    });
    assert(response.status === 302 || response.status === 303, `Expected redirect, got ${response.status}`);
    assert(response.headers.get('location') === '/admin', `Expected redirect to /admin, got ${response.headers.get('location')}`);
  });

  const failures = checks.filter((entry) => !entry.ok);
  for (const entry of checks) {
    console.log(`${entry.ok ? 'PASS' : 'FAIL'} - ${entry.name}${entry.ok ? '' : `: ${entry.error}`}`);
  }

  if (failures.length) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
