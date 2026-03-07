---
name: naming-strategies
description: This skill should be used when the user asks to "find a business name", "suggest domain names", "brainstorm company names", "check domain availability", "name my startup", "find a brand name", "suggest product names", "help me pick a name", or discusses naming a new business, project, app, or product. Provides naming methodology, TLD guidance, and availability-checking workflows.
version: 0.1.0
---

# Business & Domain Name Finder

## Purpose

Provide structured naming methodology for businesses, products, apps, and projects — combining creative brainstorming with real-time domain availability checking via web search.

## When to Use

Activate when a user needs help naming a business, product, startup, app, or project and wants to find available domain names. Also activate when checking if specific domain names are taken.

## Naming Process

### Step 1: Gather Context

Before generating names, collect key information:

- **Industry/niche** — What does the business do?
- **Target audience** — Who are the customers?
- **Brand personality** — Professional, playful, technical, luxurious?
- **Keywords** — Core concepts, values, or descriptors
- **Competitors** — Names to differentiate from
- **Preferences** — Length, style, any must-have letters or sounds

If the user hasn't provided these, ask targeted questions before brainstorming.

### Step 2: Generate Names Using Multiple Strategies

Apply these naming strategies to produce diverse candidates:

| Strategy | Technique | Examples |
|----------|-----------|---------|
| **Compound** | Combine two real words | Salesforce, YouTube, Facebook |
| **Portmanteau** | Blend parts of words | Pinterest (pin+interest), Groupon (group+coupon) |
| **Invented** | Create new words | Spotify, Xerox, Kodak, Hulu |
| **Metaphor** | Use symbolic/evocative words | Amazon, Apple, Uber, Slack |
| **Abbreviation** | Acronyms or shortened forms | IBM, NASA, Etsy |
| **Prefix/Suffix** | Add common modifiers | Shopify (-ify), Bitly (-ly), Clearbit (clear-) |
| **Phonetic** | Sound-driven coinage | Google, Skype, TikTok |
| **Descriptive** | Directly describe function | Booking.com, WeTransfer |
| **Foreign word** | Borrow from other languages | Volvo (Latin: "I roll"), Lego (Danish: "play well") |
| **Personal** | Founder or character names | Tesla, Disney, Bloomberg |

Generate 10-20 candidates across at least 4 different strategies for variety.

### Step 3: Evaluate Candidates

Score each candidate on:

1. **Memorability** — Easy to recall after hearing once?
2. **Pronounceability** — Can people say it without confusion?
3. **Spellability** — Can people type it from hearing it?
4. **Uniqueness** — Distinctive from competitors?
5. **Scalability** — Works if the business expands beyond initial scope?
6. **Domain potential** — Likely to have TLDs available?

Shortlist the top 5-8 candidates.

### Step 4: Check Domain Availability

For each shortlisted name, check availability across these TLDs:

**Primary TLDs (always check):**
- `.com` — Universal standard, highest credibility
- `.net` — Strong alternative for tech
- `.org` — Non-profits, communities, open-source

**Tech TLDs (check for tech/startup names):**
- `.io` — Popular for developer tools, SaaS
- `.dev` — Google-backed, developer-focused
- `.app` — Mobile apps, software products
- `.ai` — AI/ML companies
- `.co` — Startup-friendly alternative to .com

**Checking method:**
Use the WebSearch tool to search for `"domainname.tld" site:instantdomainsearch.com OR site:namecheap.com OR whois` to determine availability. Alternatively, search `domainname.tld availability` or `whois domainname.tld`.

Present results in a clear table:

```
| Name         | .com | .io  | .dev | .app | .ai  | .co  |
|-------------|------|------|------|------|------|------|
| BrightFlow  | ❌   | ✅   | ✅   | ✅   | ❌   | ✅   |
| CodeNest    | ❌   | ✅   | ✅   | ❌   | ✅   | ✅   |
```

### Step 5: Present Recommendations

For each recommended name, provide:

1. **Name and available TLDs**
2. **Naming strategy used** (compound, invented, etc.)
3. **Why it works** — Brief rationale
4. **Variations** — Alternative spellings or TLD combinations
5. **Potential concerns** — Trademark risks, pronunciation issues

## Domain Availability Tips

- If `.com` is taken, check if the owner is actively using it — parked domains may be purchasable
- Consider creative TLD usage: `get[name].com`, `[name]hq.com`, `[name]app.com`
- Hyphenated domains (e.g., `bright-flow.com`) are generally discouraged for branding
- Two-word `.com` domains under 12 characters are extremely scarce — plan for alternatives
- New TLDs (`.io`, `.dev`, `.app`) are increasingly accepted for tech companies

## Trademark Considerations

Always remind users to:

1. Search the USPTO trademark database (tmsearch.uspto.gov) before committing
2. Check for existing businesses with similar names in their industry
3. Verify social media handle availability (@name on major platforms)
4. Consider international trademark implications if operating globally

## Additional Resources

### Reference Files

For detailed naming patterns and industry-specific guidance:
- **`references/naming-patterns.md`** — Extended naming techniques with 50+ examples
- **`references/tld-guide.md`** — Comprehensive TLD comparison and pricing guide
