(() => {
  if (window.FaroInteractions) return;

  const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  const openerByDialog = new WeakMap();

  const injectStyles = () => {
    if (document.getElementById('faroInteractionStyles')) return;
    const style = document.createElement('style');
    style.id = 'faroInteractionStyles';
    style.textContent = `
      .faro-action-card{position:relative;cursor:pointer;transition:transform .12s ease,box-shadow .18s ease,border-color .18s ease;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
      .faro-action-card:active{transform:scale(.982)}
      .faro-action-card:focus-visible{outline:3px solid rgba(59,130,246,.34);outline-offset:3px}
      dialog.faro-dialog{border:0;padding:0;background:transparent;color:inherit;overflow:visible;max-width:none}
      dialog.faro-dialog::backdrop{background:rgba(15,23,42,.52);backdrop-filter:blur(4px);animation:faroBackdropIn .18s ease both}
      dialog.faro-dialog[data-closing="true"]::backdrop{animation:faroBackdropOut .16s ease both}
      .faro-dialog--sheet{width:min(100%,560px);margin:auto auto 0;max-height:94dvh}
      .faro-dialog--page{width:min(100%,620px);height:calc(100dvh - max(10px,env(safe-area-inset-top)));margin:max(10px,env(safe-area-inset-top)) auto 0}
      .faro-dialog-shell{background:#fff;border-radius:28px 28px 0 0;box-shadow:0 -20px 70px rgba(15,23,42,.22);overflow:hidden;max-height:94dvh;display:flex;flex-direction:column;animation:faroSheetIn .2s cubic-bezier(.2,.75,.25,1) both}
      .faro-dialog--page .faro-dialog-shell{height:100%;max-height:none}
      dialog.faro-dialog[data-closing="true"] .faro-dialog-shell{animation:faroSheetOut .16s ease both}
      .faro-dialog-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:20px 20px 12px;background:#fff;position:sticky;top:0;z-index:2}
      .faro-dialog-kicker{display:block;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#2563eb}
      .faro-dialog-title{margin-top:3px;font-size:22px;line-height:1.05;font-weight:900;letter-spacing:-.035em;color:#0f172a}
      .faro-dialog-close{width:44px;height:44px;border:0;border-radius:16px;background:#f1f5f9;color:#475569;display:grid;place-items:center;flex:0 0 auto}
      .faro-dialog-body{padding:4px 20px max(22px,env(safe-area-inset-bottom));overflow:auto;overscroll-behavior:contain}
      .faro-dialog-handle{width:42px;height:4px;border-radius:999px;background:#cbd5e1;margin:8px auto 0}
      @keyframes faroBackdropIn{from{background:rgba(15,23,42,0)}to{background:rgba(15,23,42,.52)}}
      @keyframes faroBackdropOut{from{background:rgba(15,23,42,.52)}to{background:rgba(15,23,42,0)}}
      @keyframes faroSheetIn{from{opacity:.4;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
      @keyframes faroSheetOut{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(16px)}}
      @media(prefers-reduced-motion:reduce){.faro-action-card{transition:none}.faro-action-card:active{transform:none}dialog.faro-dialog::backdrop,dialog.faro-dialog[data-closing="true"]::backdrop,.faro-dialog-shell,dialog.faro-dialog[data-closing="true"] .faro-dialog-shell{animation:none!important}}
    `;
    document.head.appendChild(style);
  };

  const restoreFocus = dialog => {
    const opener = openerByDialog.get(dialog);
    openerByDialog.delete(dialog);
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
    window.setTimeout(() => finishClose(dialog, returnValue), 170);
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

  const open = (dialog, opener = document.activeElement) => {
    if (!dialog) return false;
    register(dialog);
    if (dialog.open) return true;
    if (opener instanceof HTMLElement) openerByDialog.set(dialog, opener);
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
