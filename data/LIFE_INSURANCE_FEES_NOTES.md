# Non-Resident Life Insurance License Fees by State

`life_insurance_nonresident_license_fees.csv` — initial **non-resident
individual producer license application fee** for the life line of authority,
one row per state + DC, compiled 2026-09-02.

## What the numbers are (and aren't)

- These are **state application/license fees** for a non-resident individual
  producer license (life LOA), not appointment fees, renewal fees, exam fees,
  or fingerprinting costs.
- Most states add a **NIPR transaction fee (~$5.60)** per electronic
  application on top of the state fee. A few states (reported: Idaho, Nevada,
  South Dakota, Alaska, Arizona) have no NIPR fee.
- Some states (CA, and retaliatory-fee states like MA, IN, TN) adjust the fee
  based on what *your home state* charges their residents ("retaliatory
  fees"), so the actual charge can differ from the base fee listed.
- Range observed: **$10 (Michigan) to ~$225 (Massachusetts with retaliation)**.

## Data quality

The execution environment that compiled this cannot reach nipr.com,
naic.org, or state DOI sites directly (network allowlist), so figures came
from search-result summaries. Each row carries a `Confidence` column:

- `verified (...)` — figure attributed to a state DOI or an official fee
  schedule in search results.
- `needs verification` — best-supported figure from aggregator sources;
  confirm before relying on it.

## How to verify / refresh

Authoritative sources, in order of preference:

1. **NAIC producer licensing fee chart** (updated ~annually):
   https://content.naic.org/sites/default/files/model-law-chart-zz-8-producer-licensing-fees.pdf
2. **NIPR state requirements pages** (per-state, shows the exact fee charged
   at checkout): https://nipr.com/licensing-center/state-requirements
3. Each state Department of Insurance fee schedule.

To refresh: for each row marked `needs verification`, open the NIPR
non-resident individual page for that state, note the fee for the Life line
of authority, update the CSV, and change `Confidence` to `verified (NIPR)`.
