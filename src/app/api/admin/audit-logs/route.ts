import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'STAFF')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const filter = searchParams.get('filter'); // 'failed_qr' or 'all'

    const where: any = {};

    if (filter === 'failed_qr') {
      where.action = 'QR_INVALID';
    } else if (action && action !== 'ALL') {
      where.action = action;
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const parsedLogs = logs.map((log) => {
      let parsedDetails = log.details;
      try {
        parsedDetails = JSON.parse(log.details);
      } catch (e) {
        // Keep as string if not JSON
      }
      return {
        ...log,
        details: parsedDetails,
      };
    });

    return NextResponse.json({ logs: parsedLogs });
  } catch (error) {
    console.error('Fetch audit logs error:', error);
    return NextResponse.json({ error: 'Failed to retrieve audit logs' }, { status: 500 });
  }
}

