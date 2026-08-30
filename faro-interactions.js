(() => {
  if (window.FaroInteractions) return;

  const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  const openerByDialog = new WeakMap();
  const clamp = (value,min,max) => Math.max(min,Math.min(max,value));

  const injectStyles = () => {
    if (document.getElementById('faroInteractionStyles')) return;
    const style = document.createElement('style');
    style.id = 'faroInteractionStyles';
    style.textContent = `
      .faro-action-card{position:relative;cursor:pointer;transition:transform .1s ease,box-shadow .18s ease,border-color .18s ease;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
      .faro-action-card:active{transform:scale(.982)}
      .faro-action-card:focus-visible{outline:3px solid rgba(37,99,235,.28);outline-offset:3px}
      dialog.faro-dialog{border:0;padding:0;background:transparent;color:inherit;overflow:visible;max-width:none;font-family:"Plus Jakarta Sans",sans-serif}
      dialog.faro-dialog::backdrop{background:rgba(11,17,33,.64);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);animation:faroBackdropIn .16s ease both}
      dialog.faro-dialog[data-closing="true"]::backdrop{animation:faroBackdropOut .17s ease both}
      .faro-dialog--sheet{width:min(100%,560px);margin:auto auto 0;max-height:94dvh}
      .faro-dialog--page{width:min(100%,620px);height:calc(100dvh - max(10px,env(safe-area-inset-top)));margin:max(10px,env(safe-area-inset-top)) auto 0}
      .faro-dialog--focus{width:min(92vw,430px);max-height:min(84dvh,720px);margin:auto}
      .faro-dialog--workspace{width:min(94vw,570px);max-height:88dvh;margin:auto}
      .faro-dialog-shell{background:#fff;border-radius:28px 28px 0 0;box-shadow:0 -20px 70px rgba(11,17,33,.22);overflow:hidden;max-height:94dvh;display:flex;flex-direction:column;animation:faroSheetIn .2s cubic-bezier(.2,.75,.25,1) both}
      .faro-dialog--page .faro-dialog-shell{height:100%;max-height:none}
      .faro-dialog--focus .faro-dialog-shell{width:100%;max-height:min(84dvh,720px);border:1px solid rgba(226,232,240,.78);border-radius:30px;box-shadow:0 30px 90px -24px rgba(11,17,33,.52),0 8px 28px -18px rgba(37,99,235,.2);animation:faroFocusIn .23s cubic-bezier(.16,1,.3,1) both}
      .faro-dialog--workspace .faro-dialog-shell{width:100%;max-height:88dvh;border:1px solid rgba(226,232,240,.78);border-radius:30px;box-shadow:0 34px 100px -28px rgba(11,17,33,.58),0 8px 28px -18px rgba(37,99,235,.18);animation:faroFocusIn .24s cubic-bezier(.16,1,.3,1) both}
      dialog.faro-dialog[data-closing="true"] .faro-dialog-shell{animation:faroSheetOut .16s ease both}
      dialog.faro-dialog--focus[data-closing="true"] .faro-dialog-shell,dialog.faro-dialog--workspace[data-closing="true"] .faro-dialog-shell{animation:faroFocusOut .19s cubic-bezier(.4,0,.2,1) both}
      .faro-dialog-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:20px 20px 12px;background:#fff;position:sticky;top:0;z-index:2}
      .faro-dialog--focus .faro-dialog-head,.faro-dialog--workspace .faro-dialog-head{padding:20px 20px 14px}
      .faro-dialog--focus .faro-dialog-head>div,.faro-dialog--workspace .faro-dialog-head>div{flex:1;min-width:0}
      .faro-dialog-kicker{display:block;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.075em;color:#2563EB}
      .faro-dialog-title{margin-top:3px;font-size:21px;line-height:1.12;font-weight:800;letter-spacing:-.03em;color:#0B1121}
      .faro-dialog-close{width:44px;height:44px;border:1px solid #F1F5F9;border-radius:16px;background:#F8FAFC;color:#475569;display:grid;place-items:center;flex:0 0 auto;transition:transform .1s ease,background-color .16s ease}
      .faro-dialog-close:active{transform:scale(.95);background:#F1F5F9}
      .faro-dialog-body{padding:4px 20px max(22px,env(safe-area-inset-bottom));overflow:auto;overscroll-behavior:contain;scrollbar-gutter:stable}
      .faro-dialog--focus .faro-dialog-body{padding:2px 20px 20px}
      .faro-dialog--workspace .faro-dialog-body{padding:2px 20px max(22px,env(safe-area-inset-bottom))}
      .faro-dialog-handle{width:42px;height:4px;border-radius:999px;background:#CBD5E1;margin:8px auto 0}
      .faro-dialog--focus .faro-dialog-handle,.faro-dialog--workspace .faro-dialog-handle{display:none}
      @keyframes faroBackdropIn{from{background:rgba(11,17,33,0);backdrop-filter:blur(0)}to{background:rgba(11,17,33,.64);backdrop-filter:blur(8px)}}
      @keyframes faroBackdropOut{from{background:rgba(11,17,33,.64);backdrop-filter:blur(8px)}to{background:rgba(11,17,33,0);backdrop-filter:blur(0)}}
      @keyframes faroSheetIn{from{opacity:.4;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
      @keyframes faroSheetOut{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(16px)}}
      @keyframes faroFocusIn{from{opacity:.12;transform:translate(var(--faro-origin-x,0),var(--faro-origin-y,8px)) scale(.94)}to{opacity:1;transform:translate(0,0) scale(1)}}
      @keyframes faroFocusOut{from{opacity:1;transform:translate(0,0) scale(1)}to{opacity:0;transform:translate(var(--faro-close-x,0),var(--faro-close-y,6px)) scale(.965)}}
      @media(max-width:360px){.faro-dialog--focus{width:min(94vw,430px)}.faro-dialog--workspace{width:95vw}.faro-dialog--focus .faro-dialog-shell,.faro-dialog--workspace .faro-dialog-shell{border-radius:26px}.faro-dialog-title{font-size:20px}}
      @media(prefers-reduced-motion:reduce){.faro-action-card,.faro-dialog-close{transition:none}.faro-action-card:active,.faro-dialog-close:active{transform:none}dialog.faro-dialog::backdrop,dialog.faro-dialog[data-closing="true"]::backdrop,.faro-dialog-shell,dialog.faro-dialog[data-closing="true"] .faro-dialog-shell{animation:none!important}}
    `;
    document.head.appendChild(style);
  };

  const restoreFocus = dialog => {
    const opener = openerByDialog.get(dialog);
    openerByDialog.delete(dialog);
    for (const property of ['--faro-origin-x','--faro-origin-y','--faro-close-x','--faro-close-y']) dialog.style.removeProperty(property);
    if (opener && document.contains(opener) && typeof opener.focus === 'function') requestAnimationFrame(() => opener.focus({ preventScroll:true }));
  };

  const finishClose = (dialog, returnValue = '') => {
    if (!dialog.open) return;
    dialog.removeAttribute('data-closing');
    dialog.close(returnValue);
  };

  const close = (dialog, returnValue = '') => {
    if (!dialog?.open || dialog.dataset.closing === 'true') return;
    if (reduceMotion()) return finishClose(dialog, returnValue);
    dialog.dataset.closing = 'true';
    const centered = dialog.classList.contains('faro-dialog--focus') || dialog.classList.contains('faro-dialog--workspace');
    window.setTimeout(() => finishClose(dialog, returnValue), centered ? 195 : 170);
  };

  const register = dialog => {
    if (!dialog || dialog.dataset.faroDialogReady === 'true') return dialog;
    dialog.dataset.faroDialogReady = 'true';
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      close(dialog, 'cancel');
    });
    dialog.addEventListener('click', event => {
      if (event.target === dialog) close(dialog, 'outside');
    });
    dialog.addEventListener('close', () => restoreFocus(dialog));
    dialog.querySelectorAll('[data-faro-dialog-close]').forEach(button => button.addEventListener('click', () => close(dialog, 'close')));
    return dialog;
  };

  const setOrigin = (dialog, opener) => {
    if (!opener || typeof opener.getBoundingClientRect !== 'function') return;
    const rect = opener.getBoundingClientRect();
    const x = rect.left + rect.width / 2 - window.innerWidth / 2;
    const y = rect.top + rect.height / 2 - window.innerHeight / 2;
    const originX = clamp(x,-44,44);
    const originY = clamp(y,-58,58);
    dialog.style.setProperty('--faro-origin-x', `${originX}px`);
    dialog.style.setProperty('--faro-origin-y', `${originY}px`);
    dialog.style.setProperty('--faro-close-x', `${clamp(originX * .55,-24,24)}px`);
    dialog.style.setProperty('--faro-close-y', `${clamp(originY * .55,-32,32)}px`);
  };

  const open = (dialog, opener = document.activeElement) => {
    if (!dialog) return false;
    register(dialog);
    if (dialog.open) return true;
    if (opener instanceof HTMLElement) {
      openerByDialog.set(dialog, opener);
      setOrigin(dialog, opener);
    }
    dialog.removeAttribute('data-closing');
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    requestAnimationFrame(() => {
      const focusTarget = dialog.querySelector('[autofocus],[data-faro-initial-focus],input:not([type="hidden"]),select,button:not([data-faro-dialog-close])');
      focusTarget?.focus?.({ preventScroll:true });
    });
    return true;
  };

  injectStyles();
  window.FaroInteractions = Object.freeze({ open, close, register, reduceMotion });
})();