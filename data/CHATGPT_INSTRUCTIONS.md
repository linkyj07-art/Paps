# Task: Find ABA routing numbers for a list of banks/credit unions

## What you're doing
You have a CSV file called `chatgpt_remaining_institutions.csv` with three columns:
`State, Institution Name, Type` (Type is "Bank" or "Credit Union").

For every row, find that institution's ABA routing number **for that specific state**
(one row = one institution operating in one state — the same institution name may
appear again under a different state with a *different* routing number, since many
banks use different routing numbers per state/region).

## Output format
Produce a Python dict literal (or a CSV, see below) with one entry per row, in this
exact shape:

```python
("Institution Name", "State"): "123456789",
```

- The key is a tuple of `(Institution Name, State)` — copy the Institution Name
  **exactly** as it appears in the CSV (same capitalization, punctuation, spaces,
  including any trailing/double spaces — do not "clean up" the name).
- The value is the 9-digit routing number as a **string** (quotes, not an int —
  keep any leading zeros).
- Group entries by state, in the same order as the input file, with a comment
  header before each state's block, like:

```python
    # ---- Alabama ----
    ("1st Franklin Financial Corporation", "Alabama"): "062203751",
    ...

    # ---- California ----
    ("Bank of America, National Association", "California"): "121000358",
    ...
```

If you'd rather hand back a CSV instead of a Python dict, that's fine too — just
use columns `State, Institution Name, Routing Numbers` with one row per institution
(same content, just tabular instead of dict literal). Either format works, whichever
is easier for you to produce reliably.

## Rules for picking the right number

1. **State-specific only.** Only record a routing number when you can confirm (from
   the search results) that it is tied to that institution's presence/branch in
   THAT state. Don't blindly reuse a nationwide number without checking — many
   large banks (Wells Fargo, Chase, Bank of America, Truist, PNC, Regions, TD Bank,
   Citizens Bank, Huntington, M&T, Woodforest) use a **different routing number per
   state**, so search "[Bank Name] [State] routing number" for those, not just
   "[Bank Name] routing number".

2. **ACH/direct-deposit number, not wire.** If a bank lists separate numbers for
   ACH vs. wire transfers, use the **ACH/direct-deposit** one. If a source only
   gives a "wire transfer" number and no ACH number is findable, leave it blank
   rather than guessing.

3. **Multiple numbers, no clear winner → leave blank.** If search results show 2+
   candidate numbers for the same institution/state and none is clearly labeled as
   *the* correct one (e.g., conflicting numbers with no explanation), use `""`
   (empty string) as the value rather than picking arbitrarily. Do not put a guess
   in the data.

4. **Institution is headquartered elsewhere / not actually in that state** — if a
   search for "[Name] [State] routing number" turns up a company that's clearly a
   different state's institution (e.g. searching a Washington institution turns up
   only a California result with no separate WA branch/number), also use `""`
   rather than a wrong-state number.

5. **Multiple routing numbers for legitimately different branches within the same
   state** (e.g., an old vs. new number after a merger) — prefer the one identified
   as "current" by the bank's own site; otherwise use the most frequently-cited one
   across sources.

6. A few nationwide credit unions reuse the same number everywhere and don't need
   a fresh per-state search — you can just reuse these directly:
   - NAVY FEDERAL CREDIT UNION: `256074974`
   - USAA Federal Savings Bank: `314074269`

## Batching / workflow tips
- Work through the CSV in state order — finish one state fully before moving to
  the next, so partial progress is always "N states done" rather than scattered.
- Skim the CSV first — dedupe your searches: if the same "Institution Name" already
  has a known number for a *different* state from a bank that's genuinely
  nationwide with ONE number (rare — most are not), you can reuse it, but default
  to searching per state unless you're confident.
- Give me back the finished dict/CSV in **one message per state, or in chunks of
  ~150–200 entries at a time**, so I can drop each chunk straight into the master
  file without re-parsing a giant blob.

## Reference: what the master data file already looks like
The project's own lookup file (`scripts/routing_lookup_data.py`) already has ~40
states done in exactly this dict format — mimic that style (comment header per
state marked `(complete)`, `("Name", "State"): "routing_number",` lines, blank
`""` for unresolved ones) so it merges in cleanly.

## The file to work from
`chatgpt_remaining_institutions.csv` — 9,077 rows across 27 states:
Alabama, California, Colorado, Florida, Georgia, Illinois, Indiana, Iowa, Kansas,
Kentucky, Louisiana, Massachusetts, Michigan, Minnesota, Missouri, Nebraska,
New Jersey, New York, North Carolina, Ohio, Oklahoma, Pennsylvania, Tennessee,
Texas, Utah, Virginia, Wisconsin.
