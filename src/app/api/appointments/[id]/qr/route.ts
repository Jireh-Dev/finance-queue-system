import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import QRCode from 'qrcode';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentId: true,
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Role check: only owner or staff/admin can view QR
    if (session.role === 'STUDENT' || session.role === 'PARENT') {
      if (appointment.userId !== session.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // The QR code encodes strictly the CSPRNG secure token (no plain text PII)
    const qrContent = appointment.qrToken;

    const dataUrl = await QRCode.toDataURL(qrContent, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 320,
      color: {
        dark: '#004B87', // UA Royal Blue
        light: '#FFFFFF', // Crisp White
      },
    });

    return NextResponse.json({
      success: true,
      dataUrl,
      qrToken: appointment.qrToken,
      appointment: {
        id: appointment.id,
        purpose: appointment.purpose,
        appointmentDate: appointment.appointmentDate,
        timeSlot: appointment.timeSlot,
        status: appointment.status,
        queueNumber: appointment.queueNumber,
        studentName: `${appointment.user.firstName} ${appointment.user.lastName}`,
        studentId: appointment.user.studentId,
      },
    });
  } catch (error) {
    console.error('QR generation error:', error);
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 });
  }
}

