# Paps — Bank & Credit Union Locations by State

Builds one master workbook listing every FDIC-insured bank and NCUA-insured
credit union that has a physical location in each US state — deduplicated
to one row per (institution, state), not one row per branch.

## Why this can't be fully automated end-to-end here

This tool's execution environment has outbound network access restricted to
a small allowlist (PyPI, npm, etc.) and cannot reach `banks.data.fdic.gov`
or `ncua.gov`. So `scripts/build_master_list.py` does the merge/dedupe
locally against files **you download yourself**, rather than fetching them.
Run it from a machine with normal internet access (or drop the downloaded
files into `data/` and run it here).

## 1. Get the source files

### FDIC (banks)
From the [FDIC BankFind Suite bulk data page](https://banks.data.fdic.gov/bankfind-suite/bulkData):
- **Institutions (CSV)** — one row per bank charter (`CERT`, `NAME`, ...)
- **Locations (CSV)** — one row per branch/office (`CERT`, `STALP`, ...)

### NCUA (credit unions)
From the [NCUA Credit Union & Corporate Call Report Data page](https://ncua.gov/analysis/credit-union-corporate-call-report-data):
- The latest **List of Active Federally Insured Credit Unions** extract.

Note: NCUA's standard extract is one row per credit union (headquarters
state only). If you have a branch-level NCUA extract instead (with a state
column per branch), the script will dedupe it the same way it dedupes FDIC
branches, using the charter/CU-number column when present.

Save the three files anywhere (`data/` is a convenient spot and is
git-ignored).

## 2. Run it

```bash
pip install -r requirements.txt
python3 scripts/build_master_list.py \
  --fdic-institutions data/institutions.csv \
  --fdic-locations data/locations.csv \
  --ncua-credit-unions data/ncua_credit_unions.csv \
  --output data/master_institutions.xlsx
```

## 3. Output

`master_institutions.xlsx` with four sheets:

1. **All Financial Institutions** — `State | Institution Name | Type`, deduped.
2. **State Summary** — bank / credit union / total counts per state.
3. **Bank Source Data** — the deduped FDIC rows before merging with NCUA.
4. **Credit Union Source Data** — the deduped NCUA rows.

## Column name flexibility

The script auto-detects common column-name variants (e.g. `STALP` or
`STATE` for the state column, `CU_NAME` or `NAME` for the credit union name
column). If your downloaded file uses different headers than it expects,
either rename the columns in the CSV or extend the candidate lists in
`scripts/build_master_list.py` (`find_col` calls in `build_bank_table` and
`build_credit_union_table`).

## Tests

`tests/fixtures/` has small synthetic FDIC/NCUA sample files that exercise
the dedup and inactive-institution filtering logic:

```bash
python3 scripts/build_master_list.py \
  --fdic-institutions tests/fixtures/institutions_sample.csv \
  --fdic-locations tests/fixtures/locations_sample.csv \
  --ncua-credit-unions tests/fixtures/ncua_sample.csv \
  --output /tmp/test_output.xlsx
```
