// Tokens visuais do design (cores por tema, logos). Nao dependem de dados.

export const THEME_TOKENS={
 noturno:{bg:'#07090F',surface:'#11151F',surface2:'#1A1F2C',ink:'#F3F1EC',muted:'#8F95A6',line:'rgba(255,255,255,.06)',line2:'rgba(255,255,255,.13)',accent:'#6EA0FF',accentSoft:'rgba(110,160,255,.14)',gold:'#E9B04B',goldInk:'#1A1100',accentInk:'#06101F',goldSoft:'rgba(233,176,75,.13)',pos:'#3DDC97',posInk:'#04120B',neg:'#FF6B6B',negSoft:'rgba(255,107,107,.1)',negLine:'rgba(255,107,107,.3)',cW:'#8FB4FF',cF:'#4FA8E8',cL:'#38C6D9',nav:'rgba(17,21,31,.92)',logoBg:'#0E1222',
  heroBg:'conic-gradient(from 212deg at 104% -2%, rgba(233,176,75,0) 0deg, rgba(233,176,75,.22) 9deg, rgba(233,176,75,0) 24deg), radial-gradient(120% 70% at 100% 0%, rgba(110,160,255,.22), rgba(110,160,255,0) 65%), linear-gradient(180deg, #161B2E 0%, #0B0E18 100%)'},
 dia:{bg:'#EEF1F6',surface:'#FFFFFF',surface2:'#F0F3F8',ink:'#0D1530',muted:'#677290',line:'rgba(13,21,48,.06)',line2:'rgba(13,21,48,.13)',accent:'#2B5BEF',accentSoft:'rgba(43,91,239,.1)',gold:'#F0A81E',goldInk:'#221500',accentInk:'#FFFFFF',goldSoft:'rgba(240,168,30,.15)',pos:'#0E9F6E',posInk:'#fff',neg:'#E5484D',negSoft:'rgba(229,72,77,.07)',negLine:'rgba(229,72,77,.25)',cW:'#6E9BF2',cF:'#1B8FD6',cL:'#0FA3B8',nav:'rgba(255,255,255,.94)',logoBg:'#16349F',
  heroBg:'conic-gradient(from 212deg at 104% -2%, rgba(255,199,77,0) 0deg, rgba(255,214,120,.3) 9deg, rgba(255,199,77,0) 24deg), radial-gradient(120% 70% at 100% 0%, rgba(120,175,255,.45), rgba(120,175,255,0) 65%), linear-gradient(170deg, #2A56EA 0%, #10288A 100%)'}
};
// hsFade/hsArrow: degradê e seta das faixas roláveis; derivam do tema.
export const themeOf = name => {
  const t = THEME_TOKENS[name] || THEME_TOKENS.noturno;
  return { ...t, hsFade: t.surface, hsArrow: t.muted };
};
export const LOGO = { uber: 'assets/platforms/faro-platform-uber.svg', n99: 'assets/platforms/faro-platform-99.svg', indrive: 'assets/platforms/faro-platform-indrive.svg' };
// cor da barra de cada fonte de renda na lista "por app"
export const sourceColor = (key, t, themeName) => ({ uber: themeName === 'dia' ? '#111' : '#E9EDF5', n99: '#FFD43B', indrive: '#B7F34A' }[key] || t.accent);
