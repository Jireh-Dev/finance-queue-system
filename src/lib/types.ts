export type UserRole = 'STUDENT' | 'PARENT' | 'STAFF' | 'ADMIN';

export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'SERVING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'MISSED';

export interface UserSession {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  studentId?: string | null;
}

export interface AppointmentWithUser {
  id: string;
  userId: string;
  purpose: string;
  appointmentDate: string | Date;
  timeSlot: string;
  status: AppointmentStatus;
  qrToken: string;
  queueNumber?: number | null;
  counterName?: string | null;
  remarks?: string | null;
  checkInTime?: string | Date | null;
  servedTime?: string | Date | null;
  completedTime?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    studentId?: string | null;
    role: string;
  };
}

export interface QueueSummary {
  nowServing: AppointmentWithUser | null;
  servingList: AppointmentWithUser[];
  waitingQueue: AppointmentWithUser[];
  completedTodayCount: number;
  totalWaitingCount: number;
  estimatedWaitMinutes: number;
}

