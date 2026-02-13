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

## Guidelines

- **Read-only only.** The API blocks INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE, and other write operations.
- Keep result sets reasonable — use LIMIT unless the user wants everything.
- Format output nicely for the user. Summarize large result sets.
- If a query errors, check table/column names (they often have spaces) and fix.
- The API enforces a 30-second query timeout.
- When presenting tabular data, use markdown tables for readability.

## Workflow

1. If the user asks a question about data, first check which tables are relevant using the schema exploration queries above.
2. Write and execute a SQL query to answer the question.
3. Present results clearly, with context and interpretation when helpful.
4. If a query errors, read the error details and fix.
