import type { Metadata } from 'next';
import { DM_Mono, Instrument_Serif, Manrope, Outfit } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';

// Free stand-ins for Rho's licensed fonts (see docs/design-notes.md).
const manrope = Manrope({ variable: '--font-manrope', subsets: ['latin'] });                       // ≈ Basier Circle
const outfit = Outfit({ variable: '--font-outfit', subsets: ['latin'], weight: ['500', '600'] });  // ≈ Degular Display
const dmMono = DM_Mono({ variable: '--font-dm-mono', subsets: ['latin'], weight: ['400', '500'] });
const serif = Instrument_Serif({ variable: '--font-instrument-serif', subsets: ['latin'], weight: '400' });

export const metadata: Metadata = {
  title: 'Rho Inbox · Check-in prototype',
  description: 'Hackathon prototype: one inbox for every Rho product, plus a weekly Check-in with decisions ready to approve.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${outfit.variable} ${dmMono.variable} ${serif.variable}`}>
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
