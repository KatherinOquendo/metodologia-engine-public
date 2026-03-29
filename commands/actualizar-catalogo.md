---
description: "Update the MetodologIA service catalog. Add new services, modify prices, resolve [POR CONFIRMAR] items, or update conditions. Requires written authorization for confirmed changes. Follows cascade protocol (48h SLA). Use: /actualizar-catalogo [description of change]"
user-invocable: true
---

# /actualizar-catalogo — Catalog Update

Activate `catalog-curator` in EDIT mode.

**Change requested:** `$ARGUMENTS`

---

## Authority check (before any write)

`catalog-curator` will verify authorization before modifying the catalog. The required authority per change type is defined in `catalog-curator.md`. Key rule: **oral confirmation is not sufficient** — written confirmation (email, Slack message, explicit statement quoting JM's written words) is required for all price changes and PC resolutions.

---

## Change type detection

`catalog-curator` detects the change type from `$ARGUMENTS`:

| Input pattern | Change type |
|--------------|-------------|
| "agregar servicio", "add service", "nuevo servicio" | ADD — parse definition, validate schema, write |
| "cambiar precio", "price change", "actualizar precio" | UPDATE — surgical edit, log old/new/date |
| "confirmar PC-[N]", "resolved PC-[N]", "JM confirmó" | RESOLVE PC — authority check, then update |
| "pending", "por confirmar", "listar PC" | LIST — show all active PC items as table |
| (empty) | Ask: "¿Qué quieres actualizar? (agregar servicio / modificar precio / resolver [POR CONFIRMAR] / listar servicios)" |

---

## What catalog-curator will do

For each change type:

**ADD:** Validate required fields → check slug uniqueness → write to `services.yaml` → cascade to `conditions.yaml`, `segments.yaml`, `canonico.md` stub → log CHANGELOG.

**UPDATE:** Read current entry → apply surgical edit → record old+new values → log CHANGELOG.

**RESOLVE PC:** Verify written authority → update `conditions.yaml` → update `services.yaml` affected entries → remove conditional wording → update CLAUDE.md PC table → log CHANGELOG.

**LIST pending:** `grep -n "POR_CONFIRMAR\|POR CONFIRMAR" skills/metodologia-proposal-engine/catalog/*.yaml` → present as table with PC item ID, affected service, required authority, and conditional wording to use until resolved.

---

## Cascade reminder

After every write, `catalog-curator` will list cascade items with 48h SLA. Human follow-up is required for derived document updates (audience-version files, CLAUDE.md summary, etc.).

---

## Edge cases

- **Conflicting information (two prices for same service):** Pause; show the conflict; ask which is correct. Do not guess.
- **Batch update (multiple changes at once):** Process one change at a time. Confirm each before moving to the next.
- **Request to delete a service:** Flag that deletion is irreversible. Suggest `status: deprecated` instead. Require explicit confirmation with "yes, delete [slug]" before any removal.
