---
description: Query the Gerschel portal PostgreSQL database with read-only SQL. Use when analyzing case data, checking schema, retrieving records, or answering questions about data in the system.
allowed-tools: Bash(curl:*),Bash(curl.exe:*)
argument-hint: [question about the data or SQL query]
---

# Chat with Database

Run read-only SQL queries against the portal database via the API.

## Authentication

The API key should be provided via the user's Cowork custom instructions (Settings → Cowork → Instructions). The key will be available in your context at the start of each session.

Look in your system context for a Gerschel API key starting with `glk_`. If you can't find one, ask the user to either:
1. Paste their API key here (starts with `glk_`)
2. Generate a new one at **https://portal.gerschellaw.com/tools/api-keys** and paste it

To make the key persist across sessions, tell the user to add it to their Cowork custom instructions in Claude Desktop settings (Settings → Cowork → Instructions) like: `gerschel api key: glk_...`

## Running Queries

Use the API key from context to call the API.

```bash
curl -s -X POST https://portal.gerschellaw.com/api/sql-query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer glk_THE_KEY_FROM_CONTEXT" \
  -d '{"query": "SELECT 1"}'
```

## Response Format

Success:
```json
{
  "rows": [...],
  "rowCount": 10,
  "fields": [{"name": "col", "dataTypeID": 23}],
  "executionTimeMs": 42
}
```

Error (SQL issues):
```json
{
  "data": {
    "message": "column \"foo\" does not exist",
    "detail": null,
    "hint": "Perhaps you meant...",
    "position": "8"
  }
}
```

Use the error details (especially `hint` and `position`) to fix and retry the query.

## Schema Exploration

Many table and column names contain spaces — always wrap them in double quotes in SQL (e.g. `"Case Info Database"`).

List all tables:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name
```

Describe a table's columns:
```sql
SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'Case Info Database' ORDER BY ordinal_position
```

List foreign keys:
```sql
SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'TABLE_NAME_HERE'
```

## Identifier Formats

When a user references a case or student, identify the type from the format:

| Format | Type | Example | Column |
|--------|------|---------|--------|
| 6 digits | **Case Number** | `240012` | `"Case Info Database"."Case Number"` |
| 8 hex chars | **UCID** | `fcfd9b8f` | `"Case Info Database"."UCID"` |
| 9 digits + dash + 8 hex | **UCID** (long form) | `240400440-3a10c056` | `"Case Info Database"."UCID"` |
| 9 digits | **OSIS** | `123456789` | `student.osis` |

When a user gives a 6-digit number, always treat it as a Case Number. To get the UCID from a Case Number:
```sql
SELECT "UCID" FROM "Case Info Database" WHERE "Case Number" = 240012
```

The Drive endpoint (`/api/skills/drive/student/:id`) accepts UCID or OSIS — **not** Case Number. If the user provides a Case Number, look up the UCID first, then use that for the Drive API.

## Core Tables

- **`student`** — basic student info (name, DOB, osis, etc.). Linked to cases via `student_id`.
- **`"Case Info Database"`** — the main case table. Key columns: `"UCID"`, `"Case Number"`, `"Student First Name"`, `"Student Last Name"`, `"Parent Name"`, `"Case Type"`, `"School Year"`, `"Folder Link"`, `"IHO"`, `"Hearing Staff"`, `student_id`.
- **`case_school_year`** — which school year(s) a case covers. Join on `student_id`.
- **`case_agencies`** — which agency or agencies serviced the student for a case.

## Important Table Notes

### Intake Portal Tables
The intake portal tables are prefixed with `june_1_`. For example, the intake students table is `june_1_students`, not `students`. When querying intake-related data, always use the `june_1_` prefix.

### Email (`gmail_messages`)
This table contains all email correspondence from the admin@gerschellaw.com inbox. **NEVER use the `date` column** — it is unreliable. Always use `internal_date` which stores Unix timestamps in milliseconds (e.g. `1718838221000`). To convert:
```sql
SELECT subject, to_timestamp(internal_date / 1000) AS sent_at
FROM gmail_messages
ORDER BY internal_date DESC
```

### Calendar / Hearings
When asked about calendar events, hearings, or scheduling, **never use the `google_calendar` table**. Always use the `hearing` table instead.

## Guidelines

- **Read-only only.** The API blocks INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE, and other write operations.
- Keep result sets reasonable — use LIMIT unless the user wants everything.
- Format output nicely for the user. Summarize large result sets.
- If a query errors, check table/column names (they often have spaces) and fix.
- The API enforces a 30-second query timeout.
- When presenting tabular data, use markdown tables for readability.

## Google Drive Operations

Access case files stored in Google Drive. All endpoints use the same API key authentication.

### List a Student's Case Files

Look up a case by UCID or OSIS number and return all files in the case folder:

```bash
curl -s https://portal.gerschellaw.com/api/skills/drive/student/UCID_OR_OSIS \
  -H "Authorization: Bearer glk_THE_KEY_FROM_CONTEXT"
```

Response:
```json
{
  "caseId": "UCID-123",
  "caseNumber": 12345,
  "folderLink": "https://drive.google.com/drive/folders/...",
  "files": [
    {
      "id": "abc123",
      "name": "IEP Document.pdf",
      "mimeType": "application/pdf",
      "breadcrumb": "Root > Subfolder",
      "modifiedTime": "2025-01-15T...",
      "size": "102400",
      "link": "https://drive.google.com/file/d/abc123/view"
    }
  ]
}
```

### List Files in Any Folder

Browse a specific Google Drive folder by its ID:

```bash
curl -s https://portal.gerschellaw.com/api/skills/drive/folder/FOLDER_ID \
  -H "Authorization: Bearer glk_THE_KEY_FROM_CONTEXT"
```

Returns an array of files with `id`, `name`, `mimeType`, `breadcrumb`, `modifiedTime`, `size`, and `link`.

### Get File Content

Download a file's content. Google Docs/Sheets/Slides are automatically exported as PDF:

```bash
curl -s https://portal.gerschellaw.com/api/skills/drive/file/FILE_ID \
  -H "Authorization: Bearer glk_THE_KEY_FROM_CONTEXT" \
  --output file.pdf
```

Returns raw file bytes with appropriate `Content-Type` and `Content-Disposition` headers.

### Drive Workflow Tips

- Start with `/api/skills/drive/student/:id` to get a student's case files by UCID or OSIS.
- Use the `breadcrumb` field to understand folder structure without extra API calls.
- Use the `link` field to give the user a clickable Google Drive link.
- To read a Google Doc's content, fetch it via `/api/skills/drive/file/:id` — it comes back as PDF.
- Folder IDs from the file listing can be used with `/api/skills/drive/folder/:id` to drill deeper.

## Workflow

1. If the user asks a question about data, first check which tables are relevant using the schema exploration queries above.
2. Write and execute a SQL query to answer the question.
3. Present results clearly, with context and interpretation when helpful.
4. If a query errors, read the error details and fix.
5. If the user asks about case files or documents, use the Drive endpoints to browse and retrieve them.
