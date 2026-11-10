const path = '/auth/confirm';
export const NATIVE_AUTH_RETURN = 'bible-diaries://auth/confirm';
export function emailReturnUrl({ platform, origin, configured } = {}) {
  if (platform === 'web') {
    const u = new URL(origin);
    if (u.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)) throw Error('A secure app address is required.');
    return u.origin + path;
  }
  if (!configured) return NATIVE_AUTH_RETURN;
  const u = new URL(configured);
  if (u.protocol !== 'https:' || u.username || u.password || u.pathname !== path || u.hash) throw Error('Configure the HTTPS /auth/confirm app return address.');
  u.search = '?client=mobile';
  return u.href;
}
export function readAuthReturn(raw, { webOrigin, configured } = {}) {
  const u = new URL(raw);
  const native = u.protocol === 'bible-diaries:' && u.hostname === 'auth' && u.pathname === '/confirm';
  const origins = [webOrigin, configured && new URL(configured).origin].filter(Boolean);
  if (!native && !(origins.includes(u.origin) && u.pathname === path)) throw Error('Invalid verification address.');
  const p = new URLSearchParams(u.hash.slice(1));
  if (u.searchParams.has('error') || p.has('error')) throw Error('This verification link has expired or is invalid.');
  const access_token = p.get('access_token'), refresh_token = p.get('refresh_token');
  if (!access_token || access_token.length > 3500 || !refresh_token || refresh_token.length > 1000 || !['signup', 'email'].includes(p.get('type'))) throw Error('Open the verification link from your email.');
  return { access_token, refresh_token };
}
export async function confirmEmailReturn(client, raw, options) {
  const tokens = readAuthReturn(raw, options);
  const { error } = await client.auth.setSession(tokens);
  if (error) throw Error('This verification link has expired or is invalid.');
  const result = await client.auth.getUser();
  if (result.error || !result.data.user?.email_confirmed_at) throw Error('Your email has not been verified. Open the link from your email.');
  return { user: result.data.user, tokens };
}
