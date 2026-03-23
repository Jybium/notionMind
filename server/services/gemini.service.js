import { GoogleGenAI, Type } from "@google/genai";

export function getGeminiClient(apiKey) {
  if (!apiKey) throw new Error("Gemini API key is required.");
  return new GoogleGenAI({ apiKey });
}

export const BASE_SYSTEM_GEMINI = `You are NotionMind v2, an AI workspace brain running on Google Gemini. 

Rules:
- **PRECISE FORMATTING**: Always use Markdown (headers, bold, lists) for responses.
- Use bullet points for lists; keep prose tight and professional.
- For code snippets, use correct language triple-backticks.
- If a focus document is provided below, anchor your reasoning to that data.
- (Gmail/Calendar): CRITICAL: You have tools to fetch unread emails and calendar events (\`get_unread_emails\`, \`get_calendar_events\`). YOU MUST USE THESE TOOLS if the user asks for their emails, a summary, or schedule. NEVER say you do not have access or cannot log in. You have direct access via these functions.
- (Calendar UI): When displaying calendar events, YOU MUST output the raw JSON array exactly as returned by the tool, wrapped inside a markdown code block tagged with 'calendar'. Example: \`\`\`calendar\\n[{"start": "...", "summary": "...", "location": "..."}]\\n\`\`\`
- (Notion Insight): You have access to user workspace context. Describe your findings clearly.`;

export const GEMINI_TOOLS = [
  {
    functionDeclarations: [
      {
        name: "get_unread_emails",
        description: "Fetch the latest unread emails (sender, subject, and snippet) from the user's Gmail inbox.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            maxResults: { 
              type: Type.NUMBER, 
              description: "Maximum number of unread emails to retrieve (default 10)." 
            }
          }
        }
      },
      {
        name: "get_calendar_events",
        description: "Fetch upcoming events from the user's primary Google Calendar.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            maxResults: { 
              type: Type.NUMBER, 
              description: "Maximum number of events to retrieve (default 10)." 
            }
          }
        }
      },
      {
        name: "search_notion",
        description: "Search the user's Notion workspace for pages. If the user asks for 'tasks', 'projects', or 'notes', DO NOT ask for a title. Instead, autonomously execute this tool using common keywords like 'Task' or 'To Do' to try to find their database.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: { type: Type.STRING, description: "The search query (e.g., 'Project Alpha', 'Task')." }
          },
          required: ["query"]
        }
      },
      {
        name: "get_notion_page",
        description: "Retrieve the full text content of a specific Notion page by its ID.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            pageId: { type: Type.STRING, description: "The unique ID of the Notion page." }
          },
          required: ["pageId"]
        }
      },
      {
        name: "create_notion_page",
        description: "Create a new Notion page (note or task) inside an existing page. Perfect for creating meeting notes, task lists, or project ideas.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            parentPageId: { type: Type.STRING, description: "The ID of the parent page where the new page will be created." },
            title: { type: Type.STRING, description: "The title of the new page." },
            content: { type: Type.STRING, description: "(Optional) The initial text content for the page." }
          },
          required: ["parentPageId", "title"]
        }
      },
      {
        name: "update_notion_page",
        description: "Update the properties of an existing Notion page or task. Use this to mark tasks as 'Done', change status, or update titles. Properties must follow the Notion API format.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            pageId: { type: Type.STRING, description: "The ID of the page to update." },
            properties: { type: Type.OBJECT, description: "The property object to update (e.g., { 'Status': { 'status': { 'name': 'Done' } } })." }
          },
          required: ["pageId", "properties"]
        }
      }
    ]
  }
];