---
description: "Legal compliance check for any proposal content. Runs all 10 legal blockers (L1-L10) and 7 warnings (W1-W7). Returns APPROVED / APPROVED_WITH_WARNINGS / BLOCKED with exact fix instructions. Use whenever someone pastes proposal text, asks 'can I send this?', 'is this OK to share?', or wants to review existing content before a client meeting — even if they don't say 'verificar' or 'legal check'. Use: /verificar [content or file path]"
user-invocable: true
---

# /verificar — Legal Compliance Check

Activate `legal-guardian` for a standalone verification run.

**Content to verify:** `$ARGUMENTS`

---

## Steps

1. **Resolve input:**
   - If `$ARGUMENTS` is a file path (starts with `/`, `./`, or `~`):
     ```bash
     cat [FILE_PATH]
     ```
     If file does not exist: "File not found: [path]. Paste the proposal content directly instead."
   - If `$ARGUMENTS` is direct text: use as-is.
   - If `$ARGUMENTS` is empty: "Paste the proposal text or provide a file path to check."

2. **Reject binary content:** If the file appears binary (PDF, image, non-text): "Can't check binary files. Export the content as text or markdown first."

3. **Run automated check:**
   ```bash
   node skills/metodologia-proposal-engine/scripts/verify-legal.js --content "[CONTENT]" --json
   ```

4. **Execute full L1-L10 + W1-W7 checklist manually** (automated tool is a supplement, not the complete check):
   - L1: Price matches catalog
   - L2: No [POR CONFIRMAR] stated as confirmed
   - L3: Guarantee clause exact wording (only check if guarantee words present)
   - L4: Credit terms "100%, 6 months, non-transferable"
   - L5: Result % wrapped with "Indicative target:"
   - L6: No out-of-scope promises
   - L7: No red list words
   - L8: No unconfirmed credit chains stated as fact
   - L9: IAC B2C prices marked [POR CONFIRMAR]
   - L10: USD amounts include "(indicative rate, subject to variation)"

5. **Return:**

```
RESULTADO DE VERIFICACIÓN
==========================
Estado: ✅ APROBADO | ⚠️ APROBADO CON ADVERTENCIAS | 🔴 BLOQUEADO

Bloqueadores encontrados: [N]
  [ID]: "[quoted offending text]" → Fix: [exact replacement]

Bloqueadores auto-corregibles: [N]
  [ID]: "[original]" → "[corrected]"

Advertencias activas: [N]
  [ID]: [what triggers it] → [recommended action]

---
[APROBADO ✅] Listo para enviar.
[o]
[BLOQUEADO 🔴] Corrige [N] ítems antes de enviar. Ver lista arriba.
```

---

## Edge cases

- **Content too short to check meaningfully (< 50 words):** Run checks anyway; results may be "N/A" for most. Show what was checked.
- **Content in English only:** Apply EN-language red list checks. L3 checks English guarantee clause. All blockers apply equally.
- **Content already has all fixes applied:** Return APPROVED and confirm: "All 10 blockers checked — no issues found."
- **Mixed draft + final content:** Check everything. Flag if something appears to be a placeholder (`[CLIENT NAME]`, `[PRICE]`) — these are not blockers but note them: "Placeholder found: '[CLIENT NAME]' — replace before sending."
