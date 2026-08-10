import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nutrition Agent Dashboard',
  description: 'Modern AI-powered nutrition dashboard with macro tracking and grocery pricing.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
