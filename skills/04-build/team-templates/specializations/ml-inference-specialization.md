# Specialization: ML Inference

Serve models inside the product without letting a probabilistic black box
break deterministic guarantees: pinned models, bounded latency, validated
outputs, and a fallback for every inference path.

## Domain
Model serving in product: recommendations, ranking, classification,
generation, embeddings - anywhere a slice calls an external model API
(OpenAI, Anthropic) or loads a local model (ONNX, GGUF) and then renders,
stores, or acts on the output.

## When To Apply
- PRD mentions recommendations, ranking, classification, generation,
  embeddings, or "AI-powered" anything on a user-facing path.
- A slice calls a model API or loads a model inside request handling.
- Any feature where the model output is rendered, stored, or acted on.

## Additional Constraints (applied on top of the base role)
- Model identity is pinned and recorded: provider, exact model ID, and
  version/checksum. No `model="latest"`, no unversioned endpoints.
- Every inference call has a hard timeout and a per-request latency budget
  declared in the slice spec; the budget is enforced in code, not hoped for.
- Degradation path exists for model timeout, rate limit, and 5xx: cached
  answer, heuristic fallback, or explicit error state - never a hang.
- Prompts are data, not string interpolation: user input enters via
  parameterized templates; prompt-injection surface is listed in the slice
  spec (OWASP LLM01).
- Model output is validated against a schema before it is rendered, stored,
  or passed to another system. Unparseable output follows the degradation
  path, never the UI.
- Cost per call is known: token/byte accounting per request is logged so the
  inference path is measurable and auditable.
- Streaming responses terminate: max token/byte cap per request, and the
  client handles truncated output as a normal case.
- No model output is treated as authority: no generated SQL executed raw, no
  generated IDs trusted for authorization, no model decision that cannot be
  overridden.

## Extra Steps
1. Wrap the model call in an adapter behind the slice's contract interface so
   the rest of the slice compiles against the contract, not the provider SDK.
2. Add a deterministic eval harness: a fixed fixture set of inputs with
   recorded baseline outputs, runnable offline via `aegis eval`-style checks.
3. Record golden outputs for the fixture set at build time; CI fails on
   schema-violating or timeout behavior, not on wording drift.
4. Add a kill-switch flag so inference can be disabled per-request via config
   without redeploying the slice.

## Acceptance Checks
- Pinned model ID/version asserted in a test (mock provider rejects "latest").
- Timeout test: model call exceeding the budget takes the degradation path.
- Schema test: malformed model output never reaches render or persistence.
- Rate-limit/5xx test: provider failure produces a defined error state, not
  an unhandled exception or a hanging request.
- Cost accounting: one request logs token/byte usage through the adapter.

## Pairs Commonly With
- ml-engineer -> owns the adapter, eval harness, and fallback logic; this
  specialization supplies the latency/cost/validation rules it must meet.
- backend-engineer -> the inference path usually lives behind an API
  endpoint; pairs to enforce timeouts, retries, and cost caps server-side.
- security-engineer -> prompt injection and output-as-authority are attack
  surfaces; pairs when user input reaches the prompt or model output
  reaches an action.
