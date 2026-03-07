---
description: Brainstorm business/product names and check domain availability
argument-hint: [industry/description] [optional: style preference]
allowed-tools: WebSearch, WebFetch, Read, Grep, AskUserQuestion, mcp__plugin_domain-business-name-finder_perplexity__*, mcp__plugin_domain-business-name-finder_whois__*, mcp__plugin_domain-business-name-finder_domain-search__*, mcp__plugin_domain-business-name-finder_firecrawl__*
---

Generate business and domain name suggestions for: $ARGUMENTS

## MCP Tools Available

This plugin has 4 MCP servers for domain research. Prefer MCP tools over manual web search when available:

- **Perplexity** (`perplexity_search`, `perplexity_chat`) — AI-powered web search for competitor research, industry naming trends, and brand landscape analysis
- **WHOIS** (`whois_lookup`) — Direct WHOIS protocol lookups for accurate domain registration data
- **Domain Search** — Bulk domain availability checks across multiple TLDs with RDAP/WHOIS fallback (no API key needed)
- **Firecrawl** (`firecrawl_scrape`, `firecrawl_search`) — Scrape registrar pages for pricing and detailed domain info

## Process

1. **Gather context** — If the user hasn't provided enough detail about their business/product, use AskUserQuestion to ask about:
   - What the business or product does
   - Target audience
   - Preferred brand personality (professional, playful, technical, etc.)
   - Any keywords or themes to incorporate
   - Names to avoid or differentiate from

2. **Research the landscape** — Use Perplexity (`perplexity_search`) to research:
   - Competitor names in the user's industry
   - Current naming trends for the sector
   - Names to avoid due to trademark conflicts

3. **Generate 15-20 name candidates** across multiple naming strategies:
   - Compound words (e.g., Salesforce, YouTube)
   - Portmanteau blends (e.g., Pinterest, Groupon)
   - Invented words (e.g., Spotify, Zillow)
   - Metaphors (e.g., Amazon, Slack)
   - Prefix/suffix patterns (e.g., Shopify, Bitly)
   - Descriptive names (e.g., Booking.com)

4. **Shortlist the top 8 candidates** based on memorability, pronounceability, spellability, and uniqueness.

5. **Check domain availability** for each shortlisted name using MCP tools in this priority order:
   - **First**: Use the Domain Search MCP to bulk-check availability across TLDs (.com, .net, .org, .io, .dev, .app, .ai, .co)
   - **Then**: Use WHOIS MCP (`whois_lookup`) to verify results and get registration details for taken domains
   - **Fallback**: Use WebSearch if MCP tools are unavailable

6. **Present results** in a clear table format:

   ```
   | Name        | Strategy    | .com | .io  | .dev | .app | .ai  | .co  |
   |-------------|-------------|------|------|------|------|------|------|
   | ExampleName | Compound    | ❌   | ✅   | ✅   | ✅   | ❌   | ✅   |
   ```

7. **Provide top 3 recommendations** with:
   - Why the name works for their business
   - Best available TLD option
   - Suggested variations if primary TLDs are taken
   - Reminder to check USPTO trademark database and social media handles

If the user wants to explore more options or refine, offer to generate additional names with adjusted criteria.
