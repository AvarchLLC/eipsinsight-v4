# EIPs & Network Upgrades | September 2026

Protocol meetings, Glamsterdam's run to the Sepolia line, Frames taking the Hegota headline, and EIP coordination.

If August was when Glamsterdam started shipping, September was when the clock started ticking.

The whole month bent toward one date. Glamsterdam locked Sepolia to October 6, set a hard client-release cutoff of September 29, and turned the fork from a plan into a countdown. On the next track, Hegota got its lead act: EIP-8141 (Frames) was confirmed as the headliner, and days later the first Frames feature devnet went live. The work behind all of it stayed deliberately in the open, carried by the @ECHInstitute, @EIPsInsight, EIP Editors, proposal authors, client teams, spec testers, and a wide bench of contributors who kept the decisions legible as they landed.

What follows is a record of the coordination work across September that kept Ethereum's protocol process moving to schedule.

## Protocol Meetings Highlights

The community ran 27 public sessions in September across execution, consensus, testing, standards, networking, account abstraction, and research. The headline from each series:

| Meeting Series | Total Meetings Organized | Meeting Highlights |
|---|---|---|
| AllCoreDevs Execution (ACDE) | 2 | Confirmed **EIP-8141 (Frames) as the Hegota headliner** (#245, Sep 10) and ran the CFI pass on top-ranked EIPs with final DFI calls on the delayed set; deferred EIP-8253; drove the Sepolia countdown at #246, holding the October 6 fork and the September 29 client-release deadline. |
| AllCoreDevs Consensus (ACDC) | 2 | Shipped consensus-specs beta.0 (#186); at #187 locked Sepolia to October 6 with a hard September 29 release cutoff, confirmed QUIC enabled by default with Mplex deprecation deferred, slotted Hoodi for roughly October 27, PFI'd EIP-8411, CFI'd EIP-8015, cut EIP-8365 to a deposit-guard-only scope, and tabled the issuance-reduction EIP for a broader process. |
| AllCoreDevs Testing (ACDT) | 4 | Carried devnet-11 to launch, then moved the whole fleet toward Sepolia: frozen test releases including EIP-8037, EIP-8253 deferred, Snap2 shadow forks staged on Sepolia ahead of mainnet, and the September 29 release deadline held across clients for the October 6 fork (epoch 353024). |
| ACDT CL Breakouts | 4 | Settled a run of ePBS/Gloas details: closed the bid-gas-limit PR as unneeded in CL rules, set clients to count invalid equivocations, deferred the GetHead viable-payload filter until after Gloas mainnet, landed a builder-payment edge-case fix before Hoodi, and confirmed Mplex deprecation before the Gloas mainnet upgrade. |
| FOCIL Breakout | 3 | Pushed toward first metal: cut spec revisions (#41–43), aimed focil-devnet-0 at the week of September 29, began the FOCIL + Frames execution-spec work, and opened max-verify-gas benchmarking and VOPS use cases. |
| Post-Quantum Transaction Signatures (PQTS) | 3 | Momentum behind hash-based and STARK-aggregation paths: PQ1 hardware-wallet consumer release eyed for Q4 2026, STARK signature-aggregation experiments on a public testnet, and testnet v0.3 targeting first end-to-end EIP-8288 aggregation with Nethermind or ethrex. |
| Account Abstraction (Frames) | 3 | The month's native-AA story: Frame Transaction Breakouts #3–5 drove **frames-devnet-0** from "targeting launch" to live, exercising EIP-8141 on a real network, and worked the Frames Glamsterdam/Hegota spec alongside the FOCIL interaction. |
| RPC Standards | 2 | Kept execution-apis moving: approved removing error code -39001 (#875, with Geth and Nethermind signing off on call) and held eSimulate V1 error categorization steady, deferring breaking changes to eSimulate V2. |
| zkEVM Breakout | 1 | Refreshed EIP-8025 toward CFI, targeting CL integration on a Gloas devnet, and worked through client decisions on the stateless path. |
| P2P Networking | 1 | Looked past Glamsterdam: framed Hegota as tentatively Q3/Q4 2027, set EIP-8411 as a PFI target there, and reviewed ETHP2P broadcast work. |
| Encrypt the Mempool (ETM) | 1 | Moved the call cadence from bi-weekly to monthly, and advanced the classical-vs-post-quantum threshold decisions that gate the design. |
| EIPIP | 1 | EIPIP #130 cleared open Calls for Input, tightened the editorial process (Unicode Technical Standards links, associate-editor steps), and hosted an EIPsInsight demo of the searchable call archive and PR board. |

Three threads ran through the month:

- **Glamsterdam became a countdown.** October 6 for Sepolia, a hard September 29 release cutoff, QUIC on by default, Hoodi penciled for late October, and mainnet still pointed at early December.
- **Frames graduated.** EIP-8141 became the Hegota headliner and, within the same fortnight, shipped its first feature devnet, moving native account abstraction from spec to running code.
- **The post-Glamsterdam tracks firmed up.** FOCIL, post-quantum signatures, zkEVM, ePBS, and RPC each took concrete steps, shaping what comes after the fork.

Every session stays open to contributors who could not join live. Recaps, recordings, decisions, and breakout notes land in the @ECHInstitute Discord right after each call, and the full schedule of recent and upcoming calls (breakouts included) is tracked in one place.

Resources: eipsinsight.com/calls · eipsinsight.com/decisions

## Upgrade Communications

**General Upgrade Dashboards:** The Glamsterdam and Hegota dashboards, the Upgrade Directory, stage-transition charts, the per-upgrade timeline with downloadable data, and in-upgrade devnet tracking all continued through the month: eipsinsight.com/upgrade · eipsinsight.com/upgrade/eips

**New this month:**

- **Live EIP-8141 Frames devnet tracking.** With frames-devnet-0 going live, the Account Abstraction hub now reads the devnet RPC directly, charting frame-transaction throughput, native-AA validation cost, signature-scheme economics, and a post-quantum watch: eipsinsight.com/aa/eip-8141
- **Advanced Account Abstraction analytics** with in-chart datazoom, so any series can be scoped to a time window: eipsinsight.com/aa
- **Sandwich index peer review.** The mainnet sandwich-MEV index (alongside Lucid / EIP-8184) went into peer review with the Encrypt the Mempool group, adding a "share of trades attacked" metric: eipsinsight.com/lucid

**Upgrade EIP Coordination:**

- Kept the Glamsterdam Meta EIP in sync with AllCoreDevs decisions and reported weekly into ACD meetings through the Sepolia countdown
- Tracked the hard September 29 client-release cutoff and the October 6 Sepolia fork against client readiness
- Coordinated Hegota PFI / CFI / DFI transitions, including the Frames headliner confirmation, and followed up with testing teams
- Prepared Status / Stage change PRs and posted reminders in the ACD channel
- Followed up one-on-one with authors on open proposals

**Glamsterdam (EIP-7773):** In final testing and release crunch. Gas repricing and the 200M gas limit remain locked; the fork cleared its devnet work toward a Sepolia activation on **October 6** (epoch 353024), with all client releases due by **September 29** and QUIC enabled by default. Hoodi is tentatively **October 27**, with mainnet still targeted for **early December** after the security window.

**Hegota (EIP-8081):** The headline act is set: **EIP-8141 (Frames) is confirmed as the Hegota headliner**, bringing native account abstraction to L1. Scoping advanced around it, with EIP-8411 moved to PFI, EIP-8015 confirmed, EIP-8365 narrowed to a deposit-guard-only scope, and the issuance-reduction proposal tabled for broader input. The slate continues to firm up ahead of tiering.

## EIP Coordination

**EIP Office Hours:**

- The weekly EIP Editing Office Hours ran throughout September, continuing from session #112 on September 1
- Editors worked through pull requests and followed up with authors to keep the repository backlog moving
- Live tracker: eipsinsight.com/officehours

**EIP Status Transition Summary:** 20 status-transition entries were recorded in September, per the EIPsInsight Status Transition Dashboard:

| Status | EIP | ERC |
|---|---|---|
| Draft | 9 | 3 |
| Review | 1 | 4 |
| Last Call | 1 | 1 |
| Living | 0 | 0 |
| Final | 0 | 1 |
| Stagnant | 0 | 0 |
| Withdrawn | 0 | 0 |

**Notable movements:** ERC-7813 (Store, Table-Based Introspectable Storage) reached **Final**; EIP-8246 (Remove SELFDESTRUCT Burn) and ERC-8167 (Modular Dispatch Proxies) both advanced to **Last Call**.

**Repository throughput:** 104 pull requests merged in September (78 in the EIPs repo, 26 in the ERCs repo), with 12 new proposals entering Draft and 5 moving into Review.

**Most active EIP editors:** jochem-brouwer, SamWilsn, lightclient, and g11tech.

**EIP Board:** The editor board kept surfacing PRs scheduled for an ACD agenda (grouped by meeting type, with CI-blocked PRs flagged so a failing PR is not mistaken for a ready one), used through the month by Office Hours and the editors: eipsinsight.com/board

## EIP Hub at Devcon 8

Preparation ramped up this month for the **EIP Hub at Devcon 8 India** (Jio World Centre, Mumbai, November 3 to 6). It is a four-day, community-led, project-neutral space dedicated entirely to EIPs, ERC application standards, and protocol upgrades, open to everyone from first-time authors to core devs.

The Hub is organized around a few tracks: EIP Process and Governance, Protocol and Core Ethereum, Application Standards and ERCs, Enterprise Ethereum, and Meet the Editors. Across all four days it runs interactive office hours, direct access to EIP Editors, live EIPsInsight dashboards, hands-on ERC design clinics, hackathon integration, and contributor onboarding. Sessions are hybrid, in person on the main Devcon floor and livestreamed with recordings afterward.

Details and schedule: **eiphub.xyz**

## Gratitude

Thank you to the EIP Editors, proposal authors, client teams, and testing teams whose steady work carried a demanding month, and to the wider community that keeps this process open. A special thanks to the ECH team, to Pooja Ranjan for sustained Meta EIP coordination, and to the EIPsInsight team keeping Office Hours, the EIP Board, the Frames devnet tracking, and the public dashboards running. Thanks as well to @Giveth, @OctantApp, and everyone who supported the work through the grant round.

September turned Glamsterdam into a dated run to Sepolia and gave Hegota its headliner in Frames, with the first native-AA devnet already live. We will keep investing in coordination, documentation, and public tooling so the whole community can follow along, and we hope to see many of you at the EIP Hub at Devcon 8 in Mumbai. Onward to the fork.
