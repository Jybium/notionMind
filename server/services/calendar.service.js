import logger from "./logger.js";

/**
 * Fetches upcoming calendar events
 * @param {string} accessToken - Google OAuth access token
 * @param {number} maxResults - Max events to fetch
 */
export async function getCalendarEvents(accessToken, maxResults = 10) {
  if (!accessToken) throw new Error("Google access token is required for Calendar");

  try {
    const timeMin = new Date().toISOString();
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await res.json();

    if (!data.items || data.items.length === 0) {
      return "No upcoming calendar events found.";
    }

    const events = data.items.map(event => ({
      start: event.start.dateTime || event.start.date,
      summary: event.summary || 'No Title',
      location: event.location || ''
    }));

    return JSON.stringify(events);
  } catch (err) {
    logger.error("Calendar Tool Error:", err);
    throw new Error(`Failed to fetch Calendar data: ${err.message}`);
  }
}
