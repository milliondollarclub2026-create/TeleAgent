"""Fix existing deal stages and lead statuses to be well-distributed.
Also add more activities (calls + emails only, no tasks/meetings-with-comms)."""
import requests, time, random
from datetime import datetime, timedelta
from collections import Counter

URL = "https://b24-mbii6g.bitrix24.ae/rest/1/wm5uunx4xpkf2x6m/"
NOW = datetime.now()
random.seed(77)


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


# ---- Collect all deal IDs ----
print("=== FIXING DEAL STAGES ===")
all_deals = []
start = 0
while True:
    r = api("crm.deal.list", {"select": ["ID"], "start": start, "order": {"ID": "ASC"}})
    items = r.get("result", [])
    if not items:
        break
    all_deals.extend(int(x["ID"]) for x in items)
    nxt = r.get("next")
    if not nxt:
        break
    start = nxt

n = len(all_deals)
print(f"  Found {n} deals")

# Build balanced stage list
# NEW 13%, PREPARATION 12%, PREPAYMENT_INVOICE 10%, EXECUTING 8%, FINAL_INVOICE 5%
# WON 30%, LOSE 17%, APOLOGY 5%
stages = []
stages += ["NEW"] * int(n * 0.13)
stages += ["PREPARATION"] * int(n * 0.12)
stages += ["PREPAYMENT_INVOICE"] * int(n * 0.10)
stages += ["EXECUTING"] * int(n * 0.08)
stages += ["FINAL_INVOICE"] * int(n * 0.05)
stages += ["WON"] * int(n * 0.30)
stages += ["LOSE"] * int(n * 0.17)
stages += ["APOLOGY"] * (n - len(stages))
random.shuffle(stages)

updated = 0
for i in range(0, n, 50):
    chunk = list(zip(all_deals[i:i + 50], stages[i:i + 50]))
    cmds = {}
    for j, (did, stg) in enumerate(chunk):
        closed = "&fields[CLOSED]=Y" if stg in ("WON", "LOSE", "APOLOGY") else "&fields[CLOSED]=N"
        cmds[f"u{j}"] = f"crm.deal.update?id={did}&fields[STAGE_ID]={stg}{closed}"
    r = batch(cmds)
    res = r.get("result", {}).get("result", {})
    updated += len([v for v in res.values() if v])
print(f"  Updated {updated}/{n} deal stages")


# ---- Collect all lead IDs ----
print("\n=== FIXING LEAD STATUSES ===")
all_leads = []
start = 0
while True:
    r = api("crm.lead.list", {"select": ["ID"], "start": start, "order": {"ID": "ASC"}})
    items = r.get("result", [])
    if not items:
        break
    all_leads.extend(int(x["ID"]) for x in items)
    nxt = r.get("next")
    if not nxt:
        break
    start = nxt

n = len(all_leads)
print(f"  Found {n} leads")

# 20% NEW, 20% IN_PROCESS, 25% PROCESSED, 25% CONVERTED, 10% JUNK
statuses = []
statuses += ["NEW"] * int(n * 0.20)
statuses += ["IN_PROCESS"] * int(n * 0.20)
statuses += ["PROCESSED"] * int(n * 0.25)
statuses += ["CONVERTED"] * int(n * 0.25)
statuses += ["JUNK"] * (n - len(statuses))
random.shuffle(statuses)

updated = 0
for i in range(0, n, 50):
    chunk = list(zip(all_leads[i:i + 50], statuses[i:i + 50]))
    cmds = {}
    for j, (lid, st) in enumerate(chunk):
        cmds[f"u{j}"] = f"crm.lead.update?id={lid}&fields[STATUS_ID]={st}"
    r = batch(cmds)
    res = r.get("result", {}).get("result", {})
    updated += len([v for v in res.values() if v])
print(f"  Updated {updated}/{n} lead statuses")


# ---- Add more activities (calls + emails only) ----
print("\n=== ADDING 15 MORE ACTIVITIES (calls + emails) ===")
deal_sample = all_deals[:30]
acts = [
    ("call", 2, "Discovery call - initial outreach"),
    ("email", 3, "Proposal: CRM Integration Package"),
    ("call", 2, "Follow-up: pricing discussion"),
    ("email", 3, "Case study: similar company results"),
    ("call", 2, "Demo scheduling call"),
    ("email", 3, "Contract draft for review"),
    ("call", 2, "Contract negotiation call"),
    ("email", 3, "ROI analysis attached"),
    ("call", 2, "Budget approval follow-up"),
    ("email", 3, "Implementation timeline shared"),
    ("call", 2, "Upsell discussion"),
    ("email", 3, "Feature comparison document"),
    ("call", 2, "Quarterly review call"),
    ("email", 3, "Next steps after demo"),
    ("call", 2, "Renewal discussion"),
]
created_acts = 0
for i, (atype, tid, subj) in enumerate(acts):
    did = deal_sample[i % len(deal_sample)]
    act_date = NOW - timedelta(days=random.randint(1, 80))
    if atype == "call":
        comms = [{"VALUE": f"+97150{random.randint(1000000, 9999999)}", "TYPE": "PHONE"}]
    else:
        comms = [{"VALUE": f"contact{i}@business.ae", "TYPE": "EMAIL"}]
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
print(f"  Created {created_acts}/15 activities")


# ---- FINAL VERIFY ----
print("\n=== FINAL STATE ===")
for e in ["product", "company", "contact", "lead", "deal", "activity"]:
    time.sleep(0.3)
    r = requests.post(f"{URL}crm.{e}.list.json", json={"select": ["ID"]}, timeout=15).json()
    print(f"  {e:12s}: {r.get('total', len(r.get('result', [])))}")

# Full deal distribution
print("\nDeal stages (all):")
all_d = []
start = 0
while True:
    time.sleep(0.3)
    r = requests.post(f"{URL}crm.deal.list.json", json={"select": ["STAGE_ID"], "start": start}, timeout=15).json()
    items = r.get("result", [])
    if not items:
        break
    all_d.extend(items)
    nxt = r.get("next")
    if not nxt:
        break
    start = nxt
for s, c in sorted(Counter(d["STAGE_ID"] for d in all_d).items()):
    print(f"  {s:25s}: {c}")

# Full lead distribution
print("\nLead statuses (all):")
all_l = []
start = 0
while True:
    time.sleep(0.3)
    r = requests.post(f"{URL}crm.lead.list.json", json={"select": ["STATUS_ID"], "start": start}, timeout=15).json()
    items = r.get("result", [])
    if not items:
        break
    all_l.extend(items)
    nxt = r.get("next")
    if not nxt:
        break
    start = nxt
for s, c in sorted(Counter(d["STATUS_ID"] for d in all_l).items()):
    print(f"  {s:25s}: {c}")

print("\nDONE!")
