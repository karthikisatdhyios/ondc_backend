# Dhiyos — ONDC Buyer App (BAP)

Dhiyos is a consumer commerce platform that acts as a **Buyer Network Participant (BAP)** on [ONDC](https://ondc.org) pre-production. It discovers products from real network sellers via the Beckn protocol, applies Dhiyos card-reward logic, and can drive the order flow (select → init → confirm).

**Live pre-prod backend:** https://bap.dhiyos.com  
**Subscriber ID:** `bap.dhiyos.com`  
**Domain:** `ONDC:RET10` (retail grocery)

This monorepo contains the **Express backend** (ONDC + API) and a **React chat UI** (Vite). Only the backend is deployed today; the UI runs locally.

---

## Quick start (local dev)

**Requirements:** Node.js 20+, npm

```bash
git clone https://github.com/Tech-Dhiyos/dhiyos-ondc.git
cd dhiyos-ondc
cp .env.example .env
npm install
npm run seed
npm run dev
```

| URL | What |
|---|---|
| http://localhost:5173 | React chat UI |
| http://localhost:8787/beckn/health | ONDC diagnostics |
| http://localhost:8787/mock-bpp | Local mock seller (when `BECKN_ENABLED=false`) |

With default settings (`BECKN_ENABLED=false`), search talks to the in-process mock seller — no ONDC registration needed.

---

## Architecture

```
User (React UI)
      │
      ▼
Express API  ──search──►  ONDC Gateway  ──►  Seller apps (BPPs)
      ▲                         │
      └──── on_search callbacks ┘
```

| Piece | Role |
|---|---|
| **BAP (us)** | Buyer app — search, compare, order on behalf of users |
| **BPP** | Seller app — catalog, pricing, fulfillment |
| **Gateway** | Broadcasts search to many sellers |
| **Registry** | Identity, keys, subscription status |

### Key directories

```
server/
  index.js              Express app, /api/* and /beckn/* routes
  beckn/
    bap.js              Outgoing search / select / init / confirm
    search-intent.js    RET10 search payload (fulfillment + finder fee)
    routes.js           Inbound callbacks (/beckn/bap/on_*)
    discovery.js        Network search + card discount overlay
    normalize.js        Merge on_search catalogs into product cards
    mock-bpp/           Dev-only local seller
  tools/                Discount, recommend, book (cart + ONDC order)
src/                    React chat UI (Vite)
docs/
  deploy-aws-ec2.md     Production deploy guide (EC2 + nginx + SSL)
  deploy-ondc.md        ONDC onboarding notes
scripts/
  ec2-setup.sh          One-shot EC2 provisioning
```

---

## Environment variables

Copy `.env.example` → `.env`. Secrets are git-ignored.

| Variable | Purpose |
|---|---|
| `BECKN_ENABLED` | `false` = local mock seller; `true` = live ONDC pre-prod |
| `BAP_ID` / `BAP_URI` | Your network identity (e.g. `bap.dhiyos.com`) |
| `ONDC_GATEWAY_URL` | Pre-prod: `https://preprod.gateway.ondc.org` |
| `ONDC_REGISTRY_URL` | Pre-prod: `https://preprod.registry.ondc.org/ondc` |
| `ONDC_CORE_VERSION` | `1.2.5` (required after July 2026 gateway upgrade) |
| `ONDC_ENCRYPTION_PUBLIC_KEY` | From ONDC portal |
| `server/beckn-keys.json` | Ed25519/X25519 keypair (download from ONDC portal) |

For cloud deploys without a keys file, set `BECKN_KEYS_JSON` to the full JSON contents.

---

## ONDC / Beckn endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/beckn/health` | Config + key status (no secrets) |
| POST | `/beckn/debug/search` | Trigger gateway search (`{"q":"rice"}`) |
| POST | `/beckn/debug/pramaan-search` | Praan certification helper |
| POST | `/beckn/bap/on_search` | Seller catalog callbacks |
| POST | `/beckn/bap/on_subscribe` | Registry onboarding callback |

**Verify live search:**
```bash
curl -s -X POST https://bap.dhiyos.com/beckn/debug/search \
  -H 'Content-Type: application/json' -d '{"q":"rice"}'
```
Expect `responseCount > 0` and real `bppIds`.

---

## npm scripts

| Script | Description |
|---|---|
| `npm run dev` | Backend + frontend concurrently |
| `npm run dev:server` | Express only |
| `npm run dev:client` | Vite UI only |
| `npm run seed` | Populate local SQLite catalog |
| `npm start` | Production server |
| `npm run beckn:onboard` | CLI registry subscribe (usually done via portal) |
| `npm run build` | Build React UI to `dist/` |

---

## Deploying to EC2

See **[docs/deploy-aws-ec2.md](docs/deploy-aws-ec2.md)** for the full guide.

Short version on the server:
```bash
cd /opt/dhiyos/ondc_backend   # or wherever you cloned
git pull
npm install
sudo systemctl restart dhiyos
curl -s https://bap.dhiyos.com/beckn/health
```

---

## Contributing

1. **Branch** off `main`: `git checkout -b feature/your-change`
2. **Run locally** with mock BPP first (`BECKN_ENABLED=false`)
3. **Keep secrets out of git** — `.env`, `*.db`, `server/beckn-keys.json` are ignored
4. **Open a PR** to `main` in this repo

### Areas where help is welcome

- Wire React UI to live ONDC discovery (`/api/ask` → network search)
- End-to-end order flow against real BPPs (select → init → confirm)
- Praan / Pramaan certification (Flow 1A)
- Deploy frontend to `app.dhiyos.com`
- Tests for `search-intent.js`, `normalize.js`, discount logic

### Glossary

| Term | Meaning |
|---|---|
| **Pre-prod** | ONDC test network (safe to break) |
| **Production** | Live ONDC network |
| **BAP** | Buyer app (this repo) |
| **BPP** | Seller app |
| **Beckn** | Protocol / message format ONDC uses |
| **Praan** | ONDC certification test harness |

---

## Related repos

| Repo | Purpose |
|---|---|
| [Tech-Dhiyos/dhiyos-FE](https://github.com/Tech-Dhiyos/dhiyos-FE) | Frontend (separate; this repo also has a Vite UI) |
| [Tech-Dhiyos/dhiyos-ML](https://github.com/Tech-Dhiyos/dhiyos-ML) | ML services |
| [Tech-Dhiyos/dhiyos-BE](https://github.com/Tech-Dhiyos/dhiyos-BE) | Legacy placeholder — use **dhiyos-ondc** instead |

---

## Support / ONDC issues

For gateway or registry problems after network upgrades, email **techsupport@ondc.org** with subject `[Gateway & Registry Upgrade]` and include subscriber ID `bap.dhiyos.com`.

---

## License

Private — Dhiyos / Tech-Dhiyos. Contact the team before external use.
