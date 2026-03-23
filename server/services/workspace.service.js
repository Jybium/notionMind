import "dotenv/config";

export const WORKSPACES = [
  {
    id: "ws1",
    name: process.env.NOTION_WORKSPACE_NAME || "Primary Workspace",
    token: process.env.NOTION_API_KEY,
  },
  process.env.NOTION_API_KEY_2 && {
    id: "ws2",
    name: process.env.NOTION_WORKSPACE_NAME_2 || "Secondary Workspace",
    token: process.env.NOTION_API_KEY_2,
  },
].filter(Boolean);

export function getWorkspace(wsId) {
  return WORKSPACES.find((w) => w.id === wsId) || WORKSPACES[0];
}
