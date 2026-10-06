/**
 * The landing page: the field in 3D, and the product's argument over it.
 *
 * Its figures are evaluated in src/app/numbers.ts from the physics model and the
 * committed detector output. See src/components/landing/Landing.tsx.
 */

import { Landing } from '@/components/landing/Landing';

export default function Page() {
  return <Landing />;
}
