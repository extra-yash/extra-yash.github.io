import { contentPart1 } from './content-1';
import { contentPart2 } from './content-2';
import { contentCh06, contentCh07 } from './content-3';
import { contentCh08, contentCh09 } from './content-4';
import { contentPart5 } from './content-5';

// --- Document 01: Brand Strategy ---
// Chapters: 01, 02, 03, 04, 05, 07, 08
export const brandStrategyContent =
  contentPart1 + '\n\n' +
  contentPart2 + '\n\n' +
  contentCh07 + '\n\n' +
  contentCh08;

// --- Document 02: Operational Handbook ---
// Chapters: 10, 11 + Appendix
export const operationsContent = contentPart5;

// --- Document 03: Visual Guidelines ---
// Sections: The Mark (symbol from Ch01) + Ch06 (Brand Aesthetics)
export const visualContent = `
# EXTRA VISUAL GUIDELINES
## Document 03: Visual Identity

**Version 0.1 | May 2026**
**IN DEVELOPMENT**

---

## Document Purpose

This document defines Extra's visual identity system — the mark, design philosophy, colour system, typography, spacing, and usage rules. It is a living document currently in early development. Sections will be added as the visual system is formalised.

**Reference:** Visual identity decisions are grounded in the Brand Strategy (Document 01) and the Operational Handbook (Document 02).

---

# 01. The Mark

## The Symbol: Brand Origin

The Extra logo carries a deliberately chosen symbol. Its origins are dual:

- **The Vitruvian Man** — Da Vinci's study of human proportions, with limbs outstretched, representing human potential at full extension.

- **The Kanji character 大 (pronounced "Dai")** — meaning "Big" or "Great" — a figure with arms spread wide, signifying scale and ambition.

The symbol is therefore both a human figure and a representation of scale and significance. It marks something exceptional, something that needs to be noted, something extra. The brand name and mark are inseparable from this idea.

A "Fil Rouge" (red thread) runs through the logo — the connecting line that ties everything together, representing Extra's role as the connective tissue between talent and opportunity.

---

` + contentCh06;

// --- Scrapbook: Archived Content ---
// Chapters cut during initial split, with redistribution notes
export const scrapbookContent = `
# EXTRA SCRAPBOOK
## Archived Content — Pending Redistribution

**This document is not linked from the main navigation. Access via direct URL.**

Archived content is preserved in its original form. Each entry records the source chapter, archive date, and recommended redistribution path for when the content is ready to be incorporated into its target document.

---

## Archive Entry 01 — Chapter 09: Brand Architecture

**Original document:** Extra Brand Strategy (Document 01)
**Archived:** May 2026
**Cut during:** Initial document split into Brand Strategy, Operational Handbook, and Visual Guidelines
**Recommended redistribution:**
- Sections 9.1–9.4 (The Singular Brand, Operating Modes, Attribution Framework, Code Name Protocol) → Operational Handbook (Document 02)
- Section 9.5 (Visual Identity Hierarchy) → Visual Guidelines (Document 03)

---

` + contentCh09;

// Backward-compat alias used by any remaining references
export const strategyContent = brandStrategyContent;
