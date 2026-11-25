# PeerTube

PeerTube publishes every channel and video under its primary URL, and other instances remember that address. Pick the address you mean to keep before you federate.

## Documentation

- [PeerTube documentation](https://docs.joinpeertube.org/) — the admin guide (configuration, moderation, following other instances, plugins and themes) and the user guide (accounts, channels, uploading, live streaming and playlists).

## What you get on StartOS

- **Web Interface**: the full PeerTube site for watching, uploading and administration. Signed in as `root`, the **Administration** menu holds every instance setting.
- **Stream Ingest**: the RTMPS address you give OBS (or any broadcasting software) to go live.
- The database, the job queue and transcoding are all handled for you. Your videos stay on your server.

## Getting set up

1. Run **Set Root Password** when prompted. Copy the password it shows; the username is `root`.
2. Start PeerTube and open the **Web Interface**. Sign in as `root`.
3. From your account menu, open **Settings** and change root's email from `admin@example.com` to your own.
4. Under **Administration → Settings → Configuration**, give the instance a name and description, and decide whether to allow sign-ups. Sign-up is off until you turn it on.
5. To federate, or to share videos outside your network, add a public domain to the Web Interface and run **Set Primary URL** to choose it. Do this before following other instances: PeerTube cannot move an instance that follows other servers.
6. If you want sign-ups, password resets or notifications by email, run **Configure SMTP**.

## Using PeerTube

### Uploading

Upload from the **Publish** button. PeerTube transcodes every upload on your server's CPU, so a long video takes a while before it can be watched. Which resolutions it produces is set under **Administration → Settings → Configuration → VOD**; every extra resolution costs CPU time and disk space.

### Going live

1. Under **Administration → Settings → Configuration → Live**, enable live streams.
2. Create a live from **Publish → Go live**. PeerTube shows a stream key and an RTMP URL.
3. In OBS, enter the **Stream Ingest** RTMPS address from StartOS as the server, not the RTMP URL PeerTube shows, and paste the stream key from PeerTube.

### Peer-to-peer playback

Viewers watching the same video share pieces of it with each other through their browsers, which takes load off your server. Each viewer can turn it off in their own settings, and you can change the default under **Administration → Settings → Configuration**.

### Actions

- **Set Root Password**: generates a new password for `root`, for when you've lost the current one.
- **Set Primary URL**: moves the instance to another address. PeerTube rewrites its own links and restarts; on a big library this can take several minutes.
- **Configure SMTP**: use StartOS's email settings, your own mail server, or none.

### Publishing through a tunnel

PeerTube connects out to the instances it federates with and to sites you import videos from, and they see your server's address. If you publish PeerTube through a tunnel to keep your home IP private, send its outbound traffic through that tunnel too. If you use a tunnel for another reason, such as a port your router can't forward, you have nothing to change.
