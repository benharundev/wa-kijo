import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/providers/theme-provider';
import { QueryProvider } from '@/providers/query-provider';
import { MotionProvider } from '@/providers/motion-provider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: "wa'kijo — Multi-tenant B2B SaaS Platform",
    template: "%s | wa'kijo",
  },
  description:
    'Production-grade NestJS + Next.js SaaS boilerplate with multi-tenancy, billing, and WhatsApp messaging built in.',
  metadataBase: new URL('https://wakijo.io'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <MotionProvider>{children}</MotionProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
