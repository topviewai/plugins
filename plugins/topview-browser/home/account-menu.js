(function (scope, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else scope.TopviewAccountMenu = api;
})(globalThis, function () {
  'use strict';

  /** Display the existing main-site PricingModal in its authenticated provider. */
  async function launchPricing(services) {
    if (typeof services?.openPricingModal !== 'function') {
      throw Object.assign(new Error('Topview pricing service is not connected.'), { code: 'PRICING_UNAVAILABLE' });
    }
    // Opening a pricing view does not select a product, create an order, or pay.
    return services.openPricingModal();
  }

  function bind({ container, button, popover, rechargeButton, onRecharge, onError }) {
    const doc = container.ownerDocument;
    let timer, disposed = false;
    function setOpen(open) {
      clearTimeout(timer);
      if (disposed) return;
      popover.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
    }
    const enter = event => { if (event.pointerType !== 'touch') setOpen(true); };
    const leave = () => { clearTimeout(timer); timer = setTimeout(() => setOpen(false), 220); };
    const focus = () => { if (button.matches(':focus-visible')) setOpen(true); };
    const blur = event => { if (!container.contains(event.relatedTarget)) leave(); };
    // Pointer entry may already have opened the card before the click fires.
    // Clicking or pressing Enter should keep it open, not immediately reverse hover.
    const toggle = () => setOpen(true);
    const outside = event => { if (!container.contains(event.target)) setOpen(false); };
    const escape = event => {
      if (event.key !== 'Escape' || popover.hidden) return;
      event.stopPropagation();
      setOpen(false);
      button.focus();
    };
    const recharge = async () => {
      setOpen(false);
      try { await onRecharge(); }
      catch (error) { if (!disposed) onError?.(error); }
    };
    const listeners = [
      [container, 'pointerenter', enter], [container, 'pointerleave', leave],
      [button, 'focus', focus], [container, 'focusout', blur], [button, 'click', toggle],
      [rechargeButton, 'click', recharge], [doc, 'click', outside], [doc, 'keydown', escape, true],
    ];
    for (const [target, type, listener, capture] of listeners) target.addEventListener(type, listener, capture);
    setOpen(false);
    return {
      setOpen,
      dispose() {
        setOpen(false);
        disposed = true;
        clearTimeout(timer);
        for (const [target, type, listener, capture] of listeners) target.removeEventListener(type, listener, capture);
      },
    };
  }
  return { bind, launchPricing };
});
