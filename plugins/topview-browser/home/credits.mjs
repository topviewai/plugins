/** Read balances through the caller's authenticated MCP connection, never a web login. */
export class CreditsError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'CreditsError';
    this.code = code;
  }
}

export function parseCreditResponse(response) {
  if (!response || response.isError === true) {
    throw new CreditsError('CREDITS_UNAVAILABLE', 'Unable to read the authorized account balance.');
  }
  let payload = response.structuredContent;
  if (!payload) {
    const content = response.content?.find((item) => item.type === 'text');
    try {
      payload = JSON.parse(content?.text ?? '');
    } catch {
      throw new CreditsError('INVALID_RESPONSE', 'The credit service returned an invalid response.');
    }
  }
  // Verified topview_get_credit contract: code 200, result.remainCredit.
  // HTTP / JSON-RPC success alone does not establish business success.
  if (String(payload.code) !== '200') {
    const code = String(payload.code);
    throw new CreditsError(
      code === '401' || code === '403' ? 'AUTHORIZATION_REQUIRED' : 'CREDITS_UNAVAILABLE',
      'Unable to read the authorized account balance.',
    );
  }
  const remaining = payload.result?.remainCredit;
  if (typeof remaining !== 'number' || !Number.isFinite(remaining)) {
    throw new CreditsError('INVALID_BALANCE', 'The credit service did not return a valid balance.');
  }
  // Do not forward uid or the complete upstream response to the page.
  // Preserve zero and fractional balances; unknown is never converted to zero.
  return { remaining };
}

/** callTool must be bound by the gateway to the current OAuth principal. */
export async function readAuthorizedCredits(callTool) {
  if (typeof callTool !== 'function') {
    throw new CreditsError('AUTHORIZATION_REQUIRED', 'Connect your Topview account to view credits.');
  }
  return parseCreditResponse(await callTool('topview_get_credit', { req: {} }));
}

/**
 * Stale-while-revalidate balance cache for the account popover.
 * The last known value is kept in memory only: the page has no account key and the
 * host reloads the page whenever the signed-in account changes, so nothing can leak
 * across accounts. Refreshes are de-duplicated and throttled to `maxAge` unless forced,
 * and `onChange` fires only when the displayed value actually changes.
 */
export function createCreditCache({ load, onChange, maxAge = 15000, now = () => Date.now() }) {
  let value;
  let fetchedAt = -Infinity;
  let failed = false;
  let pending = null;
  const state = () => (value !== undefined ? 'ready' : failed ? 'unavailable' : 'loading');
  return {
    get value() { return value; },
    get state() { return state(); },
    refresh({ force = false } = {}) {
      if (pending) return pending;
      if (!force && value !== undefined && now() - fetchedAt < maxAge) return Promise.resolve(value);
      pending = Promise.resolve()
        .then(load)
        .then((next) => {
          fetchedAt = now();
          const before = state();
          const changed = !Object.is(next, value);
          value = next;
          failed = false;
          if (changed || before !== 'ready') onChange?.(value, 'ready');
          return value;
        })
        .catch(() => {
          // A failed refresh keeps the last known balance; only an empty cache reports unavailable.
          if (value === undefined && !failed) {
            failed = true;
            onChange?.(undefined, 'unavailable');
          }
          return value;
        })
        .finally(() => { pending = null; });
      return pending;
    },
  };
}
