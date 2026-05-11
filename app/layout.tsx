import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/toast-provider';

export const metadata: Metadata = {
  title: 'Pousada Sancho | Channel Manager',
  description: 'MVP de channel manager para prevenção de overbooking em pousadas.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
