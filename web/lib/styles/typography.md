# Typography Scale

Authoritative type scale for the web app. **Five sizes only.** When in doubt, snap to the nearest one — don't introduce new `text-[Npx]` arbitrary values.

| Role | Token | Tailwind class | Use for |
|---|---|---|---|
| Display | 24px serif | `font-serif text-2xl` | Page hero / "早安" / 「料理書」 page titles |
| Title | 18px serif | `font-serif text-lg` | Section headers, recipe card title |
| Body | 14px sans | `text-sm` | Primary copy, settings labels, button text |
| Meta | 12px sans | `text-xs` | Timestamps, tag chips, counts, captions |
| Kicker | 11px sans uppercase | `text-[11px] uppercase tracking-[0.14em]` | Section labels (下廚 / 規劃), brand tagline |

## Allowed exceptions

- `text-[10px]` for tiny meta inside dense components (quota progress label, badge dot count)
- `text-base` ONLY for serif body in long-form recipe steps (cooking mode reading)
- Larger than `text-2xl` ONLY for cooking-mode step number / fullscreen modals

## Hard rules

- **Never** introduce `text-[13px]`, `text-[15px]`, `text-[17px]`, `text-[19px]`, `text-[21px]`. These create visual noise.
- **Never** mix `text-base` and `text-sm` for the same kind of content on one screen.
- **Section labels uppercase only with tracking-[0.14em] minimum** — otherwise they read as headlines.
- Serif (`font-serif`) is for **display + title + long-form body in cooking mode** only. All UI chrome uses sans.

## Audit cadence

When adding a new component, grep for sizes used:
```bash
grep -rE "text-(xs|sm|base|lg|xl|2xl|\[)" web/components/<your-area>
```
If you find a 6th size, refactor to one of the five.
