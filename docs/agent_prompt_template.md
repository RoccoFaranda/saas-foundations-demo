# Agent Prompt Template

Use this template when requesting AI agent assistance for feature development or bug fixes.

## Objective

[Clear, concise description of what needs to be accomplished]

## Non-goals

[What should NOT be done or changed]

- Example: Do not modify authentication logic
- Example: Do not add new dependencies unless necessary

## Acceptance Criteria

- [ ] Criterion 1: Specific, testable requirement
- [ ] Criterion 2: Another specific requirement
- [ ] Criterion 3: Edge cases or error handling

## Files/Folders to Focus

- `app/route-name/` - Primary route to modify
- `components/ComponentName.tsx` - Component to update
- `lib/service-name.ts` - Service layer changes

## Tests to Add/Update

- [ ] Unit test: `__tests__/service-name.test.ts` - Test new functionality
- [ ] Integration test: `__tests__/api/route-name.test.ts` - Test API endpoint
- [ ] E2E test: `e2e/feature-name.spec.ts` - Test user flow (if applicable)

## Output Format

After completion, provide:

1. **Files changed**: List of all files created/modified
2. **Commands run + results**: Output from lint, typecheck, and test commands
3. **Manual test notes**: Steps to manually verify the changes work as expected

## Operator Note (do not paste into Cursor)

At the end of the prompt, add a one-line **model recommendation** (Auto or a specific model) with a brief reason.

## Example Usage

### Objective

Add a "Delete Item" button to the dashboard that removes items from the list.

### Non-goals

- Do not modify the database schema
- Do not add new API routes (use existing endpoints)

### Acceptance Criteria

- [ ] Delete button appears next to each item in the list
- [ ] Clicking delete removes the item from the UI immediately
- [ ] Guest mode: Item removal resets on refresh
- [ ] Authenticated mode: Item is removed from database
- [ ] Error handling: Shows user-friendly message if deletion fails

### Files/Folders to Focus

- `app/dashboard/page.tsx` - Add delete button UI
- `app/api/items/route.ts` - Add DELETE handler
- `lib/services/item-service.ts` - Add delete method

### Tests to Add/Update

- [ ] Unit test: `__tests__/item-service.test.ts` - Test delete method
- [ ] Integration test: `__tests__/api/items.test.ts` - Test DELETE endpoint
- [ ] E2E test: `e2e/dashboard.spec.ts` - Test delete flow
