import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Circuit Sandbox',
  description: '3D browser-based electronics simulator — ngspice + avr8js + React Three Fiber',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden">
        {children}
      </body>
    </html>
  );
}
