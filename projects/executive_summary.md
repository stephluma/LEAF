# LEAF Project Dashboard Executive Summary

## Overview

The LEAF Project Dashboard (v10) is the current version of the platform's unified project and task management interface, delivering a full-featured operational dashboard with real-time task tracking, analytics, OKR alignment, Kanban board, recurring task automation and many more functions that utilize LEAF's infrastructure at the core. 

## Purpose of the Project Dashboard

Provide a unified, platform-level view of project and task execution to support leadership oversight, prioritization, and accountability.

## Business problem it solves

Eliminates external software use and fragmented, manual status reporting by consolidating project and task data into a single, consistent view of progress, risk, and throughput.

## Intended users

Leadership, portfolio owners, program managers, and operational stakeholders who require visibility across projects and tasks.

## Relationship to LEAF platform modules (Projects, Tasks, Analytics)

Consolidates data from Projects and Tasks into an analytics-oriented dashboard that aligns operational activity with outcome tracking.

## Current State: project_v10 (Active Operations Phase)

### Core capabilities

- Unified project and task visibility across all active work streams
- Task-level status, ownership, due-date, and completion date tracking
- Actual Completion Date auto-stamped when a task is marked complete, enabling schedule variance analysis
- Recurring task automation — tasks flagged as recurring automatically generate a fresh copy when completed, requiring no manual re-creation
- Three task views: Table (virtualized, paginated), Kanban (drag-and-drop with keyboard support), and Gantt (timeline bar chart)
- % Completion column on the Projects table — live calculation of completed vs. total tasks per project with inline progress bar
- Project Health Sticky bar — per-project summary of total tasks, completed count, completion %, and overdue count
- Cross-project analytics with Year/Quarter filtering, including schedule variance chart
- OKR roll-up with Quick View, Index, and per-Key-Result drill-down
- Add menu for creating Projects, Tasks, Recurring Tasks, Objectives, and Key Results directly from the dashboard

### Primary user workflows

- Review project inventory, status, fiscal year, and % completion at a glance
- Inspect task execution details across Table, Kanban, and Gantt views
- Track actual completion dates against due dates to identify schedule trends
- Monitor recurring task health — set up once per task, the system self-maintains
- Identify overdue work and execution bottlenecks via the analytics tab
- Align task and project activity to OKRs and Key Results

### Analytics roll-ups and indicator health scoring

- Aggregated roll-ups of task completion, overdue indicators, and schedule variance
- Project-level health scoring based on completion percentage and schedule risk
- Schedule Variance chart: buckets completed tasks into Early/On Time, 1–7 days late, 8–14 days late, and 15+ days late — giving leadership a data-driven view of execution accuracy over time
- OKR analytics with per-objective and per-key-result completion percentages
- Analytics filtering by calendar year and quarter for trend analysis

### Operational improvements over legacy reporting patterns

- Standardized metrics across teams with consistent indicator interpretation
- Reduced dependency on ad hoc status updates through real-time dashboard visibility
- Faster identification of execution risk via overdue tracking and schedule variance analytics
- Recurring task automation eliminates manual re-creation of repeating work items
- Actual Completion Date tracking closes the loop between planned and actual delivery

### Operational Governance Design

#### Internal Forms

- Internal Forms are used within both the Project and Task forms to identify an org chart employee for Product Owner (PO) review prior to closeout.
- This enables structured routing for PO review without relying on broad user access group notifications.
- This design reduces non-actionable notifications and supports scalable multi-team usage.
- An additional Internal Form is used in Task to collect file attachments and supplemental notes in a structured manner.

#### User Access Groups

- Governance and visibility are controlled through defined user access groups.
- PO Review workflow group for product owner approvals.
- OKR workflow group for leadership approvals.
- Two dashboard-specific groups:
  - LEAF Team: Full dashboard visibility plus action controls (Add buttons and inbox row); operational contributors.
  - Project Dashboard – Read Only: Dashboard visibility only; intended for senior leadership and viewers; no action controls unless also added to LEAF Team.
- Intentional separation of visibility vs. action authority.
- Reduced notification fatigue.
- Clear governance boundaries.
- Scalable oversight model.

## Strategic Value

### Visibility into work and progress

Clear, organization-wide visibility into active work streams, execution status, and delivery accuracy — including whether work is being completed on time or trending late.

### Structured accountability

Defined ownership, measurable progress indicators, and actual completion date tracking create a consistent and auditable record of delivery performance.

### Operational Intelligence Through Schedule Variance

The Schedule Variance chart transforms raw completion data into actionable delivery insight — revealing whether the team is consistently on time, trending late, or improving over time. This gives leadership a fact-based foundation for resourcing and prioritization decisions.

### Recurring Work Without Overhead

The recurring task system eliminates the manual cost of re-creating repeating work items. Each recurring task is configured once and self-maintains indefinitely, reducing operational overhead and ensuring repeating work is never dropped.

### Controlled Action and Oversight

- The dashboard separates who can see work from who can act on work.
- Approval routing is structured and role-based rather than broadcast-based.
- Governance scales without overwhelming stakeholders.

### Reduction of fragmented reporting

Single source of truth that eliminates duplicate reporting, inconsistent metrics, and manual status collection — from task-level execution up to OKR alignment.

### Operational clarity at scale

Scalable reporting structure for portfolio-level decision-making.
