#!/usr/bin/env python3
"""
Comprehensive routing number lookup with web search fallback
"""

import csv
import json
import subprocess
import time
from pathlib import Path
from datetime import datetime

def search_routing_number(institution_name, state, inst_type):
    """
    Search for routing number using web search
    Returns the routing number if found, None otherwise
    """
    # Build search query
    if inst_type == "Credit Union":
        query = f'"{institution_name}" {state} routing number credit union ACH'
    else:
        query = f'"{institution_name}" {state} routing number ACH direct deposit'

    print(f"  Searching: {query[:80]}...", end=" ", flush=True)

    try:
        # This is a placeholder - we'll implement actual search
        print("⏳")
        time.sleep(0.5)  # Rate limiting
        return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def create_output_csv(institutions, results):
    """Create output CSV with routing numbers"""
    output_path = Path('/tmp/claude-0/-home-user-Paps/7b387ca1-afb1-5e67-9257-f562005f72bb/scratchpad/batch_06_with_routing_numbers.csv')
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['State', 'Institution Name', 'Routing Numbers'])

        for inst in institutions:
            inst_name = inst['Institution Name'].strip()
            state = inst['State'].strip()
            routing = results.get(f"{state}|{inst_name}", "")
            writer.writerow([state, inst_name, routing])

    return output_path

def load_institutions(csv_path):
    """Load institutions from CSV"""
    institutions = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['Institution Name'].strip():
                institutions.append(row)
    return institutions

def main():
    csv_path = Path('/root/.claude/uploads/7b387ca1-afb1-5e67-9257-f562005f72bb/e6337eb0-batch_06_institutions.csv')
    institutions = load_institutions(csv_path)

    print(f"Loaded {len(institutions)} institutions")
    print(f"Starting routing number lookup at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("\nNote: This will require web searches for 900+ institutions")
    print("Estimated time: 30-40 minutes")

    results = {}
    found_count = 0

    # Process institutions
    for i, inst in enumerate(institutions[:10], 1):  # Start with first 10
        print(f"\n[{i}/{len(institutions)}] {inst['Institution Name']} ({inst['State']})")
        routing = search_routing_number(inst['Institution Name'], inst['State'], inst['Type'])
        if routing:
            results[f"{inst['State']}|{inst['Institution Name']}"] = routing
            found_count += 1

    print(f"\n\nFound {found_count} routing numbers so far")

    # Create output file
    output_path = create_output_csv(institutions, results)
    print(f"\nOutput saved to: {output_path}")

if __name__ == '__main__':
    main()
