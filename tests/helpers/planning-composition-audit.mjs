const has = (source, pattern) => pattern.test(source || '');
const indexOfModule = (source, name) => String(source || '').indexOf(name);

export function auditPlanningComposition({ shell = '', appShell = '', brand = '', home = '', planning = '', navigation = '' } = {}) {
  const violations = [];
  const push = (code, detail) => violations.push({ code, detail });

  const hasSecondaryPlanningEntry = has(shell, /data-secondary-view=["']planning["']/);
  const settingsIsPlanning = has(navigation, /settings:\s*['"]Planejar['"]/);
  const planningOwnsPrimary = has(planning, /navPlanning\.dataset\.view = ['"]planning['"]/);
  const homeRemovesLegacyEntry = has(home, /legacyPlanningCta\?\.remove\(\)/);
  const settingsIsHiddenLegacy = has(planning, /#view-settings\{display:none!important\}/);
  const finalPlanningReplaced = has(planning, /planning\.replaceChildren\(root\)/);

  if (hasSecondaryPlanningEntry && settingsIsPlanning && !(planningOwnsPrimary && homeRemovesLegacyEntry && settingsIsHiddenLegacy && finalPlanningReplaced)) {
    push('PLANNING_DESTINATION_SPLIT', 'Planejar ainda possui duas superfícies ativas para a mesma intenção.');
  }

  const legacyCostsRoute = has(navigation, /faroManageCosts[\s\S]*navigateToPrimary\(['"]settings['"]\)/);
  const r2CapturesCosts = has(planning, /faroManageCosts[\s\S]*stopImmediatePropagation\(\)[\s\S]*planning-costs/);
  const r3OwnsMoney = has(planning, /id=\"faroOpenMoney\"[\s\S]*const openMoney =/);
  if (legacyCostsRoute && !r2CapturesCosts && !r3OwnsMoney) {
    push('PLANNING_COSTS_ROUTE_SPLIT', 'Gerenciar custos ainda escapa do Planejar unificado.');
  }

  const brandMovesTarget = has(
    brand,
    /const targetCard = document\.getElementById\(['"]targetProfitDisplay['"]\)\?\.closest\(['"]\.card-vetta['"]\);[\s\S]*planningDetails\.appendChild\(card\)/
  );
  if (brandMovesTarget) push('TARGET_CARD_REPARENTED_BY_BRAND', 'A camada de marca ainda assume responsabilidade de composição da meta.');

  const brandMovesDre = has(
    brand,
    /const distributionCard = document\.getElementById\(['"]dreGross['"]\)\?\.closest\(['"]\.card-vetta['"]\);[\s\S]*planningDetails\.appendChild\(card\)/
  );
  if (brandMovesDre) push('DRE_REPARENTED_BY_BRAND', 'A camada de marca ainda assume responsabilidade de composição da DRE.');

  const homeLooksForDashboardSlider = has(home, /dashboard\.querySelector\([^\n;]*targetProfit[^\n;]*range/);
  const brandIndex = indexOfModule(appShell, 'faro-brand.js');
  const homeIndex = indexOfModule(appShell, 'faro-home.js');
  if (brandMovesTarget && homeLooksForDashboardSlider && brandIndex >= 0 && homeIndex >= 0 && brandIndex < homeIndex) {
    push('SLIDER_OWNER_ORDER_CONFLICT', 'Brand move o slider antes de Home procurar o mesmo controle no dashboard.');
  }

  const legacyAdjustesCopy = has(shell, /view-planning[\s\S]*edição do planejamento continua em Ajustes/);
  if (legacyAdjustesCopy && !finalPlanningReplaced) push('LEGACY_ADJUSTES_MENTAL_MODEL', 'A superfície final ainda ensina Ajustes como segundo destino mental.');

  if (planning && !has(planning, /slider\.removeAttribute\(['"]data-model['"]\)/)) {
    push('TARGET_SLIDER_LEGACY_AUTOSAVE', 'O slider final ainda conserva o autosave legado por input.');
  }

  const r2Subcontexts = has(planning, /planning-days[\s\S]*planning-operation[\s\S]*planning-costs/);
  const r3Cockpit = has(planning, /id=\"faroOpenMeta\"[\s\S]*id=\"faroOpenAgenda\"[\s\S]*id=\"faroOpenPlanDetail\"[\s\S]*id=\"faroOpenOperation\"[\s\S]*id=\"faroOpenMoney\"/);
  if (planning && !(r2Subcontexts || r3Cockpit)) {
    push('PLANNING_ACTIONS_MISSING', 'Meta, Agenda, Meu planejamento, Operação e Dinheiro não convergem numa única superfície de Planejar.');
  }

  return violations;
}
