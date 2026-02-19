import { authProcedures } from './procedures/auth'
import { analyticsProcedures } from './procedures/analytics'
import { dashboardProcedures } from './procedures/dashboard'
import { governanceProcedures } from './procedures/governance'
import { governanceTimelineProcedures } from './procedures/governanceTimeline'
import { historicalProcedures } from './procedures/historical'
import { accountProcedures } from './procedures/account'
import { proposalsProcedures } from './procedures/proposals'
import { upgradesProcedures } from './procedures/upgrades'
import { searchProcedures } from './procedures/search'
import { preferencesProcedures } from './procedures/preferences'
import { exploreProcedures } from './procedures/explore'
import { standardsProcedures } from './procedures/standards'
import { insightsProcedures } from './procedures/insights'
import { toolsProcedures } from './procedures/tools'
import { blogProcedures } from './procedures/blog'

export const router = {
  auth: authProcedures,
  analytics: analyticsProcedures,
  dashboard: dashboardProcedures,
  governance: governanceProcedures,
  governanceTimeline: governanceTimelineProcedures,
  historical: historicalProcedures,
  account: accountProcedures,
  proposals: proposalsProcedures,
  upgrades: upgradesProcedures,
  search: searchProcedures,
  preferences: preferencesProcedures,
  explore: exploreProcedures,
  standards: standardsProcedures,
  insights: insightsProcedures,
  tools: toolsProcedures,
  blog: blogProcedures,
}
