import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/hooks/useAuth';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import SOSButton from '@/components/sos/SOSButton';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SafeRoute AI — AI-Powered Safe Route Navigation & SOS System',
  description: 'Production-ready pedestrian safety navigation with real-time AI CCTV surveillance, verified community hazard alerts, and instant emergency SOS dispatch.',
  keywords: ['safe navigation', 'emergency SOS', 'AI safety', 'CCTV monitoring', 'pedestrian security'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className={`${inter.className} min-h-full flex flex-col bg-slate-950 text-slate-100 antialiased selection:bg-blue-500 selection:text-white`}>
        <AuthProvider>
          <Navbar />
          <main className="flex-1 flex flex-col">
            {children}
          </main>
          <Footer />
          {/* Global Persistent Floating SOS Button */}
          <SOSButton variant="floating" />
        </AuthProvider>
      </body>
    </html>
  );
}
