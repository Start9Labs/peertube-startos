<p align="center">
  <img src="icon.svg" alt="PeerTube Logo" width="21%">
</p>

# PeerTube on StartOS

> Everything not listed in this document should behave the same as upstream
> PeerTube. If a feature, setting, or behavior is not mentioned here, the
> upstream documentation is accurate and fully applicable — see the
> Documentation section of `instructions.md` for links.

[PeerTube](https://github.com/Chocobozzz/PeerTube) is a federated (ActivityPub) video platform: channels, video-on-demand with server-side transcoding, live streaming, and peer-to-peer playback between viewers over WebRTC.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

The package runs upstream's images unmodified, for x86_64 and aarch64, in three subcontainers:

| Subcontainer | Image                 | Purpose                                                                                           |
| ------------ | --------------------- | ------------------------------------------------------------------------------------------------- |
| `peertube`   | `chocobozzz/peertube` | The PeerTube server, through the image's own entrypoint, which drops to the `peertube` user       |
| `postgres`   | `postgres` (Alpine)   | The database, listening on `127.0.0.1` only                                                       |
| `valkey`     | `valkey/valkey`       | Redis-compatible job queue and cache, listening on `127.0.0.1` only, with append-only persistence |

Before the server starts, a oneshot (`apply-origin`, in the `peertube` subcontainer) compares the primary URL with the one the database was last written for, and runs PeerTube's `update-host` script when they differ. Transcoding runs in the server's own process with FFmpeg on the CPU.

## Volume and Data Layout

Four volumes hold everything the service keeps.

| Volume     | Mount point                       | Contents                                                                                                    |
| ---------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `startos`  | —                                 | `store.json`: generated secrets, the primary URL, the root password, the SMTP selection                     |
| `peertube` | `/data` (subpath `data`)          | Videos (original, web, HLS), thumbnails, avatars, captions, plugins, logs, caches; `.startos-origin` marker |
| `peertube` | `/config` (subpath `config`)      | `local-production.json`, the settings PeerTube's admin panel writes                                         |
| `db`       | `/var/lib/postgresql`             | The PostgreSQL cluster (`PGDATA` at `/var/lib/postgresql/data`)                                             |
| `valkey`   | `/data` in the `valkey` container | Valkey's append-only file: queued transcodes, federation deliveries and other jobs                          |

`/data` grows with the video library. Every upload is kept as an original plus one transcoded copy per enabled resolution.

## File Models

The package owns `store.json` and seeds one key in PeerTube's own settings file. Everything else is configured in PeerTube's admin panel.

- **`store.json`** (`startos` volume, JSON). At install it gets a PostgreSQL password and `PEERTUBE_SECRET` (generated once, never rotated), plus the `.local` address as the primary URL. **Set Primary URL**, **Set Root Password** and **Configure SMTP** write it afterwards. It is not meant to be edited by hand.
- **`/config/local-production.json`** (`peertube` volume, JSON). Seeded at install with `admin.email: admin@example.com`, because the image's own config nulls that value and PeerTube cannot create `root` without one. After that the file belongs to PeerTube: its admin panel (**Administration → Settings → Configuration**) rewrites it, and the package never touches it again.

Settings the package owns go to PeerTube as `PEERTUBE_*` environment variables, re-applied on every start. Such a variable overrides the same setting in `local-production.json`, so these cannot be changed from the admin panel:

- listen address and port, and `webserver.hostname`/`port`/`https`, derived from the primary URL
- database and Redis connection
- `secrets.peertube`
- SMTP, but only while **Configure SMTP** selects a server; with it disabled, PeerTube's own defaults apply (email off)
- `peertube.check_latest_version.enabled: false`, since StartOS handles updates

`PT_INITIAL_ROOT_PASSWORD` is passed too. PeerTube reads it only on the start that finds no users in the database.

## Dependencies

None.

## Network Access and Interfaces

One host carries both interfaces, so a domain added to it serves both.

| Interface id | Name          | Type  | Port | Protocol                        | Purpose                                                                     |
| ------------ | ------------- | ----- | ---- | ------------------------------- | --------------------------------------------------------------------------- |
| `ui`         | Web Interface | `ui`  | 9000 | HTTP (TLS added by StartOS)     | The web app, REST API, ActivityPub endpoints, and the WebSocket P2P tracker |
| `rtmp`       | Stream Ingest | `api` | 1935 | RTMP; RTMPS on 1936 via StartOS | Live stream ingest from OBS or any RTMP client                              |

The stream key travels inside the RTMP URL, so plaintext RTMP on 1935 is published only on the box itself. Off the box, broadcasters use RTMPS on external port 1936, where StartOS terminates TLS. PeerTube's own live page always shows `rtmp://<host>:1935/live`, which is unreachable from the LAN or the internet. The working address is the **Stream Ingest** interface's RTMPS address, used with the stream key from PeerTube's live page.

P2P playback happens between browsers and needs no port on the server. The browsers use upstream's default third-party STUN servers to find each other.

## Installation and First-Run Flow

Install seeds the secrets, sets the primary URL to the server's `.local` address, and raises a critical **Set Root Password** task.

1. **Set Root Password** generates the password and stores it. On first start PeerTube creates `root` with it (email `admin@example.com`). This is the only account, and public sign-up is off (upstream's default).
2. On start, `apply-origin` writes the `.startos-origin` marker, and PeerTube creates its schema for that origin.

Whoever opens the address first cannot claim the instance: `root` exists before the server ever answers, and sign-up stays off until an administrator enables it.

## Actions

Three actions, all user-facing.

- **Set Root Password**: run it when the root password is lost, or right after install (it is the critical task). The first run only stores the password, and PeerTube applies it when it creates `root`. Later runs need the service running: they pipe the password into PeerTube's `reset-password` script in a temporary subcontainer, without restarting PeerTube. Each run replaces the password. It returns the username (`root`) and the password.
- **Set Primary URL**: run it to move the instance to a different address, typically from `.local` to a public domain before federating. It restarts PeerTube. On a changed origin (scheme, host or port), `apply-origin` runs `update-host` before the server starts. That script rewrites every local actor, video, comment, playlist and torrent URL, and takes longer the bigger the library. PeerTube refuses to move an instance that follows other servers, so while the database is reachable the action checks for accepted server follows and fails with a message rather than store the URL. While the service is stopped it can't check; if follows exist, `update-host` then fails and PeerTube won't start until the URL is set back. Remote instances keep the old address for anything they already fetched. Repeating it with the same URL changes nothing.
- **Configure SMTP**: disabled (default), StartOS system SMTP, or a custom server. Sign-up email verification, password resets and notifications need it. It restarts PeerTube.

## Tasks

Two critical tasks. Each blocks starting the service until it clears.

- **Set Root Password** (`critical`): raised while `store.json` holds no root password, which in practice means right after install. Running the action clears it for good.
- **Set Primary URL** (`critical`): raised while the stored URL's hostname is not one of the Web Interface's current addresses, for example after a restore (the public domain is not part of the backup) or after removing the domain the instance runs on. It clears once the user chooses an address, or once the stored address comes back (re-adding the same domain). It can return whenever the address goes away. No fallback is used: running PeerTube under an address the user didn't choose would change its federated identity.

## Health Checks

Two checks are visible; the PostgreSQL and Valkey checks are internal.

- **Web Interface**: `GET /api/v1/ping` on port 9000, with a 5-minute grace period. First start and upgrades run database migrations before the server listens, and a large `update-host` runs before it as well, so a long "starting" right after install, an update or a URL change is normal. A failure past that usually means `apply-origin` failed (look for `Cannot update host` in the logs) or PeerTube exited. The logs show which.
- **Email**: `success` while SMTP is configured, `disabled` otherwise. It sends nothing, so a configured but wrong server still shows `success`; PeerTube's logs show the delivery errors.

## Backups and Restore

The database is dumped and replayed; the files are copied.

- **PostgreSQL**: `pg_dump` at backup time. Restore builds a fresh cluster and replays the dump. The `db` volume's files are never copied.
- **`startos`** and **`valkey`**: copied whole, the job queue included.
- **`peertube`**: copied whole, minus `/data/tmp`, `/data/cache`, `/data/logs` and `/data/redundancy` (scratch space, cached remote media, logs, and mirrored copies of other instances' videos, all regenerated). Original and transcoded videos are included, so a backup is as large as the library.

A restore does not bring back a public domain added to the interfaces. The **Set Primary URL** task is raised and the service stays stopped until the domain is re-added or another address chosen. Choosing a different address triggers `update-host` like any other URL change.

## Limitations and Differences

1. The admin panel cannot change the instance hostname, the database or Redis settings, or SMTP while it is configured: the package re-applies those from the environment on every start.
2. PeerTube's built-in RTMPS server is off, and its live page shows an RTMP URL that only works from the box itself. Use the Stream Ingest interface's RTMPS address.
3. PeerTube's latest-version check is disabled.
4. Object storage, remote runners, and hardware-accelerated transcoding are not configured; transcoding runs on the CPU.
5. Changing the primary URL keeps local links working but cannot move existing remote followers, and it is refused while the instance follows other servers.

---

## Quick Reference for AI Consumers

```yaml
package_id: peertube
image: chocobozzz/peertube
architectures: [x86_64, aarch64]
subcontainers: [peertube, postgres, valkey]
volumes:
  startos: (store.json)
  peertube: /data (subpath data), /config (subpath config)
  db: /var/lib/postgresql
  valkey: /data (valkey subcontainer)
file_models:
  - store.json
  - config/local-production.json (seeded once)
startos_managed_env_vars:
  - PEERTUBE_LISTEN_HOSTNAME
  - PEERTUBE_LISTEN_PORT
  - PEERTUBE_WEBSERVER_HOSTNAME
  - PEERTUBE_WEBSERVER_PORT
  - PEERTUBE_WEBSERVER_HTTPS
  - PEERTUBE_SECRET
  - PEERTUBE_DB_HOSTNAME
  - PEERTUBE_DB_PORT
  - PEERTUBE_DB_NAME
  - PEERTUBE_DB_SUFFIX
  - PEERTUBE_DB_USERNAME
  - PEERTUBE_DB_PASSWORD
  - PEERTUBE_REDIS_HOSTNAME
  - PEERTUBE_REDIS_PORT
  - PEERTUBE_LIVE_RTMP_PORT
  - PEERTUBE_PEERTUBE_CHECK_LATEST_VERSION_ENABLED
  - PEERTUBE_SMTP_* (while SMTP is configured)
  - PT_INITIAL_ROOT_PASSWORD
dependencies: none
interfaces:
  ui: { type: ui, port: 9000 }
  rtmp: { type: api, port: 1935 }
actions:
  - set-root-password
  - set-primary-url
  - configure-smtp
tasks:
  - { action: set-root-password, severity: critical }
  - { action: set-primary-url, severity: critical }
health_checks:
  - peertube
  - email
```
