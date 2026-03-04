# Page Design Patterns — Professional Notion Pages

Design principles, layout patterns, and color schemes for creating polished, professional Notion pages.

## Design Philosophy

### Core Principles

1. **Scannable structure** — Toggle headings let users expand only what they need
2. **Visual hierarchy** — Hero callout → section headings → content → details
3. **Breathing room** — Dividers between major sections, not between every block
4. **Consistent color scheme** — Pick 2-3 colors and use them throughout
5. **Non-obtrusive navigation** — TOC inside a toggle or column, never at the very top
6. **Mixed block types** — Alternate headings, text, callouts, tables, and images to avoid walls of text
7. **Progressive disclosure** — Overview first, details in toggles

### What Makes Pages Look Professional

**DO**:
- Lead with a callout block (icon + brief description) to set context
- Use toggle headings to keep the page compact and scannable
- Place related content in columns (2 or 3)
- Use callouts sparingly for emphasis (tips, warnings, prerequisites)
- Keep a consistent color palette
- Use dividers between major sections

**DON'T**:
- Put a table of contents at the very top — it pushes content down
- Use more than 3-4 colors — it looks chaotic
- Create deeply nested toggles (max 2 levels)
- Put everything in callouts — it dilutes their emphasis
- Use empty lines for spacing — Notion handles this automatically
- Mix too many block types in one section

## Color Schemes

### Professional Blue

| Element | Color |
|---------|-------|
| Hero callout | `blue_bg` |
| Section callouts | `gray_bg` |
| Info highlights | `blue` text |
| Warning callouts | `yellow_bg` |
| Accent text | `blue` |

### Warm Earth

| Element | Color |
|---------|-------|
| Hero callout | `brown_bg` |
| Section callouts | `orange_bg` |
| Key metrics | `orange` text |
| Notes | `yellow_bg` |
| Accent text | `brown` |

### Modern Minimal

| Element | Color |
|---------|-------|
| Hero callout | `gray_bg` |
| Everything else | Default (no color) |
| Emphasis only | `blue` text sparingly |
| Warnings only | `red` text |

### Status Colors (Universal)

| Status | Color | Use |
|--------|-------|-----|
| Success / Done | `green_bg` or `green` text | Completed items, positive metrics |
| Warning / Review | `yellow_bg` or `orange` text | Needs attention, pending items |
| Error / Blocked | `red_bg` or `red` text | Critical issues, blockers |
| Info / Note | `blue_bg` or `blue` text | Informational, tips |
| Neutral / Default | `gray_bg` or `gray` text | De-emphasized, metadata |

## Layout Patterns

### Pattern 1: Hero + Sections

The most common professional layout. A hero callout sets context, then toggle heading sections organize content.

```
::: callout {icon="🚀" color="blue_bg"}
**Project Dashboard** — Track progress, milestones, and blockers at a glance.
:::

---

## 📊 Status Overview {toggle="true"}
	Current sprint metrics and health indicators...

## 🎯 Goals & Milestones {toggle="true"}
	Quarterly goals with progress tracking...

## 🚧 Blockers & Risks {toggle="true"}
	Active blockers requiring attention...

## 📝 Meeting Notes {toggle="true"}
	Latest meeting summaries and action items...
```

### Pattern 2: Two-Column Dashboard

Split layout with metrics on one side and actions on the other.

```
::: callout {icon="📊" color="blue_bg"}
**Weekly Report** — Key metrics and action items for the week of Jan 6.
:::

---

<columns>
	<column>
		## 📈 Key Metrics {toggle="true"}
			::: callout {icon="✅" color="green_bg"}
			**Revenue**: $142K (+12% WoW)
			:::
			::: callout {icon="📊" color="blue_bg"}
			**Active Users**: 8,241 (+5%)
			:::
			::: callout {icon="⚠️" color="yellow_bg"}
			**Churn Rate**: 3.2% (+0.4%)
			:::
	</column>
	<column>
		## ✅ Action Items {toggle="true"}
			- [ ] Review Q1 budget allocation
			- [ ] Schedule customer interviews
			- [x] Deploy v2.3 hotfix
			- [x] Update stakeholder slides
	</column>
</columns>
```

### Pattern 3: Wiki / Knowledge Base

Clean reference layout with sidebar navigation.

```
::: callout {icon="📚" color="gray_bg"}
**Engineering Wiki** — Standards, processes, and technical documentation.
:::

---

<columns>
	<column>
		### Navigation
		- <mention-page url="{{URL}}">Getting Started</mention-page>
		- <mention-page url="{{URL}}">Architecture</mention-page>
		- <mention-page url="{{URL}}">API Reference</mention-page>
		- <mention-page url="{{URL}}">Deployment Guide</mention-page>
		- <mention-page url="{{URL}}">Troubleshooting</mention-page>
	</column>
	<column>
		## Overview
		Welcome to the engineering knowledge base. This wiki covers architecture decisions, coding standards, deployment processes, and operational runbooks.

		### Quick Links
		::: callout {icon="🔗" color="blue_bg"}
		**GitHub**: [repo link](URL) | **CI/CD**: [pipeline link](URL) | **Monitoring**: [dashboard link](URL)
		:::
	</column>
</columns>
```

### Pattern 4: Meeting Notes Template

Structured layout for recurring meetings.

```
::: callout {icon="🗓️" color="purple_bg"}
**Team Standup** — Daily sync for the engineering team.
:::

---

## Attendees
@Person1, @Person2, @Person3

## 📋 Agenda {toggle="true"}
	1. Yesterday's progress
	2. Today's plan
	3. Blockers

## 🔄 Updates {toggle="true"}
	### Person 1
	- Completed API migration for user service
	- Starting database index optimization

	### Person 2
	- Deployed monitoring dashboards
	- Investigating memory leak in worker process

## 🚧 Blockers {toggle="true"}
	::: callout {icon="🔴" color="red_bg"}
	**Blocked**: CI pipeline failing on integration tests — waiting on DevOps fix.
	:::

## ✅ Action Items {toggle="true"}
	- [ ] @Person1 — Open PR for index changes by EOD
	- [ ] @Person2 — File ticket for memory leak investigation
```

### Pattern 5: Project Tracker

Detailed project page with linked databases and status tracking.

```
::: callout {icon="🎯" color="green_bg"}
**Q1 Product Launch** — Ship v3.0 with new dashboard, API v2, and mobile app.
:::

---

<columns>
	<column>
		::: callout {icon="📅" color="gray_bg"}
		**Timeline**: Jan 15 – Mar 31
		**Owner**: @ProjectLead
		**Status**: On Track
		:::
	</column>
	<column>
		::: callout {icon="📊" color="gray_bg"}
		**Progress**: 62% complete
		**Sprints remaining**: 4
		**Open blockers**: 2
		:::
	</column>
</columns>

---

## 📋 Workstreams {toggle="true"}
	### Frontend Dashboard
	- [x] Design mockups approved
	- [x] Component library setup
	- [ ] Data visualization widgets
	- [ ] User testing

	### API v2
	- [x] Schema design
	- [ ] Endpoint implementation
	- [ ] Documentation
	- [ ] Load testing

	### Mobile App
	- [x] Wireframes
	- [ ] iOS prototype
	- [ ] Android port
	- [ ] App store submission

## 🚧 Risks & Mitigations {toggle="true"}
	<table header-row="true" fit-page-width="true">
		<tr>
			<td>**Risk**</td>
			<td>**Impact**</td>
			<td>**Mitigation**</td>
		</tr>
		<tr color="red_bg">
			<td>API team understaffed</td>
			<td>High</td>
			<td>Hire contractor for Q1</td>
		</tr>
		<tr color="yellow_bg">
			<td>iOS review delays</td>
			<td>Medium</td>
			<td>Submit 2 weeks early</td>
		</tr>
	</table>
```

### Pattern 6: Onboarding Guide

Step-by-step guide with progress tracking.

```
::: callout {icon="👋" color="blue_bg"}
**Welcome to the Team!** — Follow this guide to get set up and productive.
:::

---

## Day 1: Setup {toggle="true"}
	- [ ] Get laptop and access credentials
	- [ ] Install development tools (see checklist below)
	- [ ] Join Slack channels: #engineering, #standup, #random
	- [ ] Read the team handbook

	::: callout {icon="💡" color="yellow_bg"}
	**Tip**: Ask your buddy if you get stuck on any setup step. No question is too small!
	:::

## Week 1: Learn {toggle="true"}
	- [ ] Complete architecture overview session
	- [ ] Shadow 2 code reviews
	- [ ] Deploy to staging environment
	- [ ] Meet with each team lead (30 min each)

## Week 2-4: Contribute {toggle="true"}
	- [ ] Pick up your first "good first issue"
	- [ ] Submit your first PR
	- [ ] Present at team demo
	- [ ] Write your first design doc
```

## Table of Contents Placement

### Rule: Never at the Very Top

A TOC at the top of a page pushes the actual content down and forces users to scroll past a list of links.

### Good Placements

**In a toggle** (recommended for long pages):
```
<details>
<summary>Table of Contents</summary>
	<table_of_contents/>
</details>
```

**In a sidebar column** (recommended for wiki pages):
```
<columns>
	<column>
		### Contents
		<table_of_contents/>
	</column>
	<column>
		## Main Content
		Your page content here...
	</column>
</columns>
```

**After the hero section** (acceptable for shorter pages):
```
::: callout {icon="📚" color="blue_bg"}
**Documentation Hub** — Everything you need to know.
:::

<table_of_contents/>

---

## Section 1
...
```

## Image and Media Patterns

### Wrapped Image with Text

Use columns to wrap images beside text:

```
<columns>
	<column>
		![Product screenshot](URL)
	</column>
	<column>
		### Feature Name
		Description of the feature shown in the screenshot. Explain key highlights and how users benefit from this functionality.

		::: callout {icon="💡" color="blue_bg"}
		**Pro tip**: Use keyboard shortcut Cmd+K for quick access.
		:::
	</column>
</columns>
```

### Image Gallery

```
<columns>
	<column>
		![Screenshot 1](URL)
	</column>
	<column>
		![Screenshot 2](URL)
	</column>
	<column>
		![Screenshot 3](URL)
	</column>
</columns>
```

### Hero Image

Place a full-width image right after the hero callout:

```
::: callout {icon="🎨" color="purple_bg"}
**Design System** — Components, tokens, and guidelines.
:::

![Design system overview](URL)

---
```

## Callout Patterns

### Semantic Callouts

```
::: callout {icon="💡" color="yellow_bg"}
**Tip**: Helpful advice or shortcut.
:::

::: callout {icon="⚠️" color="orange_bg"}
**Warning**: Something to be careful about.
:::

::: callout {icon="🔴" color="red_bg"}
**Critical**: Must be addressed immediately.
:::

::: callout {icon="ℹ️" color="blue_bg"}
**Note**: Additional context or background information.
:::

::: callout {icon="✅" color="green_bg"}
**Success**: Confirmation that something worked.
:::

::: callout {icon="📌" color="gray_bg"}
**Prerequisite**: What you need before starting.
:::
```

### Metric Card Callouts

```
<columns>
	<column>
		::: callout {icon="💰" color="green_bg"}
		**Revenue**
		$142,000
		+12% vs last week
		:::
	</column>
	<column>
		::: callout {icon="👥" color="blue_bg"}
		**Users**
		8,241
		+5% vs last week
		:::
	</column>
	<column>
		::: callout {icon="📈" color="purple_bg"}
		**NPS Score**
		72
		+3 pts vs last month
		:::
	</column>
</columns>
```

## Responsive Design Considerations

- **2 columns** is the most common and readable layout
- **3 columns** works for metric cards and image galleries
- **4+ columns** generally too narrow for meaningful content
- On mobile, columns stack vertically — design content to work in both orientations
- Keep column content concise — long text in narrow columns is hard to read
- Use full-width for detailed content (tables, code blocks, long text)
