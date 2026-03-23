export function buildMCPServers(notionKey, gmailToken, calendarToken) {
  const servers = [];
  if (notionKey) {
    servers.push({
      type: "url",
      url: "https://mcp.notion.com/sse",
      name: "notion",
      authorization_token: notionKey,
    });
  }
  if (gmailToken) {
    servers.push({
      type: "url",
      url: process.env.GMAIL_MCP_URL || "https://gmail.mcp.claude.com/mcp",
      name: "gmail",
      authorization_token: gmailToken,
    });
  }
  if (calendarToken) {
    servers.push({
      type: "url",
      url: process.env.GCAL_MCP_URL || "https://gcal.mcp.claude.com/mcp",
      name: "google-calendar",
      authorization_token: calendarToken,
    });
  }
  return servers;
}
