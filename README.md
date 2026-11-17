# ALAB Heat Index Checker
**ALAB = Awareness and Localized Alerts for Heat**

An installable web app (PWA) that monitors heat live and recommends the 4H learning continuity level (Hayo, Hinay, Hinga, Hinto) under **DepEd Memorandum No. 064, s. 2026**, *Anticipatory Action, Preparedness, and Protective Measures for the 2026–2027 Super El Niño*.

Works on any phone, tablet or laptop (Android, iPhone/iPad, Windows, Mac, Chromebook). No extra equipment needed.

## Triangulated decision (default)
ALAB combines three sources into one 4H decision:

| Source | What it is | Weight |
|---|---|---|
| Classroom thermometer | The Annex B reading you enter | 60%, fading after 30 min, gone at 2 h |
| Weather stations | Measured readings from up to 3 nearby airport stations | 30%, by distance and report age |
| Weather models | Median of up to 7 forecasts at your location | 20%, less if the models disagree |

**When no weather station is within 120 km**, ALAB switches the station slot automatically:
1. **PAGASA forecast:** the heat index for the current hour from PAGASA's iHeatMAP, typed in by the user (valid 90 min). PAGASA's files can't be read directly by other websites, so ALAB can't fetch them by itself.
2. **Otherwise, ECMWF alone:** the model PAGASA's iHeatMAP is built on, checked against the other models (excluding ECMWF), so the check stays independent.

It runs **two independent checks**, so agreement is never circular:
1. **Outdoor check:** the station, PAGASA or ECMWF value vs the other models (both unadjusted). They must be on the same 4H level and within 3 °C to count as agreeing.
2. **Classroom check:** the thermometer vs a classroom prediction built from the outdoor data plus the room offset learned from *earlier* readings today. A gap of more than 3 °C, or a different 4H level, is flagged.

**Safety rules:** the decision is never below a fresh classroom thermometer reading (the memo's basis, Sec. 6.1 / Annex B). If the room reads hotter than predicted, the thermometer value is used. With no reading today, ALAB says plainly that it is showing outdoor heat. "Outdoor only" mode is still one tap away.

## Accuracy
1. **Up to 7 forecast models** at your exact position, each read from its own 15-minute forecast for the current minute (ECMWF, which PAGASA's heat index map uses, plus GFS, ICON, JMA, GEM, UKMO and Open-Meteo best match). ALAB uses their **median**, so one bad model can't skew it. If a model is unavailable, it falls back to 5 models, then to 1.
2. **Corrected against up to 3 nearby weather stations** (28 built-in Philippine airport stations within 120 km: live reports via the ALAB relay, or the Iowa Environmental Mesonet as a delayed fallback). Each station's model error is weighted by distance and by how recent the reading is. Implausible readings (more than 6 °C off) are rejected.
3. **Interpolated to the current minute** between updates. The station correction fades over the hours of the forecast.
4. **Classroom calibration:** each thermometer reading records how much hotter or more humid the room is than outside. The latest readings for that room (newest weighted most) drive a live classroom estimate for the rest of the day.
5. **Accuracy meter** (High/Medium/Low), with a tap-through breakdown of every model and station.

Heat index uses the NOAA/NWS equation behind the PAGASA chart. Thermometer readings are rounded per Annex B. Results can differ from the printed chart by about ±1 °C, so values near a threshold are flagged.
4H: Hayo <27 °C · Hinay 27–32 °C · Hinga 33–41 °C · Hinto ≥42 °C.

## Live & accuracy indicator
A badge at the top of the reading shows whether you can trust it right now (tap it for the full breakdown):
| Badge | Meaning |
|---|---|
| 🟢 **LIVE · ✓ Verified accurate** | Online, data under 15 min old, models agree and nearby weather stations confirm them |
| 🔵 **LIVE · Estimated** | Online and fresh, but medium or low accuracy (models disagree, no nearby station, or approximate location) |
| 🟢 **MEASURED** | The verdict comes from a classroom thermometer reading entered in the last 90 min |
| 🟠 **UPDATING / STALE** | Fetching now, or the last update is over 15 min old |
| ⚫ **OFFLINE** | No connection; showing the last data received and how old it is |

It also counts down to the next automatic update.

## Device optimization
- **Location:** one precise GPS fix, then low-power tracking. GPS stops when the app is hidden (saves battery). Falls back to Wi-Fi or network location on laptops, or a city you pick.
- **Data:** no updates while the app is hidden. A battery and data saver mode (turns on automatically when the phone's Data Saver is on) refreshes every 20 min with fewer models. Requests time out and retry on slow connections.
- **Fast and offline:** the whole app is about 0.4 MB and opens instantly from cache. It works offline with the last data.
- **Screens:** from small 320 px phones to laptops (two-column) and wall displays, with a keep-screen-on option. Light and dark mode follow the device.
- **Alerts:** vibration and a notification when the level goes up. It installs to the home screen or desktop.

## Put it online (free, about 5 minutes)
Install needs HTTPS hosting:
- **Netlify Drop:** go to https://app.netlify.com/drop and drag this folder onto the page. You'll get a link.
- **GitHub Pages:** upload the files to a repository, then go to Settings → Pages → Deploy from branch (main / root).

## Install on a device
- **Android (Chrome/Samsung Internet):** Settings → Install, or browser menu → *Install app*.
- **iPhone/iPad (Safari):** Share → *Add to Home Screen*.
- **Windows/Mac (Chrome/Edge):** click the install icon in the address bar.

## Daily use
1. Open ALAB → **Start live monitoring** → allow location.
2. At 8:00, 12:00 and 2:00, tap **Enter reading** and type the classroom thermometer values. This logs the Annex B reading and calibrates the **Classroom** estimate.
3. Each day, open **Log → Copy today's summary** and submit it through the DRRMS link (bit.ly/PHExtremeHeat).

**Decision aid only.** The school head decides the level and coordinates with the SDS for school-level suspension (Sec. 5.2.2). Extreme heat does not automatically result in class suspension (par. 6).

Data: Open-Meteo.com (CC BY 4.0), Iowa Environmental Mesonet, BigDataCloud. Everything is stored on the device only.

## Troubleshooting: "cannot get data"
1. **Open ALAB from its https link.** Double-clicking `index.html`, or opening it inside a file preview, blocks live data and location. ALAB shows a warning when this happens.
2. Tap the **accuracy bar → Test connections** to see which source fails and why (offline, timed out, or blocked).
3. If the school Wi-Fi blocks the sources, try mobile data, or ask IT to allow: `api.open-meteo.com`, `geocoding-api.open-meteo.com`, `mesonet.agron.iastate.edu`, `api.bigdatacloud.net`.
4. If location is denied, ALAB uses your approximate network location. Allow location in the browser's site settings, or pick your city in Settings.

## ALAB relay (optional, recommended): live airport reports + automatic PAGASA forecast
Two important sources can't be read directly by other websites: **live airport weather reports** (METAR, from NOAA's aviationweather.gov) and **PAGASA's iHeatMAP**. This free relay (`pagasa-relay/worker.js`) fetches only those, caches them (5 min for reports, 30 min for maps, so the sources get very few requests), and lets ALAB read them.

Why it matters: without the relay, ALAB falls back to the Iowa Environmental Mesonet. Its Philippine airport data was about **5 hours late** when tested, and it limits requests per network, so it is rarely usable. With the relay, the station check uses reports that are minutes old.

**Setup (about 10 minutes, free Cloudflare account):**
1. Put ALAB online first (Netlify Drop or GitHub Pages; see above) and note its https link.
2. Sign up at https://dash.cloudflare.com/sign-up and verify your email.
3. In the dashboard: **Workers & Pages → Create → Create Worker** (start from "Hello World"). Name it `alab-relay`, then **Deploy**.
4. Click **Edit code**, delete everything, paste the contents of `pagasa-relay/worker.js`, then **Deploy** again.
   Optional: change `ALLOWED_ORIGIN = "*"` to your ALAB link (e.g. `"https://alab-sdo.netlify.app"`) so only your app can use it.
5. Copy the Worker link (`https://alab-relay.<your-subdomain>.workers.dev`). Open it with `?ping=1` at the end. You should see `{"ok":true,...}`.
6. In ALAB: **Settings → PAGASA relay link → paste → Test → ✅ "live airport reports + PAGASA iHeatMAP" → Done.**
   (If you already set up the first relay, paste the new `worker.js` over it and Deploy. The Test button warns you when the relay is the older version.)

**What to expect:** iHeatMAP is published mainly during the hot season (about March–June). Off-season, ALAB shows "PAGASA has not published iHeatMAP for this hour" and keeps using ECMWF automatically. Check the status anytime under accuracy bar → **Data sources → PAGASA iHeatMAP (relay)**. The free Cloudflare plan allows 100,000 requests a day, far more than a school division needs.

Data: DOST-PAGASA iHeatMAP (uses ECMWF data). The relay only passes PAGASA's public files through unchanged, with attribution. Map reading: geotiff.js (MIT license, `lib/`).
