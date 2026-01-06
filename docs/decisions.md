# Architecture Decision Records (ADRs)

## ADR Template

```markdown
## ADR-XXX: Title

**Status**: Proposed | Accepted | Deprecated | Superseded

**Context**: What is the issue we're addressing?

**Decision**: What is the change we're making?

**Consequences**: What are the trade-offs?
```

---

## ADR-001: Use Next.js App Router

**Status**: Accepted

**Context**: Need a modern React framework with server-side rendering capabilities.

**Decision**: Use Next.js with the App Router for routing and server components.

**Consequences**:

- Benefits from React Server Components
- Requires understanding of server/client boundaries
- Good TypeScript support out of the box

---

## ADR-002: Use pnpm as Package Manager

**Status**: Accepted

**Context**: Need a fast, disk-efficient package manager.

**Decision**: Use pnpm for dependency management.

**Consequences**:

- Faster installs via content-addressable storage
- Stricter dependency resolution
- Team needs to use pnpm consistently

---

_TODO: Add more ADRs as decisions are made_
