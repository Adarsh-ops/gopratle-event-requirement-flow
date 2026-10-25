import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Eventbrief | Post an event requirement',
  description: 'A guided event requirement flow for planners, performers, and event crew.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
