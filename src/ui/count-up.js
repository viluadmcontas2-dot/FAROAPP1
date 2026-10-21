// Numero grande do herói: anima de um valor ao outro (650 ms). Sem animação no 1º desenho.
import React from 'react';
import { splitMoney } from '../core/money.js';

const DURATION_MS = 650;
const font = { fontFamily: "'Bricolage Grotesque'" };

export default function CountUp({ value }) {
  const [shown, setShown] = React.useState(value);
  const last = React.useRef(value);
  React.useEffect(() => {
    const from = last.current, to = value;
    if (from === to) return undefined;
    // quem pede menos movimento vê o número novo de uma vez, sem contar
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) { last.current = to; setShown(to); return undefined; }
    const t0 = performance.now();
    let raf;
    const step = now => {
      const p = Math.min(1, (now - t0) / DURATION_MS);
      const cur = from + (to - from) * (1 - Math.pow(1 - p, 3));
      last.current = cur;
      setShown(cur);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  const [int, cents] = splitMoney(shown);
  return React.createElement(React.Fragment, null,
    React.createElement('span', { style: { ...font, fontSize: 58, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' } }, int),
    React.createElement('span', { style: { ...font, fontSize: 24, opacity: 0.75, letterSpacing: 0 } }, cents));
}
