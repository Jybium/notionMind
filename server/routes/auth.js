import express from 'express';
import { 
  GOOGLE_CONFIG, 
  NOTION_CONFIG, 
  exchangeGoogleCode, 
  getGoogleUser, 
  exchangeNotionCode 
} from '../services/auth.service.js';
import { prisma } from '../services/db.service.js';

const router = express.Router();

// ── Google OAuth ─────────────────────────────────────────────────────────────

router.get('/google', (req, res) => {
  const url = `${GOOGLE_CONFIG.authUrl}?client_id=${GOOGLE_CONFIG.clientId}&redirect_uri=${GOOGLE_CONFIG.redirectUri}&response_type=code&scope=${encodeURIComponent(GOOGLE_CONFIG.scopes)}&access_type=offline&prompt=consent`;
  res.redirect(url);
});

router.get('/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect('/?error=no_code');

  try {
    const tokens = await exchangeGoogleCode(code);
    if (tokens.error) throw new Error(tokens.error_description || tokens.error);

    const googleUser = await getGoogleUser(tokens.access_token);
    
    // Find or create user by googleId
    let user = await prisma.user.findUnique({ where: { googleId: googleUser.id } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          googleId: googleUser.id,
          name: googleUser.name,
          email: googleUser.email,
          profileImage: googleUser.picture, // Capturing from Google
          gmailToken: tokens.refresh_token, // Store refresh token
        }
      });
      // Create initial workspace
      await prisma.workspace.create({
        data: { name: 'My Workspace', userId: user.id }
      });
    } else {
      // Update tokens if they came back
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          gmailToken: tokens.refresh_token || user.gmailToken,
          name: googleUser.name,
          profileImage: googleUser.picture, // Update if changed
        }
      });
    }

    // Redirect back to frontend with the userId to set in localStorage
    res.redirect(`http://localhost:5173/?userId=${user.id}`);
  } catch (err) {
    console.error('Google Auth Error:', err);
    res.redirect(`http://localhost:5173/?error=${encodeURIComponent(err.message)}`);
  }
});

// ── Notion OAuth ─────────────────────────────────────────────────────────────

router.get('/notion', (req, res) => {
  const { userId } = req.query; // We need to know which user is connecting
  const url = `${NOTION_CONFIG.authUrl}?client_id=${NOTION_CONFIG.clientId}&redirect_uri=${NOTION_CONFIG.redirectUri}&response_type=code&owner=user&state=${userId}`;
  res.redirect(url);
});

router.get('/notion/callback', async (req, res) => {
  const { code, state: userId } = req.query;
  if (!code) return res.redirect('/?error=no_notion_code');

  try {
    const data = await exchangeNotionCode(code);
    if (data.error) throw new Error(data.error_description || data.error);

    // Find existing workspace by notionId or create new
    const existingWS = await prisma.workspace.findUnique({
      where: { notionId: data.workspace_id }
    });

    if (existingWS) {
      await prisma.workspace.update({
        where: { id: existingWS.id },
        data: {
          name: data.workspace_name || existingWS.name,
          token: data.access_token,
          userId: userId // Ensure it's linked to current user
        }
      });
    } else {
      await prisma.workspace.create({
        data: {
          name: data.workspace_name || 'Notion Workspace',
          token: data.access_token,
          notionId: data.workspace_id,
          userId: userId
        }
      });
    }

    res.redirect(`http://localhost:5173/?notion_connected=true`);
  } catch (err) {
    console.error('Notion Auth Error:', err);
    res.redirect(`http://localhost:5173/?error=${encodeURIComponent(err.message)}`);
  }
});

export default router;
