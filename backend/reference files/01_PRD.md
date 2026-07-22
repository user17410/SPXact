# SPXact — Product Requirements Document (PRD)

> **One-liner:** A tracking app tells you *where* a rider is. **SPXact proves the rider and the customer were in the same place at the same time — and makes lying about a delivery attempt impossible.**

**Product name:** SPXact (SPX + "exact" — exact location, exact truth)
**Owner:** SPX (Shopee Express) — Last-Mile Integrity
**Doc status:** v1.0 — hackathon MVP spec (context file for AI code generation)
**Scope of this doc:** WHAT we are building and WHY. Implementation detail lives in `03_ARCHITECTURE.md`. Build scope lives in `02_MVP_SPEC.md`. Completion bar lives in `04_DEFINITION_OF_DONE.md`.

---

## 1. Problem

In last-mile delivery, riders can mark a parcel as **"Customer Not Available"** (a failed attempt) *without ever genuinely attempting delivery* — driving past, or not going at all. This is a well-known industry fraud/laziness pattern. It is invisible to the operator because the only evidence is the rider's own tap.

**Evidence from the case data (`parcel_history.csv`, 11,999 parcels):**

| Signal | Value | Why it matters |
|---|---|---|
| "Customer not available" | **27.5% of all failures** (the single largest failure reason) | The bucket most vulnerable to fake attempts |
| Redelivery rate | **21.7% of parcels** | Every fake attempt triggers a paid redelivery |
| Cost per redelivery | ₱54 | Direct wasted cost |
| Cost per failed attempt | ₱72 | Direct wasted cost |
| Cost per complaint | ₱95 | Customer trust + support cost |

We **cannot** prove from historical data how many "not available" tags are fake — the data has no fraud label. **This is our most important honesty point and it defines our measurement plan (§9).**

**The deeper insight (from case analysis):** individual parcel *outcomes* are unpredictable from parcel attributes (failure-prediction AUC ≈ 0.5). So the answer is **not** a prediction model. It is **verification** — replacing an unprovable self-reported tap with a multi-signal, tamper-evident proof of what actually happened.

---

## 2. Vision & positioning

SPXact is a **two-sided, confidence-scored proof-of-interaction layer**, not a rider-surveillance tool. Every delivery event (success *or* failure) carries **proof**:

- It **blocks** a rider from falsely marking "not available" when the customer was demonstrably present.
- It **clears** a rider when a customer falsely claims "I never received it."
- It **never punishes silence** — missing signals downgrade *confidence*, they never assign *guilt*.

This two-sided framing is the product's spine. It is what makes riders *want* it (it is their alibi) and what makes it survive privacy scrutiny.

---

## 3. Goals & non-goals

### Goals
1. Produce a **trustworthy, graded verdict** for every delivery attempt (see §6).
2. **Block fraudulent "not available" tags in real time** when contradicted by evidence.
3. **Protect riders** from false "never delivered" claims with a verifiable receipt.
4. Preserve customer privacy — **the rider never sees the customer's coordinates.**
5. Be **fully open-source** and **demoable in one day** with a strong live "wow" moment.

### Non-goals (explicitly out of scope for MVP)
- Route optimization, ETA prediction, or demand forecasting.
- Predicting *which* parcels will fail (we verify, we do not predict).
- A production-grade native mobile app store release.
- Full nationwide anti-spoofing hardening (we design for it; we don't ship all of it).

---

## 4. Personas

- **Rider (Kuya/Ate rider):** Wants to close deliveries fast and be protected from false blame. Android phone, may be a contractor, sensitive to feeling "policed."
- **Customer (Buyer):** Wants their parcel and a refund guarantee if a delivery is falsely marked failed. Opted into "Delivery Protection."
- **SPX Ops (Hub lead / Integrity team):** Wants a live, auditable feed of verified events and a way to catch systematic fraud.

---

## 5. Functional requirements

### 5.1 Consent & activation
- **FR-1:** At checkout, the customer sees an **opt-in** toggle: *"Turn on Delivery Protection — get an instant review if a delivery is falsely marked failed."* Consent is **specific and purpose-bound** (PH Data Privacy Act 2012 compliant). Location is **NOT** requested at checkout.
- **FR-2:** When parcel status flips to **"Out for Delivery,"** the customer receives a push notification. Tapping it triggers a **just-in-time, one-shot foreground location** request (not continuous tracking).

### 5.2 The delivery-attempt lifecycle
- **FR-3:** Rider location streams to the server while on-route (already standard in SPX rider app).
- **FR-4:** When the rider enters the parcel's **geofence** (radius default 90m), an **Attempt Window** opens and a dwell timer starts.
- **FR-5:** The rider taps **"Start Attempt"**, which fires a "Rider is here" ping to the customer (customer sees *"Your rider is nearby"* — **never** the rider's exact coordinates).
- **FR-6:** The customer, if present and responsive, is confirmed **co-located** via (a) shared one-shot location within proximity, and/or (b) a **BLE handshake** between the two phones (strongest proof).
- **FR-7:** Rider may close the attempt as **Delivered**, **Customer Not Available**, or **Access Blocked**.
- **FR-8:** The **Verdict Engine** (§6) evaluates all signals and returns a **state + confidence score**, allowing, blocking, or flagging the requested outcome **in real time**.

### 5.3 Proof requirements
- **FR-9:** **Delivered** requires at least one strong handoff proof: **OTP** (customer reads a code) **OR** **BLE handshake**.
- **FR-10:** **Customer Not Available** is only permitted if there was a **genuine attempt** (geofence entry + dwell ≥ threshold) **and** no contradicting customer-presence signal.
- **FR-11:** **Access Blocked** (gate/lobby/security) requires a **timestamped photo** and is recorded as a *verified* failure distinct from "not available."

### 5.4 Integrity & audit
- **FR-12:** Every finalized verdict is written to a **tamper-evident Trust Ledger** (hash-chained; §Architecture).
- **FR-13:** Anti-spoofing signals (mock-location flag, impossible speed/teleport, attestation) are collected and folded into the confidence score.
- **FR-14:** SPX Ops dashboard shows a **live feed** of verified events and a **fraud heatmap** of blocked/suspicious attempts.

### 5.5 Graceful degradation (critical)
- **FR-15:** If the customer does not respond / has no app / no signal → outcome is allowed but labeled **UNVERIFIED**, never "guilty."
- **FR-16:** For customers with no smartphone (COD/rural/feature phone) → fall back to **SMS OTP** as the minimum proof tier.

---

## 6. The Verdict Engine (product logic — MUST be implemented exactly)

**Design principle:** deterministic, auditable rules. A rider accused of a fake attempt deserves a rule they can *see*, not a black box.

### 6.1 Confidence score (0–100, additive, clamp to [0,100])

**Positive signals**
| Signal | Points |
|---|---|
| Geofence entered | +15 |
| Dwell satisfied (≥ 180s inside geofence) | +20 |
| BLE handshake success | +35 |
| Customer presence confirmed (co-located during window) | +20 |
| OTP verified | +25 |
| Device attestation pass (Play Integrity / App Attest) | +5 |
| Good GPS accuracy (< 50m) | +5 |

**Negative signals**
| Signal | Points |
|---|---|
| Mock location detected | −60 |
| Teleport / impossible speed | −40 |
| No geofence entry (never got near) | −30 |
| Attestation fail | −20 |

### 6.2 Verdict states (enum)

| State | Trigger | Effect |
|---|---|---|
| `PENDING` | Out for delivery, no attempt yet | — |
| `ATTEMPT_WINDOW_OPEN` | Rider entered geofence, dwell timer running | Customer gets "rider nearby" |
| `DELIVERED_VERIFIED` | Rider marks delivered **and** (BLE or OTP) **and** confidence ≥ 70 | ✅ Success, ledgered |
| `DELIVERED_UNVERIFIED` | Delivered but weak proof | ⚠️ Allowed, flagged for review |
| `FAILED_VERIFIED` | Dwell satisfied, no contradiction, customer confirmed away OR access-blocked-with-photo | ✅ Legitimate failure |
| `FAILED_UNVERIFIED` | Dwell satisfied but **no customer signal at all** | ⚠️ Allowed, labeled (customer silent) |
| `BLOCKED_CONTRADICTION` | Rider marks "not available" but **customer presence confirmed** | ❌ Blocked live — fraud caught |
| `FLAGGED_SUSPICIOUS` | Mock location / teleport **OR** no genuine attempt (no dwell) | ❌ Blocked, routed to human review |

### 6.3 Decision tree (pseudocode)

```
on close_attempt(outcome, signals):
    conf = compute_confidence(signals)

    if outcome == DELIVERED:
        if (signals.ble_handshake or signals.otp_verified) and conf >= 70:
            return DELIVERED_VERIFIED
        else:
            return DELIVERED_UNVERIFIED   # allow but flag; prompt for OTP/photo

    if outcome in (NOT_AVAILABLE, ACCESS_BLOCKED):
        if signals.mock_location or signals.teleport:
            return FLAGGED_SUSPICIOUS
        if not signals.geofence_entered or signals.dwell_seconds < DWELL_MIN:
            return FLAGGED_SUSPICIOUS      # no genuine attempt
        if outcome == ACCESS_BLOCKED:
            if signals.photo: return FAILED_VERIFIED
            else: return DELIVERED_UNVERIFIED  # ask for photo
        # outcome == NOT_AVAILABLE, genuine attempt confirmed:
        if signals.customer_presence_confirmed:
            return BLOCKED_CONTRADICTION   # customer was here -> block the lie
        if signals.customer_signal_present and not signals.customer_presence_confirmed:
            return FAILED_VERIFIED         # customer confirmed elsewhere -> genuine
        return FAILED_UNVERIFIED           # customer silent -> allow, labeled
```

`DWELL_MIN = 180` seconds (configurable). Geofence radius default `90` meters (configurable per address density).

---

## 7. Why (mostly) NOT AI — deliberate and defensible

Per the case rubric, AI must add value over simpler methods, not be added for show. **The core verdict engine is intentionally rule-based** because:
- Integrity decisions must be **auditable and contestable** by riders.
- Geofence + dwell + proximity is **geospatial math**, not a learning problem.

**AI is reserved for exactly two Phase-2 uses, only once labeled data exists:**
1. **Behavioral spoofing detection** (Isolation Forest / anomaly model over movement + sensor patterns) — the arms-race reserve after simple flags are evaded.
2. **Rider-level fraud scoring** — the verdict engine's own labels (verified vs. suspicious) become training data to flag riders with *systematic* fake-attempt patterns.

**Q&A line:** *"The core needs no AI, and here's exactly the two places it would and wouldn't help."*

---

## 8. Non-functional requirements

- **Privacy (DPA 2012):** purpose-limited opt-in; **rider never sees customer coordinates**; raw location deleted after verdict computed (retention ≤ 24h); only the verdict + hashes persist.
- **Performance:** verdict computed < 500ms; real-time signals over WebSocket < 1s latency.
- **Resilience:** system produces a valid verdict when **only one side** participates.
- **Cost:** event-driven (one customer location event per delivery); no continuous customer tracking; no new hardware.
- **Open source:** every dependency free/open (see architecture).

---

## 9. Success metrics & measurement (A/B pilot)

**Primary metric:** First-Attempt Delivery Rate (FADR).
**Integrity metrics:** blocked-contradiction rate, suspicious rate, false-accusation rate (verified-attempts wrongly challenged).

**The natural experiment (this is the "weakest assumption" answer):**
> We cannot prove the fake-attempt rate from history. So we **randomize**: enable SPXact for 50% of deliveries. If fake attempts are real, the **"not available" rate should drop in the protected arm.** That gap **is** the fraud-rate estimate. **Stop rule:** if the protected arm shows no drop in "not available" tags *and* no complaint/redelivery reduction within 6 weeks, the hypothesis is wrong and we halt.

**Break-even:** event-driven build, no new hardware → even a few percentage points of the 27.5% not-available bucket being fake covers the cost.

---

## 10. Risks & mitigations (the Q&A defense table)

| # | Limitation | Mitigation (how we answer it) |
|---|---|---|
| R1 | Customer ignores popup / no permission | Asymmetric logic: silence → `UNVERIFIED`, never guilty. Works one-sided. |
| R2 | GPS error in condos/informal settlements (20–50m) | 90m geofence + fused location; **dwell is primary evidence**, not exact pin; confidence score, not coordinate check. |
| R3 | Rider near lobby/gate but can't reach unit | Distinct `ACCESS_BLOCKED` state + photo; not forced into "not available." |
| R4 | Presence ≠ effort (parks nearby, still lies) | Require an **action** during dwell (Start Attempt ping + photo); customer "rider here" ping makes a lie a contradiction. |
| R5 | Rider GPS spoofing | Defense in depth: `isMock()`/`isFromMockProvider()`, Play Integrity/App Attest, server teleport/speed checks, sensor fusion, **BLE handshake** (GPS-independent). |
| R6 | Fraud shifts to fake-*delivered* | Same proof applies to **Delivered** (OTP/BLE required). |
| R7 | Customer falsely claims "never got it" | OTP/BLE/photo trail clears the rider — two-sided. |
| R8 | No smartphone / COD / rural | SMS OTP fallback tier. |
| R9 | Rider morale / surveillance feel | Two-way framing (protects them), transparent deterministic rules, no black box. |
| R10 | Privacy / DPA | Opt-in, data minimization (hidden from driver), short retention. |
| R11 | Battery / scale | Event-driven; rider stream is sunk cost; one customer ping per delivery. |
| R12 | Can't prove fraud rate from history | A/B pilot is a natural experiment that measures it (§9). |

---

## 11. The demo narrative (three acts — the wow)

The emotional arc: **tension → satisfaction → respect.**

- **Act 1 — The lie:** Rider "arrives" but tries to tap *Customer Not Available* while the customer phone is present. **SPXact blocks it live** (red: *"Contradiction — customer device detected 4s ago"*). Fraud stopped on stage.
- **Act 2 — The handshake:** The two phones are brought together → synchronized **green flash + sound + haptic + "PRESENCE CONFIRMED ✓"**, token flashing between them. OTP read aloud → `DELIVERED_VERIFIED`.
- **Act 3 — The honest failure:** Rider dwells 3 min, customer genuinely absent → amber *"Verified attempt — customer unreachable,"* proof photo logged, **auto-reschedule** offered. Shows the system is *fair to the rider*.

Supporting wow: **animated confidence dial** (signals stack up: GPS +15, dwell +20, BLE +35…), **live Trust Ledger feed**, **fraud heatmap** that blooms over a simulated week from the CSV.

**Opening line:** *"A tracking app tells you where the rider is. SPXact proves the rider and the customer were in the same place at the same time — and makes lying about it impossible."*
