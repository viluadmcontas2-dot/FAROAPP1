const has = (source, pattern) => pattern.test(source || '');
const indexOfModule = (source, name) => String(source || '').indexOf(name);

export function auditPlanningComposition({ shell = '', appShell = '', brand = '', home = '', navigation = '' } = {}) {
  const violations = [];
  const push = (code, detail) => violations.push({ code, detail });

  const hasSecondaryPlanningEntry = has(shell, /data-secondary-view=["']planning["']/);
  const settingsIsPlanning = has(navigation, /settings:\s*['"]Planejar['"]/);
  if (hasSecondaryPlanningEntry && settingsIsPlanning) {
    push(
      'PLANNING_DESTINATION_SPLIT',
      'Planejar existe como view-planning secundária e também como view-settings rotulada Planejar.'
    );
  }

  if (has(navigation, /faroManageCosts[\s\S]*navigateToPrimary\(['"]settings['"]\)/)) {
    push(
      'PLANNING_COSTS_ROUTE_SPLIT',
      'Gerenciar custos envia o motorista para settings em vez de convergir com a superfície de planejamento.'
    );
  }

  const brandMovesTarget = has(
    brand,
    /const targetCard = document\.getElementById\(['"]targetProfitDisplay['"]\)\?\.closest\(['"]\.card-vetta['"]\);[\s\S]*planningDetails\.appendChild\(card\)/
  );
  if (brandMovesTarget) {
    push(
      'TARGET_CARD_REPARENTED_BY_BRAND',
      'A camada de marca move o card da meta/slider para Planning e assume responsabilidade de composição.'
    );
  }

  const brandMovesDre = has(
    brand,
    /const distributionCard = document\.getElementById\(['"]dreGross['"]\)\?\.closest\(['"]\.card-vetta['"]\);[\s\S]*planningDetails\.appendChild\(card\)/
  );
  if (brandMovesDre) {
    push(
      'DRE_REPARENTED_BY_BRAND',
      'A camada de marca move a DRE para Planning, misturando branding com arquitetura da tela.'
    );
  }

  const homeLooksForDashboardSlider = has(
    home,
    /dashboard\.querySelector\(['"]input\[data-model=["']targetProfit["']\]\[type=["']range["']\]['"]\)/
  );
  const brandIndex = indexOfModule(appShell, 'faro-brand.js');
  const homeIndex = indexOfModule(appShell, 'faro-home.js');
  if (brandMovesTarget && homeLooksForDashboardSlider && brandIndex >= 0 && homeIndex >= 0 && brandIndex < homeIndex) {
    push(
      'SLIDER_OWNER_ORDER_CONFLICT',
      'faro-brand move o slider antes de faro-home procurar o slider dentro do dashboard.'
    );
  }

  if (has(shell, /view-planning[\s\S]*edição do planejamento continua em Ajustes/)) {
    push(
      'LEGACY_ADJUSTES_MENTAL_MODEL',
      'A própria tela de Planejar ainda instrui o usuário a editar em Ajustes, criando um segundo destino mental.'
    );
  }

  return violations;
}
