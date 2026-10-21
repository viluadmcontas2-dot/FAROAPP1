// Catalogos fixos do produto (nao mudam por usuario). Portados de design/logic.dc.js.
export const FUEL = {
  gasolina: { label: 'Gasolina', unit: 'L', price: 6.29, eff: 11, icon: 'ph-duotone ph-drop' },
  etanol: { label: 'Etanol', unit: 'L', price: 4.39, eff: 7.8, icon: 'ph-duotone ph-plant' },
  gnv: { label: 'GNV', unit: 'm³', price: 4.79, eff: 13.2, icon: 'ph-duotone ph-cylinder' },
  hibrido: { label: 'Híbrido', unit: 'L', price: 6.29, eff: 17, icon: 'ph-duotone ph-leaf' },
  eletrico: { label: 'Elétrico', unit: 'kWh', price: 0.95, eff: 6.5, icon: 'ph-duotone ph-lightning' },
};
export const ENERGIES = ['flex', 'gasolina', 'etanol', 'gnv', 'hibrido', 'eletrico'];
export const VEHICLES = ['dono', 'financiado', 'alugado'];
export const BILL_CATS = ['carro', 'casa', 'cartao', 'pessoal'];
export const POT_KINDS = ['carro', 'casa', 'reserva', 'sonho'];
export const POT_COLORS = ['accent', 'cW', 'cF', 'cL', 'pos', 'gold'];
export const SCREENS = ['home', 'plan', 'bills', 'car', 'journey', 'remind'];
export const REM_KEYS = ['close', 'bills', 'rent', 'maint', 'week'];
export const THEMES = ['noturno', 'dia'];
// [chave, nome, icone]; as 3 primeiras tem logo no app
export const SRC_CAT = [
  ['uber', 'Uber', ''], ['n99', '99', ''], ['indrive', 'inDrive', ''],
  ['extra', 'Particular', 'ph-duotone ph-handshake'], ['gorjeta', 'Gorjeta', 'ph-duotone ph-heart'],
  ['bonus', 'Bônus dos apps', 'ph-duotone ph-gift'], ['vendas', 'Vendas no carro', 'ph-duotone ph-shopping-bag'],
];
// Fontes que contam para o R$/km dos apps (as demais, como gorjeta e venda, ficam fora)
export const RIDE_KEYS = ['uber', 'n99', 'indrive', 'extra'];
export const EXP_CATS = [
  ['Combustível', 'ph-duotone ph-gas-pump'], ['Alimentação', 'ph-duotone ph-fork-knife'], ['Lavagem', 'ph-duotone ph-drop-half'],
  ['Manutenção', 'ph-duotone ph-wrench'], ['Pedágio', 'ph-duotone ph-road-horizon'], ['Estacionamento', 'ph-duotone ph-traffic-sign'],
];
// "Combustível" so mede consumo: o custo ja entra pelos km (nao cobra duas vezes)
export const FUEL_CAT = 'Combustível';
export const XP = { close: 40, separate: 20, pay: 10 };
export const LEVELS = [[0, 'Primeira volta'], [300, 'Na pista'], [600, 'Rodagem firme'], [900, 'Motorista de rota'], [1150, 'Faro afiado'], [1500, 'Faro de ouro'], [2000, 'Lenda da pista']];

// veh: so vale para esse tipo de carro ('dono' = aluguel nao tem seguro proprio). due: dia do mes (mensal) ou dia da semana 0=dom (semanal).
export const DEFAULT_BILLS = [
  { id: 'aluguel-carro', name: 'Aluguel do carro', icon: 'ph-car-profile', color: '#5B95FF', cat: 'carro', v: 650, rec: 'semanal', due: 1, on: true, veh: 'alugado' },
  { id: 'parcela-carro', name: 'Parcela do carro', icon: 'ph-bank', color: '#5B95FF', cat: 'carro', v: 1450, rec: 'mensal', due: 15, on: true, veh: 'financiado' },
  { id: 'seguro', name: 'Seguro do carro', icon: 'ph-shield-check', color: '#5B95FF', cat: 'carro', v: 189, rec: 'mensal', due: 12, on: true, veh: 'dono' },
  { id: 'aluguel-casa', name: 'Aluguel de casa', icon: 'ph-house-line', color: '#A08CFF', cat: 'casa', v: 1200, rec: 'mensal', due: 5, on: true },
  { id: 'internet', name: 'Internet', icon: 'ph-wifi-high', color: '#5B95FF', cat: 'casa', v: 99.9, rec: 'mensal', due: 10, on: true },
  { id: 'celular', name: 'Celular', icon: 'ph-device-mobile', color: '#1AA3D9', cat: 'pessoal', v: 79.9, rec: 'mensal', due: 10, on: true },
  { id: 'agua', name: 'Água', icon: 'ph-drop', color: '#4FC3F7', cat: 'casa', v: 92.1, rec: 'mensal', due: 18, on: true },
  { id: 'mei', name: 'MEI / INSS', icon: 'ph-identification-badge', color: '#3DDC97', cat: 'pessoal', v: 81.05, rec: 'mensal', due: 20, on: true },
  { id: 'luz', name: 'Luz', icon: 'ph-lightbulb', color: '#F2B544', cat: 'casa', v: 186.4, rec: 'mensal', due: 25, on: true },
  { id: 'cartao', name: 'Cartão de crédito', icon: 'ph-credit-card', color: '#B36BFF', cat: 'cartao', v: 540, rec: 'mensal', due: 28, on: true },
];
export const DEFAULT_POTS = [
  { id: 'carro', name: 'Cofre do carro', icon: 'ph-fill ph-car-profile', c: 'accent', v: 0, goal: 650, kind: 'carro' },
  { id: 'casa', name: 'Contas da casa', icon: 'ph-fill ph-house-line', c: 'cW', v: 0, goal: 0, kind: 'casa' },
  { id: 'reserva', name: 'Reserva de emergência', icon: 'ph-fill ph-lifebuoy', c: 'pos', v: 0, goal: 5000, kind: 'reserva' },
];
