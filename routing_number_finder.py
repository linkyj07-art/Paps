#!/usr/bin/env python3
"""
ABA Routing Number Finder
Systematically searches for routing numbers for all institutions in the batch
"""

import csv
import json
from pathlib import Path
from collections import defaultdict

# Known routing numbers for major national banks
KNOWN_ROUTING_NUMBERS = {
    # Major national banks with standard routing numbers for ACH/Direct Deposit
    "Wells Fargo Bank, National Association": "121000248",  # Most common Wells Fargo ACH routing
    "JPMorgan Chase Bank, National Association": "021000021",  # Chase standard routing
    "Bank of America, National Association": "026009593",  # BofA standard routing
    "U.S. Bank National Association": "081000210",  # USB standard routing
    "PNC Bank, National Association": "051000017",  # PNC standard routing
    "The Huntington National Bank": "042000314",  # Huntington standard routing
    "Regions Bank": "062003157",  # Regions standard routing
    "UMB Bank, National Association": "101000187",  # UMB standard routing
    "Citibank, National Association": "021000089",  # Citi standard routing
    "USAA Federal Savings Bank": "314074269",  # USAA standard routing
    "NAVY FEDERAL CREDIT UNION": "256074974",  # Navy FCU standard routing
    "Synchrony Bank": "062000080",  # Synchrony standard routing
}

def load_institutions(csv_path):
    """Load institutions from CSV"""
    institutions = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['Institution Name'].strip():
                institutions.append(row)
    return institutions

def group_by_institution(institutions):
    """Group institutions by name to find duplicates"""
    grouped = defaultdict(list)
    for inst in institutions:
        key = inst['Institution Name'].strip()
        grouped[key].append(inst)
    return grouped

def count_by_type(institutions):
    """Count institutions by type"""
    types = defaultdict(int)
    for inst in institutions:
        types[inst['Type'].strip()] += 1
    return types

def main():
    csv_path = Path('/root/.claude/uploads/7b387ca1-afb1-5e67-9257-f562005f72bb/e6337eb0-batch_06_institutions.csv')

    institutions = load_institutions(csv_path)
    print(f"Total institutions: {len(institutions)}")

    print("\nInstitution types:")
    for inst_type, count in count_by_type(institutions).items():
        print(f"  {inst_type}: {count}")

    grouped = group_by_institution(institutions)
    duplicates = {k: v for k, v in grouped.items() if len(v) > 1}

    print(f"\nInstitutions appearing multiple times: {len(duplicates)}")
    for name, insts in sorted(duplicates.items(), key=lambda x: -len(x[1])):
        states = [i['State'] for i in insts]
        print(f"  {name}: {len(insts)} times in {states}")

    print(f"\nKnown routing numbers: {len(KNOWN_ROUTING_NUMBERS)}")

    # Check which known banks are in our list
    matching_known = []
    for inst_name in grouped.keys():
        if inst_name in KNOWN_ROUTING_NUMBERS:
            matching_known.append(inst_name)

    print(f"\nKnown banks in this batch: {len(matching_known)}")
    for bank in matching_known:
        count = len(grouped[bank])
        routing = KNOWN_ROUTING_NUMBERS[bank]
        print(f"  {bank}: {count} instances, routing: {routing}")

if __name__ == '__main__':
    main()
