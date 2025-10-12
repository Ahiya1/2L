import { PrismaClient, Status } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Clear existing data
  await prisma.launch.deleteMany()
  await prisma.metrics.deleteMany()
  await prisma.product.deleteMany()

  console.log('Cleared existing data')

  // Create sample products
  const product1 = await prisma.product.create({
    data: {
      name: 'ShipLog',
      description: 'Product launch tracker for indie hackers shipping multiple products simultaneously',
      status: Status.BUILDING,
      launchDate: new Date('2025-11-01'),
      techStack: JSON.stringify(['Next.js', 'React', 'TypeScript', 'Prisma', 'tRPC']),
      metrics: {
        create: {
          signups: 0,
          revenue: 0,
        },
      },
      launches: {
        createMany: {
          data: [
            { platform: 'ProductHunt', launched: false },
            { platform: 'Twitter', launched: false },
            { platform: 'ShowHN', launched: false },
            { platform: 'Reddit', launched: false },
            { platform: 'IndieHackers', launched: false },
            { platform: 'Newsletter', launched: false },
            { platform: 'Other', launched: false },
          ],
        },
      },
    },
  })

  const product2 = await prisma.product.create({
    data: {
      name: 'TaskFlow',
      description: 'Simple task management for solo founders who need to stay organized',
      status: Status.SHIPPED,
      launchDate: new Date('2025-09-15'),
      techStack: JSON.stringify(['Vue', 'Supabase', 'TypeScript']),
      metrics: {
        create: {
          signups: 145,
          revenue: 299.99,
        },
      },
      launches: {
        createMany: {
          data: [
            {
              platform: 'ProductHunt',
              launched: true,
              launchDate: new Date('2025-09-15'),
              url: 'https://producthunt.com/posts/taskflow',
            },
            {
              platform: 'Twitter',
              launched: true,
              launchDate: new Date('2025-09-16'),
              url: 'https://twitter.com/user/status/123',
            },
            { platform: 'ShowHN', launched: false },
            { platform: 'Reddit', launched: false },
            { platform: 'IndieHackers', launched: false },
            { platform: 'Newsletter', launched: false },
            { platform: 'Other', launched: false },
          ],
        },
      },
    },
  })

  const product3 = await prisma.product.create({
    data: {
      name: 'CodeSnip',
      description: 'Beautiful code snippet manager with syntax highlighting',
      status: Status.VALIDATED,
      launchDate: new Date('2025-07-10'),
      techStack: JSON.stringify(['React', 'Node.js', 'MongoDB']),
      metrics: {
        create: {
          signups: 523,
          revenue: 1249.50,
        },
      },
      launches: {
        createMany: {
          data: [
            {
              platform: 'ProductHunt',
              launched: true,
              launchDate: new Date('2025-07-10'),
              url: 'https://producthunt.com/posts/codesnip',
            },
            {
              platform: 'Twitter',
              launched: true,
              launchDate: new Date('2025-07-11'),
              url: 'https://twitter.com/user/status/456',
            },
            {
              platform: 'ShowHN',
              launched: true,
              launchDate: new Date('2025-07-12'),
              url: 'https://news.ycombinator.com/item?id=123',
            },
            {
              platform: 'Reddit',
              launched: true,
              launchDate: new Date('2025-07-13'),
              url: 'https://reddit.com/r/webdev/comments/123',
            },
            { platform: 'IndieHackers', launched: false },
            { platform: 'Newsletter', launched: false },
            { platform: 'Other', launched: false },
          ],
        },
      },
    },
  })

  const product4 = await prisma.product.create({
    data: {
      name: 'AIWriter',
      description: 'AI-powered content generation tool for bloggers and marketers',
      status: Status.IDEA,
      techStack: JSON.stringify(['Next.js', 'OpenAI', 'PostgreSQL']),
      metrics: {
        create: {
          signups: 0,
          revenue: 0,
        },
      },
      launches: {
        createMany: {
          data: [
            { platform: 'ProductHunt', launched: false },
            { platform: 'Twitter', launched: false },
            { platform: 'ShowHN', launched: false },
            { platform: 'Reddit', launched: false },
            { platform: 'IndieHackers', launched: false },
            { platform: 'Newsletter', launched: false },
            { platform: 'Other', launched: false },
          ],
        },
      },
    },
  })

  const product5 = await prisma.product.create({
    data: {
      name: 'AnalyticsPro',
      description: 'Privacy-focused analytics alternative to Google Analytics',
      status: Status.ARCHIVED,
      launchDate: new Date('2024-12-01'),
      techStack: JSON.stringify(['Python', 'FastAPI', 'ClickHouse']),
      metrics: {
        create: {
          signups: 89,
          revenue: 0,
        },
      },
      launches: {
        createMany: {
          data: [
            {
              platform: 'ProductHunt',
              launched: true,
              launchDate: new Date('2024-12-01'),
              url: 'https://producthunt.com/posts/analyticspro',
            },
            { platform: 'Twitter', launched: false },
            { platform: 'ShowHN', launched: false },
            { platform: 'Reddit', launched: false },
            { platform: 'IndieHackers', launched: false },
            { platform: 'Newsletter', launched: false },
            { platform: 'Other', launched: false },
          ],
        },
      },
    },
  })

  console.log('Seed completed:', {
    product1: product1.name,
    product2: product2.name,
    product3: product3.name,
    product4: product4.name,
    product5: product5.name,
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
