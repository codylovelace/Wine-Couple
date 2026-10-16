# Vino — Private Couple Wine Tasting & Cellar Journal

A mobile-first collaborative wine tasting journal and sommelier recommendation app designed for couples. Works seamlessly as a Progressive Web App (PWA) on iOS and Android, and can be self-hosted anywhere using Docker.

## Key Features

- **Collaborative Couple Reviews**: Log separate ratings, tasting notes, and aroma tags for both partners, automatically computing a combined cellar score and palate compatibility percentage.
- **Verdict Categorisation**: Classify bottles as *Must Buy Again*, *Great Value*, *Enjoyable*, *Table Wine*, *Special Occasion*, or *Avoid*.
- **AI Bottle & Label Scanner**: Take a photo of any wine bottle label to automatically extract the Wine Name, Producer, Vintage, Varietal, Region, ABV, and tasting profile (powered by Google Gemini Vision with a built-in fallback parser).
- **Purchase Tracking & Online Buy Links**: Record where you bought each bottle and at what price, alongside instant search links for Wine-Searcher, Vivino, Google Shopping, and supermarket deals.
- **Recommended For You**: Personalized wine suggestions calculated from your highest-rated bottles, favorite varietals, and aroma preferences.
- **Full Vault Backup & Restore**: Export or import your entire cellar and settings as a single JSON file at any time.

---

## Hosting with Docker (Recommended)

The project is pre-configured with a multi-stage standalone `Dockerfile` and `docker-compose.yml` that persists your cellar database (`./data`) and uploaded photos (`./public/uploads`).

### 1. Run with Docker Compose

```bash
docker compose up -d --build
```

The application will be available at **`http://localhost:3000`**.

### 2. Run with Plain Docker

```bash
docker build -t vino-journal .
docker run -d \
  --name vino-wine-journal \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/public/uploads:/app/public/uploads \
  --restart unless-stopped \
  vino-journal
```

---

## Local Development

### Prerequisites
- Node.js 20+ and npm

### Setup
```bash
npm install
npm run dev
```

Open **`http://localhost:3000`** in your browser.

---

## Installing on iOS & Android (Mobile App Experience)

1. Open your hosted URL (`http://<your-server-ip>:3000`) on your phone.
2. **iOS (Safari)**: Tap the **Share** button → **Add to Home Screen**.
3. **Android (Chrome)**: Tap the **Three-Dot Menu** → **Install App** / **Add to Home Screen**.
