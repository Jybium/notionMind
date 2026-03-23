import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  console.log('Testing database connection...');
  console.log('URL:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
  
  try {
    const userCount = await prisma.user.count();
    console.log('Connection successful!');
    console.log('User count:', userCount);
  } catch (error) {
    console.error('Connection failed:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
