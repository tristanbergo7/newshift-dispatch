# NewShift Dispatch: demo kit

## Before you go on stage (5 min)

1. Laptop plugged in, Wi-Fi on, phone charged, phone volume up (so the SMS ping is heard).
2. Terminal 1: `npm run demo` (production build + server on :3000).
3. Terminal 2: `npm run tunnel:fixed` (https://dispatch.newshiftai.com).
4. Laptop browser, two tabs:
   - https://dispatch.newshiftai.com/qr (full screen for the audience)
   - https://dispatch.newshiftai.com/board (press **Reset** right before you start)
5. Second screen or printed: the two demo photos
   - Samsung door (logo only): https://www.thedailymeal.com/img/gallery/4-common-complaints-customers-have-about-samsung-refrigerators/intro-1792696532.jpg
   - Sub-Zero rating plate (1999): https://static.tildacdn.net/tild3331-6334-4932-a435-316563616564/sub-zero-serial-and-.jpg
6. Phone: open https://dispatch.newshiftai.com/upload once so it's warm, then go back to the camera.

If the internet dies: play the backup video.

---

## Live demo script (~90 seconds)

**[QR on screen]**
> "Samsung and LG diagnose their own smart appliances and route you to their own techs. Independent repair shops get a phone call and a guess. We give every shop that ability, for any brand and any age, from one photo."

**[Scan QR → photo of the Samsung door → tap Fridge → note: "fridge warm, freezer fine, frost on back wall" → name, your real number, address "Mission Valley 92108" → submit]**
> "I'm the customer. One photo, one sentence."

**[Phone shows diagnosis in ~3s]**
> "It read the brand off the logo, figured out it's likely a defrost problem, and gave a price estimate. No model number is visible, so it doesn't invent one."

**[Switch to board]**
> "The shop sees the job instantly, with what to bring: defrost heater, thermostat, fan motor. So the tech fixes it on the first visit."
> "The AI already picked the tech: Mike. Samsung certified, covers Mission Valley, free at 1."

**[Phone: tap the Recommended time]**
> "The customer picks a time. Or taps 'talk to a person' if they'd rather."

**[Phone buzzes]**
> "Booked, and the text is already on my phone. No phone tag, no dispatcher."

**[Bonus, if time allows: board → + Add rule → "Never send Sub-Zero jobs to anyone but Mike" → Save → submit the Sub-Zero plate with address "800 Orange Ave, Coronado"]**
> "Every shop has rules. The owner types one in plain English…" *(job goes to Mike, reason says "Sub-Zero rule")* "…and dispatch follows it immediately. A 1999 Sub-Zero, by the way: any age."

**Any shop can sign up (30 seconds, strong closer before "Close")**
> "And this isn't built for one shop."
Open https://dispatch.newshiftai.com/setup → **Fill example** → Next through the steps (company, pricing, techs with brands, areas and time slots, rules, plan) → **Start free trial**.
> "Any repair shop enters its techs, hours and pricing, and gets its own customer link, QR code and dispatch board in two minutes."
Open their board link to show it's a separate, empty board with their own techs.

**Optional 15-second extras (pick one if judges look engaged)**
- Any language: submit a note in Korean or Spanish ("냉장고가 시원하지 않아요"). The whole phone screen and the SMS come back in that language; the board shows a 🌎 badge but keeps the shop's view in English.
- Safety: submit "I smell gas near my stove". The phone shows "Do this right now" steps; the board pins a red EMERGENCY card on top.
- Point at the header: photo → booked time, phone calls needed: 0.

**Close**
> "I already run this kind of dispatch for two real repair companies. Today we made it work from a single photo. That's NewShift."

---

## Backup video: 60 seconds, shot list

Record the screen (Win + Alt + R with Xbox Game Bar, or OBS) with your phone mirrored or filmed next to it.

| Time | Show | Voiceover |
|---|---|---|
| 0–8s | QR page | "Independent repair shops can't diagnose like Samsung or LG can. Now they can, from one photo." |
| 8–20s | Phone: photo of the Samsung fridge, tap Fridge, short note, submit | "The customer snaps a photo and writes one line." |
| 20–30s | Phone diagnosis card | "In about four seconds: brand, likely issue, urgency and a price estimate." |
| 30–42s | Board: new job, Bring parts, AI recommendation with reason | "The shop gets the job with the parts to bring, and the AI picks the right tech and says why." |
| 42–52s | Phone: tap a time, then the booked screen; the SMS arriving | "The customer picks a time, and the confirmation text arrives." |
| 52–60s | Board with a rule added, Sub-Zero job going to Mike | "Plain-English rules control dispatch. Any brand, any age. NewShift." |

---

## Submission text

**Name:** NewShift Dispatch

**One-liner:** Photo-to-booked-repair for independent appliance shops: AI diagnoses any brand from one photo, picks the right technician, and texts the customer.

**Description:**
Samsung and LG can diagnose their own smart appliances and send their own technicians. The independent repair shops that fix everything else, every brand and every age, still run on phone calls and guesswork. NewShift Dispatch gives them that diagnostic ability.

A customer scans a QR code or taps a link, snaps a photo of the broken appliance or its model sticker, and adds one sentence. In a few seconds the AI identifies the brand, the model when it's readable, the appliance type, the likely fault and urgency. It also writes a tech brief: which parts to bring, what to check first, and the expected repair time, so the job gets fixed on the first visit. The customer sees an estimated price range before booking. Customers can write in any language, and the diagnosis, booking screen and SMS come back in their language. Safety risks such as a gas smell, sparks or flooding trigger immediate safety steps on the customer's phone and a red priority card for the shop.

The job lands on the shop's live dispatch board. The AI picks the best technician based on brand certification, skills, service area, and availability, and explains its choice in one line. The customer picks one of the offered times (or asks for a call from a person), and an SMS confirmation goes out automatically. Shop owners can steer dispatch with plain-English rules such as "Never send Sub-Zero jobs to anyone but Mike", and they apply to the next job right away.

Any repair shop can sign up in about two minutes: enter the company, pricing, technicians (brands, certifications, appliances, service areas, open time slots) and rules, pick a plan, and get its own customer link, printable QR code, website button and dispatch board.

Built by the founder of NewShift AI, who already runs AI dispatch for two US appliance repair companies.

**How it's built:**
- Next.js (App Router) + TypeScript + Tailwind, built in one day
- Claude Sonnet 5.5 (vision) for photo diagnosis, and again for technician dispatch, using structured JSON output validated with Zod. Each call retries once, then falls back to rules-based diagnosis or scoring so the demo never breaks
- Dispatch prompt combines the diagnosis, technician skills, certifications, service areas, open time windows, and owner rules; the tech_id and window are checked against real data
- Twilio for SMS (with an on-screen preview fallback)
- In-memory job store, live board updated by polling every 2 seconds
- Served from a laptop through a Cloudflare Tunnel at dispatch.newshiftai.com, with a QR code page for the audience
