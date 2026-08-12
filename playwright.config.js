import { defineConfig } from '@playwright/test';

const localBaseURL = 'http://127.0.0.1:4173';
const remoteBaseURL = process.env.VETTA_TEST_BASE_URL?.trim();
const remoteUsageMode = Boolean(remoteBaseURL);
const requestedBrowser = (process.env.VETTA_BROWSER || 'chromium').toLowerCase();

if (!['chromium', 'firefox', 'webkit'].includes(requestedBrowser)) {
  throw new Error(`Navegador não suportado: ${requestedBrowser}`);
}

const mobileUse = {
  browserName: requestedBrowser,
  viewport: { width: 390, height: 844 },
  hasTouch: requestedBrowser !== 'firefox',
};

const projects = remoteUsageMode
  ? [{ name: `${requestedBrowser}-published-mobile`, use: mobileUse }]
  : requestedBrowser === 'chromium'
    ? [
        { name: 'chromium-mobile', use: mobileUse },
        { name: 'chromium-desktop', use: { browserName: 'chromium', viewport: { width: 1366, height: 768 } } },
      ]
    : [{ name: `${requestedBrowser}-mobile`, use: mobileUse }];

export default defineConfig({
  testDir: remoteUsageMode ? './tests/e2e-remote' : './tests/e2e',
  timeout: remoteUsageMode ? 90_000 : 60_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: remoteUsageMode ? 'test-results/remote' : `test-results/local-${requestedBrowser}`,
  projects,
  use: {
    baseURL: remoteBaseURL || localBaseURL,
    headless: true,
    serviceWorkers: 'allow',
    actionTimeout: 12_000,
    navigationTimeout: 25_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  webServer: remoteUsageMode ? undefined : {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1 --directory _site',
    url: localBaseURL,
    reuseExistingServer: false,
    timeout: 30_000,
  },
  reporter: remoteUsageMode
    ? [['line'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : [['line']],
});
