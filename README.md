# Official website — 極客創新有限公司

Static brand site for **極客創新有限公司**, the company behind the **KIMMOO** and **DIGIX** brands.

Canonical host: `https://geek-innovation.com`

Public company contact: `contact@geek-innovation.com`

This is a brand site only. It has no cart, checkout, or login. Product purchases go through Amazon and TikTok Shop.

## Pages

- `/` — Home
- `/about.html` — About the company
- `/brands/kimmoo.html` — KIMMOO
- `/brands/digix.html` — DIGIX
- `/products/fans.html` — Fans
- `/products/hand-warmers.html` — Hand warmers
- `/products/home.html` — Home & kitchen
- `/contact.html` — Contact (`mailto:contact@geek-innovation.com`)
- `/privacy` and `/privacy.html` — Privacy Policy
- `/terms` and `/terms.html` — Terms of Service
- `/tiktok-demo/` — Sandbox TikTok Login Kit and Direct Post demo
- `/tiktok-demo/callback/` — Registered Login Kit redirect for that demo

The demo calls the existing Cloudflare Worker at `https://geek-innovation-api.guoyi4491.workers.dev`. The client secret, access token, and refresh token are not in this repository. The sample clip for `PULL_FROM_URL` is `/tiktok-demo/media/sample.mp4`.

Registered office details are not published yet and will be added once confirmed.

## GitHub Pages (free, overseas)

This folder is ready to publish from a **public** GitHub repository using GitHub Pages.

Recommended repository, under the already-connected GitHub account `guoyi7899-alt`:

- Name: `guoyi7899-alt.github.io` (user site; preview at `https://guoyi7899-alt.github.io/`)
- Or: `geek-innovation-com` (project site; preview at `https://guoyi7899-alt.github.io/geek-innovation-com/`)

Steps:

1. Create that repository as **Public**.
2. Upload every file in this folder to the default branch (`main`).
3. In the repository: **Settings → Pages**.
   - Source: Deploy from a branch → `main` → `/ (root)`.
   - Custom domain: `geek-innovation.com` → Save.
   - After DNS is in place and a certificate is issued, tick **Enforce HTTPS**.
4. If GitHub shows a domain-verification TXT record, add it in 腾讯云 DNSPod first (see below), then continue.

Do not add the DNS records below until the custom domain has been saved in the repository Pages settings (avoids domain takeover risk).

## DNS records for 腾讯云 DNSPod

Domain: `geek-innovation.com`. TTL: `600` seconds is fine.

### Website (GitHub Pages)

Add these in **解析记录**. If `@` already has a parking A/CNAME/URL record, replace it. Do not use a wildcard `*.` record.

| 记录类型 | 主机记录 | 记录值 | 优先级 | TTL |
| --- | --- | --- | --- | --- |
| A | @ | 185.199.108.153 | — | 600 |
| A | @ | 185.199.109.153 | — | 600 |
| A | @ | 185.199.110.153 | — | 600 |
| A | @ | 185.199.111.153 | — | 600 |
| AAAA | @ | 2606:50c0:8000::153 | — | 600 |
| AAAA | @ | 2606:50c0:8001::153 | — | 600 |
| AAAA | @ | 2606:50c0:8002::153 | — | 600 |
| AAAA | @ | 2606:50c0:8003::153 | — | 600 |
| CNAME | www | guoyi7899-alt.github.io | — | 600 |

The `www` CNAME value is the GitHub user site, `guoyi7899-alt.github.io`, even if the files live in a project repository. Do not put the repository name in that CNAME.

If GitHub asks you to verify the domain, add the exact TXT record it shows (host is usually `_github-pages-challenge-guoyi7899-alt`, value is a token GitHub generates). Do not invent that value.

### Email forwarding (ImprovMX, free)

Public address: `contact@geek-innovation.com`. This is forwarding only; it is not a mailbox that can send mail by itself.

1. Sign up at https://improvmx.com (free plan: 1 domain).
2. Domain: `geek-innovation.com`.
3. Alias: `contact`.
4. Forward-to: **your personal inbox** (Gmail or similar). Do not skip this; ImprovMX needs a real destination. This personal address is not published on the website.
5. In DNSPod, delete any existing MX records for `@` first (only one MX set should exist). If `@` already has a different SPF `v=spf1 ...` TXT record, merge it instead of adding a second SPF record.
6. Then add:

| 记录类型 | 主机记录 | 记录值 | 优先级 | TTL |
| --- | --- | --- | --- | --- |
| MX | @ | mx1.improvmx.com | 10 | 600 |
| MX | @ | mx2.improvmx.com | 20 | 600 |
| TXT | @ | v=spf1 include:spf.improvmx.com ~all | — | 600 |

In ImprovMX, click **Check Again** until forwarding is active. Keep nameservers on DNSPod; you do not need to move DNS to another provider.

## Yiles (TikTok for Developers) values

Use these only after `https://geek-innovation.com` loads over HTTPS:

- Terms of Service: `https://geek-innovation.com/terms`
- Privacy Policy: `https://geek-innovation.com/privacy`
- Web/Desktop URL: `https://geek-innovation.com/`
- Company contact email: `contact@geek-innovation.com`
- Sandbox posting demo: `https://geek-innovation.com/tiktok-demo/`
- Login Kit redirect URI: `https://geek-innovation.com/tiktok-demo/callback/`

Do not reuse older temporary hosts (here.now, ship.place).

The site should stay on overseas/global hosting (GitHub Pages). Do not point the domain at a mainland-China server, or ICP 备案 would be required.
