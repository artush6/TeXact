# TeXact

TeXact is a local symbolic-math Raycast extension. Type LaTeX or plain math to see a large, rendered preview and any recognized calculus rule. Press **⌘↵** to calculate; the detail pane then shows only the enlarged answer while the original input remains in the search field.

## Examples

| Input                     | Result           |
| ------------------------- | ---------------- |
| `2 + 2`                   | `4`              |
| `\frac{1}{2}+\frac{1}{3}` | `5/6`            |
| `\frac{d}{dx}x^3`         | `3x^2`           |
| `\int x^2 dx`             | `x^3/3 + C`      |
| `\sum_{k=0}^{n} k^2`      | `n(n+1)(2n+1)/6` |

Type `sum`, `derivative`, `integral`, `primitive`, or `limit` to browse common formulas. TeXact also recognizes rules such as the power, product, quotient, and chain rules. The symbolic engine handles exact arithmetic, derivatives, integrals, equations, systems, limits, and common sums; some advanced expressions may be unsupported.

## Install in Raycast

For local development, from this folder run:

```sh
npm install
npm run dev
```

Raycast registers the development extension and keeps it available after the development terminal exits. Search for **Calculate with TeXact** in Raycast. Run `npm run dev` again when you want to reload development changes.

## Publish

Pushing this repository to GitHub makes the source code public. To make TeXact installable from Raycast’s public Store, run:

```sh
npm run build
npm run publish
```

The publish command opens a pull request to Raycast’s extensions repository. After Raycast reviews and accepts it, the extension is published in the Store. Anyone can then install it using Raycast’s **Store** command.

## Development

- Math engine: CortexJS Compute Engine.
- No account, API key, or network connection is needed to calculate.
- Run `npm test` for math-layer tests and `npm run lint` for lint and formatting checks.
