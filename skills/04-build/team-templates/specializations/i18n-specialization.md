# Specialization: I18N

## Domain
Localization: message catalogs, ICU plural/gender formatting, locale-aware
dates/numbers/currencies, and RTL layout. Applied on top of a base role when a
slice renders text, dates, or numbers for more than one locale. A hard-coded
English string is a bug, not a shortcut.

## When To Apply
- PRD lists multiple target locales, or any non-Latin / RTL language (Arabic, Hebrew, Persian)
- Slice renders user-facing strings, dates, currencies, or pluralized counts
- Scope mentions translation files, locale switching, or regional formatting

## Additional Constraints (applied on top of the base role)
- Zero string concatenation for UI copy. Every sentence is one message key; word
  order differs across languages, so "Hello " + name is untranslatable
- ICU MessageFormat for plurals and gender (e.g. `{count, plural, one {# item} other {# items}}`).
  Never pluralize with a ternary — Russian and Arabic have more than two plural forms
- Dates, numbers, and currencies through a locale-aware formatter (Intl.DateTimeFormat /
  Intl.NumberFormat or the framework wrapper) — never toLocaleString() with no locale argument
- All copy lives in message catalogs (one file per locale, e.g. `locales/en.json`),
  keyed by stable IDs, loaded through the project's chosen library (FormatJS, i18next, Lingui).
  No inline user-facing literals in components
- RTL is a layout property, not a translation: use logical CSS properties
  (`margin-inline-start`, not `margin-left`); `dir="auto"` on user-generated text
- Locale negotiation reads the Accept-Language header / user setting with an explicit
  fallback chain (e.g. `fr-CA -> fr -> en`); never infer locale from IP or timezone alone
- Translation files are data, owned by this slice; adding keys to another slice's
  catalog violates worktree isolation — request the key via the contract instead
- Placeholders and HTML inside messages must be typed/escaped by the library; never
  interpolate raw user input into translated markup (stored-XSS vector)

## Extra Steps
1. Extract every user-facing literal in the slice into message keys before writing
   logic; run the library's extractor (`formatjs extract`, `i18next-parser`, `lingui extract`)
   and diff against the catalog to prove nothing was missed.
2. Add pseudo-locale testing (e.g. accented/expanded pseudo-locale with ~40% longer
   strings) to the test setup; run the UI test suite against it to catch hard-coded
   strings and layout overflow.
3. Write plural/format fixtures for at least one multi-plural-form locale
   (Russian or Arabic) and one RTL locale, verifying counts, dates, and currency render.
4. If the slice adds message keys consumed by other slices, declare the key schema in
   `src/contracts/` before implementation — translation keys are an interface.

## Acceptance Checks
- Extractor diff is empty: no user-facing literal exists outside message catalogs
- Pseudo-locale run passes: every rendered string resolves to a key, no overflow/clipping
- Plural test exists for a 3+ plural-form locale (e.g. Russian `one/few/many`) and passes
- Number/date/currency snapshot test renders differently under `en-US` vs `de-DE` vs `ar-EG`
- RTL check exists: layout mirrored under `dir="rtl"` with no `*-left`/`*-right` CSS
  properties in the slice's stylesheets

## Pairs Commonly With
- frontend-engineer -> owns message catalogs, ICU formatting, logical CSS properties,
  and pseudo-locale UI testing in components
- backend-engineer -> owns Accept-Language negotiation, locale-aware date/currency
  formatting in API responses, and localized email/notification templates
- qa-engineer -> owns pseudo-locale and plural-form test fixtures across locales;
  doubles as the overflow/clipping gate before `aegis merge check`
