import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import NetBackground from '@/components/NetBackground';
import { Analytics } from "@vercel/analytics/next";

const montserrat = Montserrat({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://nailcart.vercel.app'),
  title: {
    default: 'NailCart | Premium Nail Art Supplies in Nagpur',
    template: '%s | NailCart',
  },
  description: 'Top-rated destination for Nail Art supplies in Nagpur. Shop Gel Polish, Brushes, UV Lamps, and professional nail accessories at NailCart.',
  keywords: ['Nail Art', 'Nail Art Nagpur', 'Nail Nagpur', 'NailCart', 'Nail Cart', 'Gel Polish', 'Nail Brushes', 'Nail Art Supplies', 'Nagpur Nail Shop'],
  openGraph: {
    title: 'NailCart | Premium Nail Art Supplies',
    description: 'Everything you need for stunning nail art in Nagpur. Gel polishes, tools, and more.',
    siteName: 'NailCart',
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: '/logo.jpg',
        width: 800,
        height: 600,
        alt: 'NailCart Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NailCart | Premium Nail Art Supplies',
    description: 'Top-rated destination for Nail Art supplies in Nagpur.',
    images: ['/logo.jpg'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={montserrat.className}>
        <Providers>
          <NetBackground />
          {children}
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
