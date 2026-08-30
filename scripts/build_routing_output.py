#!/usr/bin/env python3
"""Merge curated routing-number lookups (routing_lookup_data.py) with the
master institution list, producing the running output CSV and a report of
which states are not yet covered."""
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from routing_lookup_data import ROUTING_NUMBERS  # noqa: E402

master = pd.read_excel("data/master_institutions.xlsx", sheet_name="All Financial Institutions")

covered_states = sorted({state for (_, state) in ROUTING_NUMBERS})
covered = master[master["State"].isin(covered_states)].copy()

def lookup(row):
    return ROUTING_NUMBERS.get((row["Institution Name"], row["State"]), None)

covered["Routing Numbers"] = covered.apply(lookup, axis=1)
missing = covered[covered["Routing Numbers"].isna()]
if len(missing):
    print("MISSING LOOKUPS (in covered states but no entry found):")
    print(missing[["State", "Institution Name", "Type"]].to_string())

covered["Institution"] = covered["Institution Name"] + " (" + covered["Type"] + ")"
out = covered[["State", "Institution", "Routing Numbers"]].sort_values(["State", "Institution"])
out.to_csv("data/routing_numbers_all_states.csv", index=False)

all_states = master["State"].unique()
remaining_states = sorted(set(all_states) - set(covered_states))
remaining_counts = master[master["State"].isin(remaining_states)].groupby("State").size().sort_values()

print(f"\nCovered: {len(covered_states)} states/territories, {len(out)} institution rows written to data/routing_numbers_all_states.csv")
print(f"Remaining: {len(remaining_states)} states/territories, {master[master['State'].isin(remaining_states)].shape[0]} institution rows")
print("\nRemaining states by size (smallest first):")
print(remaining_counts.to_string())
