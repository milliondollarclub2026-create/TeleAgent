# TeleAgent Development Guidelines

## Project Overview
TeleAgent is an AI-powered Sales Agent platform with Telegram + Bitrix24 CRM integration. This is a **premium SaaS product** and must look and feel like one.

## Tech Stack
- **Frontend**: React 18, Tailwind CSS, Radix UI (shadcn/ui components)
- **Backend**: FastAPI (Python), Supabase (PostgreSQL)
- **AI**: GPT-4o for sales agent, text-embedding-3-small for RAG
- **Integrations**: Telegram Bot API, Bitrix24 REST API

## GitHub Repository
- **Username**: milliondollarclub2026-create
- **Repository**: https://github.com/milliondollarclub2026-create/TeleAgent.git

---

## CORE PRINCIPLES

### 1. Never Break Functionality
- Core features must always work
- Test after every change
- If unsure, ask before changing

### 2. Ask Questions First
For **major UI changes**, ALWAYS ask clarifying questions:
- "What's the primary goal of this page?"
- "What action should users take first?"
- "Should this be prominent or subtle?"
- "Any specific elements you want to keep/remove?"

The user is available for feedback - use AskUserQuestion tool liberally.

### 3. Intentional Design
Every element must have a purpose:
- Why is this here?
- Does it help the user?
- Does it look premium?

### 4. Polish Over Features
Better to have fewer, polished features than many rough ones.

---

## MANDATORY WORKFLOWS

### Frontend Work
**ALWAYS** use the `/frontend-design` skill when:
- Creating new components or pages
- Modifying existing UI
- Styling changes
- Layout adjustments
- Any visual work

```
/frontend-design [describe what you need]
```

### Backend/Database Work
**ALWAYS** validate with Supabase MCP tools:
- Before migrations: `mcp__plugin_supabase_supabase__list_tables`
- After migrations: `mcp__plugin_supabase_supabase__execute_sql` to verify
- Check advisors: `mcp__plugin_supabase_supabase__get_advisors` for security/performance

### Code Review
After significant changes, use the `feature-dev:code-reviewer` agent to:
- Check for bugs and logic errors
- Verify code quality
- Ensure adherence to project conventions

---

## DESIGN PHILOSOPHY

### Take Inspiration, Don't Over-Enforce
The design system is a **guide**, not a rigid rulebook. Use good judgment:
- Don't add every pattern to every component
- Avoid over-stimulating or busy interfaces
- Sometimes less is more
- If something feels "too much", it probably is

### What Makes Premium UX
- **Breathing room**: Generous whitespace
- **Restraint**: Not every element needs decoration
- **Consistency**: Same patterns throughout
- **Subtlety**: Animations and colors should be understated
- **Clarity**: User always knows what to do next

### Red Flags (Stop and Reconsider)
- Adding colored backgrounds to make things "pop"
- Multiple competing visual elements
- Decorative elements with no function
- Anything that feels like "startup candy"

---

## UI/UX DESIGN SYSTEM

### Core Principles
1. **Clean** - Remove visual clutter, embrace whitespace
2. **Minimal** - Only essential elements, no decorative noise
3. **Modern** - Contemporary design patterns, 2024+ aesthetics
4. **Professional** - Enterprise-grade, premium SaaS feel
5. **Frictionless** - Every interaction should feel effortless
6. **Polished** - Every element intentional, nothing "vibe coded"

### Theme: "Emerald Graphite"
Sharp, conversion-focused. Modern and premium without looking like "startup candy".

```css
/* Core Palette */
--background: #F5F7F6;        /* Page background - subtle warm gray */
--surface: #FFFFFF;           /* Cards, modals */
--border: #E2E8F0;            /* Subtle borders */

/* Primary */
--primary: #059669;           /* Emerald green - main actions */
--primary-hover: #047857;     /* Hover state */

/* Text */
--text-main: #111827;         /* Primary text - near black */
--text-muted: #6B7280;        /* Secondary text */

/* Semantic */
--success: #16A34A;           /* Success badges/chips */
--warning: #D97706;           /* Warning states */
--destructive: #DC2626;       /* Delete, errors */

/* Neutral */
--chip-bg: #F3F4F6;           /* Neutral chip/badge background */
```

### Tailwind Mappings
| Design Token | Tailwind Class |
|--------------|----------------|
| Background | `bg-[#F5F7F6]` or `bg-slate-50` |
| Surface | `bg-white` |
| Border | `border-slate-200` |
| Primary | `text-emerald-600` / `bg-emerald-600` |
| Primary hover | `hover:bg-emerald-700` |
| Text main | `text-gray-900` |
| Text muted | `text-gray-500` |
| Success | `text-green-600` |
| Warning | `text-amber-600` |
| Destructive | `text-red-600` / `bg-red-600` |
| Chip bg | `bg-gray-100` |

### Typography
- **Font**: Plus Jakarta Sans (headings), Inter (body)
- **Sizes**: Use Tailwind's scale consistently
- **Weights**: 400 (body), 500 (medium), 600 (semibold), 700 (bold)

### Spacing & Layout
- Use Tailwind's spacing scale: 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12
- Card padding: `p-4` to `p-6`
- Section gaps: `space-y-4` to `space-y-6`
- Page max-width: `max-w-4xl` or `max-w-6xl`

### Border Radius
- Cards: `rounded-lg` or `rounded-xl`
- Buttons: `rounded-lg`
- Inputs: `rounded-lg`
- Badges: `rounded-full`
- Icons in containers: `rounded-xl`

---

## COMPONENT STANDARDS

### Cards
```jsx
// GOOD - Clean, minimal card
<Card className="bg-white border-slate-200 shadow-sm">
  <CardContent className="p-6">
    {/* Content */}
  </CardContent>
</Card>

// BAD - Over-styled, busy
<Card className="bg-gradient-to-r border-2 shadow-xl ring-4">
```

### Buttons
```jsx
// Primary action
<Button className="bg-emerald-600 hover:bg-emerald-700">
  Save Changes
</Button>

// Secondary action
<Button variant="outline" className="border-slate-200">
  Cancel
</Button>

// Destructive - MUST have confirmation dialog
<Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
  Delete
</Button>
```

### Icons
- **Sidebar**: Icons WITH labels (collapsed: icons only with tooltips)
- **Main pages**: Minimal icons, only where they add clear meaning
- **Icon style**: Lucide icons, `strokeWidth={1.75}` for consistency
- **NO colored backgrounds** - colored icon containers look cheap and "vibe coded"

```jsx
// GOOD - Clean icon, no background
<Bot className="w-5 h-5 text-emerald-600" strokeWidth={1.75} />

// GOOD - Icon with subtle gray background (only when grouping)
<div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
  <Bot className="w-5 h-5 text-gray-600" strokeWidth={1.75} />
</div>

// BAD - Colored background looks cheap
<div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
  <Bot className="w-5 h-5 text-emerald-600" strokeWidth={1.75} />
</div>
```

### When to Use Icon Containers
- Empty states (use `bg-gray-100` with `text-gray-400`)
- Avatar placeholders
- Never for inline icons or card headers

### Form Elements
```jsx
// Input
<Input className="h-10 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500" />

// Label
<Label className="text-slate-700 text-sm font-medium">Field Name</Label>

// Helper text
<p className="text-xs text-slate-500 mt-1">Helpful description</p>
```

---

## FORBIDDEN PATTERNS

### DO NOT USE
- Cheap/cartoon emojis in UI text (acceptable: 🇺🇿 flags for language)
- Gradient backgrounds on cards
- Multiple border colors
- Excessive shadows (`shadow-xl`, `shadow-2xl`)
- Animated borders or glows
- Comic Sans or decorative fonts
- Placeholder text as permanent content
- "Lorem ipsum" anywhere
- Generic stock icons
- Inconsistent spacing

### BANNED UI Patterns
```jsx
// BAD - Cheap warning banner
<div className="bg-yellow-100 border-yellow-500 p-2">
  ⚠️ Warning! Something might happen!
</div>

// GOOD - Professional notice
<div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
  <div className="text-sm">
    <p className="font-medium text-amber-800">Important Notice</p>
    <p className="text-amber-700 mt-0.5">Clear, professional explanation.</p>
  </div>
</div>
```

---

## CONFIRMATION DIALOGS

**REQUIRED** for all destructive actions (delete, disconnect, reset):

```jsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="outline" className="text-red-600 border-red-200">
      Delete
    </Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete this item?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone. This will permanently delete the item.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction className="bg-red-600 hover:bg-red-700">
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## USER FLOW PRINCIPLES

### Frictionless Experience
1. **Minimal clicks** - Reduce steps to complete tasks
2. **Clear hierarchy** - Users should instantly know what to do
3. **Consistent navigation** - Same patterns everywhere
4. **Immediate feedback** - Every action has visible response
5. **Error prevention** - Disable invalid actions, not just show errors

### Loading States
```jsx
// Spinner for buttons
{loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" strokeWidth={2} />}

// Full page loading
<div className="flex items-center justify-center h-64">
  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" strokeWidth={2} />
</div>
```

### Empty States
```jsx
<div className="text-center py-12">
  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
    <FileText className="w-6 h-6 text-slate-400" strokeWidth={1.75} />
  </div>
  <h3 className="font-medium text-slate-900 mb-1">No documents yet</h3>
  <p className="text-sm text-slate-500 mb-4">Upload your first document to get started</p>
  <Button>Upload Document</Button>
</div>
```

---

## FILE STRUCTURE

```
frontend/src/
├── components/
│   └── ui/           # shadcn/ui components
├── contexts/         # React contexts (Auth, etc.)
├── layouts/          # Page layouts
├── pages/            # Route components
└── App.js            # Routes

backend/
├── server.py         # FastAPI main server
├── llm_service.py    # LLM utilities
├── bitrix_crm.py     # Bitrix24 client
├── document_processor.py  # RAG processing
└── tests/            # Test files
```

---

## BEFORE EVERY COMMIT

1. **Visual check**: Does it look premium?
2. **Alignment check**: Is everything properly aligned?
3. **Consistency check**: Does it match existing patterns?
4. **Mobile check**: Does it work on mobile?
5. **Loading states**: Are all async operations handled?
6. **Error states**: Are errors handled gracefully?
7. **Confirmation dialogs**: Are destructive actions protected?
