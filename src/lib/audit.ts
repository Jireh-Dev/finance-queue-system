import prisma from './db';

interface AuditParams {
  userId?: string | null;
  action: string;
  details: Record<string, any> | string;
  ipAddress?: string | null;
}

export async function createAuditLog({
  userId,
  action,
  details,
  ipAddress,
}: AuditParams) {
  try {
    const detailsString =
      typeof details === 'string' ? details : JSON.stringify(details);

    return await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        details: detailsString,
        ipAddress: ipAddress || '127.0.0.1',
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
    return null;
  }
}

