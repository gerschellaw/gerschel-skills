---
description: Query the Gerschel portal PostgreSQL database with read-only SQL. Use when analyzing case data, checking schema, retrieving records, or answering questions about data in the system.
allowed-tools: Bash(psql:*)
argument-hint: [question about the data or SQL query]
---

# Chat with Database

Run read-only SQL queries against the portal PostgreSQL database using psql.

## Prerequisites

- `psql` must be installed. If not, install with: `brew install libpq` (macOS) or `apt install postgresql-client` (Linux).
- The environment variable `PORTAL_READONLY_CONNECTION_STRING` must be set to a read-only PostgreSQL connection string.

## Connection

```bash
psql "$PORTAL_READONLY_CONNECTION_STRING"
```

## Guidelines

- **Read-only only.** Never run INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, or TRUNCATE.
- Always use `psql "$PORTAL_READONLY_CONNECTION_STRING" -c "..."` for one-off queries.
- Many table and column names contain spaces — always wrap them in double quotes (e.g. `"Case Info Database"`).
- Start by exploring the schema if you don't know the structure.
- Keep result sets reasonable — use LIMIT unless the user wants everything.
- Format output nicely for the user. Summarize large result sets.

## Useful commands

List all tables:
```bash
psql "$PORTAL_READONLY_CONNECTION_STRING" -c "\dt"
```

Describe a table's columns:
```bash
psql "$PORTAL_READONLY_CONNECTION_STRING" -c '\d "TableName"'
```

Run a query:
```bash
psql "$PORTAL_READONLY_CONNECTION_STRING" -c 'SELECT COUNT(*) FROM "Case Info Database";'
```

## Workflow

1. If the user asks a question about data, first check which tables are relevant using `\dt` and `\d`.
2. Write and execute a SQL query to answer the question.
3. Present results clearly, with context and interpretation when helpful.
4. If a query errors, check table/column names (they often have spaces) and fix.
