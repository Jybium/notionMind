import { Client } from "@notionhq/client";
import logger from "./logger.js";

/**
 * Fetches and flattens the text content of a Notion page
 * @param {string} pageId - The Notion page ID
 * @param {string} token - The Notion integration token
 */
export async function getPageContent(pageId, token) {
  if (!token) throw new Error("Notion token is required");
  const notion = new Client({ auth: token });
  
  try {
    const page = await notion.pages.retrieve({ page_id: pageId });
    const title = extractTitle(page);
    const blocks = await notion.blocks.children.list({ block_id: pageId });
    let text = `Title: ${title}\n\nContent:\n`;
    
    for (const block of blocks.results) {
      text += processBlock(block);
    }
    
    return text;
  } catch (err) {
    logger.error(`getPageContent Error [${pageId}]:`, err);
    throw new Error(`Failed to read Notion page: ${err.message}`);
  }
}

function processBlock(block) {
  const type = block.type;
  const content = block[type];
  if (!content || !content.rich_text) return "";
  
  const text = content.rich_text.map(t => t.plain_text).join("");
  
  switch (type) {
    case 'paragraph': return `${text}\n`;
    case 'heading_1': return `# ${text}\n`;
    case 'heading_2': return `## ${text}\n`;
    case 'heading_3': return `### ${text}\n`;
    case 'bulleted_list_item': return `- ${text}\n`;
    case 'numbered_list_item': return `1. ${text}\n`;
    case 'to_do': return `[${content.checked ? 'x' : ' '}] ${text}\n`;
    case 'code': return `\`\`\`${content.language}\n${text}\n\`\`\`\n`;
    case 'quote': return `> ${text}\n`;
    default: return `${text}\n`;
  }
}

function extractTitle(page) {
  if (!page.properties) return "Untitled Document";
  const titleKey = Object.keys(page.properties).find(key => page.properties[key].type === 'title');
  if (titleKey) {
    const titleArr = page.properties[titleKey].title;
    if (titleArr && titleArr.length > 0) {
      return titleArr.map(t => t.plain_text).join("");
    }
  }
  return "Untitled Document";
}

/**
 * Searches for Notion pages by title
 * @param {string} query - The search query
 * @param {string} token - The Notion integration token
 */
export async function searchNotion(query, token) {
  if (!token) throw new Error("Notion token is required for search");
  const notion = new Client({ auth: token });

  try {
    const response = await notion.search({
      query,
      filter: { property: 'object', value: 'page' },
      sort: { direction: 'descending', timestamp: 'last_edited_time' },
      page_size: 10
    });

    return response.results.map(p => {
      const titleKey = Object.keys(p.properties).find(k => p.properties[k].type === 'title');
      const titleStr = titleKey && p.properties[titleKey].title?.length 
        ? p.properties[titleKey].title.map(t => t.plain_text).join("") 
        : "Untitled Page";
        
      return {
        id: p.id,
        title: titleStr
      };
    });
  } catch (err) {
    logger.error(`searchNotion Error [${query}]:`, err);
    throw new Error(`Failed to search Notion: ${err.message}`);
  }
}

/**
 * Creates a new Notion page
 * @param {string} parentPageId - The ID of the parent page or database
 * @param {string} title - The title of the new page
 * @param {string} content - (Optional) Initial markdown/text content
 * @param {string} token - The Notion integration token
 */
export async function createNotionPage(parentPageId, title, content, token) {
  if (!token) throw new Error("Notion token is required for writing");
  const notion = new Client({ auth: token });

  try {
    const response = await notion.pages.create({
      parent: { page_id: parentPageId },
      properties: {
        title: [
          { text: { content: title } }
        ]
      },
      children: content ? [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ text: { content: content } }]
          }
        }
      ] : []
    });

    return { id: response.id, url: response.url };
  } catch (err) {
    logger.error(`createNotionPage Error:`, err);
    throw new Error(`Failed to create Notion page: ${err.message}`);
  }
}

/**
 * Updates an existing Notion page's properties
 * @param {string} pageId - The ID of the page to update
 * @param {object} properties - The properties to update
 * @param {string} token - The Notion integration token
 */
export async function updateNotionPage(pageId, properties, token) {
  if (!token) throw new Error("Notion token is required for writing");
  const notion = new Client({ auth: token });

  try {
    const response = await notion.pages.update({
      page_id: pageId,
      properties: properties
    });

    return { id: response.id, url: response.url };
  } catch (err) {
    logger.error(`updateNotionPage Error:`, err);
    throw new Error(`Failed to update Notion page: ${err.message}`);
  }
}

/**
 * Appends blocks (content) to an existing Notion page
 * @param {string} blockId - The ID of the page or block to append to
 * @param {string} content - The text content to append as a paragraph
 * @param {string} token - The Notion integration token
 */
export async function appendNotionBlocks(blockId, content, token) {
  if (!token) throw new Error("Notion token is required for writing");
  const notion = new Client({ auth: token });

  try {
    const response = await notion.blocks.children.append({
      block_id: blockId,
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ text: { content: content } }]
          }
        }
      ]
    });

    return { success: true, count: response.results.length };
  } catch (err) {
    logger.error(`appendNotionBlocks Error:`, err);
    throw new Error(`Failed to append content to Notion: ${err.message}`);
  }
}
