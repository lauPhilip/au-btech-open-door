# Open Door design system

One file, `app/src/app.css`, holds every colour, space, shadow, text size and layer the shell uses. A screen that needs a new value adds a token there first, so that a student's phone, the teacher's laptop and the projector all follow the same rules. Illustrations (the map, the room pictures, the faces and props) keep their own colours and are not part of the palette.

## Colour

The palette has one action colour. Blue is for things you can press and for focus, and nothing else is blue. The sticky yellow belongs to notes and to the teacher's hints. Green, red and amber carry meaning (done, problem, may need help) and are always paired with a word or a symbol, so a colour-blind student or a washed-out projector loses nothing. Every text and background pair is tested for 4.5:1 contrast in `app/src/lib/contrast.test.ts`, and the test reads its colours from `app.css`, so a change to the palette that breaks contrast fails the build.

| Token | Use |
| --- | --- |
| `--ink`, `--slate` | text and secondary text |
| `--paper`, `--mist`, `--line` | cards, page background, borders |
| `--blue`, `--blue-dark`, `--blue-soft` | the action colour, its pressed state and its tint |
| `--sticky`, `--sticky-hover`, `--sticky-paper` | notes and hints |
| `--safe`, `--safe-dark`, `--safe-ink`, `--safe-soft` | done, correct, connected |
| `--alert`, `--alert-dark`, `--alert-soft` | problems and errors |
| `--warn-edge`, `--warn-ink`, `--warn-soft` | a team that may need help |
| `--close-*`, `--quiet-*` | "nearly" and "missed" in the debrief table |

## Space, shape and type

Spacing uses a four-pixel grid (`--space-1` to `--space-7`). Corners are `--radius-s`, `--radius-m` or `--radius-l`. Depth is `--shadow-1` for a resting card, `--shadow-2` for a raised one, `--shadow-lift` for a sticky bar and `--shadow-3` for a dialog. Layers are `--z-sticky`, `--z-modal` and `--z-overlay`. Anything a thumb has to hit is at least `--tap`, 44 pixels.

Text has one scale (`--text-s` to `--text-3xl`). The larger sizes grow a little with the screen using `clamp()`, and no size ever shrinks below its phone value, so a projector can be read from the back of the room without the phone layout changing.

## Layout rules

Phones get one column and scroll. From 861 pixels wide and 600 pixels tall, the play view fills the window and the page itself never scrolls: the picture takes the height that is left and never grows past it (the map is 1206 by 770, a room is 800 by 450, so the largest width that fits is the height times that ratio), the controls sit in one row under it, and the side panel scrolls on its own. The teacher page becomes two columns from 1100 pixels, with the controls on the left and the teams beside them. Single-column pages such as the join, vote and result pages use `--column`, which grows from 520 to 760 pixels. `e2e/responsive.spec.ts` fails if any of this breaks at 320, 390, 768, 1280, 1440 or 1920 pixels, including a page that scrolls when it should fit the window.

## Adding something new

Reuse a token before adding one. If a colour carries meaning, give it a soft background and an ink for text, add the pair to `contrast.test.ts`, and use a word or an icon beside it. Check the new screen at the six sizes in the responsive test before opening a pull request.
