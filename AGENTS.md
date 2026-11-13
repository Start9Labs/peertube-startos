# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

- **Every `PEERTUBE_*` variable added to `peertubeEnv` takes that setting away from PeerTube's admin panel** — environment overrides `local-production.json`. Add one only for a value the package must own.
- **Keep `main` from `.const()`-reading `rootPassword`** — rotation writes it, and must not restart PeerTube.
- **Never delete `/data/.startos-origin`** — `apply-origin` reads a missing marker as a fresh database, so the next origin change would skip `update-host` and leave every local URL pointing at the old address.
