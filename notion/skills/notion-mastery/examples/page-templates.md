# Page Templates — Ready-to-Use Notion Page Designs

Complete Notion-flavored Markdown templates for common page types. Copy and use with `notion-create-pages`.

## Project Dashboard

```
::: callout {icon="🚀" color="blue_bg"}
**Project Dashboard** — Track progress, milestones, and blockers at a glance.
:::

---

<columns>
	<column>
		::: callout {icon="📅" color="gray_bg"}
		**Timeline**: Q1 2024
		**Owner**: @ProjectLead
		**Status**: On Track
		:::
	</column>
	<column>
		::: callout {icon="📊" color="gray_bg"}
		**Progress**: 65% complete
		**Sprint**: 4 of 8
		**Open Blockers**: 1
		:::
	</column>
</columns>

---

## 📊 Sprint Overview {toggle="true"}
	<table header-row="true" fit-page-width="true">
		<tr>
			<td>**Sprint**</td>
			<td>**Goal**</td>
			<td>**Status**</td>
			<td>**Completion**</td>
		</tr>
		<tr>
			<td>Sprint 1</td>
			<td>Foundation & Setup</td>
			<td>✅ Done</td>
			<td>100%</td>
		</tr>
		<tr>
			<td>Sprint 2</td>
			<td>Core Features</td>
			<td>✅ Done</td>
			<td>100%</td>
		</tr>
		<tr>
			<td>Sprint 3</td>
			<td>API Integration</td>
			<td>✅ Done</td>
			<td>100%</td>
		</tr>
		<tr color="blue_bg">
			<td>Sprint 4</td>
			<td>Testing & Polish</td>
			<td>🔄 In Progress</td>
			<td>60%</td>
		</tr>
		<tr>
			<td>Sprint 5</td>
			<td>Beta Launch</td>
			<td>⏳ Upcoming</td>
			<td>0%</td>
		</tr>
	</table>

## 🎯 Milestones {toggle="true"}
	- [x] Project kickoff — Jan 8
	- [x] Architecture review approved — Jan 22
	- [x] MVP feature complete — Feb 12
	- [ ] Beta release — Mar 1
	- [ ] User acceptance testing — Mar 15
	- [ ] Production launch — Mar 31

## 🚧 Blockers & Risks {toggle="true"}
	::: callout {icon="🔴" color="red_bg"}
	**Blocked**: Third-party API rate limits causing test failures. Waiting on vendor support response.
	:::

	::: callout {icon="🟡" color="yellow_bg"}
	**Risk**: Mobile responsive testing delayed. Mitigation: Hire contract QA engineer.
	:::

## 📋 Key Decisions {toggle="true"}
	<table header-row="true" fit-page-width="true">
		<tr>
			<td>**Date**</td>
			<td>**Decision**</td>
			<td>**Rationale**</td>
		</tr>
		<tr>
			<td>Jan 15</td>
			<td>Use TypeScript for API layer</td>
			<td>Type safety reduces runtime errors</td>
		</tr>
		<tr>
			<td>Feb 3</td>
			<td>Adopt weekly release cadence</td>
			<td>Faster feedback loop with beta users</td>
		</tr>
	</table>

## 📝 Meeting Notes {toggle="true"}
	### Feb 28 — Sprint Review
	- Completed API integration milestone
	- Identified 3 performance bottlenecks
	- Action: Schedule load testing for next week

	### Feb 21 — Architecture Review
	- Approved caching strategy
	- Decided against microservices (monolith for now)
```

## Team Wiki

```
::: callout {icon="📚" color="gray_bg"}
**Engineering Wiki** — Standards, processes, and technical documentation for the team.
:::

---

<columns>
	<column>
		### 🗂️ Quick Navigation
		<table_of_contents/>
	</column>
	<column>
		::: callout {icon="🔗" color="blue_bg"}
		**Quick Links**
		[GitHub](URL) | [CI/CD Pipeline](URL) | [Monitoring](URL) | [Incident Playbook](URL)
		:::
	</column>
</columns>

---

## 🏗️ Architecture {toggle="true"}
	### System Overview

	Our platform follows a layered architecture:

	```mermaid
	graph TD
	    A["Client Apps"] --> B["API Gateway"]
	    B --> C["Auth Service"]
	    B --> D["Core Service"]
	    B --> E["Notification Service"]
	    D --> F["PostgreSQL"]
	    D --> G["Redis Cache"]
	    E --> H["Email Provider"]
	```

	### Key Design Decisions
	- **Monolith-first**: Single deployable unit until scale demands splitting
	- **Event-driven**: Async processing for non-critical paths
	- **Cache-aside pattern**: Redis for frequently accessed data

## 📏 Coding Standards {toggle="true"}
	### TypeScript Guidelines
	- Strict mode enabled (`"strict": true`)
	- No `any` types — use `unknown` and narrow
	- Prefer interfaces over type aliases for object shapes
	- Use barrel exports (`index.ts`) for module boundaries

	### Git Workflow
	1. Branch from `main` with `feature/`, `fix/`, or `chore/` prefix
	2. Write descriptive commit messages (conventional commits)
	3. Open PR with description template
	4. Require 1 approval + passing CI
	5. Squash merge to `main`

	### Code Review Checklist
	- [ ] Tests cover new/changed functionality
	- [ ] No hardcoded secrets or credentials
	- [ ] Error handling is comprehensive
	- [ ] API changes are backward compatible
	- [ ] Documentation updated if needed

## 🚀 Deployment {toggle="true"}
	### Environments
	<table header-row="true" fit-page-width="true">
		<tr>
			<td>**Environment**</td>
			<td>**URL**</td>
			<td>**Deploys**</td>
			<td>**Purpose**</td>
		</tr>
		<tr>
			<td>Development</td>
			<td>`dev.example.com`</td>
			<td>Every push to `main`</td>
			<td>Integration testing</td>
		</tr>
		<tr>
			<td>Staging</td>
			<td>`staging.example.com`</td>
			<td>Manual promotion</td>
			<td>QA and UAT</td>
		</tr>
		<tr>
			<td>Production</td>
			<td>`app.example.com`</td>
			<td>Release tag</td>
			<td>Live users</td>
		</tr>
	</table>

## 🆘 On-Call Runbook {toggle="true"}
	### Incident Severity Levels

	::: callout {icon="🔴" color="red_bg"}
	**P1 — Critical**: Complete service outage. All hands. Response: <15 min.
	:::

	::: callout {icon="🟠" color="orange_bg"}
	**P2 — Major**: Significant degradation. On-call + backup. Response: <30 min.
	:::

	::: callout {icon="🟡" color="yellow_bg"}
	**P3 — Minor**: Limited impact. On-call only. Response: <2 hours.
	:::

	### First Response Steps
	1. Acknowledge the alert
	2. Check monitoring dashboards
	3. Identify affected services
	4. Communicate status in #incidents channel
	5. Escalate if needed (see escalation matrix)
```

## Meeting Notes (Recurring)

```
::: callout {icon="🗓️" color="purple_bg"}
**Weekly Team Standup** — Every Monday at 10:00 AM
:::

---

## Attendees
@Alice, @Bob, @Carol, @Dave

---

## 🔄 This Week's Updates {toggle="true"}
	### Alice — Frontend
	- Completed user dashboard redesign
	- Started accessibility audit
	- **Blocker**: Need API schema docs from backend team

	### Bob — Backend
	- Deployed database migration to staging
	- Optimized query performance (3x improvement)
	- **Next**: API schema documentation for frontend

	### Carol — QA
	- Automated 15 new integration tests
	- Found 3 regression bugs in checkout flow
	- **Next**: Performance testing on staging

	### Dave — DevOps
	- Set up monitoring alerts for new services
	- Upgraded CI pipeline to use Docker buildkit
	- **Next**: Implement blue-green deployment

## 🚧 Blockers {toggle="true"}
	::: callout {icon="🔴" color="red_bg"}
	**Frontend blocked on API docs** — Bob to provide by Wednesday.
	:::

## ✅ Action Items {toggle="true"}
	- [ ] @Bob — Share API schema docs by Wednesday
	- [ ] @Carol — File bugs for checkout regressions
	- [ ] @Dave — Demo blue-green deployment at next standup
	- [ ] @Alice — Schedule accessibility review with design team

## 📝 Decisions {toggle="true"}
	- Agreed to adopt biweekly release cadence starting next month
	- Will use feature flags for gradual rollouts
```

## Product Requirements Document

```
::: callout {icon="📋" color="blue_bg"}
**PRD: User Notifications System** — Enable users to receive and manage notifications across channels.
:::

---

<columns>
	<column>
		::: callout {icon="📅" color="gray_bg"}
		**Status**: Draft
		**Author**: @ProductManager
		**Last Updated**: Feb 28, 2024
		:::
	</column>
	<column>
		::: callout {icon="👥" color="gray_bg"}
		**Stakeholders**:
		@Engineering, @Design, @Support
		**Target**: Q2 2024
		:::
	</column>
</columns>

---

## 📖 Overview {toggle="true"}
	### Problem Statement
	Users currently have no way to receive timely updates about events that matter to them. They must manually check for changes, leading to missed deadlines and delayed responses.

	### Proposed Solution
	Build a notification system that delivers real-time alerts via in-app, email, and push channels. Users can customize preferences per notification type.

	### Success Metrics
	<table header-row="true" fit-page-width="true">
		<tr>
			<td>**Metric**</td>
			<td>**Current**</td>
			<td>**Target**</td>
		</tr>
		<tr>
			<td>User engagement (DAU)</td>
			<td>45%</td>
			<td>65%</td>
		</tr>
		<tr>
			<td>Response time to events</td>
			<td>4.2 hours</td>
			<td><30 min</td>
		</tr>
		<tr>
			<td>Support tickets (missed updates)</td>
			<td>120/month</td>
			<td><20/month</td>
		</tr>
	</table>

## 🎯 Requirements {toggle="true"}
	### Must Have (P0)
	- [ ] In-app notification bell with unread count
	- [ ] Email notifications for critical events
	- [ ] Notification preferences page
	- [ ] Mark as read / dismiss actions

	### Should Have (P1)
	- [ ] Push notifications (mobile)
	- [ ] Notification grouping by type
	- [ ] Do Not Disturb schedule

	### Nice to Have (P2)
	- [ ] Slack integration
	- [ ] Custom notification rules
	- [ ] Notification analytics dashboard

## 🎨 Design {toggle="true"}
	### User Flow

	```mermaid
	graph TD
	    A["Event Occurs"] --> B{"User Preferences"}
	    B -->|In-App| C["Notification Bell"]
	    B -->|Email| D["Email Service"]
	    B -->|Push| E["Push Service"]
	    C --> F["Notification Center"]
	    F --> G["Mark Read / Dismiss"]
	```

	### Key Screens
	1. Notification bell (header component)
	2. Notification center (dropdown panel)
	3. Notification preferences (settings page)
	4. Individual notification cards

## ⚙️ Technical Approach {toggle="true"}
	### Architecture
	- Event bus (Redis Pub/Sub) for real-time delivery
	- PostgreSQL for notification storage and read state
	- SendGrid for email delivery
	- Firebase Cloud Messaging for push

	### API Endpoints
	- `GET /notifications` — List with pagination
	- `PATCH /notifications/:id/read` — Mark as read
	- `DELETE /notifications/:id` — Dismiss
	- `GET /notification-preferences` — Get preferences
	- `PUT /notification-preferences` — Update preferences

## 📅 Timeline {toggle="true"}
	<table header-row="true" fit-page-width="true">
		<tr>
			<td>**Phase**</td>
			<td>**Duration**</td>
			<td>**Deliverable**</td>
		</tr>
		<tr>
			<td>Design</td>
			<td>2 weeks</td>
			<td>Mockups and user flows</td>
		</tr>
		<tr>
			<td>Backend</td>
			<td>3 weeks</td>
			<td>API + event system</td>
		</tr>
		<tr>
			<td>Frontend</td>
			<td>2 weeks</td>
			<td>UI components</td>
		</tr>
		<tr>
			<td>Testing</td>
			<td>1 week</td>
			<td>QA + load testing</td>
		</tr>
		<tr>
			<td>Launch</td>
			<td>1 week</td>
			<td>Staged rollout</td>
		</tr>
	</table>
```

## Personal Dashboard

```
::: callout {icon="🏠" color="purple_bg"}
**My Dashboard** — Everything you need in one place.
:::

---

<columns>
	<column>
		## 📅 Today {toggle="true"}
			### Morning
			- [ ] Review inbox and respond to urgent emails
			- [ ] Daily standup at 10:00 AM
			- [ ] Code review for PR #142

			### Afternoon
			- [ ] Feature implementation: notification system
			- [ ] 1:1 with manager at 3:00 PM
			- [ ] Update sprint board

			### Evening
			- [ ] Write daily reflection
			- [ ] Plan tomorrow's priorities
	</column>
	<column>
		## 🎯 This Week {toggle="true"}
			::: callout {icon="🔥" color="orange_bg"}
			**Focus**: Ship notification MVP by Friday
			:::

			- [ ] Complete API endpoints
			- [ ] Frontend notification bell component
			- [ ] Integration tests
			- [ ] Deploy to staging
			- [ ] Demo at sprint review

		## 📌 Pinned {toggle="true"}
			- [Project Dashboard](URL)
			- [Sprint Board](URL)
			- [Team Wiki](URL)
			- [Design System](URL)
	</column>
</columns>

---

## 📝 Quick Notes {toggle="true"}
	*Capture thoughts throughout the day...*

## 📚 Reading List {toggle="true"}
	- [ ] [Article about notification UX patterns](URL)
	- [ ] [Redis Pub/Sub best practices](URL)
	- [x] [Firebase Cloud Messaging docs](URL)
```
