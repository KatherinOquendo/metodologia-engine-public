# Decision Log — MetodologIA Proposal Engine
# Load when: evaluating a design change, resolving a conflict between files, or onboarding a new maintainer.
# Not authoritative for: prices, PC items, service definitions (see SSOT files).

## Purpose

Records architecture and design decisions with their rationales. Without this, future maintainers don't know WHY choices were made — they re-litigate settled debates or unknowingly reverse intentional constraints.

**Format per entry:** Decision → Context (what alternatives existed) → Rationale (why this one) → Consequences (what this choice prevents or enables) → Status.

---

## D-01: YAML files are the catalog SSOT over .md scanning
**Date:** 2026-03-29 (JM decision, recorded retroactively)
**Decision:** `catalog/services.yaml` and `catalog/conditions.yaml` are the primary SSOT for service data. `.md` files are secondary. If they conflict, canonical `.md` wins only because it is maintained by hand with deliberate care — but for machine reads, YAML is preferred.
**Alternatives:** (a) Use only canonical .md files — too slow to parse, not machine-readable. (b) Use only YAML — loses narrative context. (c) Dual-authority — creates sync debt.
**Rationale:** YAML is faster for agents to query and parse. The canonical .md files are authoritative because they are written with legal and editorial care — when they conflict with YAML, the conflict means YAML hasn't been updated yet.
**Consequences:** Agents should always prefer YAML for speed, but flag discrepancies for human sync. The cascade protocol exists to resolve this debt.
**Status:** Active.

---

## D-02: legal-guardian is a hard gate — cannot be bypassed
**Date:** 2026-03-29
**Decision:** No file is written before legal-guardian returns APPROVED or APPROVED_WITH_WARNINGS. proposal-conductor cannot call format-producer with BLOCKED status.
**Alternatives:** (a) Run verification after file generation (post-hoc). (b) Make it optional for "quick drafts". (c) Run it only for external sends.
**Rationale:** Post-hoc verification is useless — files already exist and may be sent by mistake. "Quick draft" exceptions accumulate and become the norm. The reputational and legal risk of a proposal with wrong pricing or a guarantee clause paraphrase is higher than the cost of always running the gate.
**Consequences:** Adds 10-30 seconds to every pipeline run. Occasional BLOCKED verdicts require human intervention. This is the intended behavior.
**Status:** Active. Non-negotiable.

---

## D-03: Conductor pattern over flat multi-agent
**Date:** 2026-03-29
**Decision:** One conductor (proposal-conductor) sequences all agents. Agents do not call each other directly.
**Alternatives:** (a) Flat mesh — any agent can call any other. (b) Chain — each agent calls the next directly. (c) Current conductor pattern.
**Rationale:** The proposal pipeline has mandatory ordering (legal gate before files) and mandatory gates (never skip L3). A conductor enforces these invariants. Flat meshes and chains cannot enforce ordering without duplicating the logic in every agent.
**Consequences:** proposal-conductor is the single point of orchestration. If it fails, the pipeline fails. Subagent unavailability fallbacks must be documented in conductor (they are, in the fallback table).
**Status:** Active.

---

## D-04: CLAUDE.md as per-session memory (not authoritative for prices)
**Date:** 2026-03-29
**Decision:** CLAUDE.md is injected at every session for fast context loading (red list, core principles, authority map). It is explicitly NOT authoritative for prices or segment rules — those belong in YAML files.
**Alternatives:** (a) CLAUDE.md as single SSOT for everything — becomes a monolith, hard to update safely. (b) No CLAUDE.md — agents load 37 files on every session start, causing timeout risk. (c) Current split.
**Rationale:** CLAUDE.md accelerates the 17 most-needed facts (red list, PC items, guarantee clause, core principles) into session context without 37-file reads. Prices change; CLAUDE.md's authoritative scope excludes them so it doesn't become a stale liability.
**Consequences:** Two files can become inconsistent (CLAUDE.md catalog summary vs services.yaml prices). The "Not authoritative for" section in CLAUDE.md exists to prevent agents from trusting CLAUDE.md prices over YAML.
**Status:** Active.

---

## D-05: NEVER BLOCK is a product principle, not a technical limitation
**Date:** 2026-03-29
**Decision:** The system never refuses to produce output regardless of input quality. Even blank input produces a ProposalData with smart defaults.
**Alternatives:** (a) Require minimum fields before proceeding — cleaner output but gates the user. (b) Current NEVER BLOCK with smart defaults.
**Rationale:** The primary user is a time-pressured executive with no domain knowledge. Gatekeeping causes abandonment. A proposal with `[CLIENT COMPANY]` placeholders is always better than no proposal — the user can fill in gaps during review.
**Consequences:** Output quality degrades with input quality. The assumptions list at delivery is the transparency mechanism. Users must review it. This is documented in worst-case-recovery.md.
**Status:** Active.

---

## D-06: White-label = MetodologIA completely invisible (not subtle)
**Date:** 2026-03-29
**Decision:** In whitelabel mode, MetodologIA name, logo, colors, and ALL brand markers are absent from output files. Not "subtle" or "small" — absent.
**Alternatives:** (a) Small MetodologIA logo in footer. (b) "Powered by MetodologIA" credit. (c) Current — completely invisible.
**Rationale:** IAC and white-label partners buy the right to present the methodology as their own. A "powered by" credit undermines their commercial positioning and violates the channel agreement. The methodology content remains fully MetodologIA's — only the visible brand is removed.
**Consequences:** White-label output is harder to generate (must strip all brand markers). The white-label grep check in format-producer exists for this reason. Failure to enforce this is a brand contract violation.
**Status:** Active. Non-negotiable.

---

## D-07: IAC is a delivery channel — no IAC-specific code paths
**Date:** 2026-03-29
**Decision:** IAC services use `brand_mode: whitelabel` and are Tier 3. There are no IAC-specific code paths in any agent — brand resolution handles the distinction.
**Alternatives:** (a) IAC-specific agent or branch logic. (b) Current — brand_mode handles it.
**Rationale:** IAC is a business relationship, not a technical feature. Encoding it as a code path would make every agent IAC-aware, creating maintenance surface. Brand mode is the correct abstraction.
**Consequences:** IAC B2C pricing is [POR CONFIRMAR] (PC-02) because IAC is structurally B2B. This constraint is enforced in service-selector, not via IAC-specific logic.
**Status:** Active.

---

## D-08: Co-brand partner accent on `--gold` token only
**Date:** 2026-03-29
**Decision:** In cobrand mode, partner's primary color overrides only the `--gold` CSS token (default: `#C9A84C`). Navy (#0A1628) and typography are never overridden.
**Alternatives:** (a) Partner controls their section of the document. (b) Partner's color for all accents. (c) Current — single token override.
**Rationale:** Navy (#0A1628) is MetodologIA's identity anchor — it appears on every primary surface. Allowing partners to override it would make MetodologIA proposals visually unrecognizable. The gold token is the one expressible accent; giving partners control there is sufficient brand presence without diluting the core identity.
**Consequences:** Some partners may request more visual control. The answer is whitelabel mode, not expanded cobrand permissions.
**Status:** Active.

---

## D-09: Prototypes ≠ production automations — always clarify
**Date:** 2026-03-29
**Decision:** Any automation deliverable described in a proposal must explicitly state it is a prototype/blueprint, not a production-ready system.
**Alternatives:** (a) Leave this to client interpretation. (b) Current — mandatory disclaimer.
**Rationale:** Clients have purchased Bootcamp Trabajar Amplificado expecting production deployments. The deliverable is a prototype and a trained capability — not a deployed system. This distinction prevents scope disputes and legal exposure.
**Consequences:** In proposal-writer, any reference to automation must include the distinction. In legal-guardian, this is not a separate blocker but falls under L6 (out-of-scope promises).
**Status:** Active.

---

## D-10: Evidence 4-level hierarchy for proposal content
**Date:** 2026-03-29
**Decision:** proposal-writer uses a 4-level evidence hierarchy (real data → suggested indicator → measurable signal → required data) rather than allowing generic claims.
**Alternatives:** (a) Allow claims without evidence. (b) Require only real data (blocks Innovation Mode). (c) Current 4-level hierarchy.
**Rationale:** Generic claims ("improve productivity") are legally risky (false advertising) and commercially weak. Real data from pilots is the gold standard but often unavailable for new services. The hierarchy allows every support block to have evidence at whatever level is honest, without blocking proposals.
**Consequences:** Levels 1-2 are verifiable; levels 3-4 are qualitative. proposal-writer should always note which level evidence is at. legal-guardian doesn't enforce this hierarchy — it enforces L5 (% wrapping), which is the enforcement mechanism for level 1/2 evidence claims.
**Status:** Active.
