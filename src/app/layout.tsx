import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Condensed } from 'next/font/google';

import { ClockDriver } from './ClockDriver';
import './globals.css';

/* Two families, three roles (plan/04 §2). Both were drawn for technical
   interfaces, which is the point. Mono carries every number and ID; Condensed
   carries labels and chrome; Sans appears ONLY in agent reasoning prose. */

const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  preload: true,          // above the fold everywhere
});

const plexCond = IBM_Plex_Sans_Condensed({
  variable: '--font-plex-cond',
  subsets: ['latin'],
  weight: ['600'],
  display: 'swap',
});

const plexSans = IBM_Plex_Sans({
  variable: '--font-plex-sans',
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SURYA AGENT — Bhadla Solar Park',
  description:
    'Autonomous inspection and triage console for utility-scale solar. ' +
    'Telemetry anomaly to deadlined work order in 90 seconds, gated on a human.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${plexMono.variable} ${plexCond.variable} ${plexSans.variable}`}>
        {/* The one rAF loop. Mounted here so it outlives every view switch. */}
        <ClockDriver />
        {children}
      </body>
    </html>
  );
}
