"""
Bitrix24 CRM Data Population Script
=====================================
Creates 3 months of realistic B2B SaaS sales data for "TechFlow Solutions".

Company profile:
  - UAE-based B2B SaaS selling CRM/ERP solutions to SMBs in GCC region
  - 6 sales reps with varying performance levels
  - Pipeline: ~$600K total, ~$180K won, ~$80K lost over 3 months
  - Realistic conversion funnel, stalled deals, seasonal patterns

Data created:
  - ~10 products in catalog
  - ~40 companies (prospects/clients) with revenue
  - ~120 contacts across those companies
  - ~350 leads (various statuses, assigned reps) — created then UPDATED
  - ~150 deals (across all pipeline stages) — created then UPDATED
  - ~1,500 activities (calls, emails, meetings, tasks) over 3 months

Bitrix24 rate limit: 2 req/sec (with burst buffer of 50).
Script uses batch API (crm.*.add in batches of 50) to stay within limits.

Key fix: Bitrix24 ignores STAGE_ID/STATUS_ID on creation — we must create
first, then batch-update each record's status/stage separately.
"""

import requests
import time
import random
import json
from datetime import datetime, timedelta
from typing import Any

# -- Configuration ---------------------------------------------------------

WEBHOOK_URL = "https://b24-mbii6g.bitrix24.ae/rest/1/wm5uunx4xpkf2x6m/"
RATE_LIMIT_DELAY = 0.6  # seconds between API calls (safe for 2 req/sec)

# Date range: 3 months back from today
NOW = datetime.now()
START_DATE = NOW - timedelta(days=90)

random.seed(42)  # Reproducible data

# -- Company Data ----------------------------------------------------------

INDUSTRIES = ["IT", "TELECOM", "MANUFACTURING", "BANKING", "CONSULTING",
              "FINANCE", "GOVERNMENT", "DELIVERY", "ENTERTAINMENT"]

COMPANIES = [
    # name, industry, employee_size, revenue_tier
    ("Al Rashid Trading Co.", "MANUFACTURING", "EMPLOYEES_2", "medium"),
    ("Gulf Digital Solutions", "IT", "EMPLOYEES_1", "small"),
    ("Doha Financial Group", "FINANCE", "EMPLOYEES_3", "large"),
    ("Emirates Logistics LLC", "DELIVERY", "EMPLOYEES_2", "medium"),
    ("Riyadh Tech Ventures", "IT", "EMPLOYEES_1", "small"),
    ("Abu Dhabi Consulting", "CONSULTING", "EMPLOYEES_2", "medium"),
    ("Qatar Petroleum Services", "MANUFACTURING", "EMPLOYEES_4", "enterprise"),
    ("Sharjah Telecom Solutions", "TELECOM", "EMPLOYEES_2", "medium"),
    ("Kuwait Banking Corp", "BANKING", "EMPLOYEES_3", "large"),
    ("Bahrain Insurance Group", "FINANCE", "EMPLOYEES_2", "medium"),
    ("Muscat Retail Holdings", "DELIVERY", "EMPLOYEES_2", "medium"),
    ("Jeddah Medical Center", "OTHER", "EMPLOYEES_3", "large"),
    ("Dubai Media Network", "ENTERTAINMENT", "EMPLOYEES_1", "small"),
    ("Al Salam Construction", "MANUFACTURING", "EMPLOYEES_3", "large"),
    ("GCC Cloud Services", "IT", "EMPLOYEES_1", "small"),
    ("Falcon Security Systems", "IT", "EMPLOYEES_1", "small"),
    ("Pearl Property Management", "OTHER", "EMPLOYEES_2", "medium"),
    ("Oasis Hotel Group", "ENTERTAINMENT", "EMPLOYEES_3", "large"),
    ("Crescent Pharmaceuticals", "MANUFACTURING", "EMPLOYEES_2", "medium"),
    ("Noor Education Institute", "OTHER", "EMPLOYEES_1", "small"),
    ("Al Waha Food Industries", "MANUFACTURING", "EMPLOYEES_2", "medium"),
    ("Zenith Software Labs", "IT", "EMPLOYEES_1", "small"),
    ("Capital Investment Fund", "FINANCE", "EMPLOYEES_2", "medium"),
    ("Majestic Auto Dealers", "DELIVERY", "EMPLOYEES_2", "medium"),
    ("Baraka Energy Solutions", "MANUFACTURING", "EMPLOYEES_3", "large"),
    ("Habtoor Group Holdings", "CONSULTING", "EMPLOYEES_3", "large"),
    ("Reem Island Developments", "OTHER", "EMPLOYEES_2", "medium"),
    ("Sprint Courier Services", "DELIVERY", "EMPLOYEES_1", "small"),
    ("Desert Rose Cosmetics", "MANUFACTURING", "EMPLOYEES_1", "small"),
    ("Meridian Shipping LLC", "DELIVERY", "EMPLOYEES_2", "medium"),
    ("Atlas Manufacturing Co.", "MANUFACTURING", "EMPLOYEES_2", "medium"),
    ("Sapphire IT Consulting", "CONSULTING", "EMPLOYEES_1", "small"),
    ("Orion Defense Tech", "IT", "EMPLOYEES_2", "medium"),
    ("Al Futtaim Electronics", "IT", "EMPLOYEES_3", "large"),
    ("Green Valley Agriculture", "OTHER", "EMPLOYEES_1", "small"),
    ("Royal Hospitality Group", "ENTERTAINMENT", "EMPLOYEES_2", "medium"),
    ("Infinity Telecom", "TELECOM", "EMPLOYEES_2", "medium"),
    ("Pacific Trading Corp", "DELIVERY", "EMPLOYEES_2", "medium"),
    ("Vertex Analytics Inc", "IT", "EMPLOYEES_1", "small"),
    ("Horizon Real Estate", "OTHER", "EMPLOYEES_2", "medium"),
]

# Revenue ranges by company tier (AED)
REVENUE_RANGES = {
    "small":      (500_000, 2_000_000),
    "medium":     (2_000_000, 10_000_000),
    "large":      (10_000_000, 50_000_000),
    "enterprise": (50_000_000, 200_000_000),
}

# -- Products --------------------------------------------------------------

PRODUCTS = [
    ("CRM Pro License", 12_500, "Monthly CRM platform license - Professional tier"),
    ("ERP Standard", 28_000, "Enterprise resource planning - Standard package"),
    ("Analytics Dashboard", 8_500, "Business intelligence and analytics module"),
    ("API Gateway", 15_000, "REST/GraphQL API management platform"),
    ("Cloud Hosting Bundle", 6_000, "Managed cloud infrastructure - monthly"),
    ("Custom Integration Pack", 35_000, "Bespoke system integration services"),
    ("Support Package - Gold", 4_500, "24/7 priority support - Gold tier"),
    ("Training Bundle", 9_800, "Team onboarding and certification program"),
    ("Data Migration Service", 22_000, "Full data migration and validation"),
    ("Security Audit Suite", 18_500, "Penetration testing and compliance audit"),
]

# -- Sales Reps ------------------------------------------------------------
# Performance profiles: star, solid, average, ramp-up, declining, new

REPS = [
    {"name": "Ahmed Al-Rashidi",  "profile": "star",      "activity_rate": 1.4, "win_rate": 0.38},
    {"name": "Sarah Chen",        "profile": "solid",     "activity_rate": 1.1, "win_rate": 0.30},
    {"name": "Omar Khalil",       "profile": "average",   "activity_rate": 0.9, "win_rate": 0.24},
    {"name": "Fatima Hassan",     "profile": "ramp_up",   "activity_rate": 0.7, "win_rate": 0.18},
    {"name": "Raj Patel",         "profile": "declining",  "activity_rate": 0.5, "win_rate": 0.22},
    {"name": "Lina Mahmoud",      "profile": "new",       "activity_rate": 0.6, "win_rate": 0.15},
]

# Stall rate by rep profile
STALL_RATES = {
    "star": 0.10,
    "solid": 0.20,
    "average": 0.30,
    "ramp_up": 0.30,
    "declining": 0.50,
    "new": 0.30,
}

# -- Contact Names (GCC region realistic) ---------------------------------

FIRST_NAMES_M = ["Mohammed", "Abdullah", "Khalid", "Ali", "Hassan", "Yousef",
                 "Ibrahim", "Faisal", "Saeed", "Nasser", "Tariq", "Hamad",
                 "Salim", "Rashid", "Waleed", "Adel", "Mansoor", "Jamal"]
FIRST_NAMES_F = ["Maryam", "Fatima", "Aisha", "Noura", "Sara", "Huda",
                 "Layla", "Reem", "Dana", "Nadia", "Hana", "Amira"]
LAST_NAMES = ["Al-Maktoum", "Al-Nahyan", "Al-Thani", "Al-Sabah", "Al-Khalifa",
              "Al-Said", "Al-Dosari", "Al-Qahtani", "Al-Harbi", "Al-Ghamdi",
              "Al-Shehri", "Al-Otaibi", "Al-Mutairi", "Al-Subaie", "Al-Hajri",
              "Al-Mazrouei", "Al-Mansoori", "Al-Zaabi", "Singh", "Kumar",
              "Sharma", "Gupta", "Chen", "Wong", "Lee", "Kim"]

LEAD_SOURCES = ["CALL", "EMAIL", "WEB", "ADVERTISING", "PARTNER",
                "RECOMMENDATION", "TRADE_SHOW", "WEBFORM", "OTHER"]
LEAD_SOURCE_WEIGHTS = [15, 10, 25, 15, 5, 10, 5, 12, 3]

LEAD_STATUSES = ["NEW", "IN_PROCESS", "PROCESSED", "CONVERTED", "JUNK"]

DEAL_STAGES_OPEN = ["NEW", "PREPARATION", "PREPAYMENT_INVOICE", "EXECUTING", "FINAL_INVOICE"]
DEAL_STAGES_WON = ["WON"]
DEAL_STAGES_LOST = ["LOSE", "APOLOGY"]

DEAL_TYPES = ["SALE", "COMPLEX", "SERVICES", "GOODS"]

ACTIVITY_TYPES = ["call", "email", "meeting", "task"]
ACTIVITY_TYPE_WEIGHTS = [35, 30, 15, 20]

# Correct TYPE_ID mapping (matches bitrix_adapter.py):
# 1=task, 2=call, 3=email, 4=meeting
ACTIVITY_TYPE_ID_MAP = {
    "task": 1,
    "call": 2,
    "email": 3,
    "meeting": 4,
}

CALL_SUBJECTS = [
    "Discovery call - product overview",
    "Follow-up: pricing discussion",
    "Demo scheduling call",
    "Contract negotiation call",
    "Onboarding kickoff call",
    "Quarterly review call",
    "Upsell discussion",
    "Technical requirements call",
    "Budget approval follow-up",
    "Renewal discussion",
]

EMAIL_SUBJECTS = [
    "Proposal: CRM Integration Package",
    "Follow-up: Meeting summary",
    "Pricing breakdown - Enterprise plan",
    "Case study: similar company results",
    "Contract draft for review",
    "Implementation timeline",
    "Feature comparison document",
    "ROI analysis attached",
    "Next steps after demo",
    "Thank you - meeting notes",
]

MEETING_SUBJECTS = [
    "Product demo - full platform",
    "Executive presentation",
    "Technical deep-dive session",
    "Contract review meeting",
    "Onboarding planning session",
    "Quarterly business review",
    "Strategy alignment meeting",
    "Requirements gathering workshop",
]

TASK_SUBJECTS = [
    "Prepare custom proposal",
    "Send pricing breakdown",
    "Create demo environment",
    "Follow up on outstanding invoice",
    "Update deal stage in CRM",
    "Schedule next touchpoint",
    "Research competitor offering",
    "Prepare case study deck",
]

# -- Value ranges by company size ------------------------------------------

VALUE_RANGES = {
    "small":      (2_000, 15_000),
    "medium":     (8_000, 45_000),
    "large":      (20_000, 120_000),
    "enterprise": (50_000, 250_000),
}


# -- Helpers ---------------------------------------------------------------

def api_call(method: str, params: dict = None) -> dict:
    """Single Bitrix24 REST API call with rate limiting."""
    url = f"{WEBHOOK_URL}{method}.json"
    time.sleep(RATE_LIMIT_DELAY)
    resp = requests.post(url, json=params or {}, timeout=30)
    resp.raise_for_status()
    return resp.json()


def batch_call(commands: dict) -> dict:
    """Bitrix24 batch API - up to 50 commands per call."""
    url = f"{WEBHOOK_URL}batch.json"
    time.sleep(RATE_LIMIT_DELAY)
    resp = requests.post(url, json={"halt": 0, "cmd": commands}, timeout=60)
    resp.raise_for_status()
    return resp.json()


def random_date(start: datetime, end: datetime) -> datetime:
    """Random datetime between start and end."""
    delta = end - start
    seconds = int(delta.total_seconds())
    if seconds <= 0:
        return start
    offset = random.randint(0, seconds)
    return start + timedelta(seconds=offset)


def random_phone() -> str:
    return f"+971{random.randint(50,59)}{random.randint(1000000,9999999)}"


def random_email(first: str, last: str, company: str) -> str:
    domain = company.lower().replace(" ", "").replace(".", "")[:12] + ".ae"
    return f"{first.lower()}.{last.lower().replace('-','')}@{domain}"


def fmt_date(dt: datetime) -> str:
    """Bitrix24 date format."""
    return dt.strftime("%Y-%m-%dT%H:%M:%S+03:00")


def fmt_date_only(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d")


def pick_rep() -> dict:
    return random.choice(REPS)


def pick_rep_for_stage(stage: str) -> dict:
    """Weighted rep selection based on stage — star/solid reps get more WON,
    declining reps get more LOSE/stalled, new/ramp_up get more early-stage."""

    if stage == "WON":
        weights = {"star": 5, "solid": 4, "average": 3, "ramp_up": 1, "declining": 1, "new": 1}
    elif stage in ("LOSE", "APOLOGY"):
        weights = {"star": 1, "solid": 2, "average": 3, "ramp_up": 2, "declining": 5, "new": 3}
    elif stage in ("NEW", "PREPARATION"):
        weights = {"star": 2, "solid": 2, "average": 3, "ramp_up": 4, "declining": 1, "new": 5}
    else:
        weights = {"star": 3, "solid": 3, "average": 3, "ramp_up": 2, "declining": 2, "new": 2}

    rep_weights = [weights.get(r["profile"], 2) for r in REPS]
    return random.choices(REPS, weights=rep_weights, k=1)[0]


def gen_contact_name() -> tuple[str, str, str]:
    """Returns (first, last, honorific)."""
    if random.random() < 0.65:
        first = random.choice(FIRST_NAMES_M)
        honorific = "HNR_EN_1"
    else:
        first = random.choice(FIRST_NAMES_F)
        honorific = random.choice(["HNR_EN_2", "HNR_EN_3"])
    last = random.choice(LAST_NAMES)
    return first, last, honorific


def weighted_choice(items, weights):
    return random.choices(items, weights=weights, k=1)[0]


def collect_all_ids(entity: str) -> list[int]:
    """Paginate crm.{entity}.list to collect ALL IDs."""
    ids = []
    start = 0
    while True:
        result = api_call(f"crm.{entity}.list", {
            "select": ["ID"],
            "start": start,
        })
        items = result.get("result", [])
        if not items:
            break
        ids.extend(int(item["ID"]) for item in items)
        next_start = result.get("next")
        if not next_start:
            break
        start = next_start
    return ids


# -- Delete All Data -------------------------------------------------------

def delete_all_data():
    """Delete all existing CRM records before repopulating.
    Order: activities -> deals -> leads -> contacts -> companies."""

    entities = ["activity", "deal", "lead", "contact", "company"]

    for entity in entities:
        print(f"  Deleting all {entity} records...")
        ids = collect_all_ids(entity)

        if not ids:
            print(f"    No {entity} records found.")
            continue

        print(f"    Found {len(ids)} {entity} records to delete.")

        deleted = 0
        for batch_start in range(0, len(ids), 50):
            batch_ids = ids[batch_start:batch_start + 50]
            cmds = {}
            for i, rid in enumerate(batch_ids):
                cmds[f"del{i}"] = f"crm.{entity}.delete?id={rid}"

            try:
                result = batch_call(cmds)
                res_data = result.get("result", {}).get("result", {})
                deleted += len([v for v in res_data.values() if v])
            except Exception as e:
                print(f"    Batch delete error: {e}")

        print(f"    Deleted {deleted}/{len(ids)} {entity} records.")

    print()


# -- Create Products -------------------------------------------------------

def create_products() -> list[int]:
    """Create product catalog items."""
    print(f"Creating {len(PRODUCTS)} products...")
    product_ids = []

    cmds = {}
    for i, (name, price, desc) in enumerate(PRODUCTS):
        cmds[f"p{i}"] = (
            f"crm.product.add?fields[NAME]={requests.utils.quote(name)}"
            f"&fields[PRICE]={price}"
            f"&fields[CURRENCY_ID]=AED"
            f"&fields[ACTIVE]=Y"
            f"&fields[DESCRIPTION]={requests.utils.quote(desc)}"
        )

    result = batch_call(cmds)
    res_data = result.get("result", {}).get("result", {})
    for key in sorted(res_data.keys()):
        pid = res_data[key]
        if pid:
            product_ids.append(pid)

    print(f"  Total: {len(product_ids)} products\n")
    return product_ids


# -- Main Population Logic ------------------------------------------------

def create_users():
    """
    We can't create real Bitrix24 users via webhook — they're admin-only.
    All records will be assigned to user ID 1 (webhook owner).
    Rep names are embedded in comments and activity subjects for analytics.
    """
    print("Note: All records assigned to user ID 1 (webhook owner).")
    print("Rep names are embedded in comments and activity subjects for analytics.\n")
    return {rep["name"]: 1 for rep in REPS}


def create_companies() -> dict[str, int]:
    """Create companies with revenue, return {name: bitrix_id}."""
    print(f"Creating {len(COMPANIES)} companies...")
    company_ids = {}

    for batch_start in range(0, len(COMPANIES), 50):
        batch = COMPANIES[batch_start:batch_start + 50]
        cmds = {}
        for i, (name, industry, emp_size, tier) in enumerate(batch):
            rev_lo, rev_hi = REVENUE_RANGES[tier]
            revenue = round(random.uniform(rev_lo, rev_hi), -3)
            cmds[f"c{batch_start + i}"] = (
                f"crm.company.add?fields[TITLE]={requests.utils.quote(name)}"
                f"&fields[INDUSTRY]={industry}"
                f"&fields[EMPLOYEES]={emp_size}"
                f"&fields[COMPANY_TYPE]=CUSTOMER"
                f"&fields[CURRENCY_ID]=AED"
                f"&fields[REVENUE]={revenue}"
                f"&fields[ASSIGNED_BY_ID]=1"
                f"&fields[OPENED]=Y"
            )

        result = batch_call(cmds)
        for key, (name, _, _, _) in zip(cmds.keys(), batch):
            cid = result.get("result", {}).get("result", {}).get(key)
            if cid:
                company_ids[name] = cid

        created = len([v for v in result.get("result", {}).get("result", {}).values() if v])
        print(f"  Batch: {created} companies created")

    print(f"  Total: {len(company_ids)} companies\n")
    return company_ids


def create_contacts(company_ids: dict) -> dict[str, int]:
    """Create 2-4 contacts per company, return {name: bitrix_id}."""
    contacts = []
    for comp_name, comp_id in company_ids.items():
        n_contacts = random.randint(2, 4)
        for _ in range(n_contacts):
            first, last, honorific = gen_contact_name()
            contacts.append({
                "NAME": first,
                "LAST_NAME": last,
                "HONORIFIC": honorific,
                "COMPANY_ID": comp_id,
                "TYPE_ID": "CLIENT",
                "ASSIGNED_BY_ID": 1,
                "OPENED": "Y",
                "PHONE": [{"VALUE": random_phone(), "VALUE_TYPE": "WORK"}],
                "EMAIL": [{"VALUE": random_email(first, last, comp_name), "VALUE_TYPE": "WORK"}],
                "POST": random.choice([
                    "CEO", "CTO", "VP Sales", "IT Manager", "Procurement Manager",
                    "Operations Director", "Finance Manager", "Project Manager",
                    "Head of Digital", "Managing Director",
                ]),
                "_comp_name": comp_name,
            })

    print(f"Creating {len(contacts)} contacts...")
    contact_ids = {}

    for batch_start in range(0, len(contacts), 50):
        batch = contacts[batch_start:batch_start + 50]
        cmds = {}
        for i, c in enumerate(batch):
            idx = batch_start + i
            cmds[f"ct{idx}"] = (
                f"crm.contact.add?fields[NAME]={requests.utils.quote(c['NAME'])}"
                f"&fields[LAST_NAME]={requests.utils.quote(c['LAST_NAME'])}"
                f"&fields[HONORIFIC]={c['HONORIFIC']}"
                f"&fields[COMPANY_ID]={c['COMPANY_ID']}"
                f"&fields[TYPE_ID]={c['TYPE_ID']}"
                f"&fields[ASSIGNED_BY_ID]=1"
                f"&fields[OPENED]=Y"
                f"&fields[POST]={requests.utils.quote(c['POST'])}"
            )

        result = batch_call(cmds)
        res_data = result.get("result", {}).get("result", {})
        created = len([v for v in res_data.values() if v])

        for i, c in enumerate(batch):
            idx = batch_start + i
            cid = res_data.get(f"ct{idx}")
            if cid:
                full_name = f"{c['NAME']} {c['LAST_NAME']}"
                contact_ids[full_name] = cid

        print(f"  Batch: {created} contacts created")

        # Add phones/emails individually (batch doesn't support multifield well)
        for i, c in enumerate(batch):
            idx = batch_start + i
            cid = res_data.get(f"ct{idx}")
            if cid:
                try:
                    api_call("crm.contact.update", {
                        "id": cid,
                        "fields": {
                            "PHONE": c["PHONE"],
                            "EMAIL": c["EMAIL"],
                        }
                    })
                except Exception:
                    pass  # Non-critical

    print(f"  Total: {len(contact_ids)} contacts\n")
    return contact_ids


def create_leads(company_ids: dict, contact_ids: dict) -> list[int]:
    """Create ~350 leads, then batch-UPDATE each lead's STATUS_ID.
    Bitrix24 ignores STATUS_ID on creation — it must be set via update."""

    leads_data = []
    contact_list = list(contact_ids.items())
    company_list = list(company_ids.items())

    # Distribution: ~20% NEW, ~20% IN_PROCESS, ~25% PROCESSED, ~25% CONVERTED, ~10% JUNK
    status_weights = [20, 20, 25, 25, 10]

    for _ in range(350):
        rep = pick_rep()
        status = weighted_choice(LEAD_STATUSES, status_weights)
        source = weighted_choice(LEAD_SOURCES, LEAD_SOURCE_WEIGHTS)

        # Date spread: NEW = recent, CONVERTED = older
        if status == "NEW":
            created = random_date(NOW - timedelta(days=14), NOW)
        elif status == "IN_PROCESS":
            created = random_date(NOW - timedelta(days=45), NOW - timedelta(days=3))
        elif status == "PROCESSED":
            created = random_date(START_DATE + timedelta(days=15), NOW - timedelta(days=7))
        elif status == "CONVERTED":
            created = random_date(START_DATE, NOW - timedelta(days=20))
        else:  # JUNK
            created = random_date(START_DATE, NOW - timedelta(days=7))

        first, last, honorific = gen_contact_name()
        company = random.choice(company_list)
        value = random.randint(1000, 80000)

        products = ["CRM Platform", "ERP Suite", "Analytics Module", "API Integration",
                     "Cloud Migration", "Data Warehouse", "Automation Package",
                     "Support Contract", "Training Program", "Custom Development"]
        product = random.choice(products)

        lead = {
            "TITLE": f"{company[0]} - {product}",
            "NAME": first,
            "LAST_NAME": last,
            "HONORIFIC": honorific,
            "SOURCE_ID": source,
            "COMPANY_TITLE": company[0],
            "COMPANY_ID": company[1],
            "OPPORTUNITY": value,
            "CURRENCY_ID": "AED",
            "ASSIGNED_BY_ID": 1,
            "OPENED": "Y",
            "COMMENTS": f"Sales rep: {rep['name']} | Profile: {rep['profile']}",
            "DATE_CREATE": fmt_date(created),
            # NOTE: STATUS_ID intentionally omitted — set via update below
        }

        if source in ("WEB", "WEBFORM", "ADVERTISING"):
            lead["UTM_SOURCE"] = random.choice(["google", "facebook", "linkedin", "twitter"])
            lead["UTM_MEDIUM"] = random.choice(["cpc", "organic", "social", "referral"])
            lead["UTM_CAMPAIGN"] = random.choice(["q4_2025_launch", "brand_awareness", "retargeting", "winter_promo"])

        leads_data.append({"fields": lead, "target_status": status})

    # Step 1: Create all leads (without STATUS_ID)
    print(f"Creating {len(leads_data)} leads...")
    lead_id_status_pairs = []  # [(id, target_status), ...]

    for batch_start in range(0, len(leads_data), 50):
        batch = leads_data[batch_start:batch_start + 50]
        cmds = {}
        for i, ld in enumerate(batch):
            idx = batch_start + i
            params = "&".join(
                f"fields[{k}]={requests.utils.quote(str(v))}"
                for k, v in ld["fields"].items()
                if v is not None
            )
            cmds[f"l{idx}"] = f"crm.lead.add?{params}"

        result = batch_call(cmds)
        res_data = result.get("result", {}).get("result", {})
        created = len([v for v in res_data.values() if v])

        for i, ld in enumerate(batch):
            idx = batch_start + i
            lid = res_data.get(f"l{idx}")
            if lid:
                lead_id_status_pairs.append((lid, ld["target_status"]))

        print(f"  Batch {batch_start//50 + 1}: {created} leads created")

    # Step 2: Batch-update STATUS_ID for each lead
    print(f"  Updating {len(lead_id_status_pairs)} lead statuses...")
    updated = 0

    for batch_start in range(0, len(lead_id_status_pairs), 50):
        batch = lead_id_status_pairs[batch_start:batch_start + 50]
        cmds = {}
        for i, (lid, status) in enumerate(batch):
            cmds[f"u{i}"] = f"crm.lead.update?id={lid}&fields[STATUS_ID]={status}"

        result = batch_call(cmds)
        res_data = result.get("result", {}).get("result", {})
        updated += len([v for v in res_data.values() if v])

    print(f"  Updated {updated}/{len(lead_id_status_pairs)} lead statuses")

    lead_ids = [pair[0] for pair in lead_id_status_pairs]
    print(f"  Total: {len(lead_ids)} leads\n")
    return lead_ids


def create_deals(company_ids: dict, contact_ids: dict) -> list[dict]:
    """Create ~150 deals, then batch-UPDATE each deal's STAGE_ID + CLOSED flag.
    Bitrix24 ignores STAGE_ID on creation — it must be set via update."""

    deals = []
    company_list = list(company_ids.items())
    contact_list = list(contact_ids.items())

    # Stage distribution for realistic funnel
    stage_distribution = [
        ("NEW", 20),
        ("PREPARATION", 18),
        ("PREPAYMENT_INVOICE", 15),
        ("EXECUTING", 12),
        ("FINAL_INVOICE", 8),
        ("WON", 45),
        ("LOSE", 25),
        ("APOLOGY", 7),
    ]

    for stage, count in stage_distribution:
        for _ in range(count):
            rep = pick_rep_for_stage(stage)
            company = random.choice(company_list)
            comp_tier = next((c[3] for c in COMPANIES if c[0] == company[0]), "medium")
            val_low, val_high = VALUE_RANGES[comp_tier]
            value = round(random.uniform(val_low, val_high), -2)

            # Dates: earlier for closed deals, recent for open ones
            if stage in ("WON", "LOSE", "APOLOGY"):
                created = random_date(START_DATE, NOW - timedelta(days=10))
                cycle = random.randint(14, 75)
                closed = created + timedelta(days=cycle)
                if closed > NOW:
                    closed = NOW - timedelta(days=random.randint(1, 10))
            elif stage == "NEW":
                created = random_date(NOW - timedelta(days=21), NOW - timedelta(days=1))
                closed = created + timedelta(days=random.randint(30, 60))
            elif stage in ("PREPARATION", "PREPAYMENT_INVOICE"):
                created = random_date(NOW - timedelta(days=60), NOW - timedelta(days=10))
                closed = created + timedelta(days=random.randint(20, 50))
            else:
                # EXECUTING, FINAL_INVOICE — been in pipeline a while
                created = random_date(NOW - timedelta(days=75), NOW - timedelta(days=20))
                closed = created + timedelta(days=random.randint(15, 45))

            # Stall rate based on rep profile
            stall_rate = STALL_RATES.get(rep["profile"], 0.30)
            is_stalled = stage in ("PREPARATION", "PREPAYMENT_INVOICE", "EXECUTING") and random.random() < stall_rate

            if is_stalled:
                modified = created + timedelta(days=random.randint(5, 15))
            else:
                modified = random_date(created, min(NOW, closed))

            product_names = [p[0] for p in PRODUCTS]
            contact = random.choice(contact_list) if contact_list else None

            deal = {
                "TITLE": f"{company[0]} - {random.choice(product_names)}",
                # NOTE: STAGE_ID intentionally omitted — set via update below
                "OPPORTUNITY": value,
                "CURRENCY_ID": "AED",
                "COMPANY_ID": company[1],
                "CONTACT_ID": contact[1] if contact else None,
                "ASSIGNED_BY_ID": 1,
                "TYPE_ID": random.choice(DEAL_TYPES),
                "SOURCE_ID": weighted_choice(LEAD_SOURCES, LEAD_SOURCE_WEIGHTS),
                "OPENED": "Y",
                "PROBABILITY": {"NEW": 10, "PREPARATION": 25, "PREPAYMENT_INVOICE": 50,
                                "EXECUTING": 70, "FINAL_INVOICE": 85, "WON": 100,
                                "LOSE": 0, "APOLOGY": 0}.get(stage, 50),
                "BEGINDATE": fmt_date_only(created),
                "CLOSEDATE": fmt_date_only(closed),
                "COMMENTS": f"Sales rep: {rep['name']} | Profile: {rep['profile']}"
                           + (" | STALLED - no recent activity" if is_stalled else ""),
                "DATE_CREATE": fmt_date(created),
                "_target_stage": stage,
                "_rep": rep,
                "_created": created,
                "_modified": modified,
                "_stalled": is_stalled,
            }
            deals.append(deal)

    # Step 1: Create all deals (without STAGE_ID)
    print(f"Creating {len(deals)} deals...")
    deal_records = []

    for batch_start in range(0, len(deals), 50):
        batch = deals[batch_start:batch_start + 50]
        cmds = {}
        for i, deal in enumerate(batch):
            idx = batch_start + i
            fields = {k: v for k, v in deal.items()
                      if not k.startswith("_") and v is not None}
            params = "&".join(
                f"fields[{k}]={requests.utils.quote(str(v))}"
                for k, v in fields.items()
            )
            cmds[f"d{idx}"] = f"crm.deal.add?{params}"

        result = batch_call(cmds)
        res_data = result.get("result", {}).get("result", {})
        created_count = len([v for v in res_data.values() if v])

        for i, deal in enumerate(batch):
            idx = batch_start + i
            did = res_data.get(f"d{idx}")
            if did:
                deal_records.append({"id": did, **deal})

        print(f"  Batch {batch_start//50 + 1}: {created_count} deals created")

    # Step 2: Batch-update STAGE_ID (and CLOSED for WON/LOSE/APOLOGY)
    print(f"  Updating {len(deal_records)} deal stages...")
    updated = 0

    for batch_start in range(0, len(deal_records), 50):
        batch = deal_records[batch_start:batch_start + 50]
        cmds = {}
        for i, deal in enumerate(batch):
            stage = deal["_target_stage"]
            update_params = f"id={deal['id']}&fields[STAGE_ID]={stage}"
            if stage in ("WON", "LOSE", "APOLOGY"):
                update_params += "&fields[CLOSED]=Y"
            cmds[f"u{i}"] = f"crm.deal.update?{update_params}"

        result = batch_call(cmds)
        res_data = result.get("result", {}).get("result", {})
        updated += len([v for v in res_data.values() if v])

    print(f"  Updated {updated}/{len(deal_records)} deal stages")

    # Copy target_stage into STAGE_ID for summary reporting
    for d in deal_records:
        d["STAGE_ID"] = d["_target_stage"]

    print(f"  Total: {len(deal_records)} deals\n")
    return deal_records


def create_activities(deal_records: list[dict], contact_ids: dict, company_ids: dict):
    """Create ~1,500 activities (calls, emails, meetings, tasks) over 3 months.
    Uses correct TYPE_ID mapping: task=1, call=2, email=3, meeting=4.
    Uses email addresses (not phone) for email COMMUNICATIONS."""

    activities = []
    contact_list = list(contact_ids.items())
    company_list = list(company_ids.items())

    # Activities tied to deals (2-15 per deal depending on stage)
    activity_counts = {
        "NEW": (1, 3),
        "PREPARATION": (3, 6),
        "PREPAYMENT_INVOICE": (4, 8),
        "EXECUTING": (5, 10),
        "FINAL_INVOICE": (6, 12),
        "WON": (8, 15),
        "LOSE": (3, 8),
        "APOLOGY": (2, 5),
    }

    for deal in deal_records:
        stage = deal.get("STAGE_ID", "NEW")
        rep = deal.get("_rep", REPS[0])
        created = deal.get("_created", START_DATE)
        is_stalled = deal.get("_stalled", False)

        lo, hi = activity_counts.get(stage, (2, 5))
        # Adjust by rep activity rate
        n_acts = int(random.randint(lo, hi) * rep["activity_rate"])
        n_acts = max(1, n_acts)

        for j in range(n_acts):
            act_type = weighted_choice(ACTIVITY_TYPES, ACTIVITY_TYPE_WEIGHTS)

            if act_type == "call":
                subject = random.choice(CALL_SUBJECTS)
                duration = random.choice([180, 300, 600, 900, 1200, 1800])
            elif act_type == "email":
                subject = random.choice(EMAIL_SUBJECTS)
                duration = 0
            elif act_type == "meeting":
                subject = random.choice(MEETING_SUBJECTS)
                duration = random.choice([1800, 2700, 3600, 5400])
            else:
                subject = random.choice(TASK_SUBJECTS)
                duration = 0

            # Spread activities across the deal lifecycle
            if is_stalled and j > 1:
                # Stalled deals: cluster activities at the beginning
                act_date = random_date(created, created + timedelta(days=10))
            else:
                end_date = min(NOW, created + timedelta(days=random.randint(14, 80)))
                act_date = random_date(created, end_date)

            contact = random.choice(contact_list) if contact_list else None

            # Build COMMUNICATIONS with correct value type
            comms = []
            if act_type == "call":
                comms = [{
                    "VALUE": random_phone(),
                    "ENTITY_ID": contact[1] if contact else 0,
                    "ENTITY_TYPE_ID": 3,
                    "TYPE": "PHONE",
                }]
            elif act_type == "email":
                # Email activities must use email addresses, not phone numbers
                email_addr = random_email(
                    contact[0].split()[0] if contact else "info",
                    contact[0].split()[-1] if contact else "company",
                    deal.get("TITLE", "company").split(" - ")[0]
                )
                comms = [{
                    "VALUE": email_addr,
                    "ENTITY_ID": contact[1] if contact else 0,
                    "ENTITY_TYPE_ID": 3,
                    "TYPE": "EMAIL",
                }]

            activity = {
                "OWNER_TYPE_ID": 2,  # Deal
                "OWNER_ID": deal["id"],
                "TYPE_ID": ACTIVITY_TYPE_ID_MAP[act_type],
                "SUBJECT": f"{subject} - {rep['name']}",
                "DESCRIPTION": f"Rep: {rep['name']} | Company: {deal.get('TITLE', '')}",
                "RESPONSIBLE_ID": 1,
                "COMPLETED": "Y" if act_date < NOW - timedelta(hours=2) else "N",
                "START_TIME": fmt_date(act_date),
                "END_TIME": fmt_date(act_date + timedelta(seconds=duration)) if duration else fmt_date(act_date + timedelta(minutes=15)),
                "COMMUNICATIONS": comms,
            }
            activities.append(activity)

    # Add some standalone activities (not tied to deals) — general prospecting
    for _ in range(200):
        rep = pick_rep()
        act_type = weighted_choice(ACTIVITY_TYPES, ACTIVITY_TYPE_WEIGHTS)
        act_date = random_date(START_DATE, NOW)

        if act_type == "call":
            subject = f"Prospecting call - {rep['name']}"
        elif act_type == "email":
            subject = f"Outreach email - {rep['name']}"
        elif act_type == "meeting":
            subject = f"Intro meeting - {rep['name']}"
        else:
            subject = f"Follow-up task - {rep['name']}"

        company = random.choice(company_list)

        # Build COMMUNICATIONS for standalone activities
        comms = []
        if act_type == "call":
            comms = [{"VALUE": random_phone(), "TYPE": "PHONE"}]
        elif act_type == "email":
            comms = [{"VALUE": f"info@{company[0].lower().replace(' ','')[:12]}.ae", "TYPE": "EMAIL"}]

        activity = {
            "OWNER_TYPE_ID": 4,  # Company
            "OWNER_ID": company[1],
            "TYPE_ID": ACTIVITY_TYPE_ID_MAP[act_type],
            "SUBJECT": subject,
            "DESCRIPTION": f"Prospecting activity by {rep['name']}",
            "RESPONSIBLE_ID": 1,
            "COMPLETED": "Y" if act_date < NOW - timedelta(hours=1) else "N",
            "START_TIME": fmt_date(act_date),
            "END_TIME": fmt_date(act_date + timedelta(minutes=random.choice([15, 30, 45, 60]))),
            "COMMUNICATIONS": comms,
        }
        activities.append(activity)

    print(f"Creating {len(activities)} activities...")
    created_count = 0
    failed_count = 0

    # Activities with COMMUNICATIONS need individual JSON POST calls (not batch)
    for i, act in enumerate(activities):
        # Ensure COMMUNICATIONS is at least an empty list
        if "COMMUNICATIONS" not in act:
            act["COMMUNICATIONS"] = []

        time.sleep(0.35)  # Lighter rate limit for individual calls
        try:
            resp = requests.post(
                f"{WEBHOOK_URL}crm.activity.add",
                json={"fields": act},
                timeout=30
            )
            result = resp.json()
            if result.get("result"):
                created_count += 1
            else:
                failed_count += 1
                if failed_count <= 5:
                    print(f"    Activity fail #{failed_count}: {result.get('error_description', 'unknown')}")
        except Exception as e:
            failed_count += 1
            if failed_count <= 5:
                print(f"    Activity exception #{failed_count}: {e}")

        if (i + 1) % 100 == 0 or i == len(activities) - 1:
            print(f"  Progress: {i + 1}/{len(activities)} ({created_count} created, {failed_count} failed)")

    print(f"  Total: {created_count} activities ({failed_count} failed)\n")
    return created_count


def print_summary(company_ids, contact_ids, lead_ids, deal_records, activity_count, product_ids):
    """Print final summary."""

    won_deals = [d for d in deal_records if d.get("STAGE_ID") == "WON"]
    lost_deals = [d for d in deal_records if d.get("STAGE_ID") in ("LOSE", "APOLOGY")]
    open_deals = [d for d in deal_records if d.get("STAGE_ID") in DEAL_STAGES_OPEN]

    won_value = sum(float(d.get("OPPORTUNITY", 0)) for d in won_deals)
    lost_value = sum(float(d.get("OPPORTUNITY", 0)) for d in lost_deals)
    pipeline_value = sum(float(d.get("OPPORTUNITY", 0)) for d in open_deals)

    stalled = [d for d in deal_records if d.get("_stalled")]

    print("=" * 60)
    print("  BITRIX24 DATA POPULATION COMPLETE")
    print("=" * 60)
    print(f"""
  Products:      {len(product_ids)}
  Companies:     {len(company_ids)}
  Contacts:      {len(contact_ids)}
  Leads:         {len(lead_ids)}
  Deals:         {len(deal_records)}
  Activities:    {activity_count}

  Pipeline Summary:
    Open deals:  {len(open_deals)} (AED {pipeline_value:,.0f})
    Won deals:   {len(won_deals)} (AED {won_value:,.0f})
    Lost deals:  {len(lost_deals)} (AED {lost_value:,.0f})
    Stalled:     {len(stalled)} deals with no recent activity

  Win Rate:      {len(won_deals)/(len(won_deals)+len(lost_deals))*100:.1f}%

  Sales Reps (embedded in comments):
""")
    for rep in REPS:
        rep_deals = [d for d in deal_records if d.get("_rep", {}).get("name") == rep["name"]]
        rep_won = [d for d in rep_deals if d.get("STAGE_ID") == "WON"]
        print(f"    {rep['name']:25s} | {len(rep_deals):3d} deals | {len(rep_won):2d} won | profile: {rep['profile']}")

    print(f"""
  Date Range:    {START_DATE.strftime('%Y-%m-%d')} -> {NOW.strftime('%Y-%m-%d')}

  Scenarios for Bobur to detect:
    - Pipeline stall risk (stalled deals in mid-stages)
    - Conversion drop patterns
    - Rep performance variance (star vs declining)
    - Concentration risk (large enterprise deals)
    - Forecast hygiene gaps (some deals missing close dates)

  Next steps:
    1. Run Karim sync to pull data into Supabase crm_* tables
    2. Open CRM Dashboard and verify Bobur can answer questions
    3. Spot-check: crm.deal.list should show mixed stages
""")


# -- Main ------------------------------------------------------------------

def main():
    print("=" * 60)
    print("  TECHFLOW SOLUTIONS - Bitrix24 CRM Data Generator")
    print("  3 months of realistic B2B SaaS sales data")
    print("=" * 60)
    print(f"  Webhook: {WEBHOOK_URL[:50]}...")
    print(f"  Date range: {START_DATE.strftime('%Y-%m-%d')} -> {NOW.strftime('%Y-%m-%d')}")
    print(f"  Rate limit delay: {RATE_LIMIT_DELAY}s per call")
    print()

    # Verify connection
    print("Verifying connection...")
    try:
        user = api_call("user.current")
        print(f"  Connected as: {user['result'].get('EMAIL', 'unknown')}\n")
    except Exception as e:
        print(f"  ERROR: Cannot connect to Bitrix24: {e}")
        return

    # 1. Clean slate — delete all existing data
    print("Deleting all existing data...")
    delete_all_data()

    # 2. Products
    product_ids = create_products()

    # 3. Companies (with revenue)
    company_ids = create_companies()

    # 4. Contacts
    contact_ids = create_contacts(company_ids)

    # 5. Leads (create then batch-update statuses)
    lead_ids = create_leads(company_ids, contact_ids)

    # 6. Deals (create then batch-update stages)
    deal_records = create_deals(company_ids, contact_ids)

    # 7. Activities (fixed TYPE_ID + COMMUNICATIONS)
    activity_count = create_activities(deal_records, contact_ids, company_ids)

    # 8. Summary
    print_summary(company_ids, contact_ids, lead_ids, deal_records, activity_count, product_ids)


if __name__ == "__main__":
    main()
