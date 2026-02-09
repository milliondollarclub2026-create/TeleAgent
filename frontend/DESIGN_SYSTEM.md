# TeleAgent Frontend Design System

## Brand Identity
TeleAgent is a **premium B2B SaaS** product. The design must reflect:
- **Trust**: Enterprise-grade reliability
- **Simplicity**: Easy to use, no learning curve
- **Intelligence**: AI-powered, modern technology
- **Professionalism**: Suitable for business contexts

## Design Philosophy
- **Take inspiration, don't over-enforce** - Use good judgment
- **Less is more** - Avoid over-stimulating interfaces
- **Intentional** - Every element has a purpose
- **Polished** - Nothing should feel "vibe coded"

---

## Theme: "Emerald Graphite"

Sharp, conversion-focused. Modern and premium without looking like "startup candy".

### Core Palette
| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| Background | #F5F7F6 | `bg-[#F5F7F6]` | Page background |
| Surface | #FFFFFF | `bg-white` | Cards, modals |
| Border | #E2E8F0 | `border-slate-200` | Subtle borders |

### Primary
| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| Primary | #059669 | `bg-emerald-600` | Main actions, links |
| Primary hover | #047857 | `hover:bg-emerald-700` | Hover states |

### Text
| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| Text main | #111827 | `text-gray-900` | Primary text |
| Text muted | #6B7280 | `text-gray-500` | Secondary text |

### Semantic
| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| Success | #16A34A | `text-green-600` | Success badges |
| Warning | #D97706 | `text-amber-600` | Warnings |
| Destructive | #DC2626 | `text-red-600` | Errors, delete |

### Neutral
| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| Chip bg | #F3F4F6 | `bg-gray-100` | Badge backgrounds |

---

## Typography

### Font Stack
```css
/* Headings */
font-family: 'Plus Jakarta Sans', sans-serif;

/* Body (Tailwind default) */
font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Scale
| Size | Class | Usage |
|------|-------|-------|
| 12px | text-xs | Helper text, timestamps |
| 14px | text-sm | Body text, labels |
| 16px | text-base | Large body text |
| 18px | text-lg | Section headings |
| 20px | text-xl | Page titles |
| 24px | text-2xl | Hero headings |

### Weights
| Weight | Class | Usage |
|--------|-------|-------|
| 400 | font-normal | Body text |
| 500 | font-medium | Labels, emphasis |
| 600 | font-semibold | Subheadings |
| 700 | font-bold | Headings |

---

## Spacing System

### Base Unit: 4px
Use Tailwind's spacing scale consistently:

| Token | Size | Common Usage |
|-------|------|--------------|
| 0.5 | 2px | Tiny gaps |
| 1 | 4px | Icon gaps |
| 1.5 | 6px | Tight padding |
| 2 | 8px | Small gaps |
| 3 | 12px | Medium gaps |
| 4 | 16px | Standard padding |
| 5 | 20px | Section gaps |
| 6 | 24px | Large padding |
| 8 | 32px | Section spacing |

### Layout Spacing
- **Card padding**: `p-4` to `p-6`
- **Section gaps**: `space-y-4` to `space-y-6`
- **Grid gaps**: `gap-4`
- **Page padding**: `px-4 lg:px-6`

---

## Component Library

### Buttons

```jsx
// Primary - Main actions
<Button className="bg-emerald-600 hover:bg-emerald-700 h-10">
  Save Changes
</Button>

// Secondary - Alternative actions
<Button variant="outline" className="border-slate-200 h-10">
  Cancel
</Button>

// Ghost - Subtle actions
<Button variant="ghost" className="text-slate-600 hover:text-slate-900">
  Learn More
</Button>

// Destructive - Dangerous actions (REQUIRES confirmation)
<Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
  Delete
</Button>

// With icon
<Button className="bg-emerald-600 hover:bg-emerald-700 h-10">
  <Plus className="w-4 h-4 mr-2" strokeWidth={1.75} />
  Add New
</Button>

// Loading state
<Button disabled={loading}>
  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" strokeWidth={2} />}
  Processing...
</Button>
```

### Cards

```jsx
// Standard card
<Card className="bg-white border-slate-200 shadow-sm">
  <CardHeader className="pb-4">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
        <Icon className="w-5 h-5 text-emerald-600" strokeWidth={1.75} />
      </div>
      <div>
        <CardTitle className="text-base font-semibold text-slate-900">Card Title</CardTitle>
        <CardDescription className="text-sm text-slate-500">Description text</CardDescription>
      </div>
    </div>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Content */}
  </CardContent>
</Card>
```

### Form Elements

```jsx
// Input field
<div className="space-y-1.5">
  <Label className="text-slate-700 text-sm">Field Label</Label>
  <Input
    placeholder="Placeholder text"
    className="h-10 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
  />
  <p className="text-xs text-slate-500">Helper text explanation</p>
</div>

// Select
<Select>
  <SelectTrigger className="h-10 border-slate-200">
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>

// Textarea
<Textarea
  rows={4}
  className="border-slate-200 focus:border-emerald-500 resize-none"
/>

// Switch
<div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
  <div>
    <p className="font-medium text-slate-900 text-sm">Setting Name</p>
    <p className="text-xs text-slate-500">Setting description</p>
  </div>
  <Switch />
</div>
```

### Badges

```jsx
// Status badges
<Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>
<Badge className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>
<Badge className="bg-red-50 text-red-700 border-red-200">Error</Badge>
<Badge className="bg-slate-50 text-slate-600 border-slate-200">Inactive</Badge>

// Outline badge
<Badge variant="outline" className="capitalize">{status}</Badge>
```

### Alerts & Notices

```jsx
// Warning notice
<div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
  <div className="text-sm">
    <p className="font-medium text-amber-800">Warning Title</p>
    <p className="text-amber-700 mt-0.5">Warning description with clear, professional language.</p>
  </div>
</div>

// Info notice
<div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
  <div className="text-sm">
    <p className="font-medium text-blue-800">Information</p>
    <p className="text-blue-700 mt-0.5">Helpful information for the user.</p>
  </div>
</div>

// Success notice
<div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
  <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
  <div className="text-sm">
    <p className="font-medium text-emerald-800">Success</p>
    <p className="text-emerald-700 mt-0.5">Operation completed successfully.</p>
  </div>
</div>
```

### Confirmation Dialog

```jsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="outline" className="text-red-600 border-red-200">
      Delete Item
    </Button>
  </AlertDialogTrigger>
  <AlertDialogContent className="sm:max-w-[425px]">
    <AlertDialogHeader>
      <AlertDialogTitle className="text-slate-900">Delete this item?</AlertDialogTitle>
      <AlertDialogDescription className="text-slate-500">
        This action cannot be undone. This will permanently delete the item and all associated data.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel className="border-slate-200">Cancel</AlertDialogCancel>
      <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white">
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Icons

### Usage Rules
1. **Always use Lucide icons**
2. **Set strokeWidth={1.75}** for consistency
3. **Size appropriately**: w-4 h-4 (small), w-5 h-5 (medium), w-6 h-6 (large)
4. **NO colored backgrounds** - they look cheap and "vibe coded"

### Icon Patterns
```jsx
// PREFERRED - Clean icon, no container
<Settings className="w-5 h-5 text-gray-500" strokeWidth={1.75} />

// ACCEPTABLE - Neutral container for empty states only
<div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
  <FileText className="w-6 h-6 text-gray-400" strokeWidth={1.75} />
</div>

// AVOID - Colored backgrounds look cheap
<div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
  <Bot className="w-5 h-5 text-emerald-600" strokeWidth={1.75} />
</div>
```

### When to Use Containers
- Empty states (gray only)
- Avatar placeholders (gray only)
- **Never** for inline icons
- **Never** for card headers
- **Never** with colored backgrounds

---

## Page Templates

### Standard Page Layout
```jsx
<div className="space-y-5 animate-fade-in max-w-4xl" data-testid="page-name">
  {/* Page Header */}
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-xl font-bold font-['Plus_Jakarta_Sans'] text-slate-900">
        Page Title
      </h1>
      <p className="text-slate-500 text-sm mt-0.5">
        Brief page description
      </p>
    </div>
    <Button className="bg-emerald-600 hover:bg-emerald-700">
      Primary Action
    </Button>
  </div>

  {/* Content */}
  <div className="grid gap-4">
    {/* Cards and content */}
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
  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
    <FileText className="w-6 h-6 text-slate-400" strokeWidth={1.75} />
  </div>
  <h3 className="font-medium text-slate-900 mb-1">No items yet</h3>
  <p className="text-sm text-slate-500 mb-4 max-w-sm mx-auto">
    Get started by creating your first item.
  </p>
  <Button className="bg-emerald-600 hover:bg-emerald-700">
    <Plus className="w-4 h-4 mr-2" strokeWidth={1.75} />
    Create Item
  </Button>
</div>
```

---

## Animation

### Allowed
- `animate-fade-in` - Page mount
- `animate-spin` - Loading indicators
- `transition-colors duration-150` - Hover states
- `transition-all duration-200` - Smooth interactions

### Forbidden
- Bouncing
- Shaking
- Pulsing (except loading)
- Any "playful" animations

---

## Accessibility

### Requirements
- All interactive elements must be keyboard accessible
- Color contrast must meet WCAG AA (4.5:1 for text)
- Focus states must be visible
- Images must have alt text
- Forms must have labels

### Focus States
```jsx
// Input focus
focus:border-emerald-500 focus:ring-emerald-500 focus:ring-2 focus:ring-offset-2

// Button focus
focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2
```

---

## Responsive Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| sm | 640px | Mobile landscape |
| md | 768px | Tablets |
| lg | 1024px | Desktop |
| xl | 1280px | Large desktop |

### Common Patterns
```jsx
// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Responsive padding
<div className="px-4 lg:px-6">

// Responsive visibility
<span className="hidden sm:block">Desktop text</span>
<span className="sm:hidden">Mobile text</span>
```
