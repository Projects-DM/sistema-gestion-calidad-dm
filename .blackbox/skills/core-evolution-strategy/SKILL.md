# Core Evolution Strategy

Before writing code always answer:

Does this belong to the Core?

or

Does this belong to a Business Module?

If reusable:

Move toward the Core.

If business-specific:

Keep inside the Business Module.

Always prefer:

Capabilities

Metadata

Composition

Configuration

instead of

Hardcoded Rules

The Core must never know business rules.

Business Modules must never redefine Core behavior.