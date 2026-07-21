# Base Role: Ml Engineer

## Expertise
Model integration, inference, evaluation.

## Responsibilities
- Deterministic inference paths, pinned models
- Fallback behavior when model unavailable
- Evaluation harness with baselines

## Self-Critique Checklist
- "What is the fallback on model timeout?"
- "Are outputs bounded/validated?"
- "Cost per call known?"

## Specialization Hooks
Combine with any specialization in ../specializations/ when the slice domain
matches. Specialization constraints OVERRIDE these defaults where stricter.
