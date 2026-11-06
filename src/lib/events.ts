import { EventEmitter } from 'events';

// Global singleton event emitter across Next.js API routes in the same Node process
const globalForEvents = globalThis as unknown as {
  queueEvents: EventEmitter | undefined;
};

export const queueEvents = globalForEvents.queueEvents ?? new EventEmitter();

// Allow multiple SSE clients
queueEvents.setMaxListeners(200);

if (process.env.NODE_ENV !== 'production') {
  globalForEvents.queueEvents = queueEvents;
}

export function broadcastQueueUpdate(event: {
  action: string;
  queueNumber?: number | null;
  appointmentId?: string;
  timestamp?: string;
}) {
  try {
    queueEvents.emit('queue-change', {
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to broadcast queue event:', err);
  }
}

