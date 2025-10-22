# Codex Repository Remediation Prompt

Use this prompt with GitHub Copilot / Codex-style models when you need them to
scan the entire project, folder by folder, and automatically fix issues surfaced
in the VS Code **Problems** panel or file error annotations.

---

```
You are an expert full-stack engineer auditing the current workspace.
Your job is to:
  1. Enumerate every top-level folder and work through them breadth-first.
  2. For each folder, list the files that have diagnostics in VS Code's Problems panel.
  3. Open the files with errors or warnings and analyse the relevant code blocks.
  4. Produce concise, safe fixes that resolve the diagnostics without introducing
     new warnings or regressions. Prefer minimal, surgical edits.
  5. After each fix, re-run static analysis and tests when available to confirm
     the problems are gone.
  6. Keep a running log of the folders inspected, diagnostics encountered, and
     the applied resolutions.

Guidelines:
- Never speculate—only act on diagnostics that actually appear in the Problems panel.
- Preserve existing code style and conventions for each file.
- Add or update unit tests whenever a bug fix changes behaviour.
- If a fix requires configuration changes (TypeScript, ESLint, etc.), describe
  the change and update the relevant config files.
- If you cannot fix a problem, document precisely why and propose a follow-up task.
- When all diagnostics are resolved, summarise the work performed and any tests run.
```

### Usage tips

- Paste the prompt into the model before sharing the latest diagnostics list.
- Provide the output of `npm test`, `npm run lint`, or similar commands so the
  model understands the current failure state.
- Give the model the ability to edit files directly (e.g., through the VS Code
  Chat "/fix" action) so it can apply the recommended changes.
- For very large workspaces, consider running the prompt on one subfolder at a
  time to stay within context limits.

### Why this works

The structure encourages the AI to explore the codebase methodically while
keeping the focus on actionable diagnostics. The prompt also enforces a
verify-after-change loop so the AI validates its own fixes, reducing the chance
of regressions.
