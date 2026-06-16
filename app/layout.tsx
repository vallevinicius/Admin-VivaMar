import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/toast-provider';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata: Metadata = {
  title: 'Pousada Sancho | Channel Manager',
  description: 'MVP de channel manager para prevenção de overbooking em pousadas.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var e=document.documentElement;var t=localStorage.getItem('theme');var n=t==='dark'||t==='light'?t:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');e.classList.remove('light','dark');e.classList.add(n);e.style.colorScheme=n;}catch(_){}})();`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <ToastProvider>
          <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
            <ThemeToggle />
          </div>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
