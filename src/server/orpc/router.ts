import { authProcedures } from './procedures/auth'
import { analyticsProcedures } from './procedures/analytics'
import { governanceProcedures } from './procedures/governance'
import { governanceTimelineProcedures } from './procedures/governanceTimeline'
import { historicalProcedures } from './procedures/historical'
import { accountProcedures } from './procedures/account'
import { proposalsProcedures } from './procedures/proposals'
import { upgradesProcedures } from './procedures/upgrades'
import { searchProcedures } from './procedures/search'

export const router = {
  auth: authProcedures,
  analytics: analyticsProcedures,
  governance: governanceProcedures,
  governanceTimeline: governanceTimelineProcedures,
  historical: historicalProcedures,
  account: accountProcedures,
  proposals: proposalsProcedures,
  upgrades: upgradesProcedures,
  search: searchProcedures,
}
