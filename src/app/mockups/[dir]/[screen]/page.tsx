import { notFound } from 'next/navigation';

import { DIRS, SCREEN_IDS, isDir, isScreen } from '../../directions';
import { Mockup } from '../../Mockup';

export function generateStaticParams() {
  return DIRS.flatMap((dir) => SCREEN_IDS.map((screen) => ({ dir, screen })));
}

export default async function MockupPage({ params }: { params: Promise<{ dir: string; screen: string }> }) {
  const { dir, screen } = await params;
  if (!isDir(dir) || !isScreen(screen)) notFound();
  return <Mockup dir={dir} screen={screen} />;
}
