---
description: Prepare a trial sheet for an upcoming hearing based on disclosure analysis and case documents. Use when an attorney asks for hearing preparation, trial sheet, or witness/exhibit strategy.
allowed-tools: Bash(curl:*),Bash(curl.exe:*)
argument-hint: [UCID or case identifier]
---

# Trial Preparation

Generate a trial preparation sheet based on case documents, disclosure analysis, and IHO tendencies.

## Prerequisites

This skill requires the **chat-database** skill for SQL queries and the **Drive API** for fetching documents. It builds on the **analyze-disclosure** and **analyze-iho** skills — if a disclosure analysis or IHO analysis has already been done in this session, use those results as input.

## Workflow

### Step 1: Gather Case Info

```sql
SELECT "UCID", "Case Number", "Student First Name", "Student Last Name",
       "Parent Name", "Case Type", "School Year", "Folder Link",
       "Hearing Staff", "IHO", "Status", "Hearing Date",
       "FOFD Status", "FOFD Date"
FROM "Case Info Database"
WHERE "UCID" = 'THE_UCID'
```

### Step 2: Get Disclosure Data

```sql
-- Disclosure compilation
SELECT dc.id, dc.status, dc.compiled_pdf_drive_id, dc.doe_disclosure_drive_file_id
FROM disclosure_compilation dc
WHERE dc.case_id = 'THE_UCID'
ORDER BY dc.created_at DESC LIMIT 1;

-- Exhibits
SELECT de.exhibit_number, de.title, de.description, de.category, de.source,
       def.drive_file_id, def.original_filename
FROM disclosure_exhibit de
JOIN disclosure_exhibit_file def ON de.id = def.exhibit_id
WHERE de.compilation_id = COMPILATION_ID
ORDER BY de.exhibit_number;

-- Witnesses
SELECT name, title, role, description
FROM disclosure_witness
WHERE compilation_id = COMPILATION_ID;
```

### Step 3: Fetch Key Documents

Get the compiled disclosure and DOE disclosure (if available) from Drive:

```bash
curl -s "https://portal.gerschellaw.com/api/skills/drive/file/COMPILED_PDF_DRIVE_ID" \
  -H "Authorization: Bearer glk_THE_KEY" \
  --output disclosure.pdf
```

### Step 4: Get IHO Info (if assigned)

If the case has an assigned IHO, check for their tendencies:

```sql
SELECT id, "IHO First Name", "IHO Last Name", "Notes"
FROM "IHO Database"
WHERE ("IHO First Name" || ' ' || "IHO Last Name") ILIKE '%IHO_NAME%'
```

If an IHO analysis was already performed in this session, reference those findings. Otherwise, note that an IHO analysis could provide additional strategic value.

### Step 5: Generate Trial Sheet

Produce a comprehensive trial preparation document covering:

#### 1. Case Overview
- Student name, DOB, classification, school year(s)
- Case type and relief sought
- Assigned IHO (with key tendencies if known)
- Hearing date and status

#### 2. Theory of the Case
- One-paragraph narrative framing the case from the parent's perspective
- Key theme to emphasize throughout testimony and argument

#### 3. Claims and Legal Standards
For each FAPE denial alleged:
- The specific legal standard
- Key facts supporting the claim (with exhibit citations)
- Anticipated DOE defense
- Suggested rebuttal

#### 4. Exhibit Strategy
For each parent exhibit:
- Purpose (what it proves)
- Which claim(s) it supports
- Key pages/sections to highlight
- Cross-reference with witness testimony
- Potential DOE objections and responses

#### 5. Witness Strategy

**Parent Witnesses:**
For each witness:
- Key topics for direct examination
- Exhibits to introduce through this witness
- Anticipated cross-examination areas
- Preparation notes

**DOE Witnesses (anticipated):**
For each expected DOE witness:
- Likely testimony areas
- Cross-examination strategy
- Exhibits to use for impeachment
- Key admissions to obtain

#### 6. Cross-Reference Matrix

| Claim | Supporting Exhibits | Parent Witnesses | DOE Witness Cross | Legal Standard |
|-------|-------------------|-----------------|-------------------|----------------|
| FAPE Denial 1 | Ex. A, C, F | Dr. Smith, Parent | CSE Chair | Burlington Prong 1 |
| ... | ... | ... | ... | ... |

#### 7. Burlington-Carter Analysis (Tuition Cases)

**Prong 1 — DOE Failed to Provide FAPE:**
- Procedural violations with evidence citations
- Substantive inadequacies with evidence citations

**Prong 2 — Appropriateness of Unilateral Placement:**
- Evidence of specially designed instruction
- Progress documentation
- Provider qualifications

**Prong 3 — Equities:**
- Ten-Day Notice compliance
- Cooperation with DOE
- Financial documentation

#### 8. Evidence Gaps and Risk Areas
- Missing documents that could weaken the case
- Claims with thin evidentiary support
- Potential DOE attacks and mitigation strategies

#### 9. IHO-Specific Strategy (if IHO analysis available)
- Tailor arguments to IHO's known preferences
- Evidence priorities based on IHO's patterns
- Legal authorities this IHO credits
- Settlement leverage points

#### 10. Hearing Day Checklist
- Documents to bring (originals and copies)
- Exhibit binders prepared
- Witness availability confirmed
- Technology setup (if remote hearing)
- Key deadlines (post-hearing briefs, etc.)

## Important Guidelines

- Every factual assertion must cite its source exhibit and page
- Be specific to THIS case — no generic advice
- Prioritize the strongest claims and evidence
- Be honest about weaknesses — better to prepare for them than be surprised
- If IHO tendencies are known, tailor the entire strategy accordingly
- Flag any last-minute items that need attention before the hearing
