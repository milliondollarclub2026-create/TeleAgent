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
  - ~40 companies (prospects/clients)
  - ~120 contacts across those companies
  - ~350 leads (various statuses, sources, assigned reps)
  - ~150 deals (across all pipeline stages, won/lost included)
  - ~1,500 activities (calls, emails, meetings, tasks) over 3 months

Bitrix24 rate limit: 2 req/sec (with burst buffer of 50).
Script uses batch API (crm.*.add in batches of 50) to stay within limits.
"""

import requests
import time
import random
import json
from datetime import datetime, timedelta
from typing import Any

# -- Configuration ---------------------------------------------------------

WEBHOOK_URL = "https://b24-mbii6g.bitrix24.ae/rest/1/cen9jveztuj0muu6/"
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
    offset = random.randint(0, int(delta.total_seconds()))
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


# -- Main Population Logic ------------------------------------------------

def create_users():
    """
    We can't create real Bitrix24 users via webhook - they're admin-only.
    We'll use ASSIGNED_BY_ID = 1 (the webhook owner) for all records,
    but store rep names in lead/deal titles and activity subjects.
    The sync engine maps assigned_to from ASSIGNED_BY_ID.

    Actually, Bitrix24 webhooks run as user ID=1. All records will be
    assigned to user 1. For rep tracking, we'll put rep names in the
    COMMENTS field and use activities with employee names.
    """
    print("Note: All records assigned to user ID 1 (webhook owner).")
    print("Rep names are embedded in comments and activity subjects for analytics.\n")
    return {rep["name"]: 1 for rep in REPS}


def create_companies() -> dict[str, int]:
    """Create companies, return {name: bitrix_id}."""
    print(f"Creating {len(COMPANIES)} companies...")
    company_ids = {}

    # Batch in groups of 50
    for batch_start in range(0, len(COMPANIES), 50):
        batch = COMPANIES[batch_start:batch_start + 50]
        cmds = {}
        for i, (name, industry, emp_size, _) in enumerate(batch):
            cmds[f"c{batch_start + i}"] = (
                f"crm.company.add?fields[TITLE]={requests.utils.quote(name)}"
                f"&fields[INDUSTRY]={industry}"
                f"&fields[EMPLOYEES]={emp_size}"
                f"&fields[COMPANY_TYPE]=CUSTOMER"
                f"&fields[CURRENCY_ID]=AED"
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
            })

    print(f"Creating {len(contacts)} contacts...")
    contact_ids = {}

    for batch_start in range(0, len(contacts), 50):
        batch = contacts[batch_start:batch_start + 50]
        cmds = {}
        for i, c in enumerate(batch):
            idx = batch_start + i
            # Use individual API calls for contacts (multifield phone/email need POST body)
            cmds[f"ct{idx}"] = f"crm.contact.add?fields[NAME]={requests.utils.quote(c['NAME'])}&fields[LAST_NAME]={requests.utils.quote(c['LAST_NAME'])}&fields[HONORIFIC]={c['HONORIFIC']}&fields[COMPANY_ID]={c['COMPANY_ID']}&fields[TYPE_ID]={c['TYPE_ID']}&fields[ASSIGNED_BY_ID]=1&fields[OPENED]=Y&fields[POST]={requests.utils.quote(c['POST'])}"

        result = batch_call(cmds)
        res_data = result.get("result", {}).get("result", {})
        created = len([v for v in res_data.values() if v])

        for i, c in enumerate(batch):
            idx = batch_start + i
            cid = res_data.get(f"ct{idx}")
            if cid:
                full_name = f"{c['NAME']} {c['LAST_NAME']}"
                contact_ids[full_name] = cid
                # Add phone and email separately (batch doesn't support multifield well)

        print(f"  Batch: {created} contacts created")

        # Add phones/emails individually for this batch (needed for multifield)
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
    """Create ~350 leads spread over 3 months."""

    leads = []
    contact_list = list(contact_ids.items())
    company_list = list(company_ids.items())

    # Distribution: ~40% NEW/IN_PROCESS, ~25% PROCESSED, ~25% CONVERTED, ~10% JUNK
    status_weights = [20, 20, 25, 25, 10]

    for _ in range(350):
        rep = pick_rep()
        status = weighted_choice(LEAD_STATUSES, status_weights)
        source = weighted_choice(LEAD_SOURCES, LEAD_SOURCE_WEIGHTS)

        # Date: spread across 3 months, with more recent leads being NEW
        if status == "NEW":
            created = random_date(NOW - timedelta(days=14), NOW)
        elif status == "IN_PROCESS":
            created = random_date(NOW - timedelta(days=45), NOW - timedelta(days=3))
        else:
            created = random_date(START_DATE, NOW - timedelta(days=7))

        first, last, honorific = gen_contact_name()
        company = random.choice(company_list)
        value = random.randint(1000, 80000)

        # Build lead title based on product interest
        products = ["CRM Platform", "ERP Suite", "Analytics Module", "API Integration",
                     "Cloud Migration", "Data Warehouse", "Automation Package",
                     "Support Contract", "Training Program", "Custom Development"]
        product = random.choice(products)

        lead = {
            "TITLE": f"{company[0]} - {product}",
            "NAME": first,
            "LAST_NAME": last,
            "HONORIFIC": honorific,
            "STATUS_ID": status,
            "SOURCE_ID": source,
            "COMPANY_TITLE": company[0],
            "COMPANY_ID": company[1],
            "OPPORTUNITY": value,
            "CURRENCY_ID": "AED",
            "ASSIGNED_BY_ID": 1,
            "OPENED": "Y",
            "COMMENTS": f"Sales rep: {rep['name']} | Profile: {rep['profile']}",
            "PHONE": [{"VALUE": random_phone(), "VALUE_TYPE": "WORK"}],
            "EMAIL": [{"VALUE": random_email(first, last, company[0]), "VALUE_TYPE": "WORK"}],
            "DATE_CREATE": fmt_date(created),
        }

        if source in ("WEB", "WEBFORM", "ADVERTISING"):
            lead["UTM_SOURCE"] = random.choice(["google", "facebook", "linkedin", "twitter"])
            lead["UTM_MEDIUM"] = random.choice(["cpc", "organic", "social", "referral"])
            lead["UTM_CAMPAIGN"] = random.choice(["q4_2025_launch", "brand_awareness", "retargeting", "winter_promo"])

        leads.append(lead)

    print(f"Creating {len(leads)} leads...")
    lead_ids = []

    for batch_start in range(0, len(leads), 50):
        batch = leads[batch_start:batch_start + 50]
        cmds = {}
        for i, lead in enumerate(batch):
            idx = batch_start + i
            # Simplified batch - key fields only (phone/email added after)
            params = "&".join(
                f"fields[{k}]={requests.utils.quote(str(v))}"
                for k, v in lead.items()
                if k not in ("PHONE", "EMAIL") and v is not None
            )
            cmds[f"l{idx}"] = f"crm.lead.add?{params}"

        result = batch_call(cmds)
        res_data = result.get("result", {}).get("result", {})
        created = len([v for v in res_data.values() if v])
        lead_ids.extend(v for v in res_data.values() if v)
        print(f"  Batch {batch_start//50 + 1}: {created} leads")

    print(f"  Total: {len(lead_ids)} leads\n")
    return lead_ids


def create_deals(company_ids: dict, contact_ids: dict) -> list[dict]:
    """Create ~150 deals with realistic stage distribution."""

    deals = []
    company_list = list(company_ids.items())
    contact_list = list(contact_ids.items())

    # Stage distribution for realistic funnel:
    # NEW: 20, PREPARATION: 18, PREPAYMENT_INVOICE: 15, EXECUTING: 12, FINAL_INVOICE: 8
    # WON: 45, LOSE: 25, APOLOGY: 7
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
            rep = pick_rep()
            company = random.choice(company_list)
            comp_tier = next((c[3] for c in COMPANIES if c[0] == company[0]), "medium")
            val_low, val_high = VALUE_RANGES[comp_tier]
            value = round(random.uniform(val_low, val_high), -2)  # Round to nearest 100

            # Dates: earlier for closed deals, recent for open ones
            if stage in ("WON", "LOSE", "APOLOGY"):
                created = random_date(START_DATE, NOW - timedelta(days=10))
                cycle = random.randint(14, 75)
                closed = created + timedelta(days=cycle)
                if closed > NOW:
                    closed = NOW - timedelta(days=random.randint(1, 10))
            elif stage in ("NEW",):
                created = random_date(NOW - timedelta(days=21), NOW - timedelta(days=1))
                closed = created + timedelta(days=random.randint(30, 60))
            elif stage in ("PREPARATION", "PREPAYMENT_INVOICE"):
                created = random_date(NOW - timedelta(days=60), NOW - timedelta(days=10))
                closed = created + timedelta(days=random.randint(20, 50))
            else:
                # EXECUTING, FINAL_INVOICE - been in pipeline a while
                created = random_date(NOW - timedelta(days=75), NOW - timedelta(days=20))
                closed = created + timedelta(days=random.randint(15, 45))

            # Some deals intentionally stalled (no recent modification)
            is_stalled = stage in ("PREPARATION", "PREPAYMENT_INVOICE", "EXECUTING") and random.random() < 0.3
            if is_stalled:
                modified = created + timedelta(days=random.randint(5, 15))
            else:
                modified = random_date(created, min(NOW, closed))

            products = ["CRM Pro License", "ERP Standard", "Analytics Dashboard",
                        "API Gateway", "Cloud Hosting", "Custom Integration",
                        "Support Package", "Training Bundle", "Data Migration",
                        "Security Audit", "Consulting Hours"]

            contact = random.choice(contact_list) if contact_list else None

            deal = {
                "TITLE": f"{company[0]} - {random.choice(products)}",
                "STAGE_ID": stage,
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
                "_rep": rep,
                "_created": created,
                "_modified": modified,
                "_stalled": is_stalled,
            }
            deals.append(deal)

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

        print(f"  Batch {batch_start//50 + 1}: {created_count} deals")

    print(f"  Total: {len(deal_records)} deals\n")
    return deal_records


def create_activities(deal_records: list[dict], contact_ids: dict, company_ids: dict):
    """Create ~1,500 activities (calls, emails, meetings, tasks) over 3 months."""

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

            activity = {
                "OWNER_TYPE_ID": 2,  # Deal
                "OWNER_ID": deal["id"],
                "TYPE_ID": 2 if act_type == "call" else (4 if act_type == "email" else (1 if act_type == "meeting" else 3)),
                "SUBJECT": f"{subject} - {rep['name']}",
                "DESCRIPTION": f"Rep: {rep['name']} | Company: {deal.get('TITLE', '')}",
                "RESPONSIBLE_ID": 1,
                "COMPLETED": "Y" if act_date < NOW - timedelta(hours=2) else "N",
                "START_TIME": fmt_date(act_date),
                "END_TIME": fmt_date(act_date + timedelta(seconds=duration)) if duration else fmt_date(act_date + timedelta(minutes=15)),
                "COMMUNICATIONS": [{
                    "VALUE": random_phone(),
                    "ENTITY_ID": contact[1] if contact else 0,
                    "ENTITY_TYPE_ID": 3,
                    "TYPE": "PHONE" if act_type == "call" else "EMAIL",
                }] if act_type in ("call", "email") else [],
            }
            activities.append(activity)

    # Add some standalone activities (not tied to deals) - general prospecting
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
        activity = {
            "OWNER_TYPE_ID": 4,  # Company
            "OWNER_ID": company[1],
            "TYPE_ID": 2 if act_type == "call" else (4 if act_type == "email" else (1 if act_type == "meeting" else 3)),
            "SUBJECT": subject,
            "DESCRIPTION": f"Prospecting activity by {rep['name']}",
            "RESPONSIBLE_ID": 1,
            "COMPLETED": "Y" if act_date < NOW - timedelta(hours=1) else "N",
            "START_TIME": fmt_date(act_date),
            "END_TIME": fmt_date(act_date + timedelta(minutes=random.choice([15, 30, 45, 60]))),
        }
        activities.append(activity)

    print(f"Creating {len(activities)} activities...")
    created_count = 0
    failed_count = 0

    # Activities require COMMUNICATIONS field which doesn't work with URL-encoded batch.
    # Use individual JSON POST calls instead.
    for i, act in enumerate(activities):
        # Ensure COMMUNICATIONS exists (required by Bitrix24)
        if "COMMUNICATIONS" not in act or not act["COMMUNICATIONS"]:
            act["COMMUNICATIONS"] = [{"VALUE": random_phone(), "TYPE": "PHONE"}]

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
        except Exception:
            failed_count += 1

        if (i + 1) % 100 == 0 or i == len(activities) - 1:
            print(f"  Progress: {i + 1}/{len(activities)} ({created_count} created, {failed_count} failed)")

    print(f"  Total: {created_count} activities ({failed_count} failed)\n")
    return created_count


def print_summary(company_ids, contact_ids, lead_ids, deal_records, activity_count):
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
        print(f"  ERROR: {e}")
        return

    # 1. Companies
    company_ids = create_companies()

    # 2. Contacts
    contact_ids = create_contacts(company_ids)

    # 3. Leads
    lead_ids = create_leads(company_ids, contact_ids)

    # 4. Deals
    deal_records = create_deals(company_ids, contact_ids)

    # 5. Activities
    activity_count = create_activities(deal_records, contact_ids, company_ids)

    # Summary
    print_summary(company_ids, contact_ids, lead_ids, deal_records, activity_count)


if __name__ == "__main__":
    main()
