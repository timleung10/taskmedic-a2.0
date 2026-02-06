# TaskMedic – Agent Rules (v2fix16a Reset)

These rules govern all autonomous agents operating in this repository.
They are mandatory.

---

## 1. Baseline Reality

- The starting point is v2fix16a
- Logic, persistence, and tests are mostly correct
- UI is NOT acceptable and must be replaced

Do NOT attempt to "improve" the existing UI.
It is to be superseded.

---

## 2. UI Rebuild Mandate

This is a UI REBUILD, not a UI iteration.

Agents MUST:
- Remove legacy UI patterns
- Remove modal-based detail views where expansion is required
- Remove icon-led affordances like chevrons or arrows

If old UI code conflicts with the new design, DELETE it.

---

## 3. Design Authority

`design.md` and `/reference/*` are authoritative.

They define:
- Layout
- Spacing
- Interaction model
- Visual hierarchy

They are NOT inspiration.
They are the target.

Deviation is a defect.

---

## 4. Card Interaction Rules

All primary entities render as CARDS.

Cards:
- Are collapsed by default
- Expand INLINE within the list
- Expand via tap OR long-press
- Collapse via tapping header or outside region

There MUST be:
- No chevrons
- No expand icons
- No “Details” buttons

---

## 5. Checklist Rules

Checklist items MUST:
- Use circular check controls
- Animate state changes
- Show completion timestamps subtly
- Be tappable across the full row width

Native browser checkboxes are forbidden.

---

## 6. Motion & Gestures

Motion is not optional.

Agents SHOULD implement:
- Inline expand/collapse animations
- Tap feedback
- Long-press detection
- Swipe affordances (future-safe)

Animations should be:
- Fast
- Subtle
- Interruptible

---

## 7. Testing Rules

Playwright tests are part of the product.

Agents MUST:
- Update tests to reflect new UI structure
- Add tests for expansion, collapse, persistence
- Never delete tests just to pass CI

Selectors should prefer:
- Data attributes
- Semantic roles
- Stable UI anchors

---

## 8. Autonomy Rules

Agents MUST:
- Not ask questions
- Not request approval
- Not pause execution

When uncertain:
- Default to the simplest UI
- Prefer whitespace and calm visuals
- Re-check design.md

---

## 9. Success Criteria

Work is complete ONLY when:
- UI visually matches reference mockups
- Cards expand inline correctly
- One-handed use feels natural
- Animations feel intentional
- All tests pass locally

Anything less is incomplete.
