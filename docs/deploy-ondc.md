# Deploying the Dhiyos BAP for ONDC (bap.dhiyos.com)

> NOTE: We chose **AWS EC2** as the host — see `docs/deploy-aws-ec2.md`. This Render
> guide is kept for reference only.

Goal: put the backend online at `https://bap.dhiyos.com` (your ONDC `subscriber_id`)
with valid SSL, without touching your live `www.dhiyos.com` site or moving your
GoDaddy nameservers. Target host: **Render** (no Docker, free SSL, custom domains).

Only the **backend** (Express server) needs to be public — that's what ONDC calls.
The React UI can stay local for now, or be deployed separately later.

---

## 0. One-time: put the code on GitHub
Hosts deploy from a Git repo. Secrets are already git-ignored (`.env`, `*.db`,
`server/*keys.json`), so they will NOT be pushed.

```bash
cd "AI Commerce"
git init
git add .
git commit -m "Dhiyos BAP: initial deploy"
# create an EMPTY private repo at github.com/<you>/dhiyos, then:
git remote add origin https://github.com/<you>/dhiyos.git
git branch -M main
git push -u origin main
```

---

## 1. Create the Render web service
1. Sign up at https://render.com and click **New > Web Service**, connect the GitHub repo.
2. Settings:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm run seed && npm start`
   - **Instance type:** **Starter ($7/mo)** recommended — the Free tier sleeps after
     15 min, and ONDC callbacks need the endpoint always awake.
3. Render provides `PORT` automatically; the server already reads `process.env.PORT`.

---

## 2. Environment variables (Render dashboard > Environment)
Copy these from your local `.env`, with the Beckn ones set for the network:

| Key | Value |
|---|---|
| `OPENAI_API_KEY` | (from local .env) |
| `OPENAI_MODEL` | `gpt-5.5` |
| `STRIPE_SECRET_KEY` | (from local .env) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | (from local .env) |
| `STRIPE_CURRENCY` | `usd` |
| `STRIPE_COUNTRY` | `US` |
| `BECKN_ENABLED` | `false` (flip to `true` after you're subscribed) |
| `BAP_ID` | `bap.dhiyos.com` |
| `BAP_URI` | `https://bap.dhiyos.com` |
| `BECKN_UNIQUE_KEY_ID` | `dhiyos-bap-key-1` |
| `ONDC_REGISTRY_URL` | staging: `https://staging.registry.ondc.org` |
| `ONDC_GATEWAY_URL` | staging: `https://staging.gateway.proteantech.in` |
| `ONDC_DOMAIN` | `ONDC:RET10` |
| `ONDC_CORE_VERSION` | `1.2.0` |
| `ONDC_CITY` | `std:080` |
| `ONDC_ENV` | `staging` |
| `ONDC_ENCRYPTION_PUBLIC_KEY` | (ONDC's public key for your env — from ONDC docs/portal) |
| `BECKN_KEYS_JSON` | paste the entire contents of `server/beckn-keys.json` (keeps your registered keys stable across restarts) |

> Get `BECKN_KEYS_JSON` locally with: `cat server/beckn-keys.json` (single line is fine).
> This is critical: without it, a restart regenerates keys and your ONDC
> registration breaks.

---

## 3. Point bap.dhiyos.com at Render (GoDaddy, does NOT touch www)
1. In Render: **Settings > Custom Domains > Add** `bap.dhiyos.com`. Render shows a
   CNAME target like `dhiyos.onrender.com`.
2. In **GoDaddy DNS** for `dhiyos.com`, add ONE record:
   - Type: `CNAME`, Host/Name: `bap`, Value: `<the-render-target>.onrender.com`, TTL: default.
3. Wait for DNS + Render to issue SSL (a few minutes to ~1 hr).
4. Verify:
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" https://bap.dhiyos.com/api/payment-status   # expect 200
   ```

---

## 4. Register on ONDC (portal task: "Build components to transact")
Your public keys (already generated locally):
```bash
npm run beckn:onboard keys
```
Provide on the portal / in the subscribe call:
- `subscriber_id`: `bap.dhiyos.com`
- `subscriber_url`: `https://bap.dhiyos.com`
- `callback_url`: `/beckn/bap`
- `signing_public_key`, `encryption_public_key`, `unique_key_id`: from the command above

Site verification (ONDC gives you a `request_id`):
```bash
# run this where BECKN_KEYS_JSON/keys match production, then redeploy so it's served
npm run beckn:onboard site <request_id>
```
It is served at `https://bap.dhiyos.com/ondc-site-verification.html`.

Subscribe:
```bash
npm run beckn:onboard subscribe
```

---

## 5. Go live on the network
- After ONDC confirms your subscription, set `BECKN_ENABLED=true` on Render and redeploy.
- Test a search from the app; you should get `on_search` callbacks from network sellers.

---

## Alternatives to Render
- **Railway** (nixpacks, ~$5/mo, always-on): same env vars; set start command `npm run seed && npm start`; add custom domain, CNAME at GoDaddy.
- **AWS** (you already use it for www): App Runner or Elastic Beanstalk (Node platform, no Docker) works too, but is more setup than Render.
