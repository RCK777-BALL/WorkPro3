# Coding Standards

## General
- Use TypeScript for all application code.
- Keep functions small and focused on a single responsibility.
- Avoid duplicating DTOs—import from `/shared/types`.

## backend
- Use async/await for I/O.
- Validate request payloads using Zod or express-validator.
- Ensure tenant scoping is applied to all data access.

## frontend
- Use React functional components with hooks.
- Keep API interactions in `/frontend/src/api`.

## Naming
- Use `camelCase` for variables and functions.
- Use `PascalCase` for types and React components.

## Formatting
- Follow ESLint and Prettier configuration.
- 2-space indentation, no trailing whitespace.
