"""Google Sheets read+write service using gspread + service account."""

import os
import json
import logging
import time
from typing import Optional, Dict, List, Any
from pathlib import Path

import gspread
from google.oauth2.service_account import Credentials

logger = logging.getLogger(__name__)

# Scopes for Sheets API (read + write)
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

# Leads worksheet config
LEADS_SHEET_TITLE = "Leads"
LEADS_FIXED_HEADERS_START = ["ID", "Created", "Last Active", "Telegram", "Status", "Score"]
LEADS_FIXED_HEADERS_END = ["Summary", "Follow-up", "Notes"]

# Field key → human-readable header mapping
FIELD_LABEL_MAP = {
    "collect_name": "Name",
    "collect_phone": "Phone",
    "collect_email": "Email",
    "collect_product": "Interest",
    "collect_budget": "Budget",
    "collect_timeline": "Timeline",
    "collect_quantity": "Quantity",
    "collect_company": "Company",
    "collect_job_title": "Job Title",
    "collect_team_size": "Team Size",
    "collect_location": "Location",
    "collect_preferred_time": "Contact Time",
    "collect_urgency": "Urgency",
    "collect_reference": "Reference ID",
    "collect_notes": "Extra Notes",
}

# Module-level gspread client (lazy-initialized)
_gspread_client: Optional[gspread.Client] = None
_service_account_email: Optional[str] = None


def _load_credentials_info() -> Optional[Dict]:
    """Load service account credentials from env var or local file."""
    # Try environment variable first (production / Render)
    creds_json = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
    if creds_json:
        try:
            return json.loads(creds_json)
        except json.JSONDecodeError:
            logger.error("GOOGLE_SERVICE_ACCOUNT_JSON env var is not valid JSON")
            return None

    # Fallback to local file (development)
    local_path = Path(__file__).parent / "credentials" / "google_service_account.json"
    if local_path.exists():
        with open(local_path) as f:
            return json.load(f)

    logger.warning("No Google service account credentials found")
    return None


def get_gspread_client() -> Optional[gspread.Client]:
    """Get or create an authenticated gspread client."""
    global _gspread_client

    if _gspread_client is not None:
        return _gspread_client

    creds_info = _load_credentials_info()
    if not creds_info:
        return None

    try:
        creds = Credentials.from_service_account_info(creds_info, scopes=SCOPES)
        _gspread_client = gspread.authorize(creds)
        logger.info("gspread client initialized with service account")
        return _gspread_client
    except Exception as e:
        logger.error(f"Failed to initialize gspread client: {e}")
        return None


def get_service_account_email() -> Optional[str]:
    """Return the service account email for display in the UI."""
    global _service_account_email

    if _service_account_email:
        return _service_account_email

    creds_info = _load_credentials_info()
    if creds_info:
        _service_account_email = creds_info.get("client_email")
        return _service_account_email

    return None


def verify_sheet_access(sheet_id: str) -> Dict[str, Any]:
    """
    Verify the service account can access a sheet.
    Returns {"ok": True, "title": "...", "tabs": [...]} or {"ok": False, "error": "..."}.
    """
    gc = get_gspread_client()
    if not gc:
        return {"ok": False, "error": "Google Sheets service not configured"}

    try:
        sh = gc.open_by_key(sheet_id)
        tabs = [ws.title for ws in sh.worksheets()]
        # Read first tab row count for feedback
        first_ws = sh.sheet1
        row_count = first_ws.row_count
        return {
            "ok": True,
            "title": sh.title,
            "tabs": tabs,
            "first_tab_rows": row_count,
        }
    except gspread.exceptions.APIError as e:
        status = e.response.status_code if hasattr(e, 'response') else None
        if status == 403:
            return {"ok": False, "error": "Access denied. Make sure you shared the sheet with our bot email as Editor."}
        elif status == 404:
            return {"ok": False, "error": "Sheet not found. Check the URL."}
        return {"ok": False, "error": f"Google API error: {e}"}
    except Exception as e:
        return {"ok": False, "error": f"Could not access sheet: {e}"}


def get_or_create_leads_worksheet(sheet_id: str, field_headers: List[str]) -> Dict[str, Any]:
    """
    Get or create the 'Leads' worksheet with proper headers.
    field_headers: list of human-readable field names from tenant config (e.g., ["Name", "Phone", "Interest"])
    Returns {"ok": True, "created": bool, "headers": [...]} or {"ok": False, "error": "..."}.
    """
    gc = get_gspread_client()
    if not gc:
        return {"ok": False, "error": "Google Sheets service not configured"}

    try:
        sh = gc.open_by_key(sheet_id)

        # Check if Leads tab already exists
        existing_tabs = [ws.title for ws in sh.worksheets()]
        created = False

        if LEADS_SHEET_TITLE in existing_tabs:
            ws = sh.worksheet(LEADS_SHEET_TITLE)
            # Read existing headers
            existing_headers = ws.row_values(1)
            if existing_headers:
                return {"ok": True, "created": False, "headers": existing_headers}
            # Tab exists but no headers — set them
        else:
            ws = sh.add_worksheet(title=LEADS_SHEET_TITLE, rows=1000, cols=20)
            created = True

        # Build headers
        headers = LEADS_FIXED_HEADERS_START + field_headers + LEADS_FIXED_HEADERS_END

        # Write header row
        ws.update([headers], "A1")

        # Bold + freeze header row
        ws.format("A1:T1", {"textFormat": {"bold": True}})
        ws.freeze(rows=1)

        logger.info(f"{'Created' if created else 'Updated'} Leads worksheet with {len(headers)} columns")
        return {"ok": True, "created": created, "headers": headers}

    except Exception as e:
        logger.error(f"Failed to setup Leads worksheet: {e}")
        return {"ok": False, "error": str(e)}


def append_lead_row(sheet_id: str, row_data: List[str]) -> Dict[str, Any]:
    """
    Append a new lead row to the Leads worksheet.
    row_data must match the header column order.
    Returns {"ok": True, "row": row_number} or {"ok": False, "error": "..."}.
    """
    gc = get_gspread_client()
    if not gc:
        return {"ok": False, "error": "Google Sheets service not configured"}

    try:
        sh = gc.open_by_key(sheet_id)
        ws = sh.worksheet(LEADS_SHEET_TITLE)
        result = ws.append_row(row_data, value_input_option="USER_ENTERED")
        # Extract the row number from the response
        updated_range = result.get("updates", {}).get("updatedRange", "")
        logger.info(f"Appended lead row to {updated_range}")
        return {"ok": True, "range": updated_range}
    except gspread.exceptions.WorksheetNotFound:
        return {"ok": False, "error": "Leads worksheet not found. Reconnect Google Sheets."}
    except Exception as e:
        logger.error(f"Failed to append lead row: {e}")
        return {"ok": False, "error": str(e)}


def update_lead_row(sheet_id: str, telegram_id: str, col_updates: Dict[int, str]) -> Dict[str, Any]:
    """
    Update an existing lead row by finding the Telegram column match.
    col_updates: {column_index (1-based): new_value}
    Returns {"ok": True, "row": row_number} or {"ok": False, "error": "..."}.
    """
    gc = get_gspread_client()
    if not gc:
        return {"ok": False, "error": "Google Sheets service not configured"}

    try:
        sh = gc.open_by_key(sheet_id)
        ws = sh.worksheet(LEADS_SHEET_TITLE)

        # Find the row by Telegram ID (column 4 = "Telegram")
        try:
            cell = ws.find(telegram_id, in_column=4)
        except gspread.exceptions.CellNotFound:
            return {"ok": False, "error": f"Lead with Telegram '{telegram_id}' not found"}

        if not cell:
            return {"ok": False, "error": f"Lead with Telegram '{telegram_id}' not found"}

        # Update specific cells
        for col_idx, value in col_updates.items():
            ws.update_cell(cell.row, col_idx, value)

        logger.info(f"Updated lead row {cell.row} for Telegram '{telegram_id}'")
        return {"ok": True, "row": cell.row}

    except gspread.exceptions.WorksheetNotFound:
        return {"ok": False, "error": "Leads worksheet not found"}
    except Exception as e:
        logger.error(f"Failed to update lead row: {e}")
        return {"ok": False, "error": str(e)}


def find_lead_by_telegram(sheet_id: str, telegram_id: str) -> Optional[int]:
    """Find a lead row number by Telegram ID. Returns row number or None."""
    gc = get_gspread_client()
    if not gc:
        return None

    try:
        sh = gc.open_by_key(sheet_id)
        ws = sh.worksheet(LEADS_SHEET_TITLE)
        cell = ws.find(telegram_id, in_column=4)
        return cell.row if cell else None
    except Exception:
        return None


def read_product_catalog(sheet_id: str) -> Optional[Dict]:
    """
    Read the first worksheet (product catalog) via gspread.
    Returns {"headers": [...], "rows": [{col: val}, ...]} or None.
    """
    gc = get_gspread_client()
    if not gc:
        return None

    try:
        sh = gc.open_by_key(sheet_id)
        ws = sh.sheet1  # First tab = product catalog
        all_values = ws.get_all_values()

        if not all_values:
            return {"headers": [], "rows": []}

        headers = all_values[0]
        rows = []
        for row in all_values[1:]:
            if any(cell.strip() for cell in row):
                row_dict = {}
                for i, header in enumerate(headers):
                    if header.strip() and i < len(row):
                        row_dict[header.strip()] = row[i].strip()
                if row_dict:
                    rows.append(row_dict)

        return {"headers": [h.strip() for h in headers if h.strip()], "rows": rows}
    except Exception as e:
        logger.warning(f"Failed to read product catalog via gspread: {e}")
        return None
