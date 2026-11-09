<p align="center">
  <img src="public/newshift-logo-white.svg" alt="NewShift AI" height="64" />
</p>

# NewShift Dispatch

**From one photo to a booked repair.** AI photo diagnosis and automatic dispatch for independent appliance repair shops. Any brand, any age, any language.

Live demo: **https://dispatch.newshiftai.com** · Built in one day at c0mpiled-17 Seoul.

---

## The problem

Samsung and LG can diagnose their own smart appliances and send their own technicians. The independent repair shops that fix everything else still run on phone tag and guesswork: they learn what's broken only when the tech is standing in the kitchen, and the wrong part on the truck means a second visit.

## What it does

1. **Customer snaps a photo.** The appliance, its model sticker or an error code, plus one sentence, in any language. No app, no account, no call.
2. **AI diagnoses it in seconds.** Brand (from the logo or rating plate), model when readable (never invented), appliance type, likely fault, urgency and a price estimate based on the shop's own rates. Plus a **tech brief**: parts to bring, what to check first and expected repair time, so the job is fixed on the first visit.
3. **Right tech, booked and texted.** The AI picks the best technician by brand certification, skills, service area and availability, and explains why in one line. The customer picks a time on their phone and gets an SMS confirmation.

### Also

- **Plain-English dispatch rules.** "Never send Sub-Zero jobs to anyone but Mike" applies to the next job.
- **Every language.** The customer's screen, diagnosis and SMS come back in their language; the shop's board stays in English.
- **Safety mode.** Gas smell, sparks or flooding: immediate safety steps on the customer's phone and a red priority card for the shop.
- **Human fallback.** Customers can tap "Request a call" instead of booking.
- **Any shop can sign up.** A 2-minute wizard (company, pricing, technicians with brands, certifications, areas and time slots, rules, plan) creates the shop's own customer link, QR code, website button and password-protected dispatch board.
- **Live metrics.** Photo-to-booked time, phone calls needed, parts list ready.

## Screens

| Path | What |
|---|---|
| `/` | Home: try the demo, sign in, or set up a shop (admins see all shops) |
| `/upload`, `/c/<shop>/upload` | Customer photo page (mobile) |
| `/board`, `/c/<shop>/board` | Live dispatch board (demo board is open; shop boards need sign-in) |
| `/setup` | Shop sign-up wizard |
| `/login` | Shop sign-in (and NewShift admin) |
| `/how` | How it works |
| `/qr`, `/c/<shop>/qr` | Full-screen QR code |

## How it's built

- **Next.js 15** (App Router), **TypeScript**, **Tailwind CSS**
- **Claude Sonnet 5.5** (Anthropic API) with vision for photo diagnosis and again for technician dispatch, using structured JSON output validated with **Zod**. Every AI call retries once, then falls back to rules-based diagnosis or scoring, so the flow never breaks. Technician IDs and time windows from the model are checked against real data.
- **Twilio** for SMS, with an on-screen preview fallback
- **Auth:** scrypt-hashed passwords, signed httpOnly session cookies; each shop can only reach its own jobs, rules and customer photos
- **Storage:** in memory, with shop sign-ups saved to a local JSON file (hackathon scope)
- **Hosting:** Railway (single always-on Node service) at dispatch.newshiftai.com; DNS on Cloudflare

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill in your keys
npm run dev                  # http://localhost:3000
```

For the phone demo, expose it with a tunnel:

```bash
npm run tunnel   # Cloudflare quick tunnel; /qr picks up the URL automatically
```

Production-style run: `npm run demo` (build + start).

### Environment variables

| Name | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API |
| `TWILIO_ACCOUNT_SID` | Twilio account |
| `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET` | Twilio API key (or use `TWILIO_AUTH_TOKEN`) |
| `TWILIO_FROM_NUMBER` | Sending number |
| `PUBLIC_URL` | Public base URL for QR codes (optional) |
| `ADMIN_PASSWORD` | NewShift admin sign-in |

Without Twilio keys, SMS shows as a preview on the board. Without an Anthropic key, diagnosis and dispatch use the rules-based fallback.

## Hackathon scope and next steps

Built in a day, so some parts are intentionally simple: in-memory data, no payments (the plan step starts a free trial), no password reset or team accounts. Next: a real database, Stripe billing, missed-call text-back, a technician mobile view, and calendar sync.

---

Built by Tristan at **NewShift AI**, which already runs AI dispatch for two US appliance repair companies.
