import { authProcedures } from './procedures/auth'
import { analyticsProcedures } from './procedures/analytics'
import { dashboardProcedures } from './procedures/dashboard'
import { governanceProcedures } from './procedures/governance'
import { governanceTimelineProcedures } from './procedures/governanceTimeline'
import { historicalProcedures } from './procedures/historical'
import { accountProcedures } from './procedures/account'
import { proposalsProcedures } from './procedures/proposals'
import { upgradesProcedures } from './procedures/upgrades'
import { curationsProcedures } from './procedures/curations'
import { callsProcedures } from './procedures/calls'
import { devnetsProcedures } from './procedures/devnets'
import { clientPriorityProcedures } from './procedures/clientPriority'
import { searchProcedures } from './procedures/search'
import { preferencesProcedures } from './procedures/preferences'
import { exploreProcedures } from './procedures/explore'
import { standardsProcedures } from './procedures/standards'
import { insightsProcedures } from './procedures/insights'
import { toolsProcedures } from './procedures/tools'
import { blogProcedures } from './procedures/blog'
import { videoProcedures } from './procedures/video'
import { githubProcedures } from './procedures/github'
import { feedbackProcedures } from './procedures/feedback'
import { pageCommentProcedures } from './procedures/pageComment'
import { commentVoteProcedures } from './procedures/commentVote'
import { subscriptionsProcedures } from './procedures/subscriptions'

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
  curations: curationsProcedures,
  calls: callsProcedures,
  devnets: devnetsProcedures,
  clientPriority: clientPriorityProcedures,
  search: searchProcedures,
  preferences: preferencesProcedures,
  explore: exploreProcedures,
  standards: standardsProcedures,
  insights: insightsProcedures,
  tools: toolsProcedures,
  blog: blogProcedures,
  video: videoProcedures,
  github: githubProcedures,
  feedback: feedbackProcedures,
  pageComment: pageCommentProcedures,
  commentVote: commentVoteProcedures,
  subscriptions: subscriptionsProcedures,
}
