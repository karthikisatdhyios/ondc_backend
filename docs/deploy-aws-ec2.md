# Deploying the Dhiyos BAP on AWS EC2 (bap.dhiyos.com)

Chosen host: **EC2 t3.micro (Ubuntu), ap-south-1 (Mumbai)** — free-tier eligible for
12 months, single always-on instance (required by our in-memory Beckn callback store).
No Docker. Free SSL via Let's Encrypt.

The provisioning script (`scripts/ec2-setup.sh`) does the server-side heavy lifting;
the steps below cover the AWS console + DNS parts only you can do.

---

## 1. Launch the EC2 instance (AWS console)
EC2 → **Launch instance**:
- **Name:** `dhiyos-bap`
- **AMI:** Ubuntu Server 24.04 LTS (64-bit x86)
- **Instance type:** the micro marked **"Free tier eligible"** (`t3.micro` or `t2.micro`)
- **Key pair:** create one, download the `.pem` (you'll SSH with it)
- **Network / Security group — allow inbound:**
  - SSH (22) — *My IP*
  - HTTP (80) — *Anywhere 0.0.0.0/0*
  - HTTPS (443) — *Anywhere 0.0.0.0/0*
- **Storage:** 20–30 GB gp3 (within free tier)
- Launch.

## 2. Give it a stable IP (Elastic IP)
EC2 → **Elastic IPs** → **Allocate** → then **Associate** it with the `dhiyos-bap`
instance. Note this IP — call it `EIP`.

## 3. Point the domain (GoDaddy) — replaces the Render CNAME
In GoDaddy DNS for `dhiyos.com`:
- **Delete** the existing `bap` CNAME (that pointed to Render).
- **Add:** Type `A`, Name `bap`, Value `EIP`, TTL default.

(Also remove `bap.dhiyos.com` from the Render service's custom domains so it stops
serving there. You can delete the Render service entirely once EC2 works.)

## 4. SSH in and get the code
```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@EIP

sudo mkdir -p /opt/dhiyos && sudo chown -R ubuntu /opt/dhiyos
git clone https://github.com/karthikisatdhyios/ondc_backend.git /opt/dhiyos/ondc_backend
cd /opt/dhiyos/ondc_backend
```

## 5. Create the two config files (contents provided in chat)
```bash
nano .env                     # paste the .env block
nano server/beckn-keys.json   # paste your identity keys JSON
```
`.env` holds only non-secret config + ONDC's public key. `server/beckn-keys.json`
holds your keypair and persists on the EC2 disk (no Render env-var trick needed here).

## 6. Provision (installs Node, builds, systemd service, nginx)
```bash
bash scripts/ec2-setup.sh
```
When it finishes, the app is running behind nginx on port 80.

## 7. Free SSL (after DNS from step 3 has propagated)
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d bap.dhiyos.com --non-interactive --agree-tos -m YOUR_EMAIL --redirect
```
Certbot installs the cert, flips nginx to HTTPS, and auto-renews.

## 8. Verify
```bash
curl -s https://bap.dhiyos.com/beckn/health
```
Expect `ondcEncryptionKeySet: true` and the `bap.dhiyos.com` identity.

---

## Updating later
```bash
cd /opt/dhiyos/ondc_backend
git pull
npm install
sudo systemctl restart dhiyos
```

## Handy commands
- Logs: `journalctl -u dhiyos -f`
- Restart: `sudo systemctl restart dhiyos`
- Nginx reload: `sudo systemctl reload nginx`
