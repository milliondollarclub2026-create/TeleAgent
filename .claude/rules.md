# TeleAgent Claude Rules

## Core Rules

### 1. Never Break Functionality
Always test after changes. Core features must work.

### 2. Ask Before Major Changes
For significant UI changes, use AskUserQuestion to clarify:
- Design direction
- User priorities
- Specific preferences
The user is available and happy to answer questions.

### 3. Design is Inspiration, Not Law
Don't over-apply patterns. Use judgment. Less is more.

---

## Mandatory Agent Usage

### Frontend Work - ALWAYS USE /frontend-design
When working on ANY frontend task, you MUST invoke the frontend-design skill:
```
/frontend-design [task description]
```

This applies to:
- New pages or components
- UI modifications
- Styling changes
- Layout adjustments
- Animation or transitions
- Responsive design work

### Database/Backend Changes - ALWAYS VALIDATE WITH SUPABASE MCP
Before and after any database-related changes:

1. **Before migration**: Check existing schema
```
mcp__plugin_supabase_supabase__list_tables
```

2. **Apply migration**: Use proper migration
```
mcp__plugin_supabase_supabase__apply_migration
```

3. **Verify**: Run SQL to confirm
```
mcp__plugin_supabase_supabase__execute_sql
```

4. **Check advisors**: Security and performance
```
mcp__plugin_supabase_supabase__get_advisors
```

### Code Review - USE feature-dev:code-reviewer AGENT
After completing significant code changes, spawn the code reviewer:
```
Task tool with subagent_type="feature-dev:code-reviewer"
```

---

## Theme: "Emerald Graphite"

Sharp, conversion-focused. Modern and premium, not "startup candy".

### Color Palette
```
Background:     #F5F7F6  (page bg - subtle warm gray)
Surface:        #FFFFFF  (cards, modals)
Border:         #E2E8F0  (subtle borders)

Primary:        #059669  (emerald - main actions)
Primary hover:  #047857

Text main:      #111827  (near black)
Text muted:     #6B7280  (secondary)

Success:        #16A34A  (badges, confirmations)
Warning:        #D97706  (cautions)
Destructive:    #DC2626  (delete, errors)

Chip/badge bg:  #F3F4F6  (neutral chips)
```

### Forbidden
- Yellow (use amber/warning instead)
- Bright neon colors
- Colored backgrounds behind icons (looks cheap)
- Multiple competing accent colors

### Typography Rules
- Headings: font-['Plus_Jakarta_Sans']
- Body: default (Inter via Tailwind)
- NO decorative or fancy fonts

### Icon Rules
- ONLY use Lucide icons
- ALWAYS set strokeWidth={1.75}
- **NO colored backgrounds behind icons** - this looks cheap and "vibe coded"
- Sidebar: Icons + text labels
- Main content: Minimal icons, only where meaningful
- If container needed: Use `bg-gray-100` with `text-gray-600` (neutral only)

```jsx
// GOOD - Clean, no background
<Settings className="w-5 h-5 text-gray-500" strokeWidth={1.75} />

// GOOD - Neutral container (empty states only)
<div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
  <FileText className="w-5 h-5 text-gray-400" strokeWidth={1.75} />
</div>

// BAD - Colored background
<div className="bg-emerald-100 ...">
  <Bot className="text-emerald-600" />
</div>
```

---

## Component Patterns

### Cards - ALWAYS
```jsx
<Card className="bg-white border-slate-200 shadow-sm">
```

### Buttons
```jsx
// Primary
className="bg-emerald-600 hover:bg-emerald-700"

// Secondary
variant="outline" className="border-slate-200"

// Destructive
variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
```

### Inputs
```jsx
className="h-10 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
```

### Badges
```jsx
// Status badges
className="bg-emerald-50 text-emerald-700 border-emerald-200"
className="bg-amber-50 text-amber-700 border-amber-200"
className="bg-red-50 text-red-700 border-red-200"
className="bg-slate-50 text-slate-600 border-slate-200"
```

---

## Confirmation Dialogs - REQUIRED

EVERY destructive action MUST have AlertDialog:
- Delete operations
- Disconnect integrations
- Reset/clear data
- Cancel subscriptions
- Remove team members

Use shadcn/ui AlertDialog component.

---

## Warnings & Notices - PROFESSIONAL ONLY

### FORBIDDEN
```jsx
// DO NOT USE - cheap, vibe-coded look
<div className="bg-yellow-100 border border-yellow-400 text-yellow-700 p-3">
  ⚠️ Warning message here
</div>
```

### REQUIRED PATTERN
```jsx
<div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
  <div className="text-sm">
    <p className="font-medium text-amber-800">Notice Title</p>
    <p className="text-amber-700 mt-0.5">Clear, professional explanation without casual language.</p>
  </div>
</div>
```

---

## Emoji Rules

### FORBIDDEN Emojis
- 😀 😃 😄 😁 🤣 (face emojis)
- 🔥 💯 🚀 ✨ (hype emojis)
- 👍 👎 👋 (hand gestures in UI)
- Any emoji that looks "casual" or "fun"

### ALLOWED Emojis (sparingly)
- 🇺🇿 🇷🇺 🇬🇧 (language flags only)
- Professional indicators in specific contexts

### Use Icons Instead
Replace emojis with Lucide icons:
- ⚠️ → `<AlertTriangle />`
- ✅ → `<Check />`
- ❌ → `<X />`
- 📄 → `<FileText />`
- 📊 → `<BarChart3 />`

---

## Layout & Spacing

### Page Structure
```jsx
<div className="space-y-5 animate-fade-in max-w-4xl">
  {/* Header */}
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-xl font-bold font-['Plus_Jakarta_Sans'] text-slate-900">Page Title</h1>
      <p className="text-slate-500 text-sm mt-0.5">Page description</p>
    </div>
    {/* Actions */}
  </div>

  {/* Content */}
  <div className="grid gap-4">
    {/* Cards */}
  </div>
</div>
```

### Card Header Pattern
```jsx
<CardHeader className="pb-4">
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
      <Icon className="w-5 h-5 text-emerald-600" strokeWidth={1.75} />
    </div>
    <div>
      <CardTitle className="text-base font-semibold text-slate-900">Title</CardTitle>
      <CardDescription className="text-sm text-slate-500">Description</CardDescription>
    </div>
  </div>
</CardHeader>
```

---

## Loading & Empty States

### Loading Spinner
```jsx
<div className="flex items-center justify-center h-64">
  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" strokeWidth={2} />
</div>
```

### Button Loading
```jsx
<Button disabled={loading}>
  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" strokeWidth={2} />}
  Button Text
</Button>
```

### Empty State
```jsx
<div className="text-center py-12">
  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
    <Icon className="w-6 h-6 text-slate-400" strokeWidth={1.75} />
  </div>
  <h3 className="font-medium text-slate-900 mb-1">Empty State Title</h3>
  <p className="text-sm text-slate-500 mb-4">Helpful description</p>
  <Button>Primary Action</Button>
</div>
```

---

## Animation

### Allowed Animations
- `animate-fade-in` - Page transitions
- `animate-spin` - Loading spinners
- `transition-colors` - Hover states
- `transition-all duration-150` - Smooth interactions

### Forbidden
- Bouncing animations
- Shake animations
- Attention-seeking pulses
- Any animation that feels "playful"

---

## Quality Checklist

Before submitting any UI work, verify:

- [ ] Uses emerald color palette only
- [ ] No cheap emojis (use icons)
- [ ] Cards have consistent styling
- [ ] Buttons follow standard patterns
- [ ] Icons use strokeWidth={1.75}
- [ ] Destructive actions have confirmation dialogs
- [ ] Loading states implemented
- [ ] Empty states designed
- [ ] Warnings use professional pattern
- [ ] Spacing is consistent
- [ ] Typography is consistent
- [ ] Mobile responsive
- [ ] No alignment issues
