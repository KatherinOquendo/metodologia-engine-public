---
description: "Browse the MetodologIA service catalog. List all services with prices, segments, and status. Supports filters: tier, segment, type, brand. Use: /catalogo [filter: tier:1 | b2b | b2c | workshop | bootcamp | iac]"
user-invocable: true
---

# /catalogo — Catalog Browser

Activate `catalog-curator` in LIST mode.

**Filter received:** `$ARGUMENTS`

---

## Steps

1. Query catalog:
   ```bash
   node skills/metodologia-proposal-engine/scripts/catalog-query.js --list all --json
   ```
   If script unavailable: read `skills/metodologia-proposal-engine/catalog/services.yaml` directly.

2. Apply filter from `$ARGUMENTS`:

| Filter | What it shows |
|--------|--------------|
| `tier:1` | Tier 1 only (canonical, confirmed pricing) |
| `tier:2` | Tier 2 only |
| `tier:3` or `iac` | Tier 3 (IAC channel only) |
| `b2b` | Services with B2B segment |
| `b2c` | Services with B2C segment (excludes [POR CONFIRMAR] B2C) |
| `workshop` | Workshop type only |
| `bootcamp` | Bootcamp type only |
| `programa` or `program` | Program type only |
| `[any other text]` | Fuzzy search on canonical_name and slug |
| (empty) | All services, organized by tier |

3. Present as formatted tables by tier:

---

## Catálogo MetodologIA

### Tier 1 — Canónicos certificados (precios confirmados)
| Servicio | Tipo | Duración | B2C COP | B2B COP | Estado |
|----------|------|----------|---------|---------|--------|
| [name] | [type] | [hours]h | [price or —] | [price or [PC]] | [status] |

### Tier 2 — Precios confirmados, canónicos parciales
[same table format]

### Tier 3 — Canal IAC (B2B únicamente)
[same table format]
> **Nota:** Tier 3 opera exclusivamente por canal IAC. Precios B2C requieren confirmación [PC-02].

---

## Footer (always show)

- Active [POR CONFIRMAR] items: "[N] ítems pendientes"
- Total: "[N] servicios en catálogo"
- Tips: "Para generar propuesta: `/propuesta [descripción]` · Para actualizar: `/actualizar-catalogo` · Para precio: `/cotizacion [servicio]`"

---

## Edge cases

- **Empty catalog (no YAML):** "El catálogo no está disponible en este directorio. Verifica que el plugin está correctamente instalado."
- **Malformed filter (e.g., `tier:5`):** Show all services and add note: "Filtro 'tier:5' no reconocido — mostrando catálogo completo."
- **Search returns zero results:** "Ningún servicio coincide con '[filter]'. Mostrando catálogo completo." Then show all.
