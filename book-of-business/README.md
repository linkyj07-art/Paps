# Book of Business

A private, local website for tracking a life insurance book of business:
clients, policies, pending business, premium, commissions, follow-ups,
birthdays and policy anniversaries.

## Open it (easiest)

Download **`book-of-business.html`** and double-click it. It opens in your
browser. No internet, install, or Terminal needed.

- Your data is saved **inside that browser** on that computer. Always open
  the file in the same browser (e.g. always Chrome), and you can move the
  file anywhere you like.
- Clearing your browser's history/site data, or using a private/incognito
  window, can erase it. **Click Export CSV regularly** and keep the file
  somewhere safe. Import CSV restores it, and is also how you move your book
  to another computer or browser.

## Or run it as a local server (optional)

This version keeps your data in a file (`book-of-business/data/book.db`)
instead of the browser. It needs Python 3:

```bash
python3 book-of-business/server.py
```

Then open **http://127.0.0.1:8000**. Press `Ctrl+C` in the terminal to stop
it. Options: `--port 8080` for a different port, `--db /path/to/book.db` to
keep the data file somewhere else (e.g. a backed-up folder). The data file
is git-ignored so client information is never committed.

The two versions keep separate data. Use Export CSV / Import CSV to move
between them.

## What's in it

**Dashboard**
- Annual premium in force, policies in force, face amount in force
- Pending business (Submitted / Underwriting / Approved)
- Premium written this year, commission paid vs. charged back, persistency
- Premium written by month (last 12 months) and in-force premium by carrier
- **Needs attention**: follow-ups due in the next 14 days (and overdue), and
  pending apps older than 30 days
- **Coming up**: client birthdays (age changes affect rates) and policy
  anniversaries (review opportunities) in the next 30 days

**Policies**: searchable, sortable list with status and carrier filters.
Enter either the modal premium or the annual premium and the other is
calculated from the payment mode; estimated commission is premium × your
commission rate.

**Clients**: contact info, DOB/age, lead source, notes, and every policy they
hold.

Statuses: Submitted, Underwriting, Approved, Issued, In Force, Declined,
Not Taken, Lapsed, Cancelled. "In force" counts Issued + In Force.

## Import from a spreadsheet

Use **Import CSV** to bring in an existing book. `sample_import.csv` shows the
columns (one row per policy; a client with no policy columns filled in is
added as just a client). Column headers are case-insensitive. Clients are
matched on first name + last name + DOB, and policies already on file (same
policy number) are skipped, so re-importing the same file won't create
duplicates. **Export CSV** writes the same format, so an export can be
re-imported elsewhere.

## Editing the app

The app lives in `static/`. After changing it, rebuild the single file:

```bash
python3 book-of-business/build_standalone.py
```
