---
name: codebase-quality-audit
description: Whole-repo quality audit that reports dead/unused code, over-engineered abstractions, AND the opposite — quick-and-dirty/hacky/suboptimal code (crude patterns, missing state management, copy-pasted logic, magic values, inconsistent conventions). Produces a proposed-changes report ONLY, never edits files until the user explicitly validates. Use whenever the user asks to audit a codebase or folder, wants to know what's "useless", "sous-optimal", "fait trop brutalement/à l'arrache", asks "qu'est-ce qui ne va pas dans mon code", wants a cleanup pass, or asks for a code quality review that isn't scoped to a single diff/PR. Complements (does not replace) an over-engineering-only audit: this one also looks for code that's too crude or hastily written, not just code that's too fancy.
---

# Codebase Quality Audit

A whole-repo pass that looks in **both directions**: code that's over-built (unused
abstractions, speculative flexibility, needless dependencies) and code that's
under-built (rushed, hacky, copy-pasted, missing basic structure). Most audits only
check one direction — this one checks both, because a codebase built fast and
iteratively (like a learning project or an early prototype) usually has far more of
the second kind than the first.

**This skill never edits files on its own.** It always ends in a report. Changes are
only applied in a separate, later step once the user has read the report and told you
which items to act on.

## When to reach for the narrower audits instead

- Only over-engineering, ranked deletions → `ponytail-audit`.
- Just the current diff/PR → `code-review` or `simplify`.

Use this skill when the ask is broader: "look at the whole project", "is anything
sous-optimal / done too roughly", "clean this up", with no diff or PR to scope it to.

## How to run the audit

1. **Map the codebase first.** Skip `node_modules`, build output (`.next`, `dist`,
   `build`), lockfiles, and anything `.gitignore` excludes. Read every source file
   that's actually part of the app — for a small/early-stage project that's usually
   feasible to do in full rather than sampling.

2. **Read for understanding, not just pattern-matching.** A crude piece of code that
   the author clearly intends to revisit is different from the same code shipped as
   if it were finished. Note which is which where it's obvious (comments, TODOs,
   half-wired features).

3. **Look for both directions, in the same pass:**

   **Too crude / rushed / suboptimal:**
   - State that should be framework-managed but isn't (e.g. plain mutable
     module-level arrays/variables standing in for real state, relying on an
     unrelated re-render to "happen to" pick up the change)
   - Copy-pasted blocks that differ only by a variable name (should be one function)
   - Magic strings/numbers used as identifiers instead of a shared id/enum
   - Missing basic structure a real app needs at this size: no error/loading states,
     no persistence layer despite the data clearly needing to survive a reload,
     everything crammed into one file once that file is doing three unrelated jobs
   - Type shortcuts that erase real bugs (`as string`, `any`, non-null assertions)
     used to silence the compiler rather than to express a real invariant
   - Brittle coupling: a component that only works because of an assumption that
     isn't enforced anywhere (e.g. matching by array order instead of by id)

   **Over-built / unused:**
   - Abstractions with exactly one implementation and no second one coming
   - Config/options for values that never vary
   - Dependencies pulled in for something a few lines of native/stdlib code would
     cover
   - Dead code: unused exports, unreachable branches, commented-out blocks left
     "just in case"

4. **Don't flag style nitpicks** (formatting, naming taste) unless they actively
   cause confusion or bugs. The bar is "this will bite you or someone else later",
   not "this isn't how I'd write it."

5. **Write the report, grouped by file, each finding as:**
   - **What**: the concrete issue, with file:line
   - **Why it matters**: the failure mode this leads to (a bug it enables, or the
     maintenance cost it adds) — not just "this is bad practice"
   - **Proposed fix**: a short, concrete description of the change (not the full
     diff) — enough for the user to say yes/no per item

   Order findings by impact, most important first. Skip items you're not confident
   are real problems rather than padding the list.

6. **Stop after the report.** Ask which findings to act on (all of them, a subset,
   or none). Only edit files once the user answers.

## Output format

```
## Trop rapide / bricolé
- [file:line] <what> — <why it matters> → <proposed fix>

## Sur-construit / inutile
- [file:line] <what> — <why it matters> → <proposed fix>
```

Skip a section entirely if it has nothing genuine in it — don't manufacture findings
to fill both buckets.
