import { AaEcosystemSection } from '@/components/aa/ecosystem-section';

export const revalidate = 300;

/**
 * Focused view of the account-abstraction ecosystem charts. The same section is
 * embedded on the main /aa dashboard; this route is a direct link to just it.
 */
export default function AaEcosystemDashboard() {
  return <AaEcosystemSection />;
}
