---
description: Check domain name availability across multiple TLDs
argument-hint: [domain-name] [optional: specific TLDs]
allowed-tools: WebSearch, WebFetch, mcp__plugin_domain-business-name-finder_whois__*, mcp__plugin_domain-business-name-finder_domain-search__*, mcp__plugin_domain-business-name-finder_firecrawl__*, mcp__plugin_domain-business-name-finder_perplexity__*
---

Check domain availability for: $ARGUMENTS

## MCP Tools Available

This plugin has 4 MCP servers for domain research. Prefer MCP tools over manual web search:

- **WHOIS** (`whois_lookup`) — Direct WHOIS protocol lookups for accurate domain registration data
- **Domain Search** — Bulk domain availability checks across multiple TLDs (no API key needed)
- **Firecrawl** (`firecrawl_scrape`) — Scrape registrar pages for pricing and detailed domain info
- **Perplexity** (`perplexity_search`) — Search for domain pricing, registrar comparisons

## Process

1. **Parse the input** — Extract the base domain name and any specific TLDs requested. If no TLDs specified, check all default TLDs.

2. **Check availability** using MCP tools in this priority order:
   - **First**: Use the Domain Search MCP to bulk-check the name across all TLDs: .com, .net, .org, .io, .dev, .app, .ai, .co
   - **Then**: Use WHOIS MCP (`whois_lookup`) for detailed registration info on each domain — registrar, expiration date, nameservers
   - **Optionally**: Use Firecrawl to scrape a registrar (e.g., Namecheap, GoDaddy) for current pricing
   - **Fallback**: Use WebSearch if MCP tools are unavailable

3. **Present results** in a table:

   ```
   Domain Check: [name]

   | TLD  | Domain           | Status | Registrar/Notes          | Price Est. |
   |------|------------------|--------|--------------------------|------------|
   | .com | name.com         | ❌/✅  | GoDaddy / Parked / —     | $12/yr     |
   | .io  | name.io          | ❌/✅  | —                        | $40/yr     |
   | .dev | name.dev         | ❌/✅  | —                        | $12/yr     |
   | .app | name.app         | ❌/✅  | —                        | $15/yr     |
   | .ai  | name.ai          | ❌/✅  | —                        | $80/yr     |
   | .co  | name.co          | ❌/✅  | —                        | $30/yr     |
   | .net | name.net         | ❌/✅  | —                        | $12/yr     |
   | .org | name.org         | ❌/✅  | —                        | $12/yr     |
   ```

4. **If all preferred TLDs are taken**, suggest:
   - Creative alternatives: `get[name].com`, `[name]hq.com`, `use[name].com`, `[name]app.com`
   - Check those alternatives for availability using the same MCP tools
   - Offer to brainstorm similar but distinct names using `/find-names`

5. **Provide next steps**:
   - Recommend checking the USPTO trademark database
   - Suggest verifying social media handle availability (@name)
   - Note approximate pricing for available TLDs (use Perplexity or Firecrawl to get current pricing if possible)
