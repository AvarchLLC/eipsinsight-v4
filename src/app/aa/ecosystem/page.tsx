import { AaEcosystemSection } from '@/components/aa/ecosystem-section';
import { AaTimeframeProvider } from '../_timeframe';

export const revalidate = 300;

/**
 * Focused view of the account-abstraction ecosystem charts. The same section is
 * embedded on the main /aa dashboard; this route is a direct link to just it, with
 * its own page-level timeframe control (AaEcosystemSection reads it via context).
 */
export default function AaEcosystemDashboard() {
  return (
    <AaTimeframeProvider>
      <AaEcosystemSection />
    </AaTimeframeProvider>
  );
}
