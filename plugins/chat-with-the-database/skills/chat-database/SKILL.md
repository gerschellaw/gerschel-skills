---
description: Query the Gerschel portal PostgreSQL database with read-only SQL. Use when analyzing case data, checking schema, retrieving records, or answering questions about data in the system.
allowed-tools: mcp__gerschel-db__query_database,Bash(mkdir:*),Bash(md:*)
argument-hint: [question about the data or SQL query]
---

# Chat with Database

Run read-only SQL queries against the portal database using the `query_database` tool.

## First-time Setup

1. Go to **https://portal.gerschellaw.com/tools/api-keys** and generate an API key.
2. Copy the key (it's only shown once).
3. Save it to a token file at `~/.gerschel/db-api-token`.

If the user pastes a key starting with `glk_`, save it to the file for them using Bash.

## Running Queries

Use the `query_database` MCP tool directly with a SQL string:

```
query_database({ query: "SELECT COUNT(*) FROM \"Case Info Database\"" })
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

Error (SQL issues) — use the details (especially `hint` and `position`) to fix and retry:
```json
{
  "message": "column \"foo\" does not exist",
  "detail": null,
  "hint": "Perhaps you meant...",
  "position": "8"
}
```

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
