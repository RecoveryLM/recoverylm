# RecoveryLM AI Objectives

**Version:** 1.0
**Effective Date:** 2026-03-16
**Next Review:** 2026-09-16
**Derived From:** [AI Policy](../policies/ai-policy.md)

---

## How to Read This Document

Each objective traces back to a specific policy section. For each objective we define:

- **What** — the goal
- **Metric** — how we measure it
- **Target** — what success looks like
- **Owner** — who is accountable
- **Timeline** — when this should be achieved or is ongoing
- **Evaluation** — how and when we check progress

---

## OBJ-1: Crisis Detection Accuracy

**Policy Reference:** Section 3.1 (Safety First), Section 5.1 (Crisis Detection)

**What:** Maintain high accuracy in detecting crisis signals across all severity levels (EMERGENCY, URGENT, CONCERN, MONITOR), with particular emphasis on minimizing false negatives at the EMERGENCY and URGENT levels.

**Metric:** False negative rate for EMERGENCY and URGENT signals, measured against a maintained test suite of crisis input patterns.

**Target:**
- EMERGENCY false negative rate: 0%
- URGENT false negative rate: < 5%
- Test suite covers at least 50 distinct crisis pattern variations

**Owner:** Development Team

**Timeline:** Ongoing. Test suite baseline by 2026-06-16.

**Evaluation:** Run crisis detection test suite on every PR that touches `useCrisis`, crisis detection services, or related pattern-matching code. Quarterly review of test coverage against emerging crisis language patterns.

---

## OBJ-2: Data Privacy Compliance

**Policy Reference:** Section 3.2 (Privacy as a Foundation), Section 5.2 (Data Minimization)

**What:** Ensure all user data is encrypted at rest and that no unencrypted user data is transmitted to or stored by external services.

**Metric:**
- Percentage of user data fields encrypted at rest
- Number of instances where unencrypted user data is sent to an external API

**Target:**
- 100% of user data fields encrypted at rest via the vault service
- Zero instances of unencrypted user data transmitted externally
- Context window sent to Claude contains no raw encryption keys or vault credentials

**Owner:** Development Team

**Timeline:** Ongoing. Audit baseline by 2026-06-16.

**Evaluation:** Code review checklist item for any PR touching data storage or API calls. Semi-annual audit of data flows from user input through API transmission.

---

## OBJ-3: Professional Boundary Adherence

**Policy Reference:** Section 3.3 (Professional Boundaries), Section 4.3 (Healthcare Professionals)

**What:** Ensure the AI companion never diagnoses, prescribes, discourages professional help, or presents itself as a substitute for professional care.

**Metric:** Number of boundary violations detected in system prompt review and response sampling.

**Target:**
- Zero boundary violations in the system prompt (`remmi.ts`)
- System prompt explicitly includes professional boundary instructions
- Boundary violations found in response sampling trigger corrective action within 7 days

**Owner:** Project Lead

**Timeline:** System prompt review at each model or prompt change. Response sampling quarterly.

**Evaluation:** Review system prompt against professional boundary checklist on every change. Quarterly sample of 20+ conversation exchanges assessed for boundary adherence.

---

## OBJ-4: Bias Monitoring

**Policy Reference:** Section 3.4 (Fairness and Inclusion), Section 4.4 (Marginalized Communities)

**What:** Actively monitor AI responses for cultural bias, stereotyping, and inequitable treatment across user demographics.

**Metric:**
- Whether a bias evaluation has been conducted in the review period
- Number of bias-related issues identified and addressed

**Target:**
- At least one bias evaluation per review cycle (6 months)
- All identified bias issues documented and addressed within 30 days
- System prompt includes explicit fairness and inclusion instructions

**Owner:** Project Lead

**Timeline:** First evaluation by 2026-09-16. Ongoing every 6 months.

**Evaluation:** Structured evaluation using diverse recovery scenarios (varying demographics, addiction types, cultural contexts). Results documented in `governance/records/`.

---

## OBJ-5: Transparency and Disclosure

**Policy Reference:** Section 3.5 (Transparency), Section 4.1 (People in Recovery)

**What:** Ensure users clearly understand they are interacting with AI, how their data is handled, and what the system's limitations are.

**Metric:**
- Presence of AI disclosure in onboarding flow
- Presence of data handling explanation accessible to users
- Presence of limitations disclosure

**Target:**
- Onboarding includes clear statement that Remmi is AI-powered
- Users can access a plain-language explanation of data handling (encryption, local-first architecture)
- System limitations are communicated before first use

**Owner:** Development Team

**Timeline:** Baseline disclosures in place by 2026-06-16.

**Evaluation:** Review onboarding flow and in-app disclosures against checklist at each release that modifies onboarding or data handling.

---

## OBJ-6: Incident Response Readiness

**Policy Reference:** Section 5.4 (Incident Response)

**What:** Maintain the ability to respond to AI-related incidents (missed crisis signals, harmful responses, privacy breaches) quickly and systematically.

**Metric:**
- Whether a documented incident response procedure exists
- Time from incident detection to protective action
- Percentage of incidents with completed root cause analysis

**Target:**
- Incident response procedure documented in `governance/procedures/` by 2026-06-16
- Protective action taken within 24 hours of incident detection
- 100% of incidents have documented root cause analysis and corrective action

**Owner:** Project Lead

**Timeline:** Procedure documented by 2026-06-16. Response targets ongoing.

**Evaluation:** Post-incident review for every AI-related incident. Quarterly check that procedure is current and team is aware of it.

---

## OBJ-7: Governance System Maintenance

**Policy Reference:** Section 5.5 (Continuous Improvement)

**What:** Keep the governance system itself alive and current — not a one-time artifact that decays.

**Metric:**
- Whether scheduled reviews have been completed on time
- Number of governance artifacts past their review date

**Target:**
- AI Policy reviewed every 6 months (next: 2026-09-16)
- All governance artifacts reviewed within 30 days of their scheduled review date
- Zero governance artifacts more than 60 days past review date

**Owner:** Project Lead

**Timeline:** Ongoing. First full review cycle by 2026-09-16.

**Evaluation:** Check review dates on all governance documents quarterly. Flag any that are overdue.

---

## OBJ-8: Model Change Governance

**Policy Reference:** Section 5.3 (Model Selection and Configuration)

**What:** Ensure changes to AI model provider, model version, or system prompt go through governance review before deployment.

**Metric:**
- Percentage of model/prompt changes that went through governance review
- Whether a model change review checklist exists

**Target:**
- 100% of model/prompt changes reviewed against AI Policy before deployment
- Model change review checklist documented in `governance/procedures/`
- No model or prompt change deployed without documented review

**Owner:** Project Lead

**Timeline:** Checklist documented by 2026-06-16. Review requirement ongoing.

**Evaluation:** PR review process includes governance review step for any changes to model configuration or system prompt files.

---

## Tracking Summary

| ID | Objective | Target Date | Status |
|----|-----------|-------------|--------|
| OBJ-1 | Crisis Detection Accuracy | Ongoing (baseline 2026-06-16) | Not Started |
| OBJ-2 | Data Privacy Compliance | Ongoing (audit 2026-06-16) | Not Started |
| OBJ-3 | Professional Boundary Adherence | Ongoing | Not Started |
| OBJ-4 | Bias Monitoring | First eval 2026-09-16 | Not Started |
| OBJ-5 | Transparency and Disclosure | 2026-06-16 | Not Started |
| OBJ-6 | Incident Response Readiness | Procedure 2026-06-16 | Not Started |
| OBJ-7 | Governance System Maintenance | Ongoing | Not Started |
| OBJ-8 | Model Change Governance | Checklist 2026-06-16 | Not Started |

---

*These objectives are derived from the [AI Policy](../policies/ai-policy.md) and will be tracked over time. Status updates are recorded in this document and detailed records in `governance/records/`.*
