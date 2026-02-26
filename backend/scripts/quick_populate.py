"""Quick populate: add balanced leads, deals, and activities to existing CRM data."""
import requests, time, random
from datetime import datetime, timedelta
from collections import Counter

URL = "https://b24-mbii6g.bitrix24.ae/rest/1/wm5uunx4xpkf2x6m/"
NOW = datetime.now()
random.seed(42)


def api(method, params=None):
    time.sleep(0.5)
    r = requests.post(f"{URL}{method}.json", json=params or {}, timeout=30)
    return r.json()


def batch(cmds):
    time.sleep(0.5)
    r = requests.post(f"{URL}batch.json", json={"halt": 0, "cmd": cmds}, timeout=60)
    return r.json()


def fmt(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%S+03:00")


def fmtd(dt):
    return dt.strftime("%Y-%m-%d")


# Get existing company and contact IDs
r = api("crm.company.list", {"select": ["ID", "TITLE"], "limit": 50})
companies = [(c["ID"], c["TITLE"]) for c in r.get("result", [])]
print(f"Using {len(companies)} existing companies")

r = api("crm.contact.list", {"select": ["ID", "NAME"], "limit": 50})
contacts = [(c["ID"], c.get("NAME", "")) for c in r.get("result", [])]
print(f"Using {len(contacts)} existing contacts")

# ---- LEADS (20, balanced) ----
print("\n=== CREATING 20 LEADS ===")
lead_plan = [("NEW", 4), ("IN_PROCESS", 4), ("PROCESSED", 5), ("CONVERTED", 5), ("JUNK", 2)]
prods = ["CRM Platform", "ERP Suite", "Analytics Module", "API Integration", "Cloud Migration"]

cmds = {}
lead_meta = []
idx = 0
for status, count in lead_plan:
    for j in range(count):
        comp = random.choice(companies)
        days = {"NEW": 5, "IN_PROCESS": 25, "PROCESSED": 45, "CONVERTED": 70, "JUNK": 50}[status]
        dt = fmt(NOW - timedelta(days=days + random.randint(0, 15)))
        title = f"{comp[1]} - {prods[idx % 5]}"
        cmds[f"l{idx}"] = (
            f"crm.lead.add?fields[TITLE]={requests.utils.quote(title)}"
            f"&fields[NAME]=Lead&fields[LAST_NAME]=Test{idx}"
            f"&fields[COMPANY_ID]={comp[0]}"
            f"&fields[OPPORTUNITY]={random.randint(5000, 80000)}"
            f"&fields[CURRENCY_ID]=AED&fields[SOURCE_ID]=WEB"
            f"&fields[ASSIGNED_BY_ID]=1"
            f"&fields[DATE_CREATE]={requests.utils.quote(dt)}"
        )
        lead_meta.append(status)
        idx += 1

r = batch(cmds)
res = r.get("result", {}).get("result", {})
lead_pairs = []
for i in range(idx):
    lid = res.get(f"l{i}")
    if lid:
        lead_pairs.append((lid, lead_meta[i]))
print(f"  Created {len(lead_pairs)} leads")

# Update statuses
cmds = {}
for i, (lid, st) in enumerate(lead_pairs):
    cmds[f"u{i}"] = f"crm.lead.update?id={lid}&fields[STATUS_ID]={st}"
r = batch(cmds)
upd = len([v for v in r.get("result", {}).get("result", {}).values() if v])
print(f"  Updated {upd} lead statuses")

# ---- DEALS (22, balanced) ----
print("\n=== CREATING 22 DEALS ===")
deal_plan = [
    ("NEW", 3), ("PREPARATION", 3), ("PREPAYMENT_INVOICE", 2),
    ("EXECUTING", 2), ("FINAL_INVOICE", 2), ("WON", 6), ("LOSE", 3), ("APOLOGY", 1),
]
deal_prods = ["CRM Pro", "ERP Standard", "Analytics Dashboard", "API Gateway", "Cloud Hosting", "Security Audit"]

cmds = {}
deal_meta = []
idx = 0
for stage, count in deal_plan:
    for j in range(count):
        comp = random.choice(companies)
        ct = random.choice(contacts)
        val = random.randint(5000, 120000)
        days = {"NEW": 7, "PREPARATION": 25, "PREPAYMENT_INVOICE": 35, "EXECUTING": 50,
                "FINAL_INVOICE": 55, "WON": 60, "LOSE": 45, "APOLOGY": 40}[stage]
        created = NOW - timedelta(days=days + random.randint(0, 20))
        closed = created + timedelta(days=random.randint(15, 60))
        title = f"{comp[1]} - {deal_prods[idx % 6]}"
        cmds[f"d{idx}"] = (
            f"crm.deal.add?fields[TITLE]={requests.utils.quote(title)}"
            f"&fields[OPPORTUNITY]={val}&fields[CURRENCY_ID]=AED"
            f"&fields[COMPANY_ID]={comp[0]}&fields[CONTACT_ID]={ct[0]}"
            f"&fields[ASSIGNED_BY_ID]=1"
            f"&fields[BEGINDATE]={fmtd(created)}"
            f"&fields[CLOSEDATE]={fmtd(closed)}"
            f"&fields[DATE_CREATE]={requests.utils.quote(fmt(created))}"
        )
        deal_meta.append(stage)
        idx += 1

r = batch(cmds)
res = r.get("result", {}).get("result", {})
deal_pairs = []
for i in range(idx):
    did = res.get(f"d{i}")
    if did:
        deal_pairs.append((did, deal_meta[i]))
print(f"  Created {len(deal_pairs)} deals")

# Update stages
cmds = {}
for i, (did, stg) in enumerate(deal_pairs):
    closed_flag = "&fields[CLOSED]=Y" if stg in ("WON", "LOSE", "APOLOGY") else ""
    cmds[f"u{i}"] = f"crm.deal.update?id={did}&fields[STAGE_ID]={stg}{closed_flag}"
r = batch(cmds)
upd = len([v for v in r.get("result", {}).get("result", {}).values() if v])
print(f"  Updated {upd} deal stages")

# ---- ACTIVITIES (20) ----
print("\n=== CREATING 20 ACTIVITIES ===")
acts = [
    ("call", 2, "Discovery call"), ("email", 3, "Proposal sent"),
    ("meeting", 4, "Product demo"), ("task", 1, "Prepare proposal"),
    ("call", 2, "Follow-up pricing"), ("email", 3, "Case study shared"),
    ("meeting", 4, "Exec presentation"), ("task", 1, "Create demo env"),
    ("call", 2, "Contract negotiation"), ("email", 3, "Contract draft"),
    ("call", 2, "Budget follow-up"), ("email", 3, "ROI analysis"),
    ("meeting", 4, "Technical deep-dive"), ("task", 1, "Send pricing"),
    ("call", 2, "Upsell discussion"), ("email", 3, "Implementation plan"),
    ("meeting", 4, "QBR meeting"), ("task", 1, "Update CRM notes"),
    ("call", 2, "Renewal call"), ("email", 3, "Thank you note"),
]
deal_ids_list = [d[0] for d in deal_pairs]
created_acts = 0
for i, (atype, tid, subj) in enumerate(acts):
    did = deal_ids_list[i % len(deal_ids_list)]
    act_date = NOW - timedelta(days=random.randint(1, 80))
    comms = []
    if atype == "call":
        comms = [{"VALUE": f"+97150{random.randint(1000000, 9999999)}", "TYPE": "PHONE"}]
    elif atype == "email":
        comms = [{"VALUE": f"contact{i}@example.ae", "TYPE": "EMAIL"}]
    fields = {
        "OWNER_TYPE_ID": 2, "OWNER_ID": did, "TYPE_ID": tid,
        "SUBJECT": subj, "RESPONSIBLE_ID": 1, "COMPLETED": "Y",
        "START_TIME": fmt(act_date), "END_TIME": fmt(act_date + timedelta(minutes=30)),
        "COMMUNICATIONS": comms,
    }
    time.sleep(0.4)
    r = api("crm.activity.add", {"fields": fields})
    if r.get("result"):
        created_acts += 1
    else:
        print(f"  Failed: {r.get('error_description', '?')}")
print(f"  Created {created_acts}/20 activities")

# ---- VERIFY ----
print("\n=== FINAL STATE ===")
for e in ["product", "company", "contact", "lead", "deal", "activity"]:
    time.sleep(0.3)
    r = requests.post(f"{URL}crm.{e}.list.json", json={"select": ["ID"]}, timeout=15).json()
    print(f"  {e:12s}: {r.get('total', len(r.get('result', [])))}")

print("\nDeal stages:")
time.sleep(0.3)
r = requests.post(f"{URL}crm.deal.list.json", json={"select": ["STAGE_ID"], "limit": 50}, timeout=15).json()
for s, c in sorted(Counter(d["STAGE_ID"] for d in r.get("result", [])).items()):
    print(f"  {s:25s}: {c}")

print("\nLead statuses:")
time.sleep(0.3)
r = requests.post(f"{URL}crm.lead.list.json", json={"select": ["STATUS_ID"], "limit": 50}, timeout=15).json()
for s, c in sorted(Counter(d["STATUS_ID"] for d in r.get("result", [])).items()):
    print(f"  {s:25s}: {c}")

print("\nDONE!")
