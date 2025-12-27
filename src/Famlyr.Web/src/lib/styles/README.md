# Famlyr Design System

Modern, minimalistic design system using Slate & Stone colors with spacious layout.

## Colors

### Primary (Slate Blue)
| Token | Hex | Usage |
|-------|-----|-------|
| `primary-50` | `#f7f8fa` | Backgrounds, badges |
| `primary-100` | `#ebeef3` | Hover backgrounds |
| `primary-200` | `#d4dbe6` | Borders |
| `primary-500` | `#66789b` | Main brand |
| `primary-600` | `#525f80` | Buttons, links |
| `primary-700` | `#444e68` | Hover states |

### Secondary (Warm Stone)
| Token | Hex | Usage |
|-------|-----|-------|
| `secondary-50` | `#faf9f7` | Backgrounds |
| `secondary-500` | `#a99b7c` | Accents |
| `secondary-700` | `#80725b` | Text on light bg |

### Accent (Muted Teal)
| Token | Hex | Usage |
|-------|-----|-------|
| `accent-50` | `#f3faf9` | Backgrounds |
| `accent-500` | `#3f9691` | Highlights |
| `accent-600` | `#317876` | Spouse badges |

### Neutrals
| Token | Hex | Usage |
|-------|-----|-------|
| `neutral-50` | `#f8f9fa` | Page background |
| `neutral-100` | `#f1f3f5` | Subtle backgrounds |
| `neutral-200` | `#e9ecef` | Borders |
| `neutral-500` | `#adb5bd` | Secondary text |
| `neutral-700` | `#495057` | Body text |
| `neutral-900` | `#212529` | Headings |

### Status Colors
| Status | Token | Hex |
|--------|-------|-----|
| Success | `success-500` | `#22c55e` |
| Warning | `warning-500` | `#f59e0b` |
| Error | `error-500` | `#ef4444` |
| Info | `info-500` | `#3b82f6` |

## Typography

**Font**: Inter (Google Fonts)

| Element | Size | Weight |
|---------|------|--------|
| h1 | 36px | 600 |
| h2 | 30px | 600 |
| h3 | 24px | 600 |
| h4 | 20px | 500 |
| body | 16px | 400 |
| small | 14px | 400 |

## Components

### Cards

```html
<!-- Base card -->
<div class="card">Content</div>

<!-- Interactive card (clickable) -->
<article class="card-interactive">Content</article>

<!-- Selected card -->
<div class="card-selected">Content</div>
```

### Buttons

```html
<!-- Primary -->
<button class="btn-primary">Save</button>

<!-- Secondary -->
<button class="btn-secondary">Cancel</button>

<!-- Ghost -->
<button class="btn-ghost">View</button>

<!-- Danger -->
<button class="btn-danger">Delete</button>

<!-- Sizes -->
<button class="btn-primary btn-sm">Small</button>
<button class="btn-primary btn-lg">Large</button>
```

### Form Inputs

```html
<div class="space-y-2">
  <label class="label">First Name</label>
  <input class="input" placeholder="Enter name" />
  <p class="helper-text">Optional helper text</p>
</div>

<!-- Error state -->
<input class="input-error" />
<p class="error-text">This field is required</p>
```

### Badges

```html
<!-- Relationship types -->
<span class="badge-parent">Parent</span>
<span class="badge-spouse">Spouse</span>
<span class="badge-child">Child</span>

<!-- Status -->
<span class="badge-success">Living</span>
<span class="badge-neutral">Deceased</span>

<!-- Generic -->
<span class="badge-primary">Primary</span>
<span class="badge-secondary">Secondary</span>
<span class="badge-accent">Accent</span>
```

## Spacing

| Context | Class | Size |
|---------|-------|------|
| Card padding | `p-6` | 24px |
| Section margin | `py-12` | 48px |
| Grid gap | `gap-6` | 24px |
| Form fields | `space-y-6` | 24px |

## Layout

```html
<!-- Page container -->
<main class="mx-auto max-w-7xl px-6 py-12 lg:px-8">
  <!-- Content -->
</main>

<!-- Card grid -->
<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
  <!-- Cards -->
</div>
```
