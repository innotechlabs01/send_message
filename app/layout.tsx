import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Analytics } from '@vercel/analytics/next';
import { ToastProvider } from '@/components/ui/Toast';
import './globals.css';
import SessionCleanup from '@/components/SessionCleanup';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: {
    default: 'ConSentido — Mensajes con corazón',
    template: '%s | ConSentido',
  },
  description:
    'Envía mensajes personalizados y programados para cumpleaños, aniversarios y momentos especiales. Elige entre cientos de mensajes prediseñados.',
  keywords: ['mensajes programados', 'mensajes de cumpleaños', 'mensajes personalizados', 'ConSentido'],
  authors: [{ name: 'ConSentido' }],
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    siteName: 'ConSentido',
    title: 'ConSentido — Mensajes con corazón',
    description: 'Envía mensajes personalizados y programados para los momentos que importan.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ConSentido — Mensajes con corazón',
    description: 'Envía mensajes personalizados y programados para los momentos que importan.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} antialiased bg-white text-[#333333]`}>
        <SessionCleanup>
          <ToastProvider>
            {children}
          </ToastProvider>
        </SessionCleanup>
        <Analytics />
      </body>
    </html>
  );
}
