---
description: Brainstorm business/product names and check domain availability
argument-hint: [industry/description] [optional: style preference]
allowed-tools: WebSearch, WebFetch, Read, Grep, AskUserQuestion
---

Generate business and domain name suggestions for: $ARGUMENTS

Follow this process:

1. **Gather context** — If the user hasn't provided enough detail about their business/product, use AskUserQuestion to ask about:
   - What the business or product does
   - Target audience
   - Preferred brand personality (professional, playful, technical, etc.)
   - Any keywords or themes to incorporate
   - Names to avoid or differentiate from

2. **Generate 15-20 name candidates** across multiple naming strategies:
   - Compound words (e.g., Salesforce, YouTube)
   - Portmanteau blends (e.g., Pinterest, Groupon)
   - Invented words (e.g., Spotify, Zillow)
   - Metaphors (e.g., Amazon, Slack)
   - Prefix/suffix patterns (e.g., Shopify, Bitly)
   - Descriptive names (e.g., Booking.com)

3. **Shortlist the top 8 candidates** based on memorability, pronounceability, spellability, and uniqueness.

4. **Check domain availability** for each shortlisted name. Use WebSearch to search for each domain:
   - Search: `"[name].com" domain availability` or `whois [name].com`
   - Check TLDs: .com, .net, .org, .io, .dev, .app, .ai, .co

5. **Present results** in a clear table format:

   ```
   | Name        | Strategy    | .com | .io  | .dev | .app | .ai  | .co  |
   |-------------|-------------|------|------|------|------|------|------|
   | ExampleName | Compound    | ❌   | ✅   | ✅   | ✅   | ❌   | ✅   |
   ```

6. **Provide top 3 recommendations** with:
   - Why the name works for their business
   - Best available TLD option
   - Suggested variations if primary TLDs are taken
   - Reminder to check USPTO trademark database and social media handles

If the user wants to explore more options or refine, offer to generate additional names with adjusted criteria.
