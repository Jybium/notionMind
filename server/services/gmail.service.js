import logger from "./logger.js";

/**
 * Fetches unread emails from Gmail
 * @param {string} accessToken - Google OAuth access token
 * @param {number} maxResults - Max emails to fetch (default 10)
 */
export async function getUnreadEmails(accessToken, maxResults = 10) {
  if (!accessToken) throw new Error("Google access token is required for Gmail");

  try {
    // 1. List messages (unread)
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=${maxResults}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const listData = await listRes.json();

    if (!listData.messages || listData.messages.length === 0) {
      return "No unread emails found.";
    }

    // 2. Fetch details for each message
    const emailPromises = listData.messages.map(async (msg) => {
      const detailRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const detail = await detailRes.json();
      
      const snippet = detail.snippet;
      const headers = detail.payload.headers;
      const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
      const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
      const date = headers.find(h => h.name === 'Date')?.value || 'Unknown';

      return `FROM: ${from}\nDATE: ${date}\nSUBJECT: ${subject}\nSNIPPET: ${snippet}\n---`;
    });

    const results = await Promise.all(emailPromises);
    return results.join("\n");
  } catch (err) {
    logger.error("Gmail Tool Error:", err);
    throw new Error(`Failed to fetch Gmail data: ${err.message}`);
  }
}
