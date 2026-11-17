## Title

Account Abstraction and Mempool Security Analytics

## Short summary

EIPsInsight already tracks Ethereum standards, governance, upgrades, and on-chain usage in the open, including early mempool and MEV security signals.
EIPsInsight becomes an open security-visibility layer for Ethereum account abstraction and mempool risk analysis. This $45,000 grant funds a 3-month build of the security and network analytics infrastructure, centered on account abstraction with targeted mempool and MEV intelligence, plus a dedicated adoption milestone proven over a longer window of up to 12 months.

Account-abstraction focus (EIP-4337, EIP-7702, EIP-8141): mainnet indexing (extending to L2s where feasible), EntryPoint and set-code usage metrics, typed-transaction migration trends, gas economics, and threat watchlists for malicious sweeper contracts post-Pectra.

Mempool and MEV: post-Dencun analytics tracking sandwich attacks, extracted value in USD, block-level sandwiching rate, and customizable threat alerts.Account Abstraction and Mempool Security Analytics

## Funding goal (USD)

$45,000

## Expected duration (months)

Up to 12 (3-month build for the infrastructure milestones A, B, and C; the adoption milestone D is proven over a longer window of up to 12 months)

## Recipient team

EIPsInsight (Avarch LLC)

## Links

https://eipsinsight.com
https://github.com/AvarchLLC/EIPsInsight
https://eipsinsight.com/aa
https://eipsinsight.com/privacy

## Why this matters

Since Pectra activated EIP-7702, attackers have used malicious delegations to drain compromised wallets, sometimes in a single transaction. Security firms reported that a large share of early EIP-7702 delegations pointed to reused malicious sweeper contracts that automatically drain any funds arriving in a compromised account. Reported individual losses have ranged from thousands to six figures per victim, and public reporting puts cumulative EIP-7702 sweeper and delegation-phishing losses in the hundreds of thousands to low millions of dollars through 2025 across dozens of documented incidents. Exact totals vary by source, which is the gap this grant closes: it makes the count of malicious delegate contracts, the affected accounts, and the exposure in USD public and reproducible rather than anecdotal. As account abstraction evolves through ERC-4337 and EIP-8141, wallet teams and security researchers need visibility into active delegations and changes in delegation code, and today no neutral public source tracks which contract an account delegates to or when that delegation changes.

At the same time, public mempools expose transactions to frontrunning and sandwich attacks, contributing to billions of dollars in MEV. Proposals such as EIP-8184 (Lucid) aim to reduce this, but there is still no common public place to track and understand these risks.

This grant expands EIPsInsight into an open security-visibility layer. It provides free, reproducible data on account-abstraction and mempool activity, so developers and auditors can identify risks earlier and build safer systems.

## The team

All Avarch LLC, the team that builds and runs EIPsInsight (https://eipsinsight.com).

- Manish Ranjan, System Architect: system architecture, data design, and technical direction.
- Dhanush Naik, Lead Engineer: real-time chain indexers, backend data pipelines, and analytical dashboards.
- Yashkamal Chaturvedi, Operations and Content Lead: EIP explainers, review reports, and developer relations.
- Pooja Ranjan, Founder: founder of Avarch LLC and Herder in Chief at ECH Institute, focused on Ethereum community coordination and standards tracking.

Track record: Ethereum Foundation ESP (Q2 2025, https://blog.ethereum.org/2025/07/23/allocation-q2-25), Gitcoin Grants (GG18, GG21, GG23), and the Giveth Security Round (https://qf.giveth.io/project/eipsinsight).

No other funder pays for this scope. Relationships to disclose: One of Avarch's projects is a core member of the Encrypt the Mempool Coalition (https://encryptedmempool.org/) and supports EIP-8184 work. Avarch has no commercial ties to any searcher, builder, relay, or wallet provider tracked in this project, no venture backing, and no token. Because Giveth administers TheDAO Security Fund, the independent reviewer for these milestones is named in the grant agreement and is not the team.

## Why a grant: what already exists

EIPsInsight already runs the underlying account-abstraction and mempool dashboards live, and the team holds the indexing and standards expertise, so this work extends a public platform into security coverage rather than building from scratch. A stranger can check the head start now:

- Account Abstraction dashboards: https://eipsinsight.com/aa
- Mempool and MEV console: https://eipsinsight.com/lucid
- Protocol-call archive (recordings, transcripts, decision ledgers): https://eipsinsight.com/calls
- Upgrade and devnet-readiness directory: https://eipsinsight.com/upgrade/eips
- Open-source code: https://github.com/AvarchLLC/EIPsInsight

The price sits below a from-scratch build because the platform, indexers, and standards expertise already exist. What remains is the security-specific indexing, the watchlist and benchmark, the public data access, and adoption.

## In scope

This grant funds open visibility and analytics, not security enforcement. The money pays for the engineering, on-chain indexing, and public data infrastructure to extend EIPsInsight into a security-visibility layer.

- Account-abstraction analytics (EIP-4337, EIP-7702, EIP-8141): indexing of UserOperation and bundler activity, delegation patterns, frame transactions, and EOA account migration on Ethereum mainnet, extending to top L2s where feasible.
- Security and anomaly visibility: unexpected delegation-target changes, delegation to unaudited or known-malicious sweeper contracts, and malformed UserOperations, published as a watchlist.
- Mempool and MEV insights (EIP-8184): dashboards for attackable order flow, MEV surfaces, and pre-inclusion frontrunning and sandwich risk.
- Public data access: free downloadable feeds and an API, with no token gating and no paywall on the security data.

## Out of scope

- Active defense tools. Building wallets, relays, or encrypted mempools. This grant funds visibility and threat intelligence, not enforcement.
- Security services. Manual code audits, active incident response, or exploit mitigation.
- Long-term operational overhead. Beyond the maintenance commitment below, this grant does not fund general infrastructure past the delivery window.

## Commitments

- License: all code under an OSI-approved license, in public repositories under Avarch LLC. Every dashboard and data feed is free to read, with no paywall on the security data, and consumable without any specific vendor product.
- Maintenance: we keep the security analytics current as EIP-7702, ERC-4337, EIP-8141, and mempool activity evolve, for at least 12 months after the last milestone, with a documented method.
- Reproducibility: every published metric can be re-derived from public Ethereum chain data using a documented method, with no trusted, unverifiable feed.

## Milestones

### A - Account-abstraction security and core indexing - $12,000

- [ ] Indexing live for EIP-7702 delegation patterns, ERC-4337 UserOperation and bundler activity, EIP-8141 frame transactions, and EOA account migration on Ethereum mainnet, with coverage extending to top L2s where feasible, linkable by URL.
- [ ] Public account-abstraction usage dashboards live: ERC-4337 EntryPoint activity, EIP-7702 set-code (type 4) monthly counts and cumulative adoption since Pectra, distinct delegating accounts, and EntryPoint version split, linkable by URL.
- [ ] Ecosystem transaction-mix dashboards live: monthly market share across types 0 to 4, EIP-2718 typed-transaction migration, L1 composition, and per-type economics (USD fees, failure rates, EIP-4844 blob demand), linkable by URL.
- [ ] Real-time anomaly detection live for at least 3 categories (unexpected EIP-7702 delegation changes, delegation to unaudited or known-malicious sweeper contracts, malformed ERC-4337 operations), with a public watchlist, linkable by URL.
- [ ] An open-source reconciliation script cross-checks the index against public mainnet chain data and achieves at least 99.5% coverage of EIP-7702 set-code transactions and ERC-4337 EntryPoint activity, with zero unindexed sequence gaps over 30 consecutive days, re-runnable by a third party.
- [ ] All AA indexers and parsers published under an OSI-approved license in a public repository, with a public coverage page listing indexed chains, operation types, and schemas, linkable by URL.

### B - Mempool, MEV, and verified detection - $8,000

- [ ] A live post-Dencun MEV console showing total sandwich attacks, unique victim transactions, gross extracted value in USD, and block-level sandwiching rate, linkable by URL.
- [ ] Weekly historical trends over at least the trailing 26 weeks for sandwich volume, extracted bot profit in USD, exploited victim volume in USD, and active searcher-bot count, linkable by URL.
- [ ] EIP-8184 working-group progress tracking: meeting logs, recorded decisions, and latest meeting date, linkable by URL.
- [ ] Free public data access (downloadable feeds and an API) for all account-abstraction, mempool, and MEV surfaces, consumable without any specific vendor product, linkable by URL.
- [ ] A published, reproducible precision-and-recall benchmark of the sweeper/drainer watchlist against a named public malicious-address dataset published by a security firm, achieving at least 95% precision and at least 90% recall on known malicious EIP-7702 delegate targets, with method and inputs public so anyone can re-run it.
- [ ] At least 5 distinct EIP-7702 delegate contracts flagged by the watchlist and independently confirmed malicious (present in a named public dataset or a named firm's disclosure), together accounting for at least 500 affected victim accounts, each confirmable.
- [ ] The independent technical reviewer re-derives the published headline exposure and detection numbers from the documented method and public chain data, matching within a 1% margin, and confirms them publicly.

### C - Measured impact and open verification - $10,000

- [ ] Verifiable ecosystem adoption: at least 3 named external organizations, researchers, or ecosystem teams use EIPsInsight data, dashboards, APIs, or feeds in their research, analysis, tooling, or workflows, plus at least 2 independent references to EIPsInsight data or findings in established Ethereum technical forums, such as security research, EIP or ERC discussions, Ethereum Magicians, EIP Office Hours, or protocol meetings. Verified through public references or private confirmation to the independent technical reviewer.
- [ ] Public usage page: a live, URL-accessible page reports real usage of the public API and dashboards over a trailing 30-day window, excluding team-owned, demo, and automated traffic and duplicate identities, as supporting transparency alongside the named adopters and references.
- [ ] Independent verification: the independent technical reviewer confirms the named adopters and references and reproduces the headline usage and exposure numbers from the documented method and public chain data, matching within a 1% margin, and publishes confirmation.
- [ ] Sustained free access: the public API and feeds stay free for the full milestone window, with no token gating and no paywall on the security data, consumable without any specific vendor product, linkable by URL.

### D - External adoption - $15,000 (adoption)

- [ ] At least 8 named external organizations consume the public API or feeds in their own product or workflow, at least 3 of them from this list: MetaMask, Rabby, Blockaid, Pimlico, Alchemy, Safe, Etherscan, Blockscout, Base, Coinbase Wallet. Each is confirmed by a public page or post from that organization, or privately to the independent technical reviewer.
- [ ] This milestone may be demonstrated over an extended window of up to 12 months after the infrastructure milestones, since external integration timelines depend on other teams. Consumption in research, monitoring, and tooling workflows counts, not only end-user product integration.
- [ ] Independent verification: the independent technical reviewer confirms each named external consumer and publishes confirmation.




## Who is likely to fund this

Ethereum Foundation | funded EIPsInsight before (ESP Q2 2025); public-goods security tooling fits its mandate | know them well | warm intro? yes | $10,000
MetaMask (Consensys) | its users are the primary targets of EIP-7702 sweeper drainers; a public delegation watchlist and anomaly feed helps it warn users pre-signature | none | warm intro? yes | $5,000
Pimlico | runs ERC-4337 bundler and paymaster infra; public AA adoption and security metrics grow and protect its ecosystem | none | warm intro? yes | $5,000
Blockaid | transaction-security firm; a public delegation-target watchlist complements its threat detection | none | warm intro? yes | $3,000
Base | large user base exposed to drainers; wants neutral AA adoption metrics on its chain | none | warm intro? yes | $5,000

## Contact

@iamdhanushlnaik (X)





