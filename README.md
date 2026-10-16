# Wine Couple

A private wine journal for Cody & Jess. Snap a photo of the bottle, both rate it, and next time you're in the shop you can check whether it was a "must buy again" or an "avoid".

Built with Next.js, stored as JSON files plus photos on Docker volumes, and designed for phones (add it to your home screen and it opens like an app).

## Features

- **Your own login each**: Cody and Jess sign in separately. The cellar, wishlist and comments are shared; each of you can only set your own rating.
- **Swipe to rate**: right if you'd buy it again, left if you wouldn't, with optional stars and notes. When one of you logs a bottle, the other gets it in their *Your turn to rate* list. Two rights make *Must Buy Again*, two lefts *Avoid*, a split *Table Wine*; you can also mark a bottle *Great Value* by hand.
- **Comments** on every wine, so you can talk about a bottle from your own phones.
- **Bottle photos**: taken with the phone camera or picked from the photo roll, shrunk to a sensible size in the browser before upload.
- **Optional label scanning**: with a Google Gemini API key, the app reads the label and fills in the name, producer, grape, region and vintage. Without a key you type the details yourself; it never guesses.
- **Where you bought it and for how much**, plus search links (Wine-Searcher, Vivino, Google Shopping) to find it again.
- **For You suggestions**: with a Gemini key, suggestions based on the wines you both liked (and away from ones you both disliked). They're cached and refreshed when your shared likes change, or on demand.
- **More like this**: on any wine, tap to have Gemini suggest a few wines with a similar taste. The last set is saved per wine, so reopening it costs nothing.
- **Shops**: pick the shop from a list of UK supermarkets (or Custom for anywhere else; custom shops you've used are offered next time). Tap a shop anywhere to see every wine you've bought there and what you've spent.
- **Shopping list**: everything marked *Must Buy Again* or *Great Value*, grouped by the shop you bought it in, plus a wishlist of wines to try.
- **Couple stats.**
- **Backup and restore** of every wine, rating and comment as JSON from Settings (photos are not included; back up the photos volume for those).

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
   | `GEMINI_API_KEY` | *(empty)* | Turns on label scanning, For You and More like this. Can instead be entered in the app's Settings |
   | `GEMINI_MODEL` | `gemini-flash-latest` | Gemini model used for both |
   | `GEMINI_FALLBACK_MODEL` | *(empty)* | Optional backup model, tried when the main one is overloaded or rate limited after a few retries. May cost more than the main model |

3. **Deploy the stack**, then open `http://<docker-host>:3000` on your phone.
4. The first visit shows a setup screen: enter a name and password for each of you (names already in the cellar are filled in so your past ratings stay yours) and tick which one is you. After that the page is a normal sign-in.

### Updating

After new commits land on `main` and the GitHub Action has finished, open the stack in Portainer and click **Update the stack** with **Re-pull image and redeploy** turned on. Your data is on volumes and is kept.

### Data and backups

| Volume | Mounted at | Contains |
| --- | --- | --- |
| `wine-couple_wine-data` | `/app/data` | `wines.json`, `settings.json` (including a Gemini key saved in Settings), `users.json` (names and password hashes), `sessions.json`, `recommendations.json` and `similar.json` (cached suggestions) |
| `wine-couple_wine-photos` | `/app/uploads` | Bottle photos |

Back up both volumes. If you'd rather use host folders (for example on the Synology), replace the named volumes with bind mounts and make the folders writable by UID 1001, which the app runs as: `chown -R 1001:1001 /path/to/folder`. The container's health check fails if either folder isn't writable, so a permissions problem shows up as *unhealthy* in Portainer.

### Building from source instead

[`docker-compose.build.yml`](docker-compose.build.yml) builds the image from the repository instead of pulling it. Use it locally with `docker compose -f docker-compose.build.yml up -d --build`, or as a Portainer **Repository** stack (repository URL, a token with access to the repo, compose path `docker-compose.build.yml`).

## Phones

- **iPhone (Safari)**: Share → **Add to Home Screen**.
- **Android (Chrome)**: ⋮ menu → **Add to Home screen**.

Sharing a wine uses the phone's share sheet only over HTTPS; on a plain `http://` LAN address the app shows the text to copy instead. Putting the app behind a reverse proxy with HTTPS (Nginx Proxy Manager, Traefik, Caddy) makes sharing and installing smoother.

## Accounts and passwords

- Change your own name or password in **Settings** (the round initial at the top right). Changing your password signs you out on your other devices.
- If one of you forgets their password, the other can reset it in **Settings** (with their own password to confirm).
- If you're both locked out, open the container's console in Portainer (**Containers → wine-couple → Console**, `/bin/sh`) and run `node scripts/reset-password.mjs "Cody" "a-new-password"`.
- After five wrong passwords in a row an account is locked for a minute, doubling up to 15 minutes.
- Sign-in cookies are marked secure when the request arrives over HTTPS, including via a proxy that sets `X-Forwarded-Proto`.

Logins make the app safe to share between the two of you, but it's still a small home app: keep it on your home network, VPN, or behind HTTPS if you expose it.

## Local development

Requires Node.js 22.

```bash
npm install
npm run dev
```

Open http://localhost:3000. Data goes to `./data` and photos to `./data/uploads` (both git-ignored). `DATA_DIR` and `UPLOADS_DIR` override those paths.
