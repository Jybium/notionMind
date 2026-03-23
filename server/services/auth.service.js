import 'dotenv/config';

export const GOOGLE_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  scopes: [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/calendar.events',
  ].join(' ')
};

export const NOTION_CONFIG = {
  clientId: process.env.NOTION_CLIENT_ID,
  clientSecret: process.env.NOTION_CLIENT_SECRET,
  redirectUri: process.env.NOTION_REDIRECT_URI,
  authUrl: 'https://api.notion.com/v1/oauth/authorize',
  tokenUrl: 'https://api.notion.com/v1/oauth/token',
};

/**
 * Exchanges an OAuth code for tokens (Google)
 */
export async function exchangeGoogleCode(code) {
  const res = await fetch(GOOGLE_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CONFIG.clientId,
      client_secret: GOOGLE_CONFIG.clientSecret,
      redirect_uri: GOOGLE_CONFIG.redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  return res.json();
}

/**
 * Gets user info from Google
 */
export async function getGoogleUser(accessToken) {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.json();
}

/**
 * Exchanges an OAuth code for tokens (Notion)
 */
export async function exchangeNotionCode(code) {
  const auth = Buffer.from(`${NOTION_CONFIG.clientId}:${NOTION_CONFIG.clientSecret}`).toString('base64');
  const res = await fetch(NOTION_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: NOTION_CONFIG.redirectUri,
    }),
  });
  return res.json();
}

/**
 * Refreshes an access token using a refresh token
 */
export async function refreshGoogleAccessToken(refreshToken) {
  if (!refreshToken) return null;
  const res = await fetch(GOOGLE_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CONFIG.clientId,
      client_secret: GOOGLE_CONFIG.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  return data.access_token;
}
