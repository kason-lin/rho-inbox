import type { Metadata } from 'next';
import { DM_Mono, DM_Sans, Instrument_Serif } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';

// Free stand-ins for Rho's licensed fonts (see docs/design-notes.md).
const dmSans = DM_Sans({ variable: '--font-dm-sans', subsets: ['latin'], weight: ['400', '500', '600', '700'] });  // ≈ Basier Circle
const dmMono = DM_Mono({ variable: '--font-dm-mono', subsets: ['latin'], weight: ['400', '500'] });
const serif = Instrument_Serif({ variable: '--font-instrument-serif', subsets: ['latin'], weight: '400' });

export const metadata: Metadata = {
  title: 'Rho · Business health prototype',
  description: 'Case-competition prototype: a Business health tab for Rho that sees money owed before it reaches the bank.',
  robots: { index: false, follow: false },   // a demo, not a site to be found in search
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${dmMono.variable} ${serif.variable}`}>
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <Toaster position="bottom-right" />
        {/* Always visible, so nobody mistakes the demo for Rho's real app. */}
        <div className="pointer-events-none fixed bottom-3 left-2.5 z-50 w-[192px] rounded-lg bg-foreground/90 px-3 py-1.5 text-center text-[11px] leading-tight font-medium text-white shadow-sm">
          Hackathon prototype · not affiliated with Rho
          <span className="block font-normal text-white/70">All data is synthetic</span>
        </div>
      </body>
    </html>
  );
}
