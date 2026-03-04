# Notion AI Features — Complete Reference

Comprehensive guide to Notion's AI capabilities: AI autofill properties, AI blocks, meeting notes with AI summaries, AI search, and connected sources.

## AI Autofill Property

### Overview

AI Autofill is a database property type where Notion AI automatically generates values based on the page content and other properties. Configure it with a prompt that tells the AI what to extract or generate.

### Configuration

**Create via API / MCP**:
```json
{
  "AI Summary": {
    "type": "ai_autofill",
    "ai_autofill": {
      "prompt": "Summarize this page in 2-3 sentences"
    }
  }
}
```

### Common Autofill Prompts

| Purpose | Prompt Example |
|---------|---------------|
| Summary | "Summarize the key points from this page in 2-3 sentences" |
| Category | "Categorize this content as one of: Technical, Design, Product, Marketing" |
| Sentiment | "Assess the overall sentiment: Positive, Neutral, or Negative" |
| Key Takeaways | "List the top 3 takeaways from this page" |
| Action Items | "Extract action items mentioned in this page" |
| Priority | "Based on the content, suggest a priority: Low, Medium, High, or Critical" |
| Tags | "Suggest 3-5 relevant tags for this content" |

### How It Works

1. Notion AI reads the page content (title, properties, and body)
2. It applies the configured prompt to generate a value
3. The value auto-updates when page content changes significantly
4. Users can manually trigger a refresh

### Best Practices

- Write clear, specific prompts with expected output format
- Use autofill for classification, summarization, and extraction
- Don't rely on autofill for precise calculations (use formulas instead)
- Combine with views to create auto-categorized databases

## AI Blocks

### Overview

AI blocks are inline content blocks that use Notion AI to generate, transform, or analyze content directly within a page. They are contextual — AI uses surrounding page content as input.

### Capabilities

- **Generate content** — Draft text, create summaries, write outlines
- **Transform content** — Translate, change tone, simplify language
- **Analyze content** — Extract insights, identify patterns, create action items
- **Fill tables** — Populate table rows with AI-generated data

### How to Use

AI blocks are typically created through the Notion UI (type `/AI` or use the AI button). When working via MCP, you can create pages with content that AI can later enhance.

### Content Generation Patterns

When building pages that will use AI features:

1. **Structure first** — Create headings, sections, and placeholders
2. **Provide context** — Include enough content for AI to work with
3. **Leave clear markers** — Use callouts or placeholders where AI content should go

## Meeting Notes

### Overview

Meeting notes blocks (`<meeting-notes>`) are specialized blocks that combine:
- A title (meeting name)
- User-editable notes
- AI-generated summary (from notes + transcript)
- Audio transcript (from Notion's meeting recorder)

### Creating Meeting Notes

```
<meeting-notes>
	Weekly Engineering Sync
	<notes>
		## Agenda
		- Sprint review
		- Technical debt discussion
		- Next sprint planning

		## Decisions
		- Adopt TypeScript for all new services
		- Move to weekly releases starting March
	</notes>
</meeting-notes>
```

### Rules for Meeting Notes Blocks

1. **Creating new blocks**: Omit `<summary>` and `<transcript>` tags
2. **Only include `<notes>`** if the user specifically requests note content
3. **`<transcript>` is read-only** for AI — cannot be created or edited programmatically
4. **`<summary>` is AI-generated** from notes and transcript — cannot be manually set
5. **All sub-content must be indented** deeper than the `<meeting-notes>` tag

### Meeting Notes Workflow

1. User records a meeting (or creates meeting notes manually)
2. If audio is recorded, Notion generates a transcript
3. AI generates a summary based on notes + transcript
4. Notes can be edited and reorganized

### Best Practices for Meeting Notes

- Use clear headings within notes (Agenda, Decisions, Action Items)
- Include attendee names for context
- Structure action items as to-do lists
- Keep the meeting title descriptive (include date or topic)

## AI Search

### Overview

Notion AI search provides semantic search across the workspace and connected sources. Unlike standard search (which matches keywords), AI search understands meaning and context.

### Using AI Search via MCP

The `notion-search` MCP tool provides basic keyword search. For AI-powered semantic search, users can:
- Use the Q&A feature in the Notion UI
- Ask questions in natural language
- AI searches across all accessible content and connected sources

### Search Best Practices

- Use specific, descriptive page titles (AI search ranks by relevance)
- Include keywords in page content for better discoverability
- Organize content logically — AI understands page hierarchies
- Use database properties consistently — they improve search accuracy

## Connected Sources

### Overview

Connected sources allow Notion AI to search and reference external tools and services. When enabled, AI can pull information from:

- Google Drive
- Slack
- Confluence
- GitHub
- And other integrations

### How Connected Sources Work

1. Workspace admin enables connected sources
2. Users authenticate with external services
3. Notion AI indexes content from connected sources
4. AI search queries span both Notion content and connected sources
5. AI blocks can reference information from connected sources

### Impact on AI Features

With connected sources enabled:
- AI search returns results from external tools
- AI autofill can reference external context
- Meeting notes can cross-reference related documents
- Q&A answers can cite external sources

## AI-Powered Templates

### Auto-Generate Page Content

When creating pages, structure them so AI can enhance them:

```
::: callout {icon="🤖" color="blue_bg"}
**AI-Enhanced Project Brief**
:::

## Project Overview
[User fills in basic project description]

## Objectives {toggle="true"}
	[AI can help expand objectives based on the overview]

## Risks & Mitigations {toggle="true"}
	[AI can identify potential risks from the project description]

## Timeline {toggle="true"}
	[AI can suggest milestones based on objectives]
```

### Database Templates with AI Properties

Create databases where AI autofill properties automatically categorize and summarize entries:

```
Database: "Research Notes"
Properties:
- Title (title)
- Source URL (url)
- Content (rich_text) — User pastes or writes content
- AI Summary (ai_autofill) — "Summarize in 2 sentences"
- AI Category (ai_autofill) — "Categorize as: Industry, Technology, Market, or Competitor"
- AI Key Findings (ai_autofill) — "List top 3 findings"
```

## AI Limitations

### What AI Can Do

- Summarize page content
- Generate text based on context
- Categorize and tag content
- Extract structured information
- Translate content
- Change tone and style

### What AI Cannot Do

- Access real-time external data (unless connected sources are configured)
- Perform precise calculations (use formulas)
- Edit transcripts (read-only)
- Create blocks it doesn't have API access to
- Guarantee factual accuracy (always verify AI-generated content)

### Best Practices

1. **Review AI output** — Always verify AI-generated content
2. **Provide context** — More page content = better AI results
3. **Use specific prompts** — Vague prompts produce vague results
4. **Combine with formulas** — Use AI for text, formulas for calculations
5. **Iterate** — Refine autofill prompts based on output quality
