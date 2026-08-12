import { test, expect } from '@playwright/test';

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
  costs: [
    { id: 'maintenance-default', name: 'Reserva de manutenção', kind: 'per_km', category: 'reserve', value: 0.18, active: true },
    { id: 'fixed-default', name: 'Outros custos mensais', kind: 'monthly', category: 'obligation', value: 650, active: true }
  ],
  records: [],
  events: [],
  closings: []
};

test('modal fecha e salva uma despesa sem carregar patches no navegador', async ({ page }) => {
  const partRequests = [];
  const pageErrors = [];

  page.on('request', request => {
    if (request.url().includes('/parts/')) partRequests.push(request.url());
  });
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.addInitScript(({ key, state }) => {
    localStorage.setItem(key, JSON.stringify(state));
  }, { key: STORAGE_KEY, state: initialState });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#appVersionLabel')).toHaveText('Versão 3.5.1');

  await page.locator('[data-view="settings"]').first().click();
  await page.locator('#addCostButton').click();

  const modal = page.locator('#costModal');
  await expect(modal).toBeVisible();

  await page.locator('#closeCostModal i').click();
  await expect(modal).toBeHidden();

  await page.locator('#addCostButton').click();
  await expect(modal).toBeVisible();

  await page.locator('#costName').fill('Seguro de teste E2E');
  await page.locator('#costValue').fill('123.45');
  await page.locator('#saveCostButton').click();
  await expect(modal).toBeHidden();

  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
  const saved = stored.costs.filter(cost => cost.name === 'Seguro de teste E2E');

  expect(saved).toHaveLength(1);
  expect(Number(saved[0].value)).toBeCloseTo(123.45, 2);
  expect(partRequests).toEqual([]);
  expect(pageErrors).toEqual([]);
});
