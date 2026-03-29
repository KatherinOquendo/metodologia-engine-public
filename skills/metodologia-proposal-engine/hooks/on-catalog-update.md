# Hook: on-catalog-update
# Triggered when: any field in catalog/services.yaml or catalog/conditions.yaml changes,
# or when a canonical .md file is updated.
# Owner: Catalog Manager agent (agents/catalog-manager.md)

## When this hook runs
- After any CATALOG EDIT MODE operation
- After a canonical .md file is updated by the user
- After a [POR CONFIRMAR] item is resolved

## Cascade protocol

### Step 1: Identify impact scope

```bash
# Find which derived files reference the changed service/field
grep -r "[CHANGED_SLUG]" --include="*.md" --include="*.html" -l .
grep -r "[CHANGED_PRICE]" --include="*.md" -l .
```

Use this impact matrix to identify which files need updating:

| Field changed | Files that must update |
|---------------|----------------------|
| canonical_name | ALL derived files + inventario-maestro.md |
| b2b_cop price | ejecutiva-b2b, comercial-cliente-b2b, comercial-compras, b2b2b-* |
| b2c_cop price | ejecutiva-b2c, comercial-cliente-b2c, usuario-inexperto |
| duration_hours | ALL derived files + inventario-maestro.md |
| deliverables (add/remove) | ejecutiva (summary), comercial-cliente (journey), compras (specs), usuario-inexperto |
| SLA values | comercial-compras, canonico Sec 11 |
| credit_chain (confirmed) | ejecutiva, comercial-cliente, inventario |
| guarantee clause | comercial-cliente, comercial-compras + any proposal in outputs/ |
| certification conditions | comercial-compras, usuario-inexperto |
| what_it_is_not (add/remove) | ALL derived files (L6 check depends on this list) |
| segments (add/remove) | inventario-maestro.md cobertura table |

### Step 2: Verify no price inconsistencies

```bash
# Cross-check: canonical prices vs. all derived files
node scripts/catalog-query.js --price [SLUG] b2b_cop
node scripts/verify-legal.js --file [DERIVED_FILE] --canonical-price [PRICE]
```

### Step 3: Update derived files

For each affected file, update the specific field — do NOT rewrite the full file unless the canonical structure changed.

Update format convention in derived files:
```markdown
**Derivado de:** [slug]/canonico.md v[X.Y] ([YYYY-MM-DD])
**Precios verificados contra canónico:** sí, [YYYY-MM-DD]
```

### Step 4: Log the change

Append to `CHANGELOG.md`:
```markdown
## [YYYY-MM-DD] — [Change description]
**Changed:** [field or file]
**Service:** [slug]
**Previous value:** [old]
**New value:** [new]
**Authorized by:** [JM or source]
**Files updated:** [list]
**Cascade SLA:** 48 hours from [YYYY-MM-DD HH:MM]
**Status:** COMPLETE | IN PROGRESS
```

### Step 5: Flag unresolved items

If the cascade cannot be completed within 48h (too many files, complex interdependencies):
- List the remaining files in CHANGELOG.md as "pending"
- Add a [POR CONFIRMAR] note to any proposal generated before the cascade completes

## SLA
**Hard rule:** all derived files updated within **48 hours** of canonical change.
[DECISION 2026-03-29, JM: 48h chosen as balance between speed and quality. Assumption: team of 1 person. If team grows, reduce to 24h.]

## Edge cases

### Price increase mid-proposal-cycle
If a canonical price increases while a proposal is being negotiated with a client:
- The sent proposal is honored at the quoted price for its validity period.
- New proposals use the new price.
- Do NOT retroactively update sent proposals.

### [POR CONFIRMAR] resolved to a different value than assumed
- Update catalog/conditions.yaml with the confirmed value.
- Run verify-legal.js on any proposal in outputs/ that referenced that item.
- Re-generate affected proposals if the value changed materially.

### Canonical .md not yet created (Tier 2/3 services)
- Update catalog/services.yaml as the interim SSOT.
- Mark the service status as "pending" — do not generate ejecutiva/comercial derived files.
- Exception: commercial quotes can be generated with explicit [POR CONFIRMAR] on all unconfirmed fields.
