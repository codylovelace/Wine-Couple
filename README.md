# Wine Couple

A private wine journal for Cody & Jess. Snap a photo of the bottle, both rate it, and next time you're in the shop you can check whether it was a "must buy again" or an "avoid".

Built with Next.js, stored as JSON files plus photos on Docker volumes, and designed for phones (add it to your home screen and it opens like an app).

## Features

- **Both of you rate every bottle**: separate ratings and notes, a combined score and a couple verdict (*Must Buy Again*, *Great Value*, *Enjoyable*, *Table Wine*, *Special Occasion*, *Avoid*).
- **Bottle photos**: taken with the phone camera or picked from the photo roll, shrunk to a sensible size in the browser before upload.
- **Optional label scanning**: with a Google Gemini API key, the app reads the label and fills in producer, grape, region and vintage. Without a key you type the details yourself; it never guesses.
- **Where you bought it and for how much**, plus search links (Wine-Searcher, Vivino, Google Shopping) to find it again.
- **Recommendations, wishlist and couple stats.**
- **Export / import** of the wine list as JSON from Settings (photos are not included; back up the photos volume for those).

## Self-hosting on Portainer

Every push to `main` builds a Docker image and publishes it to `ghcr.io/codylovelace/wine-couple:latest` (see `.github/workflows/docker-publish.yml`). Portainer pulls that image.

### One-time: let Portainer pull from ghcr.io

The image is private because the repository is private, so Portainer needs a login:

1. On GitHub, create a **classic** personal access token with only the `read:packages` scope (Settings → Developer settings → Personal access tokens → Tokens (classic)).
2. In Portainer: **Registries → Add registry → Custom registry**. Name `ghcr`, URL `ghcr.io`, turn on **Authentication**, username `codylovelace`, password = the token.

### Create the stack

1. **Stacks → Add stack**, name it `wine-couple`, choose **Web editor**, and paste the contents of [`docker-compose.yml`](docker-compose.yml).
2. Optional environment variables (in the stack's *Environment variables* section):

   | Variable | Default | What it does |
   | --- | --- | --- |
   | `WINE_PORT` | `3000` | Port on the Docker host |
   | `TZ` | `Europe/London` | Container time zone |
   | `GEMINI_API_KEY` | *(empty)* | Turns on label scanning. Can instead be entered in the app's Settings |
   | `GEMINI_MODEL` | `gemini-flash-latest` | Gemini model used for label scanning |

3. **Deploy the stack**, then open `http://<docker-host>:3000` on your phone.

### Updating

After new commits land on `main` and the GitHub Action has finished, open the stack in Portainer and click **Update the stack** with **Re-pull image and redeploy** turned on. Your data is on volumes and is kept.

### Data and backups

| Volume | Mounted at | Contains |
| --- | --- | --- |
| `wine-couple_wine-data` | `/app/data` | `wines.json`, `settings.json` (including a Gemini key saved in Settings) |
| `wine-couple_wine-photos` | `/app/uploads` | Bottle photos |

Back up both volumes. If you'd rather use host folders (for example on the Synology), replace the named volumes with bind mounts and make the folders writable by UID 1001, which the app runs as: `chown -R 1001:1001 /path/to/folder`. The container's health check fails if either folder isn't writable, so a permissions problem shows up as *unhealthy* in Portainer.

### Building from source instead

[`docker-compose.build.yml`](docker-compose.build.yml) builds the image from the repository instead of pulling it. Use it locally with `docker compose -f docker-compose.build.yml up -d --build`, or as a Portainer **Repository** stack (repository URL, a token with access to the repo, compose path `docker-compose.build.yml`).

## Phones

- **iPhone (Safari)**: Share → **Add to Home Screen**.
- **Android (Chrome)**: ⋮ menu → **Add to Home screen**.

Sharing a wine uses the phone's share sheet only over HTTPS; on a plain `http://` LAN address the app shows the text to copy instead. Putting the app behind a reverse proxy with HTTPS (Nginx Proxy Manager, Traefik, Caddy) makes sharing and installing smoother.

The app has no login. Keep it on your home network or behind a VPN or an authenticating proxy; don't port-forward it to the internet.

## Local development

Requires Node.js 22.

```bash
npm install
npm run dev
```

Open http://localhost:3000. Data goes to `./data` and photos to `./data/uploads` (both git-ignored). `DATA_DIR` and `UPLOADS_DIR` override those paths.
