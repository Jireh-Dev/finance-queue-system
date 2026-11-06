const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Database (Admin, 2 Cashiers, Kiosk Only) ---');

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.user.deleteMany();

  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash('Admin@123', salt);
  const cashierPassword = await bcrypt.hash('Cashier@123', salt);
  const kioskPassword = await bcrypt.hash('Kiosk@123', salt);

  // 1. Create Administrator
  await prisma.user.create({
    data: {
      email: 'admin@ua.edu.ph',
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
      email: 'cashier@ua.edu.ph',
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
      email: 'cashier2@ua.edu.ph',
      passwordHash: cashierPassword,
      role: 'STAFF',
      firstName: 'Mark',
      lastName: 'Santos',
      phone: '+63 918 987 6544',
    },
  });

  // 4. Create Dedicated Door Kiosk Terminal
  await prisma.user.create({
    data: {
      email: 'kiosk@ua.edu.ph',
      passwordHash: kioskPassword,
      role: 'KIOSK',
      firstName: 'Door',
      lastName: 'Kiosk Terminal',
      phone: '+63 918 000 0001',
    },
  });

  console.log('Seeding finished successfully!');
  console.log('System Credentials:');
  console.log('- Admin:    admin@ua.edu.ph    / Admin@123');
  console.log('- Cashier 1: cashier@ua.edu.ph   / Cashier@123');
  console.log('- Cashier 2: cashier2@ua.edu.ph  / Cashier@123');
  console.log('- Kiosk:    kiosk@ua.edu.ph    / Kiosk@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });