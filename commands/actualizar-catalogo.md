---
description: "Update the MetodologIA service catalog. Add new services, modify prices, resolve [POR CONFIRMAR] items, or update conditions. Follows the cascade protocol (48h SLA). Use: /actualizar-catalogo [description of change]"
user-invocable: true
---

# /actualizar-catalogo — Catalog Update

Activate `catalog-curator` in EDIT mode with the following context:

**Change requested:** `$ARGUMENTS`

**Task:** Make the requested catalog change following the cascade protocol. Always validate before writing.

Detect the type of change from `$ARGUMENTS`:

**ADD new service:**
- Parse the new service details from input
- Validate against ServiceDefinition schema (references/schemas.md)
- Ask for missing required fields ONE AT A TIME before writing
- Write to `catalog/services.yaml`
- Follow cascade: update conditions.yaml if needed, create canonico.md stub, log in CHANGELOG.md

**UPDATE existing service:**
- Identify slug from input
- Read current entry
- Apply surgical edit (not full rewrite)
- If price change: note old price, new price, effective date
- Log in CHANGELOG.md

**RESOLVE [POR CONFIRMAR]:**
- Identify which PC item is being resolved (PC-01 through PC-14)
- Apply the confirmed value to the relevant YAML entry
- Update status to CONFIRMED
- Log resolution date and confirming authority
- Alert: "PC-[N] resolved. Update proposals generated before [date] if they contain conditional language."

**LIST pending [POR CONFIRMAR]:**
If `$ARGUMENTS` contains "pending" or "por confirmar":
```bash
grep -n "POR_CONFIRMAR\|POR CONFIRMAR" skills/metodologia-proposal-engine/catalog/*.yaml
```
Present as a table with ID, item, current wording, and required confirming authority.

**If $ARGUMENTS is empty:** Ask: "What would you like to update? (add service / modify price / resolve [POR CONFIRMAR] / list services)"

Cascade reminder after every write:
"Change applied. Cascade items requiring follow-up within 48h: [list if applicable]"
