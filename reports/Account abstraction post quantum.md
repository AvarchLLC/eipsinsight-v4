# Account Abstraction × Post-Quantum Ethereum

*A research brief — how Ethereum plans to make accounts (and consensus) quantum-safe, why account abstraction is the vehicle, and the concrete specs as of November 2026.*

---

## 0. The one-paragraph thesis

Ethereum's account signatures (ECDSA on secp256k1) and its consensus signatures (BLS on BLS12-381) are both broken by a large quantum computer. Hash functions are not. So the entire post-quantum (PQ) transition is a migration **away from elliptic-curve math and toward hash-based cryptography + STARK proofs**. The problem: PQ signatures are 10–500× larger and far more expensive to verify than a 65-byte ECDSA sig. You cannot just swap the curve on a hardcoded EOA. **Account abstraction is the escape hatch** — if the *account itself* decides how a signature is verified, it can verify a hash-based signature, a lattice signature, a passkey, or a ZK proof, with no protocol change per algorithm. That is why "post-quantum" and "account abstraction" are now the same roadmap. Vitalik's November 2026 framing ties it to money: if ETH's value rests on being a long-term **store of value**, then the first store-of-value metric is **"to survive"** — i.e. survive quantum and AI. Hence the urgency.

---

## 1. Why this is happening now: the SoV + survival framing

**Vitalik's Nov 8, 2026 thread.** The argument is that ETH should be valued primarily as a **store of value (SoV)**, not as a "fee-burning token" (the 2021 "ultrasound money" narrative where usage → fees burned → scarcity → price). His points:

- Keep EIP-1559 and the burn — but the burn is a *consequence* of usage, not the thing that gives ETH value. He says it is fine if fee burn stays below ~10% of the issuance "breakeven" indefinitely.
- The "L'Oréal" analogy: justifying a ~$270B market cap through fees alone would make Ethereum behave like a major corporation — needing huge R&D spend (he estimates ~700k ETH/yr), interventionist governance, and high gas prices. All of that is corrosive to decentralization.
- The real value is **CROPS**: **C**ensorship resistance, capture **R**esistance, **O**pen source, **P**rivacy, **S**ecurity. For an individual, privacy looks ideological; for an institution it's compliance and risk management. CROPS is what makes ETH trustworthy over decades.
- The first SoV metric is **"to survive"** — this is why Devcon's theme was *"post-quantum and post-AI,"* and why the roadmap favors conservative tradeoffs: hash-only security, formal proofs, partial ossification of the core.

**Threat model (why quantum matters to a SoV).** Two distinct risks:

1. **Store-now-decrypt-later.** Every time you *spend* from an account, the signature reveals the public key. A future quantum computer can derive the private key from a public key via **Shor's algorithm**. So funds in any account that has ever transacted are exposed the day a cryptographically-relevant quantum computer ("Q-day") arrives. Accounts that have *never* spent are protected only by the hash of the pubkey (the address), which stays quantum-safe.
2. **Consensus forgery.** The validator set signs with BLS; break BLS and you can forge attestations/finality.

**What breaks vs. survives under quantum:**

| Primitive | Used for | Quantum status |
|---|---|---|
| ECDSA / secp256k1 | EOA account signatures | **Broken** (Shor) |
| BLS12-381 | consensus sigs + aggregation | **Broken** (Shor) |
| KZG commitments (blobs) | EIP-4844 data availability | **Broken** (pairing/DL) |
| Keccak / SHA-256 hashes | addresses, Merkle/state tries | **Survives** (Grover only halves security → double output) |
| STARK proofs | validity proofs | **Survives** (hash-based only) |

Grover's algorithm gives a quadratic speedup on brute-forcing a hash, so 256-bit hashes drop to ~128-bit effective security — mitigated by using larger outputs, not by abandoning hashes. This is the whole reason Ethereum's PQ direction is **"hash-only."**

---

## 2. Account abstraction primer (the vehicle)

### 2.1 The EOA problem
A legacy **Externally Owned Account** is just a secp256k1 keypair. The *protocol* hardcodes "a transaction is valid iff its ECDSA signature recovers to this address." There is no hook to say "verify it a different way." That single hardcoded assumption is the thing quantum breaks and the thing you cannot upgrade per-account. Account abstraction removes that assumption by making *validity itself programmable*.

### 2.2 EIP-4337 / ERC-4337 — AA without protocol changes (live since 2023)
Implements AA entirely in smart contracts + a side infrastructure, no consensus change:

- **UserOperation**: a pseudo-transaction object (sender, nonce, callData, `signature`, gas fields, paymaster data) that users sign and send to a dedicated **alt-mempool** rather than the normal tx pool.
- **Bundlers**: actors that collect UserOps and wrap them into a real on-chain transaction calling the EntryPoint.
- **EntryPoint**: a singleton audited contract that runs the two-phase loop: **validation** then **execution**.
- **Account contract** implements `validateUserOp(userOp, userOpHash, ...)` — **this is the signature-abstraction hook.** The account checks `userOp.signature` however it wants. ECDSA, multisig, passkey (secp256r1), **or a post-quantum verifier**. The protocol never sees the scheme.
- **Paymasters**: let a third party pay gas (sponsored tx, pay fees in ERC-20).
- **Aggregators**: an optional contract that verifies many UserOps' signatures together (e.g. BLS aggregation) to amortize cost. *This is exactly where a PQ aggregator slots in later.*

**The catch for PQ:** the account can already verify a Falcon/Dilithium/SPHINCS+ signature inside `validateUserOp` today (people have built PoC PQ smart wallets). But the **bundler's outer transaction is still an ordinary ECDSA transaction**. So 4337 gives you a PQ-resistant *inner* wallet while the *settlement* layer stays elliptic-curve. That gap is why the long-term answer is **native** AA.

### 2.3 EIP-7702 — "set code for EOAs" (LIVE, shipped in Pectra, May 2025)
Lets an existing EOA temporarily/persistently point at smart-account code via a **delegation designator**: the account's code field is set to `0xef0100 ‖ <address>`, so the EOA executes a smart contract's logic while keeping its address and balance. This bridges the 300M+ existing EOAs into the 4337 smart-account world without new addresses. It does **not** by itself make the account post-quantum (the delegation authorization is still an ECDSA signature), but it is the migration rail.

### 2.4 RIP-7560 / EIP-7701 — native account abstraction
Makes AA a **first-class protocol transaction type** (an `AA_TX_TYPE`) rather than a contract convention. The EVM itself runs the account's validation and execution phases, removing the separate EntryPoint/relayer trust and the ECDSA-bundler gap. This is the architecture that lets the *actual settlement transaction* use a non-ECDSA signature.

### 2.5 EIP-8141 — "Frame Transactions" = native AA, the PQ off-ramp (Scheduled for Inclusion)
The current headline vehicle. A frame transaction decomposes one transaction into **up to 64 sequential "frames,"** each a standard contract call, making **verification, execution, and gas payment all programmable at the protocol level**. Its spec explicitly describes itself as a **"native off-ramp from the elliptic-curve-based cryptographic system"** used today: an account can keep ECDSA, or switch to a PQ scheme (e.g. Dilithium) or a passkey, **without a separate hard fork per algorithm**.

- Status: moved to **"Scheduled for Inclusion"** on Aug 27, 2026; rated **S-tier** by the EF Protocol Cluster alongside FOCIL (EIP-7805).
- ~10 co-authors including Vitalik; targeted for **Hegotá** (the fork after Glamsterdam).
- Companion **EIP-8164** reserves the `0xef01XX` namespace as groundwork for registering future PQ signature schemes.

**The through-line:** 4337 (live) → 7702 (live, migration rail) → 7560/7701 (native) → **8141 Frames (native AA + PQ off-ramp)**. Each step moves "how do I verify a signature?" from a protocol constant to an account-chosen policy. Post-quantum security is the first big customer of that flexibility.

---

## 3. Post-quantum cryptography primitives

### 3.1 Two families

**A. Hash-based signatures** — security rests *only* on hash functions (preimage/collision resistance). Most conservative; Ethereum's preferred direction.

- **Lamport** — one-time signature (OTS). Sign one message per key. Simple, large.
- **Winternitz / WOTS+** — OTS with a size/time tradeoff; smaller than Lamport.
- **XMSS** — a Merkle tree of WOTS+ keys → a *stateful* many-time signature (you must track which leaf you've used; reuse is catastrophic). FIPS SP 800-208.
- **SPHINCS+ / SLH-DSA (NIST FIPS 205)** — *stateless* hash-based signature (big Merkle forest + few-time sigs). No state to lose, but signatures are large (≈8–50 KB).

**B. Lattice-based signatures** — smaller/faster, but rest on newer (less battle-tested) lattice assumptions.

- **CRYSTALS-Dilithium / ML-DSA (FIPS 204)** — the NIST primary. ~2.4 KB sig, ~1.3 KB pubkey.
- **Falcon / FN-DSA (FIPS 206, forthcoming)** — smallest lattice sig (~0.7 KB) but tricky floating-point/Gaussian sampling, harder to implement safely and to prove in a circuit.

### 3.2 Rough sizes (NIST security ~level 1, for intuition)

| Scheme | Signature | Public key | Notes |
|---|---:|---:|---|
| ECDSA secp256k1 (today) | 64–65 B | 33 B | broken by quantum |
| BLS12-381 (consensus today) | 96 B | 48 B | aggregates to one 96 B sig |
| Falcon-512 (FN-DSA) | ~0.7 KB | ~0.9 KB | smallest PQ, hard to implement |
| Dilithium2 (ML-DSA-44) | ~2.4 KB | ~1.3 KB | NIST primary lattice |
| XMSS / leanSig | ~3.1 KB | ~small | stateful, hash-only |
| SPHINCS+-128s (SLH-DSA) | ~8 KB | 32 B | stateless, hash-only |
| SPHINCS+-128f | ~17 KB | 32 B | faster-signing variant |

The takeaway: PQ sigs are 10×–500× larger than ECDSA, and verifying a block full of them is orders of magnitude more gas/compute. **That size-and-cost problem is what the aggregation work (below) exists to solve.**

### 3.3 Why "hash-only" + STARKs
STARK proofs are themselves built only from hash functions, so they are post-quantum-safe. The plan leans on them twice: (1) to **aggregate** thousands of PQ signatures into one succinct proof, and (2) for account recovery (Section 4.4). SNARK/STARK-friendly hashes like **Poseidon2** are used so the signatures are cheap to prove inside a circuit.

---

## 4. The intersection: making *accounts* quantum-safe

### 4.1 The mechanism in one sentence
Because an abstracted account *runs code to decide if a signature is valid*, it can run a **hash-based or lattice verifier** instead of ECDSA — so "upgrade your account to post-quantum" becomes "deploy/choose a different verifier," not "hard-fork the whole chain."

### 4.2 The gas wall and EIP-8288 (Frames + recursive STARK aggregation)
Verifying PQ signatures on-chain is brutally expensive — a quantum-safe *private* transaction runs on the order of **~10 million gas**. **EIP-8288** attacks this by moving the heavy crypto **off-chain**:

- A transaction no longer carries the full signature/proof. It carries a short **"dependency"** — a ~**96-byte claim** that "some message was signed by some key" or "some data satisfies some proof."
- **Mempool nodes combine all the dependencies in a block into one recursive STARK proof** per block. The chain verifies one aggregate proof instead of thousands of PQ signatures.
- Claimed effect: the quantum-safe path drops from ~10M gas to the **low tens of thousands — a >99% reduction**.
- It **depends on Frames (EIP-8141)** and would need a shared proving instruction set — the leading candidate is **RISC-V**. Co-authored by Vitalik + Thomas Coratger; proposed Jun 5, 2026, merged into the EIP repo Sep 9, 2026. Not yet assigned to a fork — Vitalik wants it in **"I-star,"** the fork *after* Hegotá.
- **Caveat (Nethermind):** Frame transactions do **not** fix the signature scheme itself. Aggregation (8288) matters when many PQ transactions share a block; a *first* post-quantum account can work without it.

### 4.3 Private account abstraction
A use case Vitalik highlights: an account that can **change ownership of all its on-chain positions in one transaction without revealing what moved** — i.e. privacy-preserving AA. This combines ZK proofs of ownership with the abstracted-verification model, and benefits directly from 8288's cheap off-chain proving. It sits inside the EF's broader **Kohaku** privacy stack. (A related late-2026 line of work — covered by Decrypt as "slashing quantum-safe privacy costs" — is about making the quantum-safe *and* private path affordable, which is exactly what 8288's aggregation enables.)

### 4.4 The quantum-emergency recovery fork
Vitalik's contingency plan ("How to hard-fork to save most users' funds in a quantum emergency," Mar 2024, now routed through EIP-8141 accounts): if Q-day arrives before everyone has migrated, a **recovery hard fork** freezes vulnerable EOAs and lets a user reclaim funds by submitting a **STARK proof that they know the private preimage** (from an approved hash list) that generates their address — *without revealing the key*. Most wallet private keys are themselves derived from hash chains (seed → key), which is what makes the proof constructible. Proofs are batched via a **"STARK-of-STARKs"** scheme to cut gas. Vitalik's line is that the infrastructure could, in principle, start being built immediately.

### 4.5 The staged account roadmap (pq.ethereum.org)
The EF PQ site sequences account-side work as: **J\*** = PQ signature-verification **precompiles** (so a contract can cheaply check a PQ sig) → **PQ transactions** (native PQ accounts via Frames) → **M\*** = PQ signature **aggregation** (the 8288 end-state).

---

## 5. The intersection: making *consensus* quantum-safe

Accounts are only half the problem — the validator set must also stop signing with BLS.

### 5.1 EIP-8453 — Decoupled Consensus (+ few-slot finality)
Early draft (Ben Edgington, PR #12566, Oct 21, 2026). Splits validator duties:

- A **small committee (~512 validators) per slot** votes on the **chain head** (availability/liveness).
- **All active validators** vote on **finality**, in rounds that no longer wait for epoch boundaries.
- Retires **Gasper** (today's beacon-chain consensus). Target: **≥4× faster finality — from ~16 min to ~4 min**, and a basis for eventual few-/single-slot finality.
- Rationale matches Vitalik's point that consensus time ≈ log(validator count): putting only a few hundred validators in each slot's hot path is plausibly a ~2× speedup *on its own*, **without shrinking the total validator set**.
- Needs a consensus-layer hard fork; roadmap places it ~2027–2028, after Hegotá. Still many TBDs (committee selection, rewards, safety proof).

### 5.2 Lean Consensus (formerly "Beam Chain")
Justin Drake's from-scratch, PQ-secure, formally-verified consensus (announced as Beam Chain at Devcon SEA 2024; rebranded **Lean Consensus**). Components:

- **leanSig** — a **stateful XMSS variant** optimized for SNARK-friendly aggregation using the **Poseidon2** hash (~3,112-byte signatures, vs. 96 B for BLS, with no native aggregation of its own).
- **leanMultisig** — the signature-aggregation scheme.
- **LeanVM** — a purpose-built minimal zkVM whose job is to aggregate thousands of PQ signatures into one proof (the bottleneck that makes few-slot finality feasible).
- **Status:** pre-deployment — running on interoperability devnets (e.g. **pq-devnet-2**, integrating leanMultisig); **leanVM reported end-to-end formally verified ~Nov 3, 2026**; full PQ-consensus switch targeted ~**Dec 2028** (some roadmaps say 2027–2030 — treat as provisional).

### 5.3 Supporting upgrades riding along
- **Erasure-coded P2P / gossip** — propagate big objects (blocks, blobs, aggregate proofs) as redundant encoded pieces so nodes reconstruct from a subset → faster, more robust propagation (related to PeerDAS/DAS). "For free" speed, no consensus-security downside.
- **FOCIL (EIP-7805)** — fork-choice-enforced inclusion lists; the **S-tier headliner of Hegotá** — censorship resistance (the "C" in CROPS): block builders can't silently exclude your transaction.

---

## 6. Timeline, forks, and how the pieces land

Dates are **provisional** — sources conflict and specs are in Draft. As of Nov 2026:

| Fork | Est. timing | PQ/AA-relevant contents |
|---|---|---|
| **Pectra** | May 2025 (live) | EIP-7702 (EOA→smart-account delegation) |
| **Fusaka** | ~2025–26 | PeerDAS / data-availability scaling (sets up erasure coding) |
| **Glamsterdam** | ~Q4 2026 / H1 2027 | scaling + groundwork |
| **Hegotá** | ~2027 (Q2 2027 tentative) | **S-tier: EIP-8141 Frames (native AA / PQ off-ramp) + FOCIL (EIP-7805)**; routes quantum-emergency recovery |
| **"I-star"** (post-Hegotá) | TBD | **EIP-8288** (Frames + recursive STARK aggregation, >99% PQ gas cut) |
| **Lean Consensus** | ~Dec 2028 (2027–2030) | leanSig / leanMultisig / LeanVM; decoupled consensus (EIP-8453) direction |
| **Full PQ readiness** | **~Dec 2029** | execution + consensus + data layers quantum-safe (EF Protocol Cluster target) |

Account side (pq.ethereum.org): **PQ precompiles (J\*) → PQ transactions → PQ aggregation (M\*)**.
Consensus side: **decoupled consensus / few-slot finality → hash-based sigs + STARK aggregation → Lean Consensus**.

---

## 7. Mental model / booth cheat-sheet

- **"Why can't you just change the signature?"** Because an EOA's verification rule is a protocol constant. AA makes it account-chosen code, so an account can verify *any* scheme — including PQ.
- **"Why hashes, not lattices?"** Conservatism. Hash security is the best-understood assumption and only mildly dented by Grover; STARKs are hash-only too, so the whole stack rests on one well-studied primitive. Lattices (Dilithium/Falcon) are allowed at the account level but not the foundation of consensus.
- **"Why is it so expensive?"** PQ sigs are KBs, not 65 bytes, and verification is heavy → ~10M gas for a private quantum-safe tx. **EIP-8288** fixes this by sending 96-byte *claims* and proving the whole block's crypto off-chain in one recursive STARK.
- **"What's actually live vs. paper?"** Live: EIP-4337, EIP-7702, PQ smart-wallet PoCs (via `validateUserOp`), PQ interop devnets (pq-devnet-2), leanVM formal verification. Paper/draft: EIP-8141 (scheduled), EIP-8288 (unassigned), EIP-8453 (draft), Lean Consensus (devnets).
- **"How does this connect to the money argument?"** SoV → "to survive" → PQ + post-AI resilience + CROPS. The crypto roadmap *is* the monetary thesis.

---

## 8. Glossary

- **AA** — account abstraction: make account validity/execution/gas programmable.
- **EOA** — externally owned account (plain keypair, hardcoded ECDSA).
- **UserOperation / EntryPoint / Bundler / Paymaster** — the ERC-4337 off-protocol AA machinery.
- **Frame** — one of up to 64 programmable steps in an EIP-8141 transaction.
- **Dependency** — EIP-8288's ~96-byte claim standing in for a full signature/proof.
- **SLH-DSA / ML-DSA / FN-DSA** — NIST names for SPHINCS+ / Dilithium / Falcon.
- **XMSS / leanSig** — stateful hash-based signatures; leanSig is Ethereum's Poseidon2 XMSS variant.
- **STARK** — hash-only validity proof; PQ-safe; used for aggregation and recovery.
- **Gasper / FOCIL / Decoupled consensus** — current consensus / inclusion-lists / the EIP-8453 split-duty redesign.
- **CROPS** — Censorship resistance, capture Resistance, Open source, Privacy, Security.
- **Q-day** — the day a cryptographically-relevant quantum computer exists.

---

## 9. Sources

- [Vitalik: ETH as store of value, not fee-burning (The Block, Nov 8 2026)](https://theblock.co/news/ecosystems/2026-11-08-vitalik-buterin-says-eth-should-be-valued-as-a-store-of-value-not-a-fee-burning-token-436022)
- [Vitalik's CROPS vision (Bitfinex blog)](https://blog.bitfinex.com/industry-news/vitaliks-vision-for-ethereum-crops-not-speed/)
- [Vitalik pitches EIP-8288 as next cryptography unlock (Bankless)](https://www.bankless.com/read/news/vitalik-pitches-eip-8288-as-ethereums-next-big-cryptography-unlock)
- [EIP-8288: Frames + recursive STARK aggregation (Crypto Briefing)](https://cryptobriefing.com/eip-8288-recursive-stark-mempools-ethereum/)
- [Vitalik pushes quantum-safe privacy cost cuts (Decrypt)](https://decrypt.co/377857/vitalik-buterin-pushes-ethereum-plan-to-slash-quantum-safe-privacy-costs)
- [The road to post-quantum Ethereum is paved with AA (ethresear.ch)](https://ethresear.ch/t/the-road-to-post-quantum-ethereum-transaction-is-paved-with-account-abstraction-aa/21783)
- [EIP-8141 spec (eips.ethereum.org)](https://eips.ethereum.org/EIPS/eip-8141)
- [EIP-8141 scheduled for Hegotá (Crypto Briefing)](https://cryptobriefing.com/ethereum-eip-8141-hegota-upgrade/)
- [EIP-8141 frame transactions explained (4pillars research)](https://research.4pillars.io/en/research/frame-transactions-setting-ethereum-transaction-free)
- [EF Protocol Cluster names two must-ship EIPs for Hegotá (Forklog)](https://forklog.com/en/ethereum-foundation-protocol-cluster-names-two-must-ship-eips-for-hegota/)
- [Hegotá roadmap (ethereum.org)](https://ethereum.org/roadmap/hegota/)
- [EIP-8453 Decoupled Consensus coverage (Bankless)](https://www.bankless.com/read/news/ethereum-researchers-draft-a-consensus-overhaul-for-faster-finality)
- [Decoupled consensus for faster finality (ethresear.ch)](https://ethresear.ch/t/unblocking-faster-finality-with-decoupled-consensus/24527)
- [Ethereum draft targets faster finality + quantum defense (Bitcoin.com)](https://news.bitcoin.com/blockchain/ethereum-draft-targets-faster-finality-future-quantum-defense/)
- [From Beam to Lean: Ethereum plots a century of resilience (Blockworks)](https://blockworks.co/news/beam-to-lean-ethereum)
- [Ethereum's leanVM formally verified for quantum resistance (Quantum Zeitgeist)](https://quantumzeitgeist.com/ethereums-leanvm-formally-verified-quantum-resistance/)
- [Ethlambda: building a post-quantum Ethereum client (LambdaClass)](https://blog.lambdaclass.com/ethlambda-building-a-post-quantum-ethereum-client-with-the-help-of-shared-tooling/)
- [leanSig in the PQ Crypto Registry](https://registry.projecteleven.com/algorithms/leansig)
- [How to hard-fork to save funds in a quantum emergency (ethresear.ch #18901)](https://ethresear.ch/t/how-to-hard-fork-to-save-most-users-funds-in-a-quantum-emergency/18901)
- [Vitalik's quantum hard-fork strategy (The Quantum Insider)](https://thequantuminsider.com/2024/03/11/vitalik-buterin-proposes-hard-fork-strategy-to-protect-ethereum-from-quantum-attacks/)
- [Ethereum future-proofing / quantum resistance roadmap (ethereum.org)](https://ethereum.org/en/roadmap/future-proofing/)
- [EF post-quantum hub (pq.ethereum.org)](https://pq.ethereum.org/)

*Note: 2026 items (EIP-8288, 8141, 8453, Lean Consensus, fork dates) are drafts/coverage, not finalized specs — dates and parameters will move. Signature sizes are standard NIST/FIPS figures. Verify EIP numbers against eips.ethereum.org before publishing anything externally.*
