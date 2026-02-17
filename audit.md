# CRM Dashboard Frontend — Full Audit Report

> **Generated**: 2026-02-17
> **Scope**: All 9 new files + 2 modified files from Phase 3 implementation
> **Agents**: 5 deep-dive audits covering API hook, onboarding, chat, grid/panels, and page orchestrator

---

## Executive Summary

The Phase 3 CRM Dashboard frontend builds correctly and routes are wired up, but **the feature is non-functional end-to-end**. There are **12 CRITICAL bugs** that prevent core flows from working, **10 HIGH issues** causing significant breakage, and numerous MEDIUM/LOW items.

**No user can currently:**
1. Reach the onboarding wizard (CRM detection always fails)
2. Complete onboarding (config wrapper never unwraps, radio buttons unclickable)
3. See any widgets (field name mismatches, KPI resolver never called)
4. Use chat history (content vs text field mismatch)
5. Add widgets from chat (missing required API fields)

---

## CRITICAL Issues (12)

### C-1: CRM detection always returns `false` — dashboard unreachable

| Detail | Value |
|--------|-------|
| **Files** | `CRMDashboardPage.js:37` / `server.py:7780-7802` |
| **Problem** | Frontend checks `intData?.crm_connected ?? intData?.bitrix_connected` but backend returns `{ bitrix: { connected: false } }`. Neither key exists at top level. |
| **Double bug** | Backend also hardcodes `bitrix_status = {"connected": False}` at line 7780 — never queries the database for actual connection status. |
| **Impact** | `hasCRM` is always `false`. Users permanently see "Connect your CRM" empty state. |
| **Fix** | Frontend: `intData?.bitrix?.connected`. Backend: query `tenant_configs` for `bitrix_webhook_url` like `/api/agents` does (lines 7822-7831). |

### C-2: Dashboard config response wrapper not unwrapped

| Detail | Value |
|--------|-------|
| **Files** | `CRMDashboardPage.js:41-52` / `server.py:3599-3601` |
| **Problem** | Backend returns `{ config: { onboarding_state: "complete", ... } }`. Frontend sets `config = { config: {...} }` and checks `config.onboarding_state` which is `undefined`. |
| **Impact** | Onboarding wizard re-triggers every page load even after completion. Dashboard tabs never appear. |
| **Fix** | `setConfig(cfgData?.config ?? cfgData)` or unwrap in the backend. |

### C-3: Refinement radio buttons have no click handlers

| Detail | Value |
|--------|-------|
| **Files** | `DashboardOnboarding.js:288-302` |
| **Problem** | Step 3 renders `<label>` elements styled as radio buttons, but there is no `<input type="radio">` and no `onClick` handler. `refinementAnswers` is set once during initialization and never updated by user interaction. |
| **Impact** | Users are stuck with auto-selected first option. Cannot customize dashboard preferences. |
| **Fix** | Add `onClick={() => setRefinementAnswers(prev => ({ ...prev, [q.id]: optValue }))}` to each label. |

### C-4: Chat history field mismatch — `content` vs `text`

| Detail | Value |
|--------|-------|
| **Files** | `DashboardChat.js:119-123,249,262` / `server.py:3555` |
| **Problem** | Backend stores and returns messages with `content` field. Frontend renders `msg.text`. History messages have no `text` property. |
| **Impact** | All loaded chat history renders as empty/blank bubbles. |
| **Fix** | Map on load: `data.messages.map(m => ({ ...m, text: m.content }))` or render `msg.text \|\| msg.content`. |

### C-5: Chat conversation context sent with wrong field name

| Detail | Value |
|--------|-------|
| **Files** | `DashboardChat.js:158,167-169` / `agents/bobur.py:295` |
| **Problem** | Frontend sends history with `text` field. Backend's `_general_chat_response` reads `msg.get("content", "")`. All conversation context is empty strings to the LLM. |
| **Impact** | AI assistant has zero conversation memory. Every message is treated as standalone. |
| **Fix** | Map history to `{ role, content }` format before sending. |

### C-6: "Add to Dashboard" missing required API fields

| Detail | Value |
|--------|-------|
| **Files** | `DashboardChat.js:197-207` / `server.py:1598-1612` |
| **Problem** | Frontend sends `{ title, chart_type, chart_config }`. Backend `AddWidgetRequest` requires `data_source` and `crm_source` (both required, no defaults). `chart_config` is not a recognized field. |
| **Impact** | 422 Validation Error on every "Add to Dashboard" click. Feature completely broken. |
| **Fix** | Include `data_source` and `crm_source` from chart metadata or tenant's active CRM. |

### C-7: `addWidget` response is `{success, id}` — not a full widget object

| Detail | Value |
|--------|-------|
| **Files** | `CRMDashboardPage.js:104-110` / `server.py:3438` |
| **Problem** | Backend returns `{ success: true, id: "..." }`. Frontend pushes this directly into the widgets array: `setWidgets(prev => [...prev, data])`. |
| **Impact** | Broken/empty widget card appears in grid with no title, type, or data. |
| **Fix** | Refetch widgets after adding: `setWidgets((await api.getWidgets()).data?.widgets \|\| prev)`. |

### C-8: `chartHasValidData()` checks wrong field paths — all widgets filtered out

| Detail | Value |
|--------|-------|
| **Files** | `DashboardGrid.js:36-44` |
| **Problem** | Checks `chart.chart_config?.value` and `chart.chart_config?.data`. Backend returns `widget.data` and `widget.value` as top-level fields, not nested under `chart_config`. |
| **Impact** | `validWidgets` is always empty. Only empty state shows. |
| **Fix** | Check `chart.data` and `chart.value` directly. |

### C-9: `toChart()` spreads undefined `widget.chart_config`

| Detail | Value |
|--------|-------|
| **Files** | `DashboardGrid.js:84-87` |
| **Problem** | `toChart()` does `...widget.chart_config` which is `undefined`. ChartRenderer receives `{ type: "bar" }` with no data, title, or config. |
| **Impact** | Even if validation passed, all charts render "No data available". |
| **Fix** | `return { type: widget.chart_type, title: widget.title, data: widget.data }`. |

### C-10: KPI widgets never get `value`/`change`/`changeDirection`

| Detail | Value |
|--------|-------|
| **Files** | `server.py:3348-3378` / `KPICardBlock.js:15` |
| **Problem** | Widget hydration uses `anvar_execute_query()` which returns `ChartResult` with only `data` array. `kpi_resolve()` exists and returns proper KPI fields but is **imported and never called**. `KPICardBlock` expects `chart.value`, `chart.change`, `chart.changeDirection`. |
| **Impact** | All KPI cards show "0" with no trend indicator. |
| **Fix** | Use `kpi_resolve()` for KPI-type widgets, or extract first data item's value and compute change. |

### C-11: Sync status polling checks wrong response key

| Detail | Value |
|--------|-------|
| **Files** | `DashboardOnboarding.js:76-79` / `server.py:3054-3068` |
| **Problem** | Frontend checks `data?.status === 'complete'`. Backend returns `{ statuses: [{entity: "leads", status: "completed"}, ...] }` — an array, not a string. |
| **Impact** | Users stuck in "syncing" state forever. Polling never detects completion. |
| **Fix** | `const allDone = data?.statuses?.every(s => s.status === 'completed')`. |

### C-12: `api` object creates new reference every render — infinite useEffect loop

| Detail | Value |
|--------|-------|
| **Files** | `useDashboardApi.js:102-121` / `CRMDashboardPage.js:58` / `DashboardChat.js:127` / `DashboardOnboarding.js:62` |
| **Problem** | Hook returns `{ startOnboarding, ... }` as a plain object (new reference every render). `useEffect([api])` and `useCallback([api])` dependencies fire on every render. |
| **Impact** | Potential infinite API call loop. At minimum, duplicate calls and unnecessary re-renders. |
| **Fix** | Wrap returned object in `useMemo` or remove `api` from dependency arrays. |

---

## HIGH Issues (10)

### H-1: AddToDashboardBtn shows "Added" even on API failure

| **File** | `DashboardChat.js:409-412` |
|----------|---------------------------|
| **Problem** | `setAdded(true)` runs unconditionally after `await onAdd(chart)` regardless of error response. |
| **Fix** | Return `{ error }` from handler, check before `setAdded(true)`. |

### H-2: Mixed `content`/`text` field names in messages array

| **File** | `DashboardChat.js:119 vs 158` |
|----------|-------------------------------|
| **Problem** | History messages have `content`. New messages have `text`. Mixed array sent as conversation context. |
| **Fix** | Normalize all messages to `content` field on load. |

### H-3: `syncStatus` prop never populated

| **File** | `CRMDashboardPage.js:18` |
|----------|--------------------------|
| **Problem** | `setSyncStatus` is never called. Sync screen shows no progress info. |
| **Fix** | Populate from polling results or move polling into onboarding component. |

### H-4: Double toast on onboarding errors

| **File** | `DashboardOnboarding.js:49` + `useDashboardApi.js:43-45` |
|----------|----------------------------------------------------------|
| **Problem** | `apiCallWithToast` shows a toast, then the component shows another toast. |
| **Fix** | Use `apiCall` (no toast) or remove component-level toasts. |

### H-5: Backend error messages don't match frontend detection patterns

| **File** | `DashboardOnboarding.js:41-48` / `server.py:3130` |
|----------|---------------------------------------------------|
| **Problem** | Backend: `"No active CRM connection found."` Frontend matches: `"not connected"` or `"no crm"`. `"connection found"` doesn't match `"not connected"`. |
| **Fix** | Use structured error codes instead of string matching, or align substrings. |

### H-6: Reconfigure button has NO confirmation dialog

| **File** | `DashboardView.js:32-38` |
|----------|--------------------------|
| **Problem** | Direct `onClick={onReconfigure}` — no AlertDialog. Backend soft-deletes all widgets and resets config. CLAUDE.md requires confirmation for all destructive actions. |
| **Fix** | Wrap in AlertDialog with warning message. |

### H-7: InsightsPanel `expanded` state never auto-updates

| **File** | `InsightsPanel.js:28-29` |
|----------|--------------------------|
| **Problem** | `useState(hasUrgent)` only runs on first render when `insights=[]`. When urgent insights arrive later, panel stays collapsed. |
| **Fix** | Add `useEffect` watching `insights` to auto-expand on urgent. |

### H-8: Dead `CRMChatPage` import in App.js

| **File** | `App.js:23` |
|----------|-------------|
| **Problem** | `CRMChatPage` imported but no route uses it. Increases bundle size. |
| **Fix** | Remove the import line. |

### H-9: No cleanup on unmount for async API calls

| **File** | `CRMDashboardPage.js:31-58` |
|----------|------------------------------|
| **Problem** | `useEffect` makes multiple API calls. No `AbortController` or `isMounted` flag. State updates fire on unmounted component. |
| **Fix** | Add cleanup function with `cancelled` flag. |

### H-10: Backend Bitrix status hardcoded to `false` in `/api/integrations/status`

| **File** | `server.py:7780` |
|----------|-------------------|
| **Problem** | `bitrix_status = {"connected": False, "is_demo": True, "domain": None}` — never queries DB. Compare with `/api/agents` (line 7822) which checks `tenant_configs`. |
| **Fix** | Query `tenant_configs` for `bitrix_webhook_url` to determine real status. |

---

## MEDIUM Issues (13)

| ID | Component | Issue | Fix |
|----|-----------|-------|-----|
| M-1 | DashboardOnboarding | No state recovery on page refresh — all wizard progress lost, re-runs GPT-4o analysis ($0.02/call) | Check `dashboard_configs.onboarding_state` on mount to resume |
| M-2 | DashboardOnboarding | Generation progress animation timing misaligned with API duration (7.5s animation vs variable API time) | Add minimum display time before `onComplete` |
| M-3 | DashboardOnboarding | Missing `crm_sync_status` table causes unhandled 500 error on onboarding start | Wrap sync check in try/except, ensure migration applied |
| M-4 | DashboardChat | No error indicator on history load failure — silently falls back to intro | Show toast if `error` is truthy |
| M-5 | DashboardChat | No pagination for chat history — always loads first 50, no "load more" | Backend already returns `has_more`. Add load-more button |
| M-6 | DashboardChat | Error messages (`isError: true`) sent as conversation context to LLM | Filter more aggressively: strip to `{ role, content }` only |
| M-7 | DashboardChat | `scrollToBottom` unreliable with async chart rendering (100ms delay) | Use ResizeObserver or requestAnimationFrame |
| M-8 | InsightsPanel | `severityIcon` mapping defined but never used | Remove dead code or add icon indicator |
| M-9 | InsightsPanel | No limit on rendered insights — unbounded list | Add "Show all / Show top 5" toggle |
| M-10 | InsightsPanel | Empty state icon uses `bg-emerald-50` — violates CLAUDE.md (should be `bg-slate-100`) | Change to `bg-slate-100` + `text-slate-400` |
| M-11 | CRMDashboardPage | `TabsContent` imported but never used (manual conditional rendering) | Remove unused import |
| M-12 | CRMDashboardPage | Inconsistent height calc for loading state (`4rem` vs `2rem/3rem`) | Standardize to `h-[calc(100vh-2rem)] lg:h-[calc(100vh-3rem)]` |
| M-13 | useDashboardApi | No `AbortController` on API calls — state updates on unmounted components | Pass abort signal, cancel on cleanup |

---

## LOW Issues (14)

| ID | Component | Issue |
|----|-----------|-------|
| L-1 | useDashboardApi | Unused `config` variable in `apiCall` (line 16) |
| L-2 | useDashboardApi | No PUT/PATCH support in `apiCall` |
| L-3 | useDashboardApi | 422 errors render `[object Object]` — FastAPI detail is array, not string |
| L-4 | useDashboardApi | No differentiation between network and server errors in toasts |
| L-5 | DashboardChat | Array index as React key (`key={idx}`) — breaks if messages prepended |
| L-6 | DashboardChat | No textarea resize debouncing |
| L-7 | DashboardGrid | Unused `chartIndex` prop in `WidgetWrapper` |
| L-8 | DashboardGrid | Fixed skeleton count (4+2) may not match actual widget count |
| L-9 | DashboardView | `toLocaleTimeString([], ...)` — `[]` vs `undefined` locale parameter |
| L-10 | CategoryCard | "Recommended" and "Rich data" badges use identical emerald colors |
| L-11 | CategoryCard | `border-2` non-standard (but appropriate for selection affordance) |
| L-12 | InsightsPanel | Potential performance with 50+ insights (no virtualization) |
| L-13 | chartTheme | `formatNumber` shows "1.0K" instead of "1K" |
| L-14 | App.js | No lazy loading for CRMDashboardPage (consistent with existing pattern) |

---

## Plan of Action

### Phase 1: Unblock Core Flow (CRITICAL fixes — do first)

These must all be fixed before ANY user can test the dashboard.

**Step 1.1: Fix CRM detection (C-1 + H-10)**
```
Files: CRMDashboardPage.js, server.py
- Backend: Query tenant_configs for bitrix_webhook_url in /api/integrations/status
- Frontend: Change to intData?.bitrix?.connected
```

**Step 1.2: Fix config unwrapping (C-2)**
```
File: CRMDashboardPage.js
- setConfig(cfgData?.config ?? cfgData)
- Check config?.onboarding_state instead of cfgData.onboarding_state
```

**Step 1.3: Fix sync status detection (C-11)**
```
File: DashboardOnboarding.js
- data?.statuses?.every(s => s.status === 'completed') instead of data?.status === 'complete'
```

**Step 1.4: Fix refinement radio buttons (C-3)**
```
File: DashboardOnboarding.js
- Add onClick handler to each label element
- Update refinementAnswers state on click
```

**Step 1.5: Fix `api` object referential stability (C-12)**
```
File: useDashboardApi.js
- Wrap returned object in useMemo
- Or: destructure individual functions at call sites
```

### Phase 2: Fix Widget Rendering (CRITICAL fixes — widgets/charts)

**Step 2.1: Fix widget data field mapping (C-8 + C-9)**
```
File: DashboardGrid.js
- chartHasValidData(): check chart.data and chart.value (not chart.chart_config.*)
- toChart(): return { type: widget.chart_type, title: widget.title, data: widget.data }
```

**Step 2.2: Fix KPI widget hydration (C-10)**
```
File: server.py
- For KPI-type widgets, use kpi_resolve() instead of anvar_execute_query()
- Or: extract first data item's value and compute change
```

### Phase 3: Fix Chat (CRITICAL fixes — chat functionality)

**Step 3.1: Fix chat message field names (C-4 + C-5 + H-2)**
```
File: DashboardChat.js
- Normalize all messages to use content field
- Map history: data.messages.map(m => ({ ...m, text: m.content }))
- Map outgoing history: messages.map(m => ({ role: m.role, content: m.text || m.content }))
```

**Step 3.2: Fix "Add to Dashboard" pipeline (C-6 + C-7)**
```
Files: DashboardChat.js, CRMDashboardPage.js
- Include data_source, crm_source in addWidget payload
- After successful add, refetch widgets instead of pushing partial response
```

### Phase 4: Fix HIGH Issues

**Step 4.1: UX fixes**
```
- H-1: Check error before setAdded(true) in AddToDashboardBtn
- H-4: Use apiCall instead of apiCallWithToast for manual error handling
- H-5: Use structured error codes or align error substrings
- H-6: Add AlertDialog to Reconfigure button
- H-7: Add useEffect to auto-expand InsightsPanel on urgent insights
```

**Step 4.2: Code cleanup**
```
- H-3: Populate syncStatus from polling results
- H-8: Remove dead CRMChatPage import from App.js
- H-9: Add cleanup function with cancelled flag to useEffect
```

### Phase 5: Polish (MEDIUM + LOW)

```
- M-1: State recovery on page refresh (check onboarding_state on mount)
- M-4: Show toast on history load failure
- M-5: Add "load more" button for chat history
- M-6: Filter error messages from conversation context
- M-10: Fix InsightsPanel empty state colors (bg-slate-100)
- M-11: Remove unused TabsContent import
- M-12: Standardize height calculations
- L-3: Handle array-type FastAPI validation errors in toast
- L-5: Use unique IDs as React keys for messages
- L-8: Remove unused severityIcon and chartIndex
```

---

## Dependency Graph

```
Phase 1 (Unblock)
  ├── C-1 + H-10 (CRM detection) ← MUST be first
  ├── C-2 (config unwrap)
  ├── C-11 (sync status)
  ├── C-3 (radio buttons)
  └── C-12 (api stability)
       ↓
Phase 2 (Widgets)
  ├── C-8 + C-9 (field mapping) ← depends on Phase 1 for testing
  └── C-10 (KPI resolver)
       ↓
Phase 3 (Chat)
  ├── C-4 + C-5 + H-2 (field names)
  └── C-6 + C-7 (add to dashboard)
       ↓
Phase 4 (HIGH fixes) — independent, parallelize
       ↓
Phase 5 (Polish) — independent, parallelize
```

---

## Estimated Effort

| Phase | Issues | Effort |
|-------|--------|--------|
| Phase 1: Unblock | 5 CRITICAL + 1 HIGH | ~2 hours |
| Phase 2: Widgets | 3 CRITICAL | ~1.5 hours |
| Phase 3: Chat | 4 CRITICAL + 1 HIGH | ~1.5 hours |
| Phase 4: HIGH fixes | 8 HIGH | ~1.5 hours |
| Phase 5: Polish | 13 MEDIUM + 14 LOW | ~2 hours |
| **Total** | **49 issues** | **~8.5 hours** |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Backend `dashboard_configs` / `crm_sync_status` tables don't exist | Medium | Blocks all features | Verify with Supabase MCP before any fixes |
| KPI resolver integration breaks existing chat flow | Low | Medium | Test chat independently after KPI changes |
| `useMemo` on api object breaks hot reload | Low | Low | Test in dev mode after change |
| Multiple field renames cause missed references | Medium | High | Global search-replace with grep verification |
