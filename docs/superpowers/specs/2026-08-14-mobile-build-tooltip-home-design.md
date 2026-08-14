# Mobile Build, Tooltip, and Home Layout Design

## Goal

Make OpenBack reliable and visually complete on phones without increasing interface clutter. Mobile players must be able to select and place buildings without opening the player action menu, read complete unit information inside the viewport, and see all three homepage match cards in a balanced layout.

## Mobile build placement

Selecting a buildable unit puts the battlefield input system into an explicit placement state. While that state is active, a primary touch on the battlefield belongs only to the build preview and placement controller. It must not emit the touch action that opens the radial, trade, diplomacy, or player menu.

Pointer releases that originate outside the battlefield canvas must not be interpreted as battlefield taps. This prevents a tap on a build-bar button from acting on the map underneath it. A successful placement follows the existing OpenBack rules for preserving or clearing the selected unit. Selecting the active build item again, cancelling, or pressing the existing back action exits placement mode.

The implementation will preserve desktop mouse behavior, touch dragging, pinch zooming, long-press selection, and the existing build validation pipeline.

## Unit information on mobile

Desktop keeps the existing hover tooltip. On touch-sized viewports, unit information is presented in a viewport-safe card immediately above the build controls. The card includes:

- unit name and shortcut;
- description;
- current cost;
- any existing contextual hint.

The card is constrained to the viewport width with safe horizontal margins and safe-area spacing. Long descriptions wrap within the card instead of expanding off-screen. Its height is bounded so it cannot cover most of the battlefield; overflowing description content may scroll internally. Tapping another build item updates the same card, and cancelling placement removes it.

The compact build-bar labels and proportions remain unchanged unless a specific label is already clipped by its own button.

## Mobile homepage

The three live match cards no longer use a horizontally clipped carousel on phones. They use a responsive mosaic:

- the first match is a full-width featured card;
- the second and third matches share the next row at normal phone widths;
- very narrow screens stack all three cards;
- landscape phones use the available width without hiding a card off-screen.

The primary Solo action stays visually dominant, with Host Multiplayer, Ranked, and Join Multiplayer directly beneath it. A restrained section heading, consistent card framing, and subtle existing OpenBack background treatment fill the composition without adding new informational panels or decorative noise. The footer follows the content naturally instead of being separated by a large empty region.

## Accessibility and responsive behavior

Interactive controls retain mobile-sized touch targets. Tooltip content remains readable at browser text scaling. Safe-area insets are respected. No horizontal page scrolling is introduced. Reduced-motion preferences continue to suppress optional transitions.

## Verification

Automated regression coverage will verify:

- a selected build unit consumes a mobile battlefield tap without emitting a context-menu action;
- pointer releases originating from HUD controls cannot become battlefield actions;
- the mobile unit information container is viewport constrained;
- the phone homepage uses the three-card mosaic rather than horizontal overflow.

Browser playtesting will cover 393x852 portrait and 852x393 landscape layouts. The test flow will select a City, place it on owned territory, confirm that the City is built, and confirm that no radial or trading menu opens. Screenshots will verify the complete unit information card and all three homepage match cards.
