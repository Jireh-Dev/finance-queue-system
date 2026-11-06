import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'University of the Assumption — Finance Office QR Appointment & Queue System',
  description:
    'Official Finance Office Appointment and Real-Time Queue Management System for Students and Parents of the University of the Assumption, Pampanga.',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/ua-logo.png', type: 'image/png' },
    ],
    shortcut: '/ua-logo.png',
    apple: '/ua-logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="icon" href="/ua-logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/ua-logo.png" />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-800 antialiased selection:bg-ua-blue selection:text-white">
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
