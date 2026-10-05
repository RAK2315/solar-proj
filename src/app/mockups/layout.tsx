import { IBM_Plex_Sans } from 'next/font/google';

import './mockups.css';

/* The root layout only loads Plex Sans at 400, for agent prose. The settled scale
   in 06-design-system.md needs 500, 600 and 700, so the mockups load their own. */
const sans = IBM_Plex_Sans({
  variable: '--font-mk-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export default function MockupsLayout({ children }: { children: React.ReactNode }) {
  return <div className={sans.variable}>{children}</div>;
}
