const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Database (Admin, Cashiers, Kiosk) ---');

  // Task 2: Production Guard for Database Seeding (deleteMany)
  // Prevent accidental database wipes on production if `npm run db:seed` is run against live database
  const isProduction = process.env.NODE_ENV === 'production';
  const allowProdSeed = process.env.ALLOW_PROD_SEED === 'true';

  if (isProduction && !allowProdSeed) {
    throw new Error(
      'FATAL: Database seeding with deleteMany() is blocked in production. ' +
      'To force seeding on production, explicitly set ALLOW_PROD_SEED=true in the environment.'
    );
  }

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.user.deleteMany();

  // Task 1: Secure Seed Credentials via Environment Variables
  // Read credentials from environment variables with local development fallbacks only
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@ua.edu.ph').toLowerCase().trim();
  const adminPasswordRaw = process.env.ADMIN_PASSWORD || process.env.INITIAL_ADMIN_PASSWORD || 'Admin@123';

  const cashierEmail = (process.env.CASHIER_EMAIL || 'cashier@ua.edu.ph').toLowerCase().trim();
  const cashierPasswordRaw = process.env.CASHIER_PASSWORD || process.env.INITIAL_CASHIER_PASSWORD || 'Cashier@123';

  const cashier2Email = (process.env.CASHIER2_EMAIL || 'cashier2@ua.edu.ph').toLowerCase().trim();
  const cashier2PasswordRaw = process.env.CASHIER2_PASSWORD || cashierPasswordRaw;

  const kioskEmail = (process.env.KIOSK_EMAIL || 'kiosk@ua.edu.ph').toLowerCase().trim();
  const kioskPasswordRaw = process.env.KIOSK_PASSWORD || process.env.INITIAL_KIOSK_PASSWORD || 'Kiosk@123';

  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash(adminPasswordRaw, salt);
  const cashierPassword = await bcrypt.hash(cashierPasswordRaw, salt);
  const cashier2Password = await bcrypt.hash(cashier2PasswordRaw, salt);
  const kioskPassword = await bcrypt.hash(kioskPasswordRaw, salt);

  // 1. Create Administrator
  await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash: adminPassword,
      role: 'ADMIN',
      firstName: 'Finance',
      lastName: 'Director',
      phone: '+63 917 123 4567',
    },
  });

  // 2. Create Cashier 1
  await prisma.user.create({
    data: {
      email: cashierEmail,
      passwordHash: cashierPassword,
      role: 'STAFF',
      firstName: 'Elena',
      lastName: 'Reyes',
      phone: '+63 918 987 6543',
    },
  });

  // 3. Create Cashier 2
  await prisma.user.create({
    data: {
      email: cashier2Email,
      passwordHash: cashier2Password,
      role: 'STAFF',
      firstName: 'Mark',
      lastName: 'Santos',
      phone: '+63 918 987 6544',
    },
  });

  // 4. Create Dedicated Door Kiosk Terminal
  await prisma.user.create({
    data: {
      email: kioskEmail,
      passwordHash: kioskPassword,
      role: 'KIOSK',
      firstName: 'Door',
      lastName: 'Kiosk Terminal',
      phone: '+63 918 000 0001',
    },
  });

  console.log('Seeding finished successfully!');
  console.log(`System accounts provisioned: ${adminEmail}, ${cashierEmail}, ${cashier2Email}, ${kioskEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });