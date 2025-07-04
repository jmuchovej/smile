# experiments/

Each subdirectory is one experiment's timeline. The active experiment is
chosen in `smile.config.ts` (or with `SMILE_EXPERIMENT`); its directory is
`experiments/{name}@{version}/` when that exists, otherwise
`experiments/{name}/`.

Inside an experiment directory, every `.vue` file is a page and every
directory is a block. The file names encode the timeline:

- A numeric prefix orders an entry among its siblings: `01.welcome.vue`,
  `2.ready.vue`, `03.trials/`. Padding does not matter, and the prefixes
  become the page's SmileID (`2.1`, `3.[index].02`).
- Within one directory, either every entry is numbered or none is. Unnumbered
  siblings form a randomized group; for now they are presented in name order.
- `[param].vue` or `[param]/` binds the page (or block) to the trial identifiers
  of the experiment's stimuli, once per identifier. A dynamic page must be alone
  at its level; put it in a `[param]/` directory to combine it with other pages.
- Entries starting with `_` or `.` and files that are not `.vue` are ignored.

Pages render at `/experiment/{name}/{segments}` inside the Smile shell and can
use `useTimeline()`, `useStimuli()` and `useSmileConfig()` without importing
them.
