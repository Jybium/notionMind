import app from './app.js';
import logger from './services/logger.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`🧠 NotionMind v2 (Modular+Prisma) → http://localhost:${PORT}`);
});
