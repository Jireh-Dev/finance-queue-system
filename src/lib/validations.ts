import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email address format'),
  password: z
    .string()
    .min(1, 'Password cannot be empty'),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
});

// Strong Password Schema: min 8 chars, at least one uppercase letter, at least one special character
export const strongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(100, 'Password is too long')
  .refine((val) => /[A-Z]/.test(val) && /[^A-Za-z0-9]/.test(val), {
    message: 'Password must contain at least one uppercase letter and one special character.',
  });

export const resetPasswordSchema = z.object({
  token: z
    .string()
    .trim()
    .min(10, 'Reset token is missing or invalid'),
  password: strongPasswordSchema,
});

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please provide a valid institutional or personal email'),
  password: strongPasswordSchema,
  role: z.enum(['STUDENT', 'PARENT', 'STAFF', 'ADMIN', 'KIOSK']).default('STUDENT'),
  firstName: z
    .string()
    .trim()
    .min(1, 'First name cannot be empty')
    .max(50, 'First name is too long'),
  lastName: z
    .string()
    .trim()
    .min(1, 'Last name cannot be empty')
    .max(50, 'Last name is too long'),
  phone: z.string().trim().optional().nullable(),
  studentId: z.string().trim().optional().nullable(),
});

export const createAppointmentSchema = z.object({
  purpose: z
    .string()
    .trim()
    .min(3, 'Purpose must be at least 3 characters'),
  appointmentDate: z
    .string()
    .refine((dateStr) => !isNaN(Date.parse(dateStr)), {
      message: 'Invalid appointment date format',
    }),
  timeSlot: z
    .string()
    .trim()
    .min(5, 'Invalid time slot'),
  remarks: z.string().trim().max(500, 'Remarks cannot exceed 500 characters').optional().nullable(),
});

export const updateAppointmentSchema = z.object({
  action: z.enum(['CANCEL', 'RESCHEDULE']).optional(),
  appointmentDate: z
    .string()
    .refine((dateStr) => !dateStr || !isNaN(Date.parse(dateStr)), {
      message: 'Invalid appointment date format',
    })
    .optional(),
  timeSlot: z.string().trim().optional(),
  remarks: z.string().trim().max(500).optional().nullable(),
  counterName: z.string().trim().optional().nullable(),
  status: z
    .enum([
      'PENDING',
      'CONFIRMED',
      'CHECKED_IN',
      'SERVING',
      'COMPLETED',
      'CANCELLED',
      'MISSED',
    ])
    .optional(),
});

export const queueScanSchema = z.object({
  token: z
    .string()
    .trim()
    .min(10, 'Invalid token length'),
  counterName: z.string().trim().optional().nullable(),
});

export const queueAdvanceSchema = z.object({
  action: z.enum(['CALL_NEXT', 'START_SERVING', 'COMPLETE', 'MARK_MISSED', 'REVERT_TO_WAITING']),
  appointmentId: z.string().trim().optional(),
  counterName: z.string().trim().optional(),
  remarks: z.string().trim().max(500).optional().nullable(),
});

export function formatZodError(error: z.ZodError) {
  const issues = error.issues.map((i) => ({
    field: i.path.join('.'),
    message: i.message,
  }));
  return {
    error: issues[0]?.message || 'Validation error',
    details: issues,
  };
}
