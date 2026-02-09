# Quick Reference - TeleAgent Development

## Core Rules
1. **Never break functionality** - Test after changes
2. **Ask questions for major UI changes** - User is available
3. **Less is more** - Don't over-apply patterns

---

## Theme: "Emerald Graphite"
```
Background:     #F5F7F6   (bg-[#F5F7F6] or bg-slate-50)
Surface:        #FFFFFF   (bg-white)
Border:         #E2E8F0   (border-slate-200)
Primary:        #059669   (bg-emerald-600)
Primary hover:  #047857   (hover:bg-emerald-700)
Text main:      #111827   (text-gray-900)
Text muted:     #6B7280   (text-gray-500)
Success:        #16A34A   (text-green-600)
Warning:        #D97706   (text-amber-600)
Destructive:    #DC2626   (text-red-600)
Chip bg:        #F3F4F6   (bg-gray-100)
```

---

## Workflow Commands

### Frontend Work
```
/frontend-design [describe the task]
```
**Use for**: Any UI creation, modification, styling, layout work

### Database Validation
```
mcp__plugin_supabase_supabase__list_tables - Check schema
mcp__plugin_supabase_supabase__apply_migration - Apply changes
mcp__plugin_supabase_supabase__get_advisors - Security check
```

### Code Review
```
Task tool → subagent_type="feature-dev:code-reviewer"
```

---

## Copy-Paste Patterns

### Page Header
```jsx
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-xl font-bold font-['Plus_Jakarta_Sans'] text-slate-900">Title</h1>
    <p className="text-slate-500 text-sm mt-0.5">Description</p>
  </div>
  <Button className="bg-emerald-600 hover:bg-emerald-700">Action</Button>
</div>
```

### Card (Clean Style)
```jsx
<Card className="bg-white border-slate-200 shadow-sm">
  <CardHeader className="pb-4">
    <CardTitle className="text-base font-semibold text-gray-900">Title</CardTitle>
    <CardDescription className="text-sm text-gray-500">Description</CardDescription>
  </CardHeader>
  <CardContent>{/* content */}</CardContent>
</Card>
```

### Card with Icon (Minimal)
```jsx
<Card className="bg-white border-slate-200 shadow-sm">
  <CardHeader className="pb-4">
    <div className="flex items-center gap-3">
      <Bot className="w-5 h-5 text-emerald-600" strokeWidth={1.75} />
      <div>
        <CardTitle className="text-base font-semibold text-gray-900">Title</CardTitle>
        <CardDescription className="text-sm text-gray-500">Description</CardDescription>
      </div>
    </div>
  </CardHeader>
  <CardContent>{/* content */}</CardContent>
</Card>
```

### Professional Warning
```jsx
<div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
  <div className="text-sm">
    <p className="font-medium text-amber-800">Title</p>
    <p className="text-amber-700 mt-0.5">Description</p>
  </div>
</div>
```

### Loading State
```jsx
<div className="flex items-center justify-center h-64">
  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" strokeWidth={2} />
</div>
```

### Empty State
```jsx
<div className="text-center py-12">
  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mx-auto mb-4">
    <FileText className="w-6 h-6 text-gray-400" strokeWidth={1.75} />
  </div>
  <h3 className="font-medium text-gray-900 mb-1">Empty State Title</h3>
  <p className="text-sm text-gray-500 mb-4">Description</p>
  <Button className="bg-emerald-600 hover:bg-emerald-700">Action</Button>
</div>
```

### Delete Confirmation
```jsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="outline" className="text-red-600 border-red-200">Delete</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete this item?</AlertDialogTitle>
      <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Form Field
```jsx
<div className="space-y-1.5">
  <Label className="text-slate-700 text-sm">Label</Label>
  <Input className="h-10 border-slate-200" placeholder="Placeholder" />
  <p className="text-xs text-slate-500">Helper text</p>
</div>
```

---

## Color Cheatsheet (Emerald Graphite)

| Use Case | Class |
|----------|-------|
| Page background | `bg-[#F5F7F6]` or `bg-slate-50` |
| Card background | `bg-white` |
| Border | `border-slate-200` |
| Primary button | `bg-emerald-600 hover:bg-emerald-700` |
| Secondary button | `border-slate-200` |
| Destructive button | `text-red-600 border-red-200 hover:bg-red-50` |
| Page title | `text-gray-900` |
| Body text | `text-gray-700` |
| Secondary text | `text-gray-500` |
| Helper text | `text-gray-500 text-xs` |
| Icon (primary) | `text-emerald-600` |
| Icon (neutral) | `text-gray-500` |
| Badge/chip bg | `bg-gray-100` |
| Success text | `text-green-600` |
| Warning text | `text-amber-600` |
| Error text | `text-red-600` |

---

## Icon Sizes

| Context | Size | strokeWidth |
|---------|------|-------------|
| Button icon | w-4 h-4 | 1.75 or 2 |
| Card header | w-5 h-5 | 1.75 |
| Empty state | w-6 h-6 | 1.75 |
| Hero | w-8 h-8 | 1.5 |

---

## Spacing Quick Reference

| Use | Class |
|-----|-------|
| Card padding | p-4 to p-6 |
| Section gap | space-y-4 to space-y-6 |
| Grid gap | gap-4 |
| Small gap | gap-2 |
| Tight padding | p-3 |

---

## DON'Ts Checklist

- [ ] No colored backgrounds behind icons (looks cheap)
- [ ] No yellow (use amber)
- [ ] No cheap emojis (use icons)
- [ ] No shadow-xl or shadow-2xl
- [ ] No gradient backgrounds on cards
- [ ] No bouncing animations
- [ ] No decorative fonts
- [ ] No destructive actions without confirmation
- [ ] No over-stimulating/busy interfaces
- [ ] No "startup candy" aesthetics
