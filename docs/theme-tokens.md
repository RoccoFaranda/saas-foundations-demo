# Theme Token Contract

This project uses semantic Tailwind color tokens defined in `app/globals.css`.

## Token families

### Core surface

- `background`, `foreground`
- `surface`, `surface-elevated`
- `muted`, `muted-foreground`
- `border`, `border-strong`
- `input`, `overlay`

### Actions and interaction

- `primary`, `primary-hover`, `primary-foreground`
- `secondary`, `secondary-hover`, `secondary-foreground`
- `link`
- `focus-ring`
- `disabled`, `disabled-border`, `disabled-foreground`

### Semantic states

- `info`, `info-soft`, `info-border`
- `success`, `success-soft`, `success-border`
- `warning`, `warning-soft`, `warning-border`
- `danger`, `danger-soft`, `danger-border`
- `danger-solid`, `danger-on-solid`

### Tag/category states

- `feature`, `feature-soft`
- `bugfix`, `bugfix-soft`
- `docs`, `docs-soft`
- `infra`, `infra-soft`
- `design`, `design-soft`

## Recipe classes (preferred)

- Buttons: `btn-primary`, `btn-secondary`, `btn-danger`, `btn-outline`, `btn-link`, `btn-panel`
- Sizes: `btn-xs`, `btn-sm`, `btn-md`, `control-compact`
- Fields: `form-field`, `form-field-sm`, `form-field-md`
- Grouped controls: `control-group`, `control-group-field`, `control-group-button`
- Surfaces: `surface-card`, `surface-card-elevated`, `surface-card-header`, `surface-card-body`
- Chips: `chip`, `chip-*`
- Interaction states: `focus-ring`, `focus-ring-inset`, `row-action`, `link-subtle`
- Empty/loading/error/info: `state-empty`, `state-loading`, `state-error`, `state-info`

## Usage rules

- Use semantic tokens and recipe classes in app/source components.
- Raw palette/named/arbitrary color utilities are disallowed by `theme:check`.
- If a visual requires a deliberate exception, annotate the line (or a nearby preceding comment line) with:
  - `theme-exception reason:"<why>" ticket:"<id>" expires:"YYYY-MM-DD"`
  - Example: `theme-exception reason:"Decorative hero gradient" ticket:"THEME-001" expires:"2026-12-31"`
- Expired exceptions fail the check and must be renewed or removed.

## Quality gates

- Run `pnpm theme:check` to validate:
  - required light/dark tokens exist
  - required Tailwind token exports are present
  - contrast thresholds pass for key text/control/chip pairs
  - disallowed raw color/shadow utilities are not introduced
  - `theme-exception` metadata format and expiry are valid
- Run `pnpm test:e2e:theme` for theme behavior + visual regression checks.
