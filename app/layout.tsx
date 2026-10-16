import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vino — Couple Wine Tasting & Cellar Journal',
  description: 'Collaborative wine journal for couples. Scan bottles, rate wines, track prices and where to buy online.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Vino Journal',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#771b30',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-stone-950 text-stone-100 antialiased selection:bg-wine-600 selection:text-white pb-24 min-h-screen">
        <main className="max-w-md mx-auto min-h-screen relative flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
