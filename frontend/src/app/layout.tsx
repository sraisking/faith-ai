import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Faith AI | Ask Krishna, Bible, Quran',
  description: 'An AI platform for finding moral and ethical guidance through religious texts. Ask Krishna, the Bible, or the Quran.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
