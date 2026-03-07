---
description: Check domain name availability across multiple TLDs
argument-hint: [domain-name] [optional: specific TLDs]
allowed-tools: WebSearch, WebFetch
---

Check domain availability for: $ARGUMENTS

Follow this process:

1. **Parse the input** — Extract the base domain name and any specific TLDs requested. If no TLDs specified, check all default TLDs.

2. **Check availability** across these TLDs using WebSearch:
   - **Primary**: .com, .net, .org
   - **Tech**: .io, .dev, .app, .ai, .co

   For each TLD, search: `"[name].[tld]" whois OR availability OR "is available" OR "is taken"`

3. **Present results** in a table:

   ```
   Domain Check: [name]

   | TLD  | Domain           | Status | Notes            |
   |------|------------------|--------|------------------|
   | .com | name.com         | ❌/✅  | Parked/Active/—  |
   | .io  | name.io          | ❌/✅  | —                |
   | .dev | name.dev         | ❌/✅  | —                |
   | .app | name.app         | ❌/✅  | —                |
   | .ai  | name.ai          | ❌/✅  | —                |
   | .co  | name.co          | ❌/✅  | —                |
   | .net | name.net         | ❌/✅  | —                |
   | .org | name.org         | ❌/✅  | —                |
   ```

4. **If all preferred TLDs are taken**, suggest:
   - Creative alternatives: `get[name].com`, `[name]hq.com`, `use[name].com`, `[name]app.com`
   - Check those alternatives for availability too
   - Offer to brainstorm similar but distinct names using `/find-names`

5. **Provide next steps**:
   - Recommend checking the USPTO trademark database
   - Suggest verifying social media handle availability (@name)
   - Note approximate pricing for available TLDs
