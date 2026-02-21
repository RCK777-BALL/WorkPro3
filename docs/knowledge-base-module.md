# Documentation & Knowledge Base Module

## Goals
- Provide a centralized library for SOPs, work instructions, and troubleshooting guides with rich text, media, and attachments.
- Link procedures directly to assets, preventive maintenance (PM) schedules, and work orders so technicians see the right guidance in context.
- Enforce governance with versioning, required-read acknowledgements, and auditability.

## Core Capabilities
- **Authoring**: Rich-text editor (headings, checklists, tables, callouts), embedded media, attachment uploads, and templated sections (safety, tools, steps, references).
- **Search**: Full-text search across titles, tags, body, and attachment metadata. Facets for asset, category, tag, author, and status. Highlighting in results and recent/related articles.
- **Context links**: Associate SOPs/work instructions to assets, PM templates, and work orders; fetch and display the relevant docs inline on technician views.
- **Versioning**: Immutable published versions with diff history, draft/published states, rollback, and change logs.
- **Required-read**: Per-version acknowledgement with due dates, reminders, and read receipts for assigned roles/technicians.
- **Access control**: Role/site-aware permissions for author, reviewer, publisher, and viewer; private/internal visibility flags.

## Data Model (backend)
- `knowledge_article` table: `id`, `tenant_id`, `title`, `slug`, `status` (draft, published, archived), `category`, `tags[]`, `content_rich` (JSON), `summary`, `visibility`, `created_by`, `updated_by`, timestamps.
- `knowledge_version` table: `id`, `article_id`, `version`, `content_rich`, `attachments[]`, `change_log`, `published_at`, `published_by`, `previous_version_id`.
- `knowledge_attachment` table: `id`, `version_id`, `file_id`, `filename`, `mime`, `size`, `uploaded_by`, timestamps.
- `knowledge_link` table: `id`, `article_id`, `asset_id?`, `pm_template_id?`, `work_order_id?`, `link_type`, `context_label`.
- `knowledge_ack` table: `id`, `version_id`, `user_id`, `status` (required, acknowledged, overdue), `due_date`, `acknowledged_at`, `comment`, timestamps.
- Indexes for full-text search (title, tags, summary, content_rich) and attachment metadata; soft-delete columns for compliance.

## API/Service Layers
- CRUD for articles and versions with draft/publish workflow and audit logging.
- Attachment upload endpoint reusing existing file storage service; virus scan and file type limits.
- Search endpoint with filters (asset, tag, category, status) and relevance scoring; support pagination and highlights/snippets.
- Link management endpoints to attach/detach articles from assets/PMs/WOs and list contextual articles for a given entity.
- Acknowledgement endpoints: assign required-read for a version, mark as read, list outstanding reads per user/role, export audit trail.
- Webhooks/notifications: publish events on new version, assignment, and acknowledgements for in-app, email, or mobile push.

## frontend Flows
- **Author experience**: Rich-text WYSIWYG with templates, image upload, attachment manager, version diff viewer, and publish/review workflow.
- **Discovery**: Knowledge base home with search bar, filters, featured articles, and recents; inline search in WO/PM/asset sidebars.
- **Technician view**: Inline viewer within work orders and PM tasks showing linked SOPs; open attachments in lightbox; offline-friendly cache for mobile.
- **Compliance**: Required-read banner with due date, acknowledgement button, and per-version audit trail.
- **Observability**: View counts, helpfulness ratings, and feedback form routed to authors.

## Linking Behavior
- Assets: Attach SOPs/work instructions to assets for troubleshooting and startup/shutdown procedures; show in asset details and WO creation forms.
- Preventive maintenance: Link articles to PM templates and tasks so generated WOs inherit the relevant SOP list.
- Work orders: Inline viewer on technician work order view showing linked procedures and attachments with quick launch; support QR/asset scans to surface SOPs.

## Versioning & Required-Read
- Draft/publish with semantic version numbers; only published versions shown to technicians.
- Change history with side-by-side diffs and rollback to prior versions.
- Required-read assignments are tied to a specific version; acknowledgements remain even after new versions ship, with prompts to re-ack when major versions change.

## Security & Permissions
- Author/reviewer/publisher roles; granular edit vs. publish rights; required-read assignment limited to authorized roles.
- Site/tenant scoping for multi-site customers; visibility controls for internal vs. external contractors.
- Audit log for edits, publishes, acknowledgements, and link changes.

## Migration & Adoption
- Import existing SOPs (DOCX/PDF) into new rich-text schema; backfill links via CSV upload.
- Seed starter templates for common procedures and PM work instructions.
- Usage analytics dashboards to track adoption, outstanding required-reads, and SOP coverage by asset class.

## Acceptance Criteria
- Technicians can open linked SOPs inside WO/PM views with inline reader and attachment previews.
- Authors can publish a new version with attachments, link it to an asset, and assign required-read to a technician.
- Search returns relevant SOPs by keyword and tag; filters by asset/category work; results show highlights.
- Acknowledgement reports show who has/has not read required versions with timestamps.
