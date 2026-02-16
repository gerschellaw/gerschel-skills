---
description: Analyze an IHO's (Impartial Hearing Officer) past decisions to profile their tendencies, win rates, and preferences. Use when preparing for a hearing and the attorney wants to understand the assigned IHO.
allowed-tools: Bash(curl:*),Bash(curl.exe:*)
argument-hint: [IHO name]
---

# Analyze IHO

Profile an IHO's tendencies by analyzing their past FOFD (Findings of Fact and Decision) documents.

## Prerequisites

This skill requires the **chat-database** skill for SQL queries and the **Drive API** for fetching FOFD documents.

## Workflow

### Step 1: Find the IHO

Query the database for the IHO and their notes:

```sql
SELECT id, "IHO First Name", "IHO Last Name", "Notes"
FROM "IHO Database"
WHERE "IHO Last Name" ILIKE '%NAME%'
   OR ("IHO First Name" || ' ' || "IHO Last Name") ILIKE '%NAME%'
```

### Step 2: Find Their FOFD Documents

FOFDs are stored as case documents. Query for cases assigned to this IHO that have FOFDs:

```sql
SELECT c."UCID", c."Case Number", c."Case Type", c."IHO",
       c."Folder Link", c."FOFD Status", c."FOFD Date"
FROM "Case Info Database" c
WHERE c."IHO" ILIKE '%IHO_NAME%'
  AND c."FOFD Status" IS NOT NULL
ORDER BY c."FOFD Date" DESC
```

### Step 3: Fetch FOFD Documents

For each case with a folder link, use the Drive API to list files and find FOFDs:

```bash
curl -s "https://portal.gerschellaw.com/api/skills/drive/student/UCID" \
  -H "Authorization: Bearer glk_THE_KEY"
```

Look for files with names containing "FOFD", "Finding", "Decision", or similar. Then fetch the actual documents:

```bash
curl -s "https://portal.gerschellaw.com/api/skills/drive/file/FILE_ID" \
  -H "Authorization: Bearer glk_THE_KEY" \
  --output fofd.pdf
```

Read each FOFD document to extract the decision content.

### Step 4: Analyze

With the FOFD documents gathered, analyze the IHO across these dimensions:

#### Case Type Classification
For each decision, classify as:
- Tuition Reimbursement (private school placement)
- Related Services (SETSS, OT, PT, Speech, ABA, etc.)
- Compensatory Services
- Mixed (multiple relief types)

#### Decision Timeline Metrics
- Days from last hearing date to decision issuance
- Pattern of extensions or delays
- Compliance with regulatory timelines

#### Pendency Analysis
- Does the IHO address pendency claims?
- Standards applied for pendency determinations
- Stance on retrospective vs prospective pendency

#### Burlington-Carter Analysis (Tuition Cases)
**Prong 1 (DOE Program)**:
- Deference level to DOE's proposed placement
- Substantive vs procedural violation emphasis
- Treatment of untimely School Location Letters/TDNs

**Prong 2 (Private School)**:
- Documentation requirements
- Progress report standards
- LRE considerations

**Prong 3 (Equities)**:
- 10-day notice compliance
- Cooperation requirements
- Treatment of partial tuition awards

#### Related Services Analysis
- Rate awards (full rate vs reduced)
- Enhanced rate justifications accepted
- Provider qualification requirements
- Progress documentation standards

#### Compensatory Relief Patterns
- Frequency of compensatory awards
- Standards applied (Reid vs Burlington-Carter)
- Quantitative vs qualitative approach

#### Evidence Preferences
- Types of evidence given most weight
- Expert witness credibility factors
- Documentary evidence priorities

#### Legal Authority Citations
- Frequently cited cases
- SRO decisions followed or distinguished
- Regulatory provisions emphasized

### Step 5: Output Format

Structure the report as:

1. **IHO Profile** — Name, number of decisions analyzed, date range
2. **Statistical Summary** — Win rate (parent favorable/partial/adverse), average decision time from last hearing date
3. **Pattern Identification** — Consistent positions across decisions
4. **Case Type Analysis** — Tendencies broken down by case type
5. **Notable Decisions** — Decisions with outlier rulings or important quotes
6. **Key Quotes** — Direct quotes demonstrating legal philosophy
7. **Hearing Preparation Recommendations**:
   - Key vulnerabilities to address
   - Evidence priorities specific to this IHO
   - Witness preparation focus areas
   - Documentary evidence checklist
   - Legal argument emphasis
   - Settlement leverage points

#### Favorability Score
Assign a 1-10 parent favorability score:
- **8-10**: Strongly parent-favorable, high win rate, generous awards
- **5-7**: Moderate, follows law closely, outcome depends on evidence
- **3-4**: Leans DOE, high evidence burden on parents
- **1-2**: Strongly DOE-favorable, rarely rules for parents

Include a brief reason for the score.

## Important Guidelines

- Base all analysis on actual decision text — never assume or fabricate patterns
- Quote directly from decisions when identifying patterns
- Be honest about small sample sizes — if only 2-3 decisions, note limitations
- Track which decisions support each finding
- Include both favorable and adverse patterns — attorneys need complete picture
- Note any evolution in the IHO's positions over time
