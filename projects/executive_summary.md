# LEAF Project Dashboard v6 Executive Summary

## Overview

High-level summary of the LEAF Project Dashboard in project_v6, positioned as an iterative enhancement phase focused on platform outcomes and operational clarity.

## Purpose of the Project Dashboard

Provide a unified, platform-level view of project and task execution to support leadership oversight, prioritization, and accountability.

## Business problem it solves

Eliminates fragmented, manual status reporting by consolidating project and task data into a single, consistent view of progress, risk, and throughput.

## Intended users

Leadership, portfolio owners, program managers, and operational stakeholders who require visibility across projects and tasks.

## Relationship to LEAF platform modules (Projects, Tasks, Analytics)

Consolidates data from Projects and Tasks into an analytics-oriented dashboard that aligns operational activity with outcome tracking.

## Current State: project_v6 (Iterative Enhancement Phase)

### Core capabilities

- Unified project and task visibility
- Task-level status, ownership, and due-date tracking
- Cross-project analytics summaries

### Primary user workflows

- Review project inventory and status
- Inspect task execution details
- Identify overdue work and execution bottlenecks

### Analytics roll-ups and indicator health scoring

- Aggregated roll-ups of task completion and overdue indicators
- Project-level health scoring based on completion and schedule risk

### Operational improvements over legacy reporting patterns

- Standardized metrics across teams
- Reduced dependency on ad hoc status updates
- Faster identification of execution risk

### Areas currently being refined

- Analytics clarity and filtering precision
- Consistency of indicator interpretation
- Workflow alignment across teams

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

Clear, organization-wide visibility into active work streams and execution status.

### Structured accountability

Defined ownership and measurable progress indicators for consistent oversight.

### Controlled Action and Oversight

- The dashboard separates who can see work from who can act on work.
- Approval routing is structured and role-based rather than broadcast-based.
- Governance scales without overwhelming stakeholders.

### Reduction of fragmented reporting

Single source of truth that reduces duplicate reporting and inconsistent metrics.

### Operational clarity at scale

Scalable reporting structure for portfolio-level decision-making.

## Future Evolution

### Future versions (v7+)

Version tracking continues beginning with v6, with v7 and beyond explicitly tracked.
