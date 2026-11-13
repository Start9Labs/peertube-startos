# Updating the upstream version

## Determining the upstream version

The pin is `images.peertube.source.dockerTag` in `startos/manifest/index.ts`, `chocobozzz/peertube:v<version>`. Upstream tags a GitHub release for each version and pushes the matching image tag:

```bash
gh release list -R Chocobozzz/PeerTube --exclude-pre-releases -L 1
```

Read the release's changelog for an **IMPORTANT NOTES** section: it names manual steps, minimum PostgreSQL / Redis / Node versions, and config keys that changed.

## Applying the bump

1. Set `dockerTag` to `chocobozzz/peertube:v<version>` (the `v` prefix is part of the tag; the `-trixie` variants are not used).
2. Set the version in `startos/versions/current.ts` to `<version>:0`.
3. If the release notes raise the PostgreSQL floor above the pinned `postgres` major, the bump also needs a database upgrade path; a major change to `postgres:<n>-alpine` cannot be made by editing the tag alone.
4. Check upstream's `support/docker/production/config/custom-environment-variables.yaml` at the new tag for renamed variables among those `peertubeEnv` in `startos/utils.ts` sets.

PeerTube runs its own schema migrations on start.
