---
description: "Browse the MetodologIA service catalog. List all services with prices, segments, and status. Supports filters: tier, segment, type, brand. Use: /catalogo [filter: tier:1 | b2b | b2c | workshop | bootcamp | iac]"
user-invocable: true
---

# /catalogo — Catalog Browser

Activate `catalog-curator` in LIST mode with the following context:

**Filter received:** `$ARGUMENTS`

**Task:** Present the catalog in a readable format. No writes.

```bash
node skills/metodologia-proposal-engine/scripts/catalog-query.js --list all --json
```

Apply filter if provided:
- `tier:1` → show only Tier 1 services
- `tier:2` → Tier 2 only
- `tier:3` / `iac` → Tier 3 (IAC channel) only
- `b2b` → services with B2B segment
- `b2c` → services with B2C segment
- `workshop` → Workshop type only
- `bootcamp` → Bootcamp type only
- `[any text]` → fuzzy search on canonical_name and slug

**Present as:**

## Catálogo MetodologIA — [N] servicios

### Tier 1 — Canónicos certificados
| Servicio | Tipo | B2C COP | B2B COP | Segmentos |
|----------|------|---------|---------|-----------|
| [name] | [type] | [price or —] | [price or —] | [segments] |

### Tier 2 — Canónicos con precios confirmados
[same table format]

### Tier 3 — IAC (canal corporativo)
[same table format]
Note: "Tier 3 = canal IAC solamente. Precios B2C requieren confirmación [PC-02]."

**After the table:**
- Show active [POR CONFIRMAR] items count: "14 items pendientes de confirmación"
- Show total services: "17 servicios en catálogo"
- Show tip: "Para generar una propuesta: /propuesta [descripción del cliente]. Para actualizar el catálogo: /actualizar-catalogo"
