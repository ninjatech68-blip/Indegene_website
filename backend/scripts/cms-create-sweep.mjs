const API_BASE = process.env.API_BASE_URL || process.env.BASE_URL || 'http://localhost:4000';
const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@local.test';
const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'LocalStrongPass123!';
const stamp = Date.now().toString();

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function parseCsrf(html) {
  const token = String(html || '').match(/name="_csrf"\s+value="([^"]+)"/i)?.[1] || '';
  assert(token, 'CSRF token missing from admin form response');
  return token;
}

async function request(route, options = {}) {
  const response = await fetch(`${API_BASE}${route}`, options);
  const text = await response.text();
  return { response, text };
}

async function loginSessionCookie() {
  const { response, text } = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: adminEmail,
      password: adminPassword
    })
  });

  assert(response.status === 200, `Login failed with ${response.status}: ${text}`);
  const rawCookie = response.headers.get('set-cookie') || '';
  const cookie = rawCookie.split(';')[0];
  assert(cookie.startsWith('oco.sid='), 'Session cookie not found from login');
  return cookie;
}

async function createThroughAdmin(collection, payload, sessionCookie) {
  const newForm = await request(`/admin/${collection}/new`, {
    headers: { Cookie: sessionCookie }
  });
  assert(newForm.response.status === 200, `GET /admin/${collection}/new failed with ${newForm.response.status}`);

  const csrf = parseCsrf(newForm.text);
  const body = new URLSearchParams({ _csrf: csrf, ...payload }).toString();
  const createRes = await request(`/admin/${collection}`, {
    method: 'POST',
    headers: {
      Cookie: sessionCookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body,
    redirect: 'manual'
  });

  const ok = createRes.response.status === 302 || createRes.response.status === 303;
  assert(ok, `POST /admin/${collection} failed with ${createRes.response.status}: ${createRes.text.slice(0, 240)}`);
}

async function listViaAdminApi(collection, sessionCookie) {
  const { response, text } = await request(`/api/admin-api/${collection}`, {
    headers: { Cookie: sessionCookie }
  });
  assert(response.status === 200, `GET /api/admin-api/${collection} failed with ${response.status}: ${text.slice(0, 240)}`);
  const json = JSON.parse(text);
  return Array.isArray(json?.data) ? json.data : [];
}

async function deleteViaAdminApi(collection, id, sessionCookie) {
  const { response, text } = await request(`/api/admin-api/${collection}/${id}`, {
    method: 'DELETE',
    headers: { Cookie: sessionCookie }
  });
  const ok = response.status === 204 || response.status === 200;
  assert(ok, `DELETE /api/admin-api/${collection}/${id} failed with ${response.status}: ${text.slice(0, 240)}`);
}

async function run() {
  const results = [];
  const sessionCookie = await loginSessionCookie();

  const cases = [
    {
      collection: 'caseStudies',
      payload: {
        title: `QA Sweep Case ${stamp}`,
        excerpt: 'Automated create-sweep record',
        content: 'Automated create-sweep record content.',
        status: 'DRAFT',
        isFeatured: 'false'
      },
      verify: (items) => items.find((item) => item.title === `QA Sweep Case ${stamp}`) || null
    },
    {
      collection: 'testimonials',
      payload: {
        clientName: `QA Sweep Client ${stamp}`,
        role: 'QA',
        company: 'Automation',
        quote: 'Automated create-sweep quote.',
        isVisible: 'true',
        sortOrder: '9000'
      },
      verify: (items) => items.find((item) => item.clientName === `QA Sweep Client ${stamp}`) || null
    },
    {
      collection: 'clients',
      payload: {
        name: `QA Sweep Logo ${stamp}`,
        description: 'Automated create-sweep record',
        websiteUrl: '',
        isVisible: 'true',
        sortOrder: '9000'
      },
      verify: (items) => items.find((item) => item.name === `QA Sweep Logo ${stamp}`) || null
    },
    {
      collection: 'privatePageResources',
      payload: {
        pageKey: 'partner-access',
        title: `QA Sweep Resource ${stamp}`,
        resourceType: 'OTHER',
        description: 'Automated create-sweep record',
        url: 'https://example.com/qa-sweep-resource',
        ctaLabel: 'Open',
        isVisible: 'true',
        sortOrder: '9000'
      },
      verify: (items) => items.find((item) => item.title === `QA Sweep Resource ${stamp}`) || null
    },
    {
      collection: 'privatePageCredentials',
      payload: {
        pageKey: 'partner-access',
        username: `qa-user-${stamp}`,
        password: 'QaSweepPass123!',
        description: 'Automated create-sweep credential',
        isActive: 'true'
      },
      verify: (items) => items.find((item) => item.username === `qa-user-${stamp}`) || null
    },
    {
      collection: 'settings',
      payload: {
        key: `qa.sweep.${stamp}`,
        value: 'temporary value',
        description: 'Automated create-sweep setting'
      },
      verify: (items) => items.find((item) => item.key === `qa.sweep.${stamp}`) || null
    },
    {
      collection: 'pages',
      payload: {
        title: `QA Sweep Page ${stamp}`,
        heroTitle: 'QA Sweep Hero',
        heroSubtitle: 'Automated create-sweep page'
      },
      verify: (items) => items.find((item) => item.title === `QA Sweep Page ${stamp}`) || null
    }
  ];

  for (const testCase of cases) {
    try {
      await createThroughAdmin(testCase.collection, testCase.payload, sessionCookie);
      const items = await listViaAdminApi(testCase.collection, sessionCookie);
      const created = testCase.verify(items);
      assert(created, `Record not found after create in ${testCase.collection}`);
      await deleteViaAdminApi(testCase.collection, created.id, sessionCookie);
      results.push({ collection: testCase.collection, ok: true });
    } catch (error) {
      results.push({ collection: testCase.collection, ok: false, error: error.message });
    }
  }

  for (const result of results) {
    console.log(`${result.ok ? 'PASS' : 'FAIL'} - ${result.collection}${result.ok ? '' : `: ${result.error}`}`);
  }

  if (results.some((item) => !item.ok)) {
    process.exitCode = 1;
  }
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
