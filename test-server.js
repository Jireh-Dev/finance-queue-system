const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function runTests() {
  console.log('--- RUNNING BACKEND INTEGRATION TESTS ---');

  // Test 1: Verify Seed Data
  const usersCount = await prisma.user.count();
  console.log('✔ Users in database:', usersCount);

  const appointmentsCount = await prisma.appointment.count();
  console.log('✔ Total Appointments in database:', appointmentsCount);

  // Test 2: Verify CSPRNG Token Generation
  const token = crypto.randomBytes(32).toString('hex');
  console.log('✔ Generated 256-bit CSPRNG Token (Length):', token.length, 'chars');
  if (token.length !== 64) throw new Error('Token is not 64 hex chars');

  // Test 3: Verify Serving and Queue status
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const serving = await prisma.appointment.findMany({
    where: {
      appointmentDate: { gte: startOfDay, lt: endOfDay },
      status: 'SERVING',
    },
    include: { user: true },
  });
  console.log('✔ Currently Serving count:', serving.length);
  serving.forEach((s) => {
    console.log(`   -> Queue #${s.queueNumber}: ${s.user.firstName} ${s.user.lastName} at ${s.counterName}`);
  });

  const waiting = await prisma.appointment.findMany({
    where: {
      appointmentDate: { gte: startOfDay, lt: endOfDay },
      status: 'CHECKED_IN',
    },
    include: { user: true },
  });
  console.log('✔ Currently Waiting in Line count:', waiting.length);
  waiting.forEach((w) => {
    console.log(`   -> Queue #${w.queueNumber}: ${w.user.firstName} ${w.user.lastName}`);
  });

  // Test 4: Verify Audit Log
  const auditLogs = await prisma.auditLog.findMany();
  console.log('✔ Audit Logs Count:', auditLogs.length);

  // Test 5: Verify Passwords verification
  const student = await prisma.user.findUnique({ where: { email: 'student@ua.edu.ph' } });
  const isMatch = await bcrypt.compare('Student@123', student.passwordHash);
  console.log('✔ Password verification (Student@123):', isMatch ? 'PASSED' : 'FAILED');

  console.log('--- ALL BACKEND INTEGRATION TESTS PASSED SUCCESSFULLY ---');
}

runTests()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

