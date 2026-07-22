# SPXact — MVP Specification & One-Day Build Plan

**Read `01_PRD.md` first for WHY. This doc is WHAT to build in one day and in what order.**

**Golden rule for the hackathon:** the demo must feel *real and live*, not the whole product must *be* real. We split every feature into three tiers:

- 🟢 **BUILD** — real, working code. This is the graded core.
- 🟡 **SIMULATE** — visually real on stage, mechanism faked (e.g., BLE over WebSocket). The audience cannot tell.
- ⚪ **DEFEND** — not built; we *explain* it in Q&A as the known answer.

Judges do not expect BLE attestation implemented in a day. They expect you to (a) show a live, convincing core, and (b) *know* the rest cold.

---

## 1. MVP scope

A single web app that renders **three synchronized views** driven by **one real backend** with the **real Verdict Engine**:

1. **Rider Phone** (mobile-framed panel): map, "Start Attempt", dwell timer, Delivered / Not Available / Access Blocked buttons.
2. **Customer Phone** (mobile-framed panel): "Out for delivery" push, "Share location to enable protection", "Your rider is nearby" ping, OTP display, handshake screen.
3. **SPX Ops Dashboard**: live verdict feed, animated **confidence dial** for the active attempt, **Trust Ledger** stream, **Fraud Heatmap**.

All three run in the browser (great for projector demo) and talk to the backend over **WebSocket** so state is synchronized live across panels. On stage you can also open the Rider and Customer views on **two actual phones** for the physical handshake moment.

---

## 2. Feature list with tiers & acceptance

### Core verdict flow — 🟢 BUILD
| Feature | Acceptance |
|---|---|
| Out-for-delivery trigger + customer push | Clicking "Dispatch" flips parcel to OFD and the Customer panel shows a tappable push. |
| One-shot customer location (opt-in) | Customer taps push → panel reports a location; server marks `customer_signal_present`. |
| Rider location stream + geofence entry | Rider marker moved into 90m radius → `ATTEMPT_WINDOW_OPEN` fires automatically. |
| Dwell timer | Visible countdown; at ≥180s `dwell_satisfied=true` (demo: allow a "fast-forward" to 180s). |
| Proximity match (hidden) | Server computes rider↔customer distance; **customer coords never sent to rider panel**; both see only a boolean "nearby". |
| **Verdict Engine** (exact logic from PRD §6) | Given signals, returns correct state + confidence for all 8 states. Unit-tested. |
| **Live block of contradiction** | Rider taps "Not Available" while customer co-located → `BLOCKED_CONTRADICTION`, red UI, tap rejected. |
| OTP delivery proof | Customer panel shows a 4-digit OTP; rider enters it → `DELIVERED_VERIFIED`. |

### Anti-spoofing — 🟢 BUILD (one visible) / ⚪ DEFEND (rest)
| Feature | Tier | Acceptance |
|---|---|---|
| Mock-location flag → SUSPICIOUS | 🟢 BUILD | A "simulate spoof" toggle sets `is_mock=true`; any close attempt → `FLAGGED_SUSPICIOUS`. |
| Teleport / impossible speed check | 🟢 BUILD (server) | Two pings far apart in <2s → `teleport=true` penalty applied. |
| Play Integrity / App Attest | ⚪ DEFEND | Explain hardware attestation verbally. |
| Sensor fusion (accel/gyro) | ⚪ DEFEND | Explain flat-accelerometer-during-drive detection verbally. |

### The BLE handshake (the hero) — 🟡 SIMULATE
| Feature | Acceptance |
|---|---|
| "Bring phones together" → handshake | A **"Handshake" button** (or auto-trigger when simulated GPS < 10m) exchanges a signed token over WebSocket. Both panels flash green + play a sound + vibrate (`navigator.vibrate`) simultaneously; `ble_handshake=true`, +35 confidence. |

> On stage this reads as real BLE. In production it *is* BLE (`react-native-ble-plx` / `flutter_reactive_ble`). The visual is identical.

### Wow layer — 🟢 BUILD (visual) 
| Feature | Acceptance |
|---|---|
| **Animated confidence dial** | 0–100 gauge that animates as each signal lands (GPS +15, dwell +20, BLE +35, OTP +25…), color green/amber/red by threshold. |
| **Trust Ledger feed** | Every finalized verdict appends a hash-chained entry; dashboard shows a live-scrolling list with truncated hashes. |
| **Fraud Heatmap** | Blocked/suspicious attempts drop pulsing markers on a MapLibre map; a "Simulate week" button replays seeded events so clusters bloom. |
| **Auto-reschedule (Act 3)** | On `FAILED_UNVERIFIED`, customer panel offers pickable windows; selection logs a reschedule. |

### Fallbacks — ⚪ DEFEND
SMS OTP tier, feature-phone path, COD handling — explained, not built.

---

## 3. Seed data

Use rows from `parcel_history.csv` to seed 6–10 parcels across the hubs (HUB_C_SOUTH, HUB_E_WEST, etc.) with realistic Metro Manila coordinates. Include:
- 1 "clean delivery" parcel (for Act 2).
- 1 "customer present but rider lies" parcel (for Act 1).
- 1 "customer genuinely absent" parcel (for Act 3).
- ~5 historical "blocked/suspicious" events pre-seeded for the heatmap "Simulate week".

Seed script: `backend/seed.py` (see architecture). Coordinates can be synthetic but plausible (Las Piñas / Parañaque / Metro Manila lat-lng around 14.4–14.6, 120.9–121.0).

---

## 4. One-day build timeline (≈9 focused hours)

| Block | Hours | Tasks |
|---|---|---|
| **Setup** | 0.0–0.5 | Repo skeleton, `docker-compose` (or SQLite fast-path), FastAPI + Vite scaffolds running, WebSocket hello-world across a panel. |
| **Data + engine** | 0.5–2.5 | SQLModel models, seed script, **Verdict Engine module with unit tests** (all 8 states pass). This is the graded heart — do it early. |
| **Backend API + WS** | 2.5–4.0 | REST endpoints, WebSocket hub, location ingest, proximity calc (hidden), confidence computation, Trust Ledger hashing. |
| **Three panels** | 4.0–6.5 | Rider / Customer / Ops React panels; map (MapLibre + OSM); drag rider marker; dwell timer; buttons wired to API. |
| **Wow layer** | 6.5–8.0 | Confidence dial animation (Framer Motion), handshake flash+sound+haptic, ledger feed, fraud heatmap + "Simulate week". |
| **Demo polish** | 8.0–9.0 | Rehearse the three acts, seed the exact demo parcels, add a "Reset demo" button, test on two real phones. |

**If behind schedule, cut in this order:** Fraud Heatmap → Auto-reschedule → Teleport check. **Never cut:** Verdict Engine, live contradiction block, handshake moment, confidence dial. Those four *are* the demo.

---

## 5. Demo script (rehearse verbatim)

**Opening (10s):** *"A tracking app tells you where the rider is. SPXact proves the rider and the customer were in the same place at the same time — and makes lying about it impossible."*

**Act 1 — The lie (20s):** Dispatch the "customer-present" parcel. Drag rider into geofence. Customer taps push (present). Rider taps **Not Available** → screen goes **red, blocked**: *"Customer device detected nearby — attempt rejected."* Pause. *"That fake failed-delivery just got stopped in real time."*

**Act 2 — The handshake (25s):** Dispatch the "clean" parcel. Rider arrives. Bring the two phones together → **green flash + chime + buzz, "PRESENCE CONFIRMED".** Rider enters the OTP the customer reads aloud → **DELIVERED_VERIFIED**, confidence dial swings to ~95. *"Two devices physically shook hands. This is proof you can't fake from across town."*

**Act 3 — The honest failure (25s):** Dispatch the "absent-customer" parcel. Rider dwells (fast-forward timer). No customer signal. Rider taps Not Available → **amber: "Verified attempt — customer unreachable."** Proof photo logs. Customer later gets an **auto-reschedule** prompt. *"It's not a cop. When the rider genuinely tried, it protects them — and fixes the delivery."*

**Close (15s):** Point to the **Trust Ledger** scrolling and the **Fraud Heatmap** blooming. *"Day one it's a feature. Day seven it's a fraud dataset SPX never had — with zero new hardware and no AI black box."*

**Total: under 2 minutes of live demo**, leaving time for the business case and Q&A.

---

## 6. What "good" looks like on stage
- Nothing crashes; "Reset demo" returns to a clean state instantly.
- The **block** and the **handshake** both land within 1 second of the action.
- The confidence dial visibly *assembles* from signals (this is the sophistication signal).
- Every Q&A limitation in PRD §10 has a one-sentence answer ready.
