# SPXact — Definition of Done (DoD)

**"Done" is not "the code runs." Done is "we can demo it live without fear AND defend it against every judge question."** This doc is the final gate. If a box is unchecked, it is not done.

The hackathon is scored **40% reasoning & analysis · 40% business case & practicality · 20% presentation & Q&A** (participant deck). The app exists to make the *practical idea* real and the *presentation* unforgettable. Every DoD item below serves that.

---

## 0. Global principles
- [ ] Every claim we make on stage is backed by either the data, a working part of the demo, or a defensible Q&A answer.
- [ ] Nothing in the demo can crash the pitch: a **`/demo/reset`** button restores a clean state in < 2 seconds.
- [ ] The **privacy invariant holds**: the rider client never receives customer coordinates (proven by `test_privacy.py`, not just hidden in UI).
- [ ] The **core is rule-based and auditable**; no AI is in the verdict path (matches the rubric's "AI only where it adds value").

---

## 1. Backend DoD

### 1.1 Verdict Engine (the graded heart)
- [ ] All **8 states** reachable and correct (`PENDING`, `ATTEMPT_WINDOW_OPEN`, `DELIVERED_VERIFIED`, `DELIVERED_UNVERIFIED`, `FAILED_VERIFIED`, `FAILED_UNVERIFIED`, `BLOCKED_CONTRADICTION`, `FLAGGED_SUSPICIOUS`).
- [ ] `compute_confidence()` matches the weight table (PRD §6.1); clamps to [0,100]; negatives dominate.
- [ ] Decision tree matches PRD §6.3 exactly.
- [ ] `test_verdict.py` passes with ≥ 1 case per state + 3 edge combos (spoof+present, silent+dwell, no-dwell).
- [ ] Verdict computes in < 500ms.

### 1.2 API + realtime
- [ ] All REST endpoints in ARCHITECTURE §5 return correct shapes.
- [ ] WebSocket hub delivers `signal_update`, `verdict`, `handshake_confirmed`, `ledger_append`, `fraud_event` to the correct channels in < 1s.
- [ ] `rider_nearby` message contains **no coordinates** (only `{nearby:true}`).

### 1.3 Data + integrity
- [ ] `seed.py` loads the exact demo parcels (Act 1 present-customer, Act 2 clean, Act 3 absent-customer) + ~5 historical fraud events.
- [ ] Trust Ledger hash chain verifies; tampering with any past entry is detectable.
- [ ] `LocationPing` rows are deleted after a verdict is finalized (retention rule works).

---

## 2. Frontend DoD (three panels)

### 2.1 Rider Phone
- [ ] Map with the 90m geofence circle; rider marker is draggable (demo) or moves on ping.
- [ ] "Start Attempt", dwell timer (with a demo fast-forward), and Delivered / Not Available / Access Blocked buttons.
- [ ] On `BLOCKED_CONTRADICTION` / `FLAGGED_SUSPICIOUS`: button tap is rejected with a clear red message.
- [ ] OTP entry field for delivered.

### 2.2 Customer Phone
- [ ] Receives the out-for-delivery push; tapping shares one-shot location (opt-in).
- [ ] Shows "Your rider is nearby" (never a rider map pin).
- [ ] Displays the OTP; participates in the handshake.
- [ ] Act 3: shows the auto-reschedule window picker on `FAILED_UNVERIFIED`.

### 2.3 SPX Ops Dashboard
- [ ] **Confidence dial** animates as each signal lands (visibly assembles 0→~95).
- [ ] **Trust Ledger** live-scrolls finalized verdicts with truncated hashes.
- [ ] **Fraud Heatmap** drops pulsing markers; "Simulate week" makes clusters bloom.
- [ ] Live verdict feed shows state + color per attempt.

---

## 3. The three "wow" moments DoD (non-negotiable)
- [ ] **Act 1 – Live block:** rider's fake "Not Available" is rejected on screen within 1s, with the contradiction reason. Reliable across 5 consecutive runs.
- [ ] **Act 2 – Handshake:** bringing the two clients together triggers a **synchronized** green flash + sound + `navigator.vibrate` on both, sets `ble_handshake`, and pushes confidence to ~95. Works on two real phones on the same LAN.
- [ ] **Act 3 – Honest failure:** genuine dwell + silent customer → amber `FAILED_VERIFIED/UNVERIFIED` + proof photo logged + reschedule offered.
- [ ] Confidence dial, ledger, and heatmap are all visibly updating during the demo.

---

## 4. Demo-readiness DoD
- [ ] The full three-act script (MVP_SPEC §5) runs end-to-end in < 2 minutes without a stumble.
- [ ] `/demo/reset` tested between runs.
- [ ] Rehearsed on the actual presentation hardware (projector + two phones).
- [ ] Fallback recording (screen capture of a clean run) exists in case live networking fails.
- [ ] Both presenters can drive the demo (rubric requires both members speak).

---

## 5. Rubric-alignment DoD (this is how we win, not just ship)

### 5.1 The case's four required answers are explicit on the 3 slides
- [ ] **(1) What we prioritize:** the "customer not available" failure bucket (27.5% of failures) and the hubs where failure/redelivery concentrate (e.g., HUB_E_WEST) — a *segmented*, not blanket, target.
- [ ] **(2) Recommendation:** SPXact proof-of-presence verification (rules-first), not more capacity.
- [ ] **(3) Why it creates value:** marginal economics — event-driven, no new hardware; converts fake/unverified failed attempts into first-attempt successes; each avoided redelivery ₱54, failed attempt ₱72, complaint ₱95.
- [ ] **(4) How to test it:** the A/B natural experiment with a primary metric (FADR), a break-even, and an explicit **stop rule**.

### 5.2 The six judge signals are demonstrably present
- [ ] **Structured problem-solving:** we narrowed to one operating issue and said what we're *not* solving.
- [ ] **Data reasoning:** we distinguish *association* (historical "not available" tags) from *proven impact* (measured by the A/B), and we state the AUC≈0.5 finding to justify verification over prediction.
- [ ] **Business/ROI:** incremental benefit vs incremental cost; no unsupported uplift baked in.
- [ ] **Practical AI judgment:** core is deliberately rule-based; AI reserved for two named Phase-2 uses.
- [ ] **Measurement thinking:** primary outcome + comparison + break-even + guardrail + stop condition all stated.
- [ ] **Communication & defense:** the three-act demo + rehearsed answers.

### 5.3 Standardized Q&A answers are locked (one sentence each)
- [ ] **Structure — only one part?** → The verdict engine; everything else upgrades proof quality.
- [ ] **AI — why AI not simpler?** → It mostly *isn't* AI, deliberately; the verdict is deterministic and auditable; AI only for Phase-2 spoof anomaly detection.
- [ ] **Data — weakest evidence?** → The fake-attempt rate; history can't prove it, so the A/B measures it.
- [ ] **Measurement — what stops you?** → No drop in "not available" tags and no complaint/redelivery reduction in the protected arm within 6 weeks.
- [ ] **Business — break-even?** → Event-driven, no hardware; a few points of the 27.5% bucket being fake covers it.
- [ ] **Honesty — most-likely-wrong assumption?** → That a meaningful share of not-available tags are fake; if wrong, the A/B shows no gap and we halt.
- [ ] Every limitation in **PRD §10 (R1–R12)** has a one-line answer a presenter can give without notes.

---

## 6. Quality gates
- [ ] `pytest` green (verdict, confidence, privacy).
- [ ] No console errors in the browser during a demo run.
- [ ] Cold start to running demo in < 3 minutes from `README`.
- [ ] All dependencies confirmed free/open-source (ARCHITECTURE §2); no paid API keys required for the demo path.

---

## 7. Explicitly OUT of scope for "done" (say so, don't build)
- Real BLE, Play Integrity/App Attest, sensor fusion (defended verbally).
- SMS OTP / feature-phone tier (defended).
- Native app store build, nationwide anti-spoof hardening.
- Any ML model in the verdict path (by design).

---

## 8. The single sentence that means we're done
> We can walk on stage, block a fake failed-delivery live, make two phones physically shake hands, show an honest failure that protects the rider, point to a tamper-evident ledger and a fraud heatmap — and then answer all six standardized questions in one breath each, backed by the data and an A/B test with a stop rule.

If that sentence is true and demonstrated, **SPXact is done.**
