# TaskMedic – UI Design Specification (v2fix16a Reset)

## What TaskMedic Is

TaskMedic is a mobile-first clinical task manager used during hospital shifts.

It supports:
- Jobs
- Bleeps
- Tasks
- Actions / progress
- Review times
- Handover context

Users operate it:
- Under time pressure
- Often one-handed
- In clinical environments

Clarity and speed matter more than flexibility.

---

## What Exists Already

From v2fix16a:
- Data models exist
- Persistence exists
- Core flows exist

These SHOULD be reused.

The UI SHOULD NOT.

---

## Core Screen: Task List (Home)

The home screen is a vertical feed of CARDS.

Each card represents:
- A Job OR
- A Bleep

There is no separate “details page”.

---

## Card – Collapsed State

Collapsed cards show:
- Primary summary (headline)
- Secondary context (ward / from / bed)
- Urgency via colour, not icons

Visual style:
- Rounded corners
- Soft elevation
- Generous padding
- Clear separation between cards

No chevrons.
No arrows.
No expand icons.

---

## Card – Expanded State

Expanded cards open INLINE.

Expanded content includes:
- Outstanding tasks
- Circular checklist items
- Completion timestamps
- Actions / progress notes

Expansion pushes content down.
Nothing overlays the screen.

---

## Checklist Design

Checklist items:
- Circular tick controls
- Animate when toggled
- Show completion time quietly
- Are fully row-tappable

Square checkboxes are forbidden.

---

## Interaction Model

Primary interactions:
- Tap card → expand / collapse
- Long-press card → expand
- Tap header or outside → collapse

Secondary interactions:
- Swipe gestures (future use)
- Subtle haptic-style animation feedback

Everything must be thumb-friendly.

---

## Colour & Tone

The app should feel:
- Calm
- Dark
- Focused

Avoid:
- Bright whites
- Default browser styles
- Dense layouts

Spacing is more important than decoration.

---

## Typography

Typography must:
- Establish hierarchy clearly
- Use size and spacing over weight
- Avoid visual noise

---

## Reference

Images in `/reference/` define the target appearance.

The UI should be immediately recognisable as matching them.

If it looks like a generic web app, it is wrong.
