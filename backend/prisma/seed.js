const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      name: 'System Administrator',
      passwordHash: adminPassword,
      role: 'ADMIN'
    }
  });

  console.log('✅ Admin user created:', admin.username);

  // Create test user
  const userPassword = await bcrypt.hash('User123!', 12);
  const user = await prisma.user.upsert({
    where: { username: 'user' },
    update: {},
    create: {
      username: 'user',
      name: 'Test User',
      passwordHash: userPassword,
      role: 'USER'
    }
  });

  console.log('✅ Test user created:', user.username);

  // Create photo categories
  const photoCategories = [
    // Opening report categories
    { code: 'OPENING_ENTRANCE', name: 'Entrance', description: 'Front entrance and exterior', reportType: 'OPENING', minRequired: 1, maxAllowed: 3, order: 1 },
    { code: 'OPENING_INTERIOR', name: 'Interior', description: 'Main interior areas', reportType: 'OPENING', minRequired: 2, maxAllowed: 5, order: 2 },
    { code: 'OPENING_EQUIPMENT', name: 'Equipment', description: 'Key equipment status', reportType: 'OPENING', minRequired: 1, maxAllowed: 3, order: 3 },
    { code: 'OPENING_SAFETY', name: 'Safety', description: 'Safety equipment and exits', reportType: 'OPENING', minRequired: 1, maxAllowed: 2, order: 4 },

    // Closing report categories
    { code: 'CLOSING_CLEANUP', name: 'Cleanup', description: 'Cleaning and tidying', reportType: 'CLOSING', minRequired: 1, maxAllowed: 3, order: 1 },
    { code: 'CLOSING_SECURITY', name: 'Security', description: 'Locks, alarms, and security', reportType: 'CLOSING', minRequired: 1, maxAllowed: 2, order: 2 },
    { code: 'CLOSING_EQUIPMENT', name: 'Equipment', description: 'Equipment shutdown and status', reportType: 'CLOSING', minRequired: 1, maxAllowed: 3, order: 3 },
    { code: 'CLOSING_FINAL', name: 'Final Check', description: 'Final walkthrough', reportType: 'CLOSING', minRequired: 1, maxAllowed: 2, order: 4 },

    // Problem report categories
    { code: 'PROBLEM_ISSUE', name: 'Issue', description: 'Main problem documentation', reportType: 'PROBLEM', minRequired: 1, maxAllowed: 5, order: 1 },
    { code: 'PROBLEM_CONTEXT', name: 'Context', description: 'Surrounding area and context', reportType: 'PROBLEM', minRequired: 0, maxAllowed: 3, order: 2 },
    { code: 'PROBLEM_DAMAGE', name: 'Damage', description: 'Any damage or impact', reportType: 'PROBLEM', minRequired: 0, maxAllowed: 3, order: 3 },

    // Stock report categories
    { code: 'STOCK_OPENING', name: 'Opening Stock', description: 'Opening inventory count', reportType: 'STOCK', minRequired: 1, maxAllowed: 2, order: 1 },
    { code: 'STOCK_CLOSING', name: 'Closing Stock', description: 'Closing inventory count', reportType: 'STOCK', minRequired: 1, maxAllowed: 2, order: 2 },
    { code: 'STOCK_DOCUMENTS', name: 'Documents', description: 'Receipts and documentation', reportType: 'STOCK', minRequired: 0, maxAllowed: 3, order: 3 }
  ];

  for (const category of photoCategories) {
    await prisma.photoCategory.upsert({
      where: { code: category.code },
      update: category,
      create: category
    });
  }

  console.log('✅ Photo categories created');

  // Create checklist templates
  const checklistTemplates = [
    // Opening checklists
    { type: 'OPENING', title: 'Unlock all doors and check security', order: 1, required: true },
    { type: 'OPENING', title: 'Turn on all lights and check functionality', order: 2, required: true },
    { type: 'OPENING', title: 'Check temperature and HVAC systems', order: 3, required: true },
    { type: 'OPENING', title: 'Inspect equipment for damage or issues', order: 4, required: true },
    { type: 'OPENING', title: 'Check safety equipment (fire extinguishers, exits)', order: 5, required: true },
    { type: 'OPENING', title: 'Verify all systems are operational', order: 6, required: true },
    { type: 'OPENING', title: 'Clean and prepare work areas', order: 7, required: false },
    { type: 'OPENING', title: 'Check inventory levels', order: 8, required: false },

    // Closing checklists
    { type: 'CLOSING', title: 'Clean all work areas and equipment', order: 1, required: true },
    { type: 'CLOSING', title: 'Turn off all non-essential equipment', order: 2, required: true },
    { type: 'CLOSING', title: 'Secure all doors and windows', order: 3, required: true },
    { type: 'CLOSING', title: 'Set security alarms and systems', order: 4, required: true },
    { type: 'CLOSING', title: 'Complete end-of-day inventory count', order: 5, required: true },
    { type: 'CLOSING', title: 'Lock all storage areas', order: 6, required: true },
    { type: 'CLOSING', title: 'Turn off lights and HVAC', order: 7, required: true },
    { type: 'CLOSING', title: 'Final security walkthrough', order: 8, required: true },
    { type: 'CLOSING', title: 'Update daily logs and records', order: 9, required: false }
  ];

  for (const template of checklistTemplates) {
    await prisma.checklistTemplate.upsert({
      where: { 
        id: `${template.type}-${template.order}`
      },
      update: template,
      create: {
        id: `${template.type}-${template.order}`,
        ...template
      }
    });
  }

  console.log('✅ Checklist templates created');

  // Create sample reports
  const sampleReports = [
    {
      type: 'OPENING',
      title: 'Morning Opening - Store Setup',
      description: 'Daily opening procedures completed',
      status: 'SUBMITTED',
      userId: user.id,
      submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
    },
    {
      type: 'CLOSING',
      title: 'Evening Closing - End of Day',
      description: 'Daily closing procedures completed',
      status: 'SUBMITTED',
      userId: user.id,
      submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
    },
    {
      type: 'PROBLEM',
      title: 'Broken Equipment Issue',
      description: 'Cash register is not functioning properly, needs immediate attention',
      status: 'SUBMITTED',
      userId: user.id,
      submittedAt: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
    },
    {
      type: 'STOCK',
      title: 'Daily Stock Count',
      description: 'Regular inventory count for the day',
      status: 'DRAFT',
      userId: user.id
    }
  ];

  for (const reportData of sampleReports) {
    const report = await prisma.report.create({
      data: reportData
    });

    // Add checklist items for opening/closing reports
    if (report.type === 'OPENING' || report.type === 'CLOSING') {
      const templates = await prisma.checklistTemplate.findMany({
        where: { type: report.type },
        orderBy: { order: 'asc' }
      });

      for (const template of templates) {
        await prisma.reportChecklist.create({
          data: {
            reportId: report.id,
            templateId: template.id,
            completed: Math.random() > 0.3 // Random completion for demo
          }
        });
      }
    }

    // Add stock data for stock report
    if (report.type === 'STOCK') {
      await prisma.stockReport.create({
        data: {
          reportId: report.id,
          stockDate: report.createdAt // Use the same date as the report creation
        }
      });
    }
  }

  console.log('✅ Sample reports created');

  console.log('🎉 Database seed completed successfully!');
  console.log('\n📋 Login credentials:');
  console.log('Admin: username=admin, password=Admin123!');
  console.log('User: username=user, password=User123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
