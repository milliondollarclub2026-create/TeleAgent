# Settings Page Tab Remodel - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
> **For Claude:** REQUIRED: Use /frontend-design skill for ALL UI changes (Tasks 1-5).

**Goal:** Reorganize the AgentSettingsPage from a 2-column grid into horizontal tabs, remove Sales Constraints, and add a new (visual-only) Model Selection tab.

**Architecture:** Replace the 2-column `<div className="grid grid-cols-1 lg:grid-cols-2">` with a `<Tabs>` component (shadcn/ui, already installed). Each tab renders its subset of the existing form elements. No backend changes -- all existing `config` state, `handleChange()`, `fetchConfig()`, and `saveConfig()` stay identical. The Model tab adds local-only state (`selectedProvider`, `apiKey`) that is NOT saved to the backend.

**Tech Stack:** React 18, Tailwind CSS, shadcn/ui Tabs component (`frontend/src/components/ui/tabs.jsx`), Lucide icons.

**CRITICAL:** This is a UI-only remodel. Every existing `config.*` field, `handleChange()` call, and `saveConfig()` call must remain untouched. The backend wiring from the WIRE_SETTINGS_PLAN is preserved by keeping every form element's `value` and `onChange` props identical.

---

## Element Inventory (14 elements, Sales Constraints removed)

| # | Element | Type | Config Key | Tab |
|---|---------|------|------------|-----|
| 1 | Business Name | Input | `business_name` | Business |
| 2 | Industry | Select | `vertical` | Business |
| 3 | Business Description | Textarea | `business_description` | Business |
| 4 | Products / Services | Textarea | `products_services` | Business |
| 5 | Greeting Message | Textarea | `greeting_message` | Business |
| 6 | Closing Message | Textarea | `closing_message` | Business |
| 7 | Primary Language | Select | `primary_language` | Personality |
| 8 | Secondary Languages | Toggle buttons | `secondary_languages` | Personality |
| 9 | Tone | Select | `agent_tone` | Personality |
| 10 | Response Length | Select | `response_length` | Personality |
| 11 | Emoji Usage | Toggle buttons | `emoji_usage` | Personality |
| 12 | Response Delay | Select | `min_response_delay` | Controls |
| 13 | Rate Limit | Select | `max_messages_per_minute` | Controls |
| 14 | Data Collection Fields | Chip selector + dropdown | `collect_*` booleans | Data Collection |

Plus: **Model Selection tab** (new, visual-only, no backend save).

---

## Tab Layout

```
[ Business ]  [ Personality ]  [ Data Collection ]  [ Controls ]  [ Model ]
```

Each tab: single-column layout, full width, max-w-2xl centered within the tab panel. This gives breathing room vs. the current cramped 2-column grid.

---

## Task 1: Add Tabs wrapper and restructure into Business tab

**Files:**
- Modify: `frontend/src/pages/AgentSettingsPage.js`

**Step 1:** Add Tabs import at top of file (line ~5 area):
```jsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
```

**Step 2:** Replace the 2-column grid (`<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">` through its closing `</div>` at ~line 696) with a `<Tabs>` wrapper containing `<TabsList>` and `<TabsContent>` blocks.

The outer structure becomes:
```jsx
<Tabs defaultValue="business" className="w-full">
  <TabsList className="w-full justify-start bg-slate-100 p-1 rounded-lg h-auto flex-wrap">
    <TabsTrigger value="business" className="text-[13px] data-[state=active]:bg-white data-[state=active]:shadow-sm">
      <Building2 className="w-4 h-4 mr-1.5" strokeWidth={1.75} />
      Business
    </TabsTrigger>
    <TabsTrigger value="personality" className="text-[13px] data-[state=active]:bg-white data-[state=active]:shadow-sm">
      <Smile className="w-4 h-4 mr-1.5" strokeWidth={1.75} />
      Personality
    </TabsTrigger>
    <TabsTrigger value="data" className="text-[13px] data-[state=active]:bg-white data-[state=active]:shadow-sm">
      <User className="w-4 h-4 mr-1.5" strokeWidth={1.75} />
      Data Collection
    </TabsTrigger>
    <TabsTrigger value="controls" className="text-[13px] data-[state=active]:bg-white data-[state=active]:shadow-sm">
      <Clock className="w-4 h-4 mr-1.5" strokeWidth={1.75} />
      Controls
    </TabsTrigger>
    <TabsTrigger value="model" className="text-[13px] data-[state=active]:bg-white data-[state=active]:shadow-sm">
      <Sparkles className="w-4 h-4 mr-1.5" strokeWidth={1.75} />
      Model
    </TabsTrigger>
  </TabsList>

  <TabsContent value="business" className="mt-5">
    {/* Business tab content - Task 1 */}
  </TabsContent>

  <TabsContent value="personality" className="mt-5">
    {/* Personality tab content - Task 2 */}
  </TabsContent>

  <TabsContent value="data" className="mt-5">
    {/* Data Collection tab content - Task 3 */}
  </TabsContent>

  <TabsContent value="controls" className="mt-5">
    {/* Controls tab content - Task 4 */}
  </TabsContent>

  <TabsContent value="model" className="mt-5">
    {/* Model tab content - Task 5 */}
  </TabsContent>
</Tabs>
```

**Step 3:** Move the **Business Information** card content (elements #1-4) and **Custom Messages** card content (elements #5-6) into the Business tab. Keep all `value`, `onChange`, `handleChange` props IDENTICAL. Layout: single Card, full width, `max-w-2xl` wrapper.

**Step 4:** Remove the Sales Constraints card entirely (the `<Card>` containing `payment_plans_enabled` Switch).

**Step 5:** Remove unused imports: `Shield`, `CreditCard`.

**Step 6:** Add `Sparkles` to the lucide-react import (for Model tab icon).

**Step 7:** Verify the page loads and the Business tab renders correctly.

---

## Task 2: Personality tab

**Files:**
- Modify: `frontend/src/pages/AgentSettingsPage.js`

**Step 1:** Move these elements into the Personality `<TabsContent>`:
- **Languages** card content (elements #7-8: Primary Language select, Secondary Languages toggles)
- **Personality** card content (elements #9-11: Tone select, Response Length select, Emoji Usage toggles)

Layout: two Cards stacked vertically inside `max-w-2xl` wrapper. Languages card first, then Personality card.

**Step 2:** Keep all `value`, `onChange`, `handleChange`, `toggleSecondaryLanguage` props IDENTICAL.

**Step 3:** Verify the Personality tab renders and all dropdowns/toggles work.

---

## Task 3: Data Collection tab

**Files:**
- Modify: `frontend/src/pages/AgentSettingsPage.js`

**Step 1:** Move the Data Collection card content (element #14) into the Data Collection `<TabsContent>`. This includes:
- The header with `{activeFieldCount}/{MAX_ACTIVE_FIELDS} selected` badge
- Active field chips with remove buttons
- "Add a field" dropdown (categorized)
- Helper text

Layout: single Card, `max-w-2xl` wrapper.

**Step 2:** Keep all chip add/remove logic, `isAtLimit`, `DATA_COLLECTION_FIELDS`, `CATEGORY_LABELS`, `MAX_ACTIVE_FIELDS` IDENTICAL.

**Step 3:** Verify chips can be added and removed.

---

## Task 4: Controls tab

**Files:**
- Modify: `frontend/src/pages/AgentSettingsPage.js`

**Step 1:** Move the Response Timing card content (elements #12-13) into the Controls `<TabsContent>`:
- Response Delay select
- Rate Limit select

Layout: single Card, `max-w-2xl` wrapper. Two selects side-by-side in `grid grid-cols-2 gap-4`.

**Step 2:** Keep all `value`, `onValueChange`, `handleChange` props IDENTICAL.

**Step 3:** Verify both dropdowns work.

---

## Task 5: Model Selection tab (visual-only)

**Files:**
- Modify: `frontend/src/pages/AgentSettingsPage.js`

**Step 1:** Add local state for Model tab (NOT saved to backend):
```jsx
const [selectedProvider, setSelectedProvider] = useState('openai');
const [customApiKey, setCustomApiKey] = useState('');
const [verifyingKey, setVerifyingKey] = useState(false);
const [keyStatus, setKeyStatus] = useState(null); // null | 'valid' | 'invalid'
```

**Step 2:** Define model data constant:
```jsx
const MODEL_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', inputCost: '0.25', outputCost: '1.0' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', inputCost: '0.015', outputCost: '0.06' },
    ],
  },
  anthropic: {
    name: 'Anthropic',
    models: [
      { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', inputCost: '0.3', outputCost: '1.5' },
      { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', inputCost: '0.1', outputCost: '0.5' },
    ],
  },
};
```
Note: Costs are in cents per 1,000 tokens.

**Step 3:** Build the Model tab content inside `<TabsContent value="model">`:

```
Card with max-w-2xl wrapper:

1. SectionHeader with Sparkles icon, title "Model Selection", desc "Choose your AI provider and model"

2. Provider dropdown (Select):
   - OpenAI
   - Anthropic

3. Below the dropdown: model info cards showing each model for the selected provider:
   - Model name
   - "Input: X cents / 1K tokens"
   - "Output: X cents / 1K tokens"
   Styled as a simple list with subtle bg-slate-50 rows.

4. Divider

5. "Your API Key" section:
   - Label: "API Key (optional)"
   - Input (type password) for pasting API key
   - "Verify Key" button next to it
   - Status indicator: green checkmark if valid, red X if invalid
   - Helper text: "If you use your own API key, there is an additional platform fee of 0.1 cents per API call."

6. Info notice at bottom:
   - Subtle bg-slate-50 box: "Currently using LeadRelay's default GPT-4o. Custom model selection coming soon."
```

**Step 4:** Wire the "Verify Key" button to a dummy handler (visual only):
```jsx
const handleVerifyKey = async () => {
  setVerifyingKey(true);
  setKeyStatus(null);
  // Simulate verification delay (no real API call yet)
  setTimeout(() => {
    setVerifyingKey(false);
    setKeyStatus(customApiKey.length > 20 ? 'valid' : 'invalid');
  }, 1500);
};
```

**Step 5:** Add imports: `CheckCircle`, `XCircle`, `Sparkles`, `Key` from lucide-react (if not already imported).

**Step 6:** Verify the Model tab renders, provider dropdown switches model info, and verify button shows loading/result states.

---

## Task 6: Verify nothing is broken

**Step 1:** Check that `saveConfig()` still saves all 14 config fields by clicking Save on each tab.

**Step 2:** Check that the `fetchConfig()` null-filtering (from our earlier fix) still works -- dropdowns should show defaults, not blank.

**Step 3:** Verify `hasChanges` dirty detection works across tabs (change a field on any tab, Save button should activate).

**Step 4:** Verify the unsaved changes navigation blocker dialog still works.

**Step 5:** Commit all changes.

```bash
git add frontend/src/pages/AgentSettingsPage.js
git commit -m "Remodel settings page into tabbed layout with model selection

- Reorganize 7 cards into 5 tabs: Business, Personality, Data Collection, Controls, Model
- Move greeting/closing messages under Business tab
- Remove Sales Constraints section
- Add Model Selection tab (visual-only, no backend wiring)
- Show model pricing for OpenAI (GPT-4o, GPT-4o Mini) and Anthropic (Claude Sonnet, Haiku)
- Add API key input with verify button (dummy validation)
- All existing config save/load behavior preserved

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## What Does NOT Change

- `config` state shape -- all 14 fields remain identical
- `handleChange()` -- same function, same calls
- `fetchConfig()` -- same API call, same null-filtering merge
- `saveConfig()` -- same PUT to `/api/config`
- `savedConfigRef` -- same dirty detection
- `toggleSecondaryLanguage()` -- same logic
- `DATA_COLLECTION_FIELDS`, `CATEGORY_LABELS`, `MAX_ACTIVE_FIELDS` -- same constants
- Unsaved changes navigation blocker dialog -- same
- Backend `server.py` -- zero changes
- All wiring from WIRE_SETTINGS_PLAN -- preserved (collect_* booleans, vertical, closing_message, min_response_delay, max_messages_per_minute)

## Model Pricing Reference (cents per 1,000 tokens)

| Provider | Model | Input | Output |
|----------|-------|-------|--------|
| OpenAI | GPT-4o | 0.25 cents | 1.0 cents |
| OpenAI | GPT-4o Mini | 0.015 cents | 0.06 cents |
| Anthropic | Claude Sonnet 4.5 | 0.3 cents | 1.5 cents |
| Anthropic | Claude Haiku 4.5 | 0.1 cents | 0.5 cents |

Platform fee for BYOK (Bring Your Own Key): 0.1 cents per API call.

Sources:
- [OpenAI Pricing](https://openai.com/api/pricing/)
- [Anthropic Claude Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
