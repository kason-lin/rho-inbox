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
  robots: { index: false, follow: false },   // a demo, not a site to be found in search
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${outfit.variable} ${dmMono.variable} ${serif.variable}`}>
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <Toaster position="bottom-right" />
        {/* Always visible, so nobody mistakes the demo for Rho's real app. */}
        <div className="pointer-events-none fixed bottom-3 left-3 z-50 w-[216px] rounded-lg bg-foreground/90 px-3 py-1.5 text-center text-[11px] leading-tight font-medium text-white shadow-sm">
          Hackathon prototype · not affiliated with Rho
          <span className="block font-normal text-white/70">All data is synthetic</span>
        </div>
      </body>
    </html>
  );
}
