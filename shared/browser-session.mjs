// Session credentials live in HttpOnly cookies. Only short-lived PKCE verifiers
// use this in-memory map; no browser localStorage/sessionStorage token writes.
export function createBrowserSessionStorage(request = globalThis.fetch) {
  const verifiers = new Map();
  return {
    async getItem(key) {
      if (key.endsWith('-code-verifier')) return verifiers.get(key) || null;
      const r = await request('/api/session', { cache: 'no-store', credentials: 'same-origin' });
      if (r.status === 401) return null;
      if (!r.ok) throw Error('Could not restore your session. Try again.');
      return JSON.stringify(await r.json());
    },
    async setItem(key, value) {
      if (key.endsWith('-code-verifier')) { verifiers.set(key, value); return; }
      const session = JSON.parse(value);
      const r = await request('/api/session', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ access_token: session.access_token, refresh_token: session.refresh_token }) });
      if (!r.ok) throw Error('Could not securely save your session. Try again.');
    },
    async removeItem(key) {
      if (key.endsWith('-code-verifier')) { verifiers.delete(key); return; }
      const r = await request('/api/session', { method: 'DELETE', credentials: 'same-origin' });
      if (!r.ok) throw Error('Could not sign out. Try again.');
    },
  };
}
