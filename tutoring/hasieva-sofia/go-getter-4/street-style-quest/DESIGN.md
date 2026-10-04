# Street Style Quest design system

<!-- impeccable:design-schema 1 -->

## Direction

Street Style Quest uses the visual language of a backstage fashion-show call sheet: clipped schedules, garment tags, runway credentials, decisive typography, and one acid-green signal colour. It is editorial and energetic without turning learning controls into decoration.

## Mode

Operate. The learner must always see the next useful action before the brand expression.

## Palette

- Paper: `#F3F0E8`
- Sheet: `#FFFDF7`
- Ink: `#151515`
- Muted ink: `#5F5C55`
- Signal: `#B9E33D`
- Focus: `#2457FF`
- Success: `#167A55`
- Error: `#B9362E`

The signal colour marks progress, current state, and primary action only. Blue is reserved for keyboard focus. Success and error are semantic exceptions.

## Typography

Use Archivo throughout. Display headings use 800 to 900 weight, tight tracking, and compact leading. Body copy uses 450 to 600. Labels use uppercase sparingly for operational metadata, never as decorative eyebrows.

## Shape and depth

- Primary surfaces: 14px radius.
- Small controls: 8px radius.
- Pills only for compact status and XP.
- Use a border or a shadow, never both on the same surface.
- Shadows fall down and right with a warm ink tint.

## Composition

The home page is a vertical runway schedule, not a grid of equal cards. Day entries are full-width rows with large sequence numbers, one concise description, and a state label. The mission page is a single working sheet with clear question, response, feedback, and action zones.

## Motion

Motion explains state. Use 160 to 220ms transitions on transform, colour, and opacity. Pressable elements scale to 0.98. Hover motion is enabled only for fine pointers. Reduced-motion users keep colour feedback without spatial movement.

## Iconography

No emoji. Use text marks, numerals, and simple authored geometric SVG only when an icon is necessary. Badges use two-letter woven-patch marks.

## Responsive rules

The 390px phone layout is primary. Hero credential stacks below the title, route rows keep a 52px number rail, actions become full-width, and no content relies on hover.

