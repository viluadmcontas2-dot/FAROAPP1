// Constantes e pecas pequenas compartilhadas pelas telas (paletas do design, estilos de seleção).
import { LOGO } from './theme.js';

export const SCREEN_NAV = ['home', 'bills', 'remind', 'journey', 'plan', 'car'];
// Preço combinado (a cobrança só abre quando a assinatura for ligada: ver data/access.js). Um lugar só para o texto.
export const PRICE = 'R$ 22,99/mês';
export const PRICE_LINE = `Grátis por 7 dias · depois ${PRICE}`;
// nome do custo fixo do carro, na palavra do motorista
export const carFixName = vehicle => (vehicle === 'alugado' ? 'Aluguel' : vehicle === 'financiado' ? 'Parcela' : 'Seguro');
export const UNIT_WORD = { L: 'litro', 'm³': 'm³', kWh: 'kWh' };
export const MAX_CHOICES = 7; // fontes de renda e categorias de gasto: acima disso some o "Nova"

export const ICON_IN = ['ph-shopping-bag', 'ph-drop-half', 'ph-cookie', 'ph-coffee', 'ph-beer-bottle', 'ph-gift', 'ph-package', 'ph-storefront'];
export const ICON_OUT = ['ph-receipt', 'ph-coffee', 'ph-traffic-sign', 'ph-device-mobile', 'ph-first-aid-kit', 'ph-t-shirt', 'ph-ticket', 'ph-car-battery'];
export const BILL_ICONS = ['ph-lightbulb', 'ph-drop', 'ph-wifi-high', 'ph-credit-card', 'ph-barcode', 'ph-house-line', 'ph-graduation-cap', 'ph-heartbeat'];
export const BILL_COLORS = ['#F2B544', '#4FC3F7', '#5B95FF', '#B36BFF', '#FF8F6B', '#3DDC97', '#FF6B9A'];
export const BILL_PRESETS = [['Luz', 'ph-lightbulb', '#F2B544', 'casa'], ['Água', 'ph-drop', '#4FC3F7', 'casa'], ['Internet', 'ph-wifi-high', '#5B95FF', 'casa'], ['Cartão', 'ph-credit-card', '#B36BFF', 'cartao'], ['Boleto', 'ph-barcode', '#FF8F6B', 'pessoal'], ['Escola', 'ph-graduation-cap', '#3DDC97', 'pessoal'], ['Plano de saúde', 'ph-heartbeat', '#FF6B9A', 'pessoal'], ['Seguro do carro', 'ph-shield-check', '#5B95FF', 'carro']];
export const BILL_CAT_LABELS = [['carro', 'Carro'], ['casa', 'Casa'], ['cartao', 'Cartão'], ['pessoal', 'Pessoal']];
export const ENERGY_LABELS = { flex: ['Flex', 'ph-duotone ph-gas-pump'], gasolina: ['Gasolina', 'ph-duotone ph-drop'], etanol: ['Etanol', 'ph-duotone ph-plant'], gnv: ['GNV', 'ph-duotone ph-cylinder'], hibrido: ['Híbrido', 'ph-duotone ph-leaf'], eletrico: ['Elétrico', 'ph-duotone ph-lightning'] };
export const VEHICLE_LABELS = { dono: 'Próprio', financiado: 'Financiado', alugado: 'Alugado' };
export const DAYS_WEEK_OPTIONS = [4, 5, 6, 7];

// "1 dia", "2 dias"
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export const logoStyle = key => ({ logoUrl: LOGO[key] ? `url("${LOGO[key]}")` : 'none', imgD: LOGO[key] ? 'block' : 'none', icoD: LOGO[key] ? 'none' : 'flex' });
export const sel = (t, on) => ({ border: on ? t.accent : t.line2, bg: on ? t.accentSoft : t.surface, color: on ? t.accent : t.ink });
export const segOpt = (t, label, on, onClick) => ({ label, bg: on ? t.surface : 'transparent', color: on ? t.ink : t.muted, onClick });
export const stepper = (label, value, minus, plus, sub = '') => ({ label, value, minus, plus, sub });
