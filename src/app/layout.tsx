import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';

import { ClockDriver } from './ClockDriver';
import './globals.css';
import './shell.css';

/* Two faces (plan/rework/06-design-system.md §2). IBM Plex Sans for everything,
   IBM Plex Mono for identifiers only. Plex Sans Condensed went with the tracked
   capitals it existed to make fit. */

const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  preload: false,         // identifiers only; the sans is what paints first
});

const plexSans = IBM_Plex_Sans({
  variable: '--font-plex-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SURYA AGENT · Bhadla Solar Park',
  description:
    'Autonomous inspection and triage console for utility-scale solar. ' +
    'It finds the array that is underperforming, sends a drone to verify why, and ' +
    'hands an operator a ranked, deadlined repair plan to approve.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // The font variables go on <html>, NOT <body>. The stylesheet composes them
    // into its own tokens, and a custom property that references another one
    // resolves against the element it is DECLARED on.
    <html
      lang="en"
      className={`${plexMono.variable} ${plexSans.variable}`}
    >
      <body>
        {/* The one rAF loop. Mounted here so it outlives every view switch. */}
        <ClockDriver />
        {children}
      </body>
    </html>
  );
}
