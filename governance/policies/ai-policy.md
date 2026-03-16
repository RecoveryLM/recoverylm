# RecoveryLM AI Policy

**Version:** 1.0
**Effective Date:** 2026-03-16
**Next Review:** 2026-09-16
**Owner:** Project Lead

---

## 1. Purpose

This policy establishes the principles, commitments, and boundaries for how RecoveryLM develops and operates AI. It is the foundation of our AI management system — all objectives, risk assessments, and controls derive from what is stated here.

RecoveryLM is an AI-powered companion for people in addiction recovery. Our users are often in vulnerable states — navigating cravings, relapse, isolation, and crisis. In this context, AI governance is not a compliance exercise. It is a duty of care. Every principle in this policy exists because getting AI wrong in recovery support can cause real harm to real people.

## 2. Scope

This policy applies to all AI systems and AI-related processes within RecoveryLM:

- **Remmi** — the conversational AI companion powered by Anthropic Claude
- **Crisis detection** — the pattern-matching system that identifies risk signals before any AI call is made
- **Widget system** — AI-triggered therapeutic exercises (CBT, SMART Recovery techniques)
- **Context orchestration** — the system that selects what user history and context is sent to the AI model
- **All data handling** in the pipeline from user input through AI response generation

This policy does not cover general software bugs, UI issues, or infrastructure that is unrelated to AI behavior or AI data processing.

## 3. Principles

### 3.1 Safety First

User safety takes absolute precedence over feature development, response quality, or user engagement. When safety and any other goal conflict, safety wins. This applies especially to crisis detection — a system that must never be bypassed, degraded, or deprioritized.

### 3.2 Privacy as a Foundation

Recovery status is deeply sensitive information. Exposure can lead to stigma, employment discrimination, legal consequences, and damaged relationships. We treat all user data as high-sensitivity by default:

- All user data is encrypted at rest using AES-GCM-256
- Encryption keys are held client-side, never transmitted to or stored by any API
- The AI model receives only the context needed for the current conversation — no persistent server-side storage of user data
- We operate on a local-first architecture where the user's device is the source of truth

### 3.3 Professional Boundaries

RecoveryLM is a support tool. It is not a therapist, counselor, or medical provider. The AI must never:

- Diagnose conditions
- Prescribe treatments or medications
- Discourage users from seeking professional help
- Present itself as a substitute for professional care

When in doubt, the system should direct users toward qualified human support.

### 3.4 Fairness and Inclusion

Recovery affects people across all demographics, cultures, and backgrounds. The AI must provide equitable, respectful support regardless of a user's race, gender, sexuality, religion, socioeconomic status, type of addiction, or recovery approach. We actively monitor for and address bias in AI responses.

### 3.5 Transparency

Users deserve to know they are interacting with AI, how their data is handled, and what the system can and cannot do. We do not obscure the AI nature of Remmi. Our governance artifacts are publicly visible in this repository as a demonstration of genuine responsible AI practice.

### 3.6 Human Oversight

AI operates under human oversight at every critical decision point. Crisis detection runs locally before any API call. The system is designed so that no AI-only pathway exists for high-stakes decisions. Users always retain the ability to reach human crisis support.

## 4. Commitments to Interested Parties

### 4.1 People in Recovery (Primary Users)

We commit to providing:
- A safe space where crisis signals are never ignored
- Strong encryption and privacy protection for all recovery data
- Clear communication that Remmi is an AI, not a human counselor
- Responses grounded in evidence-based recovery techniques (CBT, SMART Recovery)
- An experience free from judgment, stigma, or harmful stereotypes

### 4.2 Support Networks (Family, Sponsors)

We commit to:
- Never sharing user data with third parties, including family members, without explicit consent
- Designing the system to complement — not replace — human support relationships

### 4.3 Healthcare and Addiction Professionals

We commit to:
- Not positioning RecoveryLM as a clinical tool or replacement for professional treatment
- Actively directing users toward professional care when appropriate
- Being transparent about the system's capabilities and limitations

### 4.4 Marginalized Communities

We commit to:
- Assessing AI responses for cultural bias and harmful stereotypes
- Ensuring recovery support is inclusive of diverse backgrounds, identities, and recovery paths
- Recognizing that barriers to recovery resources are not equally distributed

### 4.5 Regulators and the Public

We commit to:
- Maintaining publicly visible governance documentation
- Responding to legitimate inquiries about our AI practices
- Monitoring and adapting to evolving AI regulations relevant to health-adjacent systems

## 5. Policy Statements

### 5.1 Crisis Detection

Crisis detection **must** execute before any API call. The system classifies user input into four levels — EMERGENCY, URGENT, CONCERN, and MONITOR — and takes appropriate protective action at each level. False negatives (missed crises) are treated as the highest-severity failure mode. We will maintain and regularly test crisis detection patterns, and any degradation in detection accuracy triggers immediate corrective action.

### 5.2 Data Minimization

The AI model receives only the context necessary for generating a helpful response. We do not send full conversation histories when a summary suffices. We do not collect, store, or transmit data beyond what is required for the system to function. The context orchestrator is responsible for enforcing this boundary.

### 5.3 Model Selection and Configuration

We select AI models that balance capability with safety for our use case. Model configuration (system prompts, temperature, safety settings) must be reviewed for alignment with this policy before deployment. Changes to model provider, model version, or system prompt require governance review.

### 5.4 Incident Response

When an AI-related incident occurs — a missed crisis signal, a harmful response, a privacy breach, or a system failure affecting user safety — we:

1. Take immediate protective action (e.g., disable affected functionality)
2. Document the incident in `governance/records/`
3. Conduct root cause analysis
4. Implement corrective action
5. Update risk assessments and controls as needed

### 5.5 Continuous Improvement

This governance system is a living system. We review this policy every six months (or sooner if triggered by an incident or significant system change). We track measurable objectives derived from this policy. We learn from incidents, audits, and user feedback. We update our risk assessments as the system evolves.

## 6. Governance Structure

| Role | Responsibility |
|------|---------------|
| **Project Lead** | Owns this policy. Accountable for the AI management system. Reviews and approves governance artifacts. |
| **Development Team** | Implements technical controls. Reports AI-related incidents. Participates in risk assessments. |
| **All Contributors** | Follow this policy. Raise concerns about AI behavior or safety. |

For a small team, roles may overlap. The responsibilities still apply regardless of team size.

## 7. Related Documents

| Document | Location | Status |
|----------|----------|--------|
| AI Objectives | `governance/objectives/` | Pending |
| Impact Assessment | `governance/assessments/` | Pending |
| Risk Assessment | `governance/assessments/` | Pending |
| Risk Treatments | `governance/risk-treatments/` | Pending |
| Corrective Actions | `governance/records/` | Pending |

---

*This policy is publicly visible as part of RecoveryLM's commitment to transparent AI governance. It is a living document maintained in the project repository.*