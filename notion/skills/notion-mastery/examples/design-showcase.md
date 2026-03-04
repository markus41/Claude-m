# Design Showcase — Beautiful Notion Page Layouts

Complete Notion-flavored Markdown source for visually polished page designs. Each showcases different design patterns and block combinations.

## Showcase 1: Company Intranet Landing Page

**Design patterns used**: Hero callout, 3-column metric cards, toggle sections, callout cards, table.

```
::: callout {icon="🏢" color="blue_bg"}
**Acme Corp Intranet** — Your one-stop hub for company news, resources, and tools.
:::

---

<columns>
	<column>
		::: callout {icon="📢" color="yellow_bg"}
		**Announcements**
		All-hands meeting this Friday at 3 PM. New benefits package rolling out in April.
		:::
	</column>
	<column>
		::: callout {icon="🎉" color="green_bg"}
		**Wins This Week**
		Closed our biggest deal of Q1! Customer satisfaction score hit 92%.
		:::
	</column>
	<column>
		::: callout {icon="📊" color="purple_bg"}
		**Company Metrics**
		ARR: $4.2M (+18%)
		Headcount: 48
		NPS: 72
		:::
	</column>
</columns>

---

## 🏠 Quick Links {toggle="true"}
	<columns>
		<column>
			### 🛠️ Tools
			- [HR Portal](URL)
			- [Expense Reports](URL)
			- [IT Help Desk](URL)
			- [PTO Calendar](URL)
		</column>
		<column>
			### 📚 Resources
			- [Employee Handbook](URL)
			- [Brand Guidelines](URL)
			- [Engineering Wiki](URL)
			- [Sales Playbook](URL)
		</column>
		<column>
			### 👥 Teams
			- [Engineering](URL)
			- [Product](URL)
			- [Sales](URL)
			- [Marketing](URL)
		</column>
	</columns>

## 📅 Upcoming Events {toggle="true"}
	<table header-row="true" fit-page-width="true">
		<tr>
			<td>**Date**</td>
			<td>**Event**</td>
			<td>**Location**</td>
			<td>**RSVP**</td>
		</tr>
		<tr color="blue_bg">
			<td>Mar 1</td>
			<td>All-Hands Meeting</td>
			<td>Main Conference Room</td>
			<td>[RSVP](URL)</td>
		</tr>
		<tr>
			<td>Mar 8</td>
			<td>Lunch & Learn: AI in Production</td>
			<td>Kitchen Area</td>
			<td>[RSVP](URL)</td>
		</tr>
		<tr>
			<td>Mar 15</td>
			<td>Team Building: Bowling Night</td>
			<td>Lucky Strike Lanes</td>
			<td>[RSVP](URL)</td>
		</tr>
	</table>

## 🆕 New Hires {toggle="true"}
	Welcome our newest team members! 👋

	<columns>
		<column>
			::: callout {icon="👤" color="gray_bg"}
			**Sarah Chen** — Senior Engineer
			Joining the Platform team from Google. Loves hiking and board games.
			:::
		</column>
		<column>
			::: callout {icon="👤" color="gray_bg"}
			**Marcus Johnson** — Product Designer
			Previously at Figma. Passionate about accessible design.
			:::
		</column>
	</columns>
```

## Showcase 2: API Documentation Page

**Design patterns used**: Hero with quick links, columns with sidebar TOC, callout tips, code blocks, tables.

```
::: callout {icon="🔌" color="gray_bg"}
**API Reference v2.0** — Complete endpoint documentation for the Acme REST API.
:::

<columns>
	<column>
		### 📑 Contents
		<table_of_contents/>
	</column>
	<column>
		::: callout {icon="🔑" color="yellow_bg"}
		**Authentication**: All requests require a Bearer token. Get your API key from the [Developer Portal](URL).
		:::

		::: callout {icon="📦" color="blue_bg"}
		**Base URL**: `https://api.acme.com/v2`
		**Rate Limit**: 100 req/min
		**Format**: JSON
		:::
	</column>
</columns>

---

## Authentication {toggle="true"}
	Include the API key in the Authorization header:

	```bash
	curl -H "Authorization: Bearer YOUR_API_KEY" \
	     https://api.acme.com/v2/users
	```

	::: callout {icon="⚠️" color="orange_bg"}
	**Never expose your API key** in client-side code. Always make API calls from your server.
	:::

## Users {toggle="true"}
	### GET /users
	List all users with pagination.

	**Parameters**:
	<table header-row="true" fit-page-width="true">
		<tr>
			<td>**Parameter**</td>
			<td>**Type**</td>
			<td>**Required**</td>
			<td>**Description**</td>
		</tr>
		<tr>
			<td>`page`</td>
			<td>integer</td>
			<td>No</td>
			<td>Page number (default: 1)</td>
		</tr>
		<tr>
			<td>`per_page`</td>
			<td>integer</td>
			<td>No</td>
			<td>Items per page (default: 20, max: 100)</td>
		</tr>
		<tr>
			<td>`status`</td>
			<td>string</td>
			<td>No</td>
			<td>Filter by status: `active`, `inactive`</td>
		</tr>
	</table>

	**Response**:
	```json
	{
	  "data": [
	    {
	      "id": "usr_abc123",
	      "name": "Jane Doe",
	      "email": "jane@example.com",
	      "status": "active",
	      "created_at": "2024-01-15T10:30:00Z"
	    }
	  ],
	  "pagination": {
	    "page": 1,
	    "per_page": 20,
	    "total": 156
	  }
	}
	```

	---

	### POST /users
	Create a new user.

	**Request Body**:
	```json
	{
	  "name": "Jane Doe",
	  "email": "jane@example.com",
	  "role": "member"
	}
	```

	**Response**: `201 Created`

	::: callout {icon="💡" color="blue_bg"}
	**Tip**: Duplicate emails are rejected with a `409 Conflict` response.
	:::

## Error Codes {toggle="true"}
	<table header-row="true" fit-page-width="true">
		<tr>
			<td>**Code**</td>
			<td>**Meaning**</td>
			<td>**Action**</td>
		</tr>
		<tr>
			<td>`400`</td>
			<td>Bad Request</td>
			<td>Check request body format</td>
		</tr>
		<tr>
			<td>`401`</td>
			<td>Unauthorized</td>
			<td>Verify API key</td>
		</tr>
		<tr>
			<td>`403`</td>
			<td>Forbidden</td>
			<td>Check permissions</td>
		</tr>
		<tr>
			<td>`404`</td>
			<td>Not Found</td>
			<td>Verify resource ID</td>
		</tr>
		<tr color="yellow_bg">
			<td>`429`</td>
			<td>Rate Limited</td>
			<td>Wait and retry with backoff</td>
		</tr>
		<tr color="red_bg">
			<td>`500`</td>
			<td>Server Error</td>
			<td>Retry after delay</td>
		</tr>
	</table>
```

## Showcase 3: Quarterly Business Review

**Design patterns used**: Hero callout, metric columns, color-coded tables, mermaid chart, toggle sections.

```
::: callout {icon="📊" color="purple_bg"}
**Q1 2024 Business Review** — Performance summary, key initiatives, and outlook for Q2.
:::

---

<columns>
	<column>
		::: callout {icon="💰" color="green_bg"}
		**Revenue**
		$1.42M
		<span color="green">▲ 18% vs Q4</span>
		:::
	</column>
	<column>
		::: callout {icon="👥" color="blue_bg"}
		**Customers**
		824
		<span color="green">▲ 12% vs Q4</span>
		:::
	</column>
	<column>
		::: callout {icon="📈" color="purple_bg"}
		**MRR**
		$473K
		<span color="green">▲ 8% vs Q4</span>
		:::
	</column>
	<column>
		::: callout {icon="⏱️" color="yellow_bg"}
		**Churn**
		2.1%
		<span color="green">▼ 0.3% vs Q4</span>
		:::
	</column>
</columns>

---

## 📈 Revenue Breakdown {toggle="true"}
	<table header-row="true" fit-page-width="true">
		<tr>
			<td>**Segment**</td>
			<td>**Q4 2023**</td>
			<td>**Q1 2024**</td>
			<td>**Growth**</td>
		</tr>
		<tr>
			<td>Enterprise</td>
			<td>$680K</td>
			<td>$820K</td>
			<td color="green_bg">+20.6%</td>
		</tr>
		<tr>
			<td>Mid-Market</td>
			<td>$340K</td>
			<td>$380K</td>
			<td color="green_bg">+11.8%</td>
		</tr>
		<tr>
			<td>SMB</td>
			<td>$180K</td>
			<td>$220K</td>
			<td color="green_bg">+22.2%</td>
		</tr>
	</table>

## 🎯 Key Initiatives {toggle="true"}
	### Completed
	- [x] **Launch Enterprise Tier** — Added SSO, audit logs, and dedicated support. 12 enterprise customers onboarded.
	- [x] **Mobile App v2.0** — Redesigned with offline support. App store rating improved from 3.8 to 4.5.
	- [x] **SOC 2 Certification** — Completed audit, received report. Unlocked 3 deals previously blocked on compliance.

	### In Progress
	- [ ] **AI Features** — Smart search and auto-categorization. Beta with 50 customers, shipping Q2.
	- [ ] **International Expansion** — EMEA sales team hired. First EU customer expected April.

## 🚧 Challenges {toggle="true"}
	::: callout {icon="🔴" color="red_bg"}
	**Engineering Capacity**: 3 open senior roles unfilled for 60+ days. Impact: 2 features pushed to Q3.
	:::

	::: callout {icon="🟡" color="yellow_bg"}
	**Support Load**: Ticket volume up 35% with no headcount increase. Investing in self-service documentation.
	:::

## 🔮 Q2 Outlook {toggle="true"}
	### Goals
	<table header-row="true" fit-page-width="true">
		<tr>
			<td>**Metric**</td>
			<td>**Q1 Actual**</td>
			<td>**Q2 Target**</td>
		</tr>
		<tr>
			<td>Revenue</td>
			<td>$1.42M</td>
			<td>$1.65M</td>
		</tr>
		<tr>
			<td>New Customers</td>
			<td>89</td>
			<td>110</td>
		</tr>
		<tr>
			<td>Churn</td>
			<td>2.1%</td>
			<td><2.0%</td>
		</tr>
		<tr>
			<td>NPS</td>
			<td>72</td>
			<td>75+</td>
		</tr>
	</table>
```

## Showcase 4: Personal CRM Contact Page

**Design patterns used**: Hero with info columns, callout cards, timeline in toggle, table.

```
::: callout {icon="👤" color="blue_bg"}
**Contact: Sarah Thompson** — VP Engineering at TechCorp
:::

---

<columns>
	<column>
		::: callout {icon="📋" color="gray_bg"}
		**Contact Info**
		📧 sarah.t@techcorp.com
		📱 (555) 123-4567
		🔗 [LinkedIn](URL)
		🏢 TechCorp, San Francisco
		:::
	</column>
	<column>
		::: callout {icon="💼" color="gray_bg"}
		**Deal Info**
		💰 Deal Value: $85,000
		📊 Stage: Negotiation
		📅 Expected Close: March 15
		🎯 Probability: 75%
		:::
	</column>
</columns>

---

## 📝 Notes {toggle="true"}
	- Reports to CTO (Mark Williams)
	- Team of 45 engineers, growing to 60 by Q3
	- Pain point: current tooling doesn't scale past 50 users
	- Decision process: Sarah evaluates → Mark approves → procurement (2 weeks)
	- Prefers concise, data-driven presentations
	- Personal: Marathon runner, has a golden retriever named Pixel

## 📅 Interaction History {toggle="true"}
	<table header-row="true" fit-page-width="true">
		<tr>
			<td>**Date**</td>
			<td>**Type**</td>
			<td>**Summary**</td>
			<td>**Next Action**</td>
		</tr>
		<tr color="blue_bg">
			<td>Feb 28</td>
			<td>Demo</td>
			<td>Showed enterprise features. Strong interest in SSO and audit logs.</td>
			<td>Send pricing proposal</td>
		</tr>
		<tr>
			<td>Feb 20</td>
			<td>Call</td>
			<td>Discovery call. Identified scale and security as top priorities.</td>
			<td>Schedule demo</td>
		</tr>
		<tr>
			<td>Feb 15</td>
			<td>Email</td>
			<td>Intro from mutual connection (Dave at StartupXYZ).</td>
			<td>Schedule discovery call</td>
		</tr>
	</table>

## ✅ Action Items {toggle="true"}
	- [ ] Send pricing proposal with enterprise tier options — **Due: Mar 1**
	- [ ] Schedule technical deep-dive with their security team — **Due: Mar 5**
	- [ ] Prepare ROI analysis comparing current tool costs — **Due: Mar 7**
	- [ ] Follow up on procurement timeline — **Due: Mar 10**
```
