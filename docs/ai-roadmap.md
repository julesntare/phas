# PHAS — AI Roadmap

How AI can make PHAS more accurate, more accessible and cheaper to operate, without weakening the rule that made it credible: **every public claim is backed by verifiable evidence.**

---

## Ground rules for AI in PHAS

These apply to every feature below.

1. **AI never opens or closes an incident on its own.** The fusion engine ([worker/src/fusion.ts](../worker/src/fusion.ts)) stays deterministic and auditable. AI outputs can *adjust inputs* (e.g. which incident a report belongs to, whether a report is suspicious) and every such adjustment is logged.
2. **Numbers come from SQL, words come from the model.** Any AI-written text that contains a figure must be generated from a structured payload, and the figures are re-checked against that payload before publishing.
3. **Strip personal data before any model call.** Phone numbers, emails, national ID numbers and names are redacted from free text; coordinates are never sent — only district/sector.
4. **Human in the loop for anything public-facing and operator-voiced.** Operators approve AI-drafted updates; citizens’ reports are never rewritten in public.
5. **Graceful degradation.** If the AI provider is unavailable or over budget, PHAS behaves exactly as it does today.
6. **Audit trail.** Store model name, prompt version, input hash and output for every AI decision (new `ai_decisions` table), so any result can be explained if disputed.

---

## Tier 1 — High value, buildable now

### 1. Report triage & clustering *(recommended first build)*

**Problem today:** an `affected` report is attached to the most recent non-resolved incident for that platform ([web/src/app/api/reports/route.ts](../web/src/app/api/reports/route.ts), lines 112–121). If Irembo has a payment outage and someone reports that OTP SMS never arrives, both land in the same incident. `free_text` is stored but never read.

**What AI does:** for each report with free text, a small fast model returns structured JSON:

```json
{
  "language": "rw",
  "symptom": "payment_failed",
  "summary_en": "Payment fails at the MoMo confirmation step",
  "matches_incident_id": "<uuid> | null",
  "is_new_issue": false,
  "relevance": "on_topic | off_topic | abusive",
  "contains_pii": false
}
```

- Symptom taxonomy (fixed enum): `site_down`, `slow`, `login_failed`, `otp_not_received`, `payment_failed`, `wrong_data`, `feature_broken`, `other`.
- Handles Kinyarwanda, English, French and code-switching (“sora ntibyemera kwishyura”).
- Only runs when the platform has at least one open incident, or when N+ reports with free text arrive within the window (cost guard). Batch per platform.

**Where it plugs in:** a `triageReport()` step in the worker, called after insert; writes `reports.symptom`, `reports.incident_id`, `reports.ai_summary`. Fusion can then compute the affected ratio **per symptom**, which enables genuinely separate incidents for separate problems.

**Demo moment:** three reports in three languages collapse into one clearly-labelled incident — “Payment fails at MoMo confirmation (14 reports, 3 districts)”.

### 2. Multilingual, fact-grounded incident summaries

**What AI does:** turns the incident’s structured facts into a short plain-language status, in Kinyarwanda, English and French:

> *Since 14:03, IremboGov payments have been failing. Our independent check returns HTTP 502. 38% of people reporting in Gasabo and Kicukiro are affected. The operator acknowledged the issue at 14:20.*

- Input: probe results, per-district ratios, symptom clusters from #1, incident events and operator notes. No raw citizen text.
- Output used for: public incident page header, push notification body, WhatsApp/X share text.
- Guardrail: a validator rejects any output containing a number, time or district not present in the input payload.

### 3. AI-drafted operator updates & post-incident reports

- On *Acknowledge* / *Resolve*, pre-fill the operator comment box with a draft (“We’re aware payments are failing for some users…”) — operator edits and approves.
- On *Resolve*, generate a post-incident summary from the timeline: duration, time-to-acknowledge, peak affected ratio, districts, recurrence history. Attach to the incident and the weekly report.

### 4. Weekly report narrative for regulators

The `/status/weekly` page and the Monday email already compute metrics. Add a 3–5 sentence “What changed this week” narrative per authority: biggest regressions, recurrences, slowest responses, platforms that improved. Numbers are supplied by SQL; the model only writes prose.

---

## Tier 2 — Trust, safety and data quality

### 5. Proof-image verification & redaction

`reports.proof_image_url` accepts screenshots and photos. A vision-capable model:

- Confirms the image plausibly shows an error **for the reported platform** (logo/UI/error text), and extracts the visible error message or code.
- Flags irrelevant or abusive images.
- Detects PII (phone numbers, ID numbers, names, faces) → blur before the image is ever shown publicly.

Result feeds a per-report `evidence_quality` score that fusion may weight.

### 6. Coordinated-reporting (brigading) detection

Combine cheap statistical signals (burst from new accounts, same hashed IP, near-identical text embeddings, reports from districts inconsistent with account history) into a `suspicion_score`. Suspicious reports are down-weighted in the crowd ratio — never deleted — and the decision is logged. Protects platforms from pile-ons and protects PHAS’s neutrality.

### 7. Moderation for comments & suggestions

- Screen `incident_comments.content` and `suggestions.body` for PII, abuse and **defamatory accusations** (in line with “evidence, not accusations”).
- Auto-deduplicate suggestions by semantic similarity and merge upvotes, so operators see one ranked list instead of 40 variations of “add dark mode”.
- Suggest `pending → public` transitions for admin one-click approval.

### 8. Early-warning degradation detection (classic ML, not an LLM)

Learn each platform’s normal latency and error pattern per hour-of-week from `probe_results`. Raise a `degraded` pre-signal when latency drifts well above baseline **before** hard failures begin — and anticipate load around known peaks (tax filing deadlines, month-end salary/pension days).

---

## Tier 3 — Reach & scale

### 9. Conversational status assistant (WhatsApp / SMS / USSD)

“Irembo irakora?” → the assistant answers from live PHAS data in the user’s language, and can file an `affected`/`ok` report on the user’s behalf. Implemented with tool calls against read-only endpoints (`get_platform_status`, `get_incident`, `submit_report`) — the model never invents status. Reaches citizens without smartphones or data bundles, and Africa’s Talking already provides SMS/USSD.

### 10. Cross-platform correlation hints

When several platforms fail within minutes of each other, surface a possible shared dependency (“Irembo payment failures began 4 min after MTN MoMo incident”). Shown to operators and regulators as a **hypothesis**, clearly labelled, never on the public page.

### 11. Regulator Q&A over their own data

Natural-language questions in the regulator portal (“Which of our platforms recurred more than twice this quarter?”) answered via tool calls on **authority-scoped, read-only** SQL views. Every answer shows the underlying query/table so figures are verifiable.

### 12. AI-driven deep synthetic checks

A browser agent that walks multi-step flows (log in → search a service → reach the payment step) using a test account and reports *which step* fails. More resilient to UI changes than hard-coded scripts. Runs off-Vercel (worker / container) on a slower schedule because of cost.

---

## Suggested sequence

| Phase | Features | Why this order |
|---|---|---|
| Now (hackathon) | #1 Report triage & clustering | Directly improves accuracy; uses data already collected; strong demo |
| Next | #2 summaries, #3 operator drafts, #7 moderation | Makes the product clearer and safer to operate publicly |
| Pilot | #4 weekly narrative, #5 image verification, #6 brigading detection | What a regulator needs before relying on the data |
| Scale | #8 early warning, #9 WhatsApp/SMS assistant, #10 correlation, #11 regulator Q&A, #12 deep checks | Reach, new countries, deeper insight |

## Data model additions (sketch)

```sql
ALTER TABLE reports ADD COLUMN symptom TEXT;
ALTER TABLE reports ADD COLUMN ai_summary TEXT;
ALTER TABLE reports ADD COLUMN language TEXT;
ALTER TABLE reports ADD COLUMN suspicion_score NUMERIC(4,3);
ALTER TABLE reports ADD COLUMN evidence_quality NUMERIC(4,3);

CREATE TABLE ai_decisions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type   TEXT NOT NULL,          -- 'report' | 'incident' | 'comment' | 'suggestion'
  subject_id     UUID NOT NULL,
  task           TEXT NOT NULL,          -- 'triage' | 'summary' | 'moderation' | ...
  model          TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  input_hash     TEXT NOT NULL,
  output         JSONB NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Cost controls

- Use a small fast model for per-report classification; reserve larger models for summaries and reports.
- Only triage when an incident is open or a free-text burst is detected; batch per platform.
- Cache summaries per incident state + input hash; regenerate only on change.
- Daily spend cap per deployment with automatic fallback to non-AI behaviour.
