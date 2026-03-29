---
description: "Legal compliance check for any proposal content. Runs all 10 legal blockers (L1-L10) and 7 warnings (W1-W7). Returns APPROVED / APPROVED_WITH_WARNINGS / BLOCKED with exact fix instructions. Use whenever someone pastes proposal text, asks 'can I send this?', 'is this OK to share?', or wants to review existing content before a client meeting — even if they don't say 'verificar' or 'legal check'. Use: /verificar [content or file path]"
user-invocable: true
---

# /verificar — Legal Compliance Check

Activate `legal-guardian` with the following context:

**Content to verify:** `$ARGUMENTS`

**Task:** Run the full L1-L10 blocker check + W1-W7 warnings on the provided content. Do NOT generate proposal files — verification only.

If `$ARGUMENTS` is a file path, read the file first:
```bash
cat [FILE_PATH]
```

Then run:
```bash
node skills/metodologia-proposal-engine/scripts/verify-legal.js --content "[CONTENT]" --json
```

Execute the full checklist:
- L1: Prices match catalog
- L2: No [POR CONFIRMAR] stated as confirmed
- L3: Guarantee clause uses exact wording
- L4: Credit terms correct ("100%, 6 months, non-transferable")
- L5: Result % wrapped with "Indicative target:"
- L6: No out-of-scope promises
- L7: No red list words
- L8: No unconfirmed credit chains stated as fact
- L9: IAC B2C prices marked [POR CONFIRMAR]
- L10: No fixed USD rates

Return the full VerificationReport with:
1. Status (APPROVED ✅ | APPROVED WITH WARNINGS ⚠️ | BLOCKED 🔴)
2. Every blocker found — specific quote from content + fix instruction
3. Every blocker auto-fixable — what would be changed
4. Every active warning — specific recommendation
5. Summary: "Ready to send ✅" or "Fix [N] items before sending 🔴"

If content is empty or too short to check: "Paste the proposal text or provide a file path."
