import { test, expect } from '@playwright/test';

const baseURL = process.env.VETTA_TEST_BASE_URL?.trim();
const authentication = process.env.VETTA_PUBLISHED_AUTH || 'none';
const oidcToken = process.env.VETTA_TEST_OIDC_TOKEN?.trim();
const expectedCommit = process.env.VETTA_EXPECTED_COMMIT?.trim();
const STORAGE_KEY = 'vetta-driver-intelligence-v3';

const initialState = {
  version: 3,
  onboardingComplete: true,
  targetProfit: 4000,
  workWeekdays: [1, 2, 3, 4, 5, 6],
  extraDaysOff: 0,
  revenueKm: 2.25,
  fuel: { type: 'gnv', label: 'GNV', unit: 'm³', price: 4.79, efficiency: 13.2 },
  compare: { gasPrice: 6.19, gasEff: 10.5, gnvPrice: 4.79, gnvEff: 13.2, period: 1 },
  costs: [],
  records: [],
  events: [],
};

function url(path) {
  if (!baseURL) throw new Error('VETTA_TEST_BASE_URL não configurada.');
  const normalized = baseURL.endsWith('/') ? baseURL : `${baseURL}/`;
  return new URL(path.replace(/^\//, ''), normalized).toString();
}

async function authenticateWithOidc(page) {
  expect(oidcToken, 'A identidade OIDC temporária precisa existir.').toBeTruthy();
  let lastStatus = 0;
  for (let attempt = 1; attempt <= 24; attempt += 1) {
    const response = await page.request.post(url('__vetta-oidc-access'), {
      headers: { authorization: `Bearer ${oidcToken}` },
      data: { redirect: './?forceBrowser=1' },
      maxRedirects: 0,
    });
    lastStatus = response.status();
    if (lastStatus === 303) {
      const setCookie = response.headers()['set-cookie'];
      expect(setCookie, 'A rota OIDC deve devolver cookie de sessão.').toBeTruthy();
      const [pair] = setCookie.split(';');
      const separator = pair.indexOf('=');
      await page.context().addCookies([{
        name: pair.slice(0, separator),
        value: pair.slice(separator + 1),
        url: url('./'),
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
      }]);
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 10_000));
  }
  throw new Error(`A rota OIDC não ficou pronta. Último status: ${lastStatus}`);
}

test.describe.configure({ mode: 'serial' });

test('prova ambiente publicado, instalação e fluxo interno', async ({ page, request }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  for (const path of ['manifest.webmanifest', 'sw.js', 'icon.svg', 'icon-192.png', 'icon-512.png']) {
    const response = await request.get(url(path));
    expect(response.ok(), `${path} deve continuar disponível`).toBeTruthy();
  }

  if (authentication === 'github-oidc') {
    await authenticateWithOidc(page);
    if (expectedCommit) {
      const metadata = await page.request.get(url('.well-known/vetta-deploy.json'));
      expect(metadata.ok(), 'Metadado do deploy deve estar acessível após autenticação.').toBeTruthy();
      const deployed = await metadata.json();
      expect(deployed.commit, 'O Netlify deve servir a fotografia testada.').toBe(expectedCommit);
    }
  }

  const installResponse = await page.goto(url('./?forceBrowser=1'), { waitUntil: 'domcontentloaded' });
  expect(installResponse?.status(), 'O ambiente deve responder após a autenticação aplicável.').toBeLessThan(400);
  await expect(page.locator('[data-vetta-access-gate="true"]')).toHaveCount(0);
  await expect(page.locator('#installView')).toBeVisible();
  await expect(page.locator('#view-dashboard')).toHaveCount(0);

  await page.addInitScript(({ key, state }) => {
    localStorage.setItem(key, JSON.stringify(state));
  }, { key: STORAGE_KEY, state: initialState });

  await page.goto(url('./'), { waitUntil: 'domcontentloaded' });
  await page.waitForURL(/app-shell\.html(?:$|[?#])/);
  await expect(page.locator('#view-dashboard')).toBeVisible();

  await page.locator('[data-view="day"]').first().click();
  await page.locator('#recordGross').fill('321.50');
  await page.locator('#recordKm').fill('120');
  await page.locator('[data-view="dashboard"]').first().click();
  await page.locator('[data-view="day"]').first().click();
  await expect(page.locator('#recordGross')).toHaveValue('321.50');
  await expect(page.locator('#recordKm')).toHaveValue('120');
  expect(pageErrors, `Erros JavaScript: ${pageErrors.join(' | ')}`).toEqual([]);
});
