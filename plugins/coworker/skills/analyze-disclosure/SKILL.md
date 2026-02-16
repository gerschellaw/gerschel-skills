---
description: Analyze a parent's disclosure package for a special education due process hearing. Reviews documents for compliance, consistency, evidence gaps, and case strength. Use when an attorney asks to review or analyze a disclosure.
allowed-tools: Bash(curl:*),Bash(curl.exe:*)
argument-hint: [UCID or student identifier]
---

# Analyze Disclosure

Analyze a parent's disclosure package for a special education due process hearing.

## Prerequisites

This skill requires the **chat-database** skill for SQL queries and the **Drive API** for fetching documents. Use the same API key (look for `glk_` in your context).

## Workflow

### Step 1: Get Case Info

Query the database for the case and student details:

```sql
SELECT "UCID", "Case Number", "Student First Name", "Student Last Name", "Parent Name",
       "Case Type", "School Year", "Folder Link", "Hearing Staff"
FROM "Case Info Database"
WHERE "UCID" = 'THE_UCID'
```

### Step 2: Get Disclosure Data

Query the disclosure compilation and its exhibits/witnesses:

```sql
-- Find the disclosure compilation
SELECT dc.id, dc.case_id, dc.status, dc.compiled_pdf_drive_id, dc.doe_disclosure_drive_file_id
FROM disclosure_compilation dc
JOIN "Case Info Database" c ON dc.case_id = c."UCID"
WHERE c."UCID" = 'THE_UCID'
ORDER BY dc.created_at DESC LIMIT 1;

-- Get exhibits
SELECT de.exhibit_number, de.title, de.description, de.category, de.source,
       def.drive_file_id, def.original_filename, def.mime_type
FROM disclosure_exhibit de
JOIN disclosure_exhibit_file def ON de.id = def.exhibit_id
WHERE de.compilation_id = COMPILATION_ID
ORDER BY de.exhibit_number;

-- Get witnesses
SELECT name, title, role, description
FROM disclosure_witness
WHERE compilation_id = COMPILATION_ID;
```

### Step 3: Fetch Key Documents from Drive

Use the Drive API to get the compiled disclosure PDF:

```bash
curl -s "https://portal.gerschellaw.com/api/skills/drive/file/COMPILED_PDF_DRIVE_ID" \
  -H "Authorization: Bearer glk_THE_KEY" \
  --output disclosure.pdf
```

If a DOE disclosure PDF exists (`doe_disclosure_drive_file_id`), fetch that too.

Also fetch the student's case folder for additional context:

```bash
curl -s "https://portal.gerschellaw.com/api/skills/drive/student/THE_UCID" \
  -H "Authorization: Bearer glk_THE_KEY"
```

### Step 4: Analyze

With all documents and data gathered, perform a comprehensive disclosure analysis covering:

#### Case Type Identification
Classify the case: Implementation, Reduction/Pendency, Private Placement (similar/differing from DOE), Compensatory Relief, IEE Funding, or Multiple types.

#### Document-by-Document Analysis
For each exhibit:
- **Internal Consistency**: Math errors, date inconsistencies, contradictions, missing fields
- **Cross-Document Validation**: DPC vs contracts vs affidavits vs progress reports vs invoices — verify consistency of service types, frequencies, rates, dates, provider names, costs

#### Special Validations
- **Timeline Verification**: TDN date vs contract start, evaluation dates vs service dates, IEP date vs implementation
- **Pendency Checks** (if applicable): Pendency program matches prior FOFD/agreement, no services exceeding entitlement
- **Financial Reconciliation**: Total costs match across contracts, affidavits, invoices; rates are commercially reasonable

#### Three-Prong Analysis (Burlington-Carter)
- **Prong 1 (FAPE Denial)**: Procedural and/or substantive violations established?
- **Prong 2 (Appropriateness)**: Unilateral placement/services appropriate? Specially designed instruction, sufficient support, progress documented?
- **Prong 3 (Equities)**: Timely Ten-Day Notice, cooperation with DOE, notice of intent?

#### Evidence-to-Claim Substantiation
For EVERY FAPE denial alleged and EVERY item of relief requested, verify supporting evidence exists:

| Relief Type | Required Evidence |
|---|---|
| IEE Funding | Written request, DOE response/non-response, evaluator credentials |
| IEE Reimbursement | Written request, IEE report, invoice, proof of payment, credentials |
| Tuition Reimbursement | Enrollment contract, invoice, proof of payment, school credentials |
| ABA Services | Provider contract, BCBA/RBT credentials, supervision docs, progress reports, invoice, affidavit |
| Speech/OT/PT/Counseling | Provider contract, license, progress reports, invoice, affidavit |
| Compensatory Services | Period of denial docs, calculation methodology, expert recommendation |
| Transportation | Contract/invoices, evidence of need |

Rate each claim: **FULLY SUPPORTED**, **PARTIALLY SUPPORTED**, or **UNSUPPORTED** (flag as CRITICAL).

#### DOE Disclosure Analysis (if available)
- Documents DOE plans to introduce
- DOE witnesses and roles
- DOE's theory of defense
- Impeachment opportunities
- Vulnerabilities in DOE's case

### Step 5: Output Format

Structure the report as:

1. **Executive Summary** — case type, compliance status, issue counts by severity, evidence completeness rating
2. **Document Inventory** — present, missing, recommended additional documents
3. **Issue Report** — Critical / Major / Minor issues
4. **Cross-Reference Matrix** — consistency table across documents for key data points (service type, frequency, rate, provider, dates, cost)
5. **Three-Prong Analysis Assessment** — strength of each prong with gaps
6. **Evidence-to-Claim Analysis** — table mapping each FAPE denial and relief item to required vs present evidence
7. **DOE Defense Analysis** (if DOE disclosure available) — defense theory, witnesses, vulnerabilities, counter-strategies
8. **Recommendations** — immediate actions, strategic considerations, risk assessment

## Important Guidelines

- Every factual claim must cite its source document and exhibit number
- Flag CRITICAL issues that could defeat claims at hearing
- Be specific — tailor everything to this case, avoid generic statements
- Check for June/July/August services and ESY justification
- Verify all providers mentioned have credentials and documentation
- Check statute of limitations (2-year lookback from DPC filing)
- For multiple school years, ensure each year's relief is separately documented
