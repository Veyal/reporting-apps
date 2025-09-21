const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedApiCredentials() {
  try {
    // Check if Olsera credentials already exist
    const existing = await prisma.apiCredentials.findUnique({
      where: { provider: 'olsera' }
    });

    if (existing) {
      console.log('Olsera API credentials already exist');
      return;
    }

    // Create Olsera API credentials
    const credentials = await prisma.apiCredentials.create({
      data: {
        provider: 'olsera',
        appId: 'gP3lntQHc8EiFML3TgJL',
        secretKey: 'cH7hjmkWQP0LlzIhLgkyaAhEKckRY57k',
        baseUrl: 'https://api-open.olsera.co.id/api/open-api/v1',
        active: true
      }
    });

    console.log('Olsera API credentials created:', credentials.provider);
  } catch (error) {
    console.error('Error seeding API credentials:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedApiCredentials();