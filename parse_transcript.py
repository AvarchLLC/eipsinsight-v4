import json
import re

LOG_FILE = "/Users/subhrajeetbhattacharjeee/.gemini/antigravity-ide/brain/376e6c80-e5c9-4cb8-8764-e4b9930dd749/.user_uploaded/media_1789150239319.txt"

def format_time(time_str):
    parts = time_str.split(':')
    if len(parts) == 2:
        return f"00:{int(parts[0]):02d}:{int(parts[1]):02d}"
    elif len(parts) == 3:
        return f"{int(parts[0]):02d}:{int(parts[1]):02d}:{int(parts[2]):02d}"
    return "00:00:00"

def get_next_time(time_str, add_seconds=5):
    parts = time_str.split(':')
    if len(parts) == 2:
        total = int(parts[0]) * 60 + int(parts[1]) + add_seconds
    elif len(parts) == 3:
        total = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2]) + add_seconds
    else:
        total = add_seconds
    h = total // 3600
    m = (total % 3600) // 60
    s = total % 60
    return f"{h:02d}:{m:02d}:{s:02d}"

with open(LOG_FILE, 'r') as f:
    lines = f.readlines()
cues = []
current_start = None
current_text = []

for line in lines:
    line = line.strip()
    if not line or line.startswith('>>') or line == '':
        continue
    
    match = re.match(r'^(\d{2}:\d{2}(?::\d{2})?)(?:\s+(.*))?$', line)
    if match:
        time_str = match.group(1)
        text = match.group(2)
        text = text.strip() if text else ""
        
        if current_start is not None:
            # Only append if we actually have text in current_text
            if "".join(current_text).strip():
                cues.append({
                    "start": format_time(current_start),
                    "end": format_time(time_str),
                    "text": " ".join(current_text).strip()
                })
            
        current_start = time_str
        current_text = [text] if text else []
    else:
        if current_start is not None and line:
            current_text.append(line)

# Add the very last cue
if current_start is not None and "".join(current_text).strip():
    cues.append({
        "start": format_time(current_start),
        "end": get_next_time(current_start),
        "text": " ".join(current_text).strip()
    })

with open("src/data/ethproofs-009-transcript.json", "w") as f:
    json.dump(cues, f, indent=2)

print(f"Parsed {len(cues)} transcript cues.")

# Write the decisions.json and tldr.json directly since we already know the format
tldr = {
  "Targets": [
    "Build end-to-end formally verified implementations that eliminate drift between specifications and production code - 00:03:25",
    "Formally verify ZK statements, circuits and ZKVMs in Lean, covering both soundness and completeness - 00:12:00",
    "Extend formal verification across cryptography, compilers, MLIR and Ethereum execution-layer systems - 00:45:40",
    "Develop tooling that can automatically verify ZK and compiler properties and eventually produce machine-checkable proofs - 01:16:17"
  ],
  "Decisions": [
    "Ring Constant Client is being designed around the Lean consensus specification rather than implementing only a standalone basic client - 00:03:25",
    "ZK-Lean is being developed as a Lean 4 framework for formally verifying the correctness of ZK statements - 00:12:00",
    "Circuit verification should be designed around soundness and completeness by construction, rather than relying only on post-hoc verification - 00:23:31",
    "For complex trace data structures, the formal proof layer will use an abstract specification interface so the efficient implementation can be developed independently - 01:01:41",
    "AI/LLM-assisted formalization is being used as a practical workflow for generating and testing candidate proofs, with humans and theorem provers validating the results - 01:44:14",
    "The longer-term direction is proof-producing verification rather than putting the verification tooling itself inside the trusted code base - 01:22:21"
  ],
  "Highlights": {
    "Ethereum Consensus & Ring": [
      "Ring Constant Client aims to eliminate specification/implementation drift through formal verification - 00:03:25",
      "The project is intended to support the Lean consensus specification and potentially other clients rather than remaining a minimal standalone implementation - 00:05:33",
      "The broader motivation is eventually having formally verified consensus implementations that can provide stronger security guarantees - 00:03:41"
    ],
    "ZK-Lean": [
      "ZK-Lean is a Lean 4 library designed to formally verify the correctness of ZK statements - 00:12:00",
      "The framework can represent ZK circuits and their specifications and prove properties about their implementations - 00:12:26",
      "The goal is to verify both soundness and completeness of circuits - 00:21:36",
      "The project is intended to work with circuits originating from systems such as Circom and SP1 - 00:14:14",
      "A major goal is making circuit specifications and proofs reusable instead of requiring every circuit to be verified from scratch - 00:23:31"
    ],
    "End-to-End ZKVM Verification": [
      "The team presented work on formally verifying a Zcash Ironwood circuit as a complete proof-of-concept - 00:30:03",
      "The verification effort targets both soundness and completeness and is intended to eventually become end-to-end - 00:29:34",
      "Discussion highlighted the difficulty of scaling formal proofs to large, complex circuits - 00:25:10",
      "The approach is intended to eventually cover complete ZKVM implementations rather than isolated circuit components - 00:33:28"
    ],
    "CK/Golf Circuit Optimization": [
      "A circuit optimization challenge was being prepared to encourage improvements to formally verified circuits - 00:31:40",
      "The idea is to turn circuit optimization into an iterative process where optimized implementations can still be checked against formal specifications - 00:32:26",
      "The challenge is intended to make it easier to discover better implementations without sacrificing correctness guarantees - 00:32:54"
    ],
    "Zisk Verification": [
      "A RISC-V specification-verification effort for Zisk was presented - 00:41:57",
      "The goal is to establish that Zisk implementations satisfy their intended specification and to identify bugs through formal methods - 00:42:27",
      "The work was described as an initial/passive experiment that could be expanded if the approach proves useful - 00:42:00"
    ],
    "Cryptographic Verification": [
      "Work was presented on formally verifying cryptographic components and composing individually verified security properties into larger protocol guarantees - 00:45:03",
      "Signal Shot is pursuing formal verification of the Signal protocol - 00:45:54",
      "Rock and Lean are being used together to verify cryptographic libraries and implementations - 00:49:02",
      "A Hex reference implementation and its corresponding Lean verification were also discussed - 00:50:17"
    ],
    "Formalizing Proof Systems": [
      "Formal verification was discussed as a way to validate the mathematical assumptions and security properties underlying hash-based proof systems - 00:55:07",
      "The work includes formalizing constructions, soundness proofs and the relationship between pen-and-paper security arguments and machine-checked proofs - 01:01:19",
      "The project was reported to be roughly 30% complete, with constructions and soundness proofs already completed - 01:01:08"
    ],
    "Automated Verification & SMT": [
      "SMT solvers are being used to automatically verify properties of ZKVMs and circuits - 00:38:09",
      "The verification pipeline can translate relevant problems into SMT and automatically search for counterexamples or proofs - 01:20:51",
      "A major future goal is to have the tools emit proofs that can then be checked independently in Lean - 01:22:21",
      "This would reduce the amount of verification machinery that has to be trusted directly - 01:22:29"
    ],
    "AI-Assisted Formal Verification": [
      "LLMs were demonstrated as useful for generating candidate formal proofs and exploring theorem statements - 01:44:14",
      "An agent loop was reported to generate roughly 10 candidate theorems per hour across several basic blocks - 01:48:47",
      "The discussion emphasized using AI for creative proof exploration while retaining Lean/theorem-prover checking as the final correctness mechanism - 01:44:14"
    ],
    "Veil & Compiler Verification": [
      "Succinct's Veil compiler was discussed as a target for formal verification - 01:10:09",
      "Work is exploring conversion of SP1 programs into the Veil format and formalizing the resulting correctness properties - 01:10:46",
      "Compiler correctness was framed as another major area where formal verification can eliminate subtle implementation/specification mismatches - 01:10:05"
    ],
    "Verif/MLIR & Compiler Infrastructure": [
      "A verification-oriented MLIR dialect was presented for translating formal specifications into SMT-based verification tasks - 01:16:17",
      "The broader goal is to connect Lean specifications with existing compiler infrastructure instead of requiring every compiler component to be independently reimplemented in Lean - 01:30:50",
      "Lean representations of MLIR structures were discussed as a way to preserve the same asymptotic behavior while gaining machine-checked guarantees - 01:35:22"
    ],
    "EVM Formal Verification": [
      "The final section focused on formally verifying Ethereum execution-layer and smart-contract infrastructure - 01:41:26",
      "EVM-ASM was presented as an effort to formally specify and verify EVM programs and their execution - 01:47:48",
      "EVM-Spec/“EVM-Sale” work is translating the EVM specification into Lean and connecting it with verification efforts - 01:53:49",
      "A verified Vyper compiler and formal Vyper semantics were presented, including coverage of the Vyper language and compiler pipeline - 01:57:23",
      "EVM Smith and direct EVM-bytecode reasoning were discussed as possible approaches to smart-contract verification - 02:11:51"
    ],
    "Incentive Security": [
      "The closing discussion expanded formal verification beyond functional correctness toward incentive/security properties - 02:19:08",
      "The objective is to formally reason not only about whether code behaves according to its specification, but also whether the surrounding economic/security assumptions hold - 02:20:17"
    ]
  }
}

with open("src/data/ethproofs-009-tldr.json", "w") as f:
    json.dump(tldr, f, indent=2)

decisions = [
  {
    "original_text": "Ring Constant Client is being designed around the Lean consensus specification rather than implementing only a standalone basic client",
    "timestamp": "00:03:25"
  },
  {
    "original_text": "ZK-Lean is being developed as a Lean 4 framework for formally verifying the correctness of ZK statements",
    "timestamp": "00:12:00"
  },
  {
    "original_text": "Circuit verification should be designed around soundness and completeness by construction, rather than relying only on post-hoc verification",
    "timestamp": "00:23:31"
  },
  {
    "original_text": "For complex trace data structures, the formal proof layer will use an abstract specification interface so the efficient implementation can be developed independently",
    "timestamp": "01:01:41"
  },
  {
    "original_text": "AI/LLM-assisted formalization is being used as a practical workflow for generating and testing candidate proofs, with humans and theorem provers validating the results",
    "timestamp": "01:44:14"
  },
  {
    "original_text": "The longer-term direction is proof-producing verification rather than putting the verification tooling itself inside the trusted code base",
    "timestamp": "01:22:21"
  }
]

with open("src/data/ethproofs-009-decisions.json", "w") as f:
    json.dump(decisions, f, indent=2)

print("Created ethproofs-009 json files!")
