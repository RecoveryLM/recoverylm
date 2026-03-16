# Controls

This reference describes the control areas, objectives, and specific controls for governing RecoveryLM's AI systems responsibly.

---

## AI Policies

**Objective:** Provide clear direction and management support for responsible AI development and use.

### Controls

- **AI Policy** — Document a policy for the development and use of AI systems.
- **Alignment with Other Policies** — Identify where other organizational policies (privacy, security, data protection, accessibility) intersect with or apply to AI objectives, and ensure alignment.
- **Policy Review** — Review the AI policy at planned intervals and whenever significant changes warrant it, to ensure it remains suitable, adequate, and effective.

**For RecoveryLM:** The AI policy should address the unique obligations of operating in a mental health-adjacent space — crisis safety, privacy of recovery status, and the boundary between AI support and professional care.

---

## Internal Organization

**Objective:** Establish accountability for responsible AI implementation, operation, and management.

### Controls

- **Roles and Responsibilities** — Define and allocate AI-specific roles and responsibilities according to the needs of the project.
- **Reporting Concerns** — Put a process in place for anyone to report concerns about the AI system's behavior, safety, or ethics throughout its life cycle.

**For RecoveryLM:** Even on a small team, make it explicit who owns crisis detection safety, who reviews AI response quality, and how concerns (from contributors or users) get surfaced and addressed.

---

## Resources for AI Systems

**Objective:** Account for all resources the AI system depends on, so risks and impacts can be fully understood.

### Controls

- **Resource Documentation** — Identify and document the resources required at each stage of the AI system's life cycle.
- **Data Resources** — Document the data resources utilized by the AI system.
- **Tooling Resources** — Document the tooling resources utilized by the AI system.
- **System and Computing Resources** — Document the system and computing resources utilized by the AI system.
- **Human Resources** — Document the human resources and their competencies involved in development, deployment, operation, maintenance, change management, and decommissioning of the AI system.

**For RecoveryLM:** Key resources include the Anthropic Claude API (third-party inference), the client-side encryption infrastructure, IndexedDB for local storage, crisis detection pattern matching, and the team's combined expertise in software engineering and addiction recovery support.

---

## Assessing Impacts of AI Systems

**Objective:** Assess impacts on individuals, groups, and society throughout the AI system's life cycle.

### Controls

- **Impact Assessment Process** — Establish a process to assess potential consequences for individuals, groups, and society that can result from the development, provision, and use of the AI system throughout its life cycle.
- **Documentation of Impact Assessments** — Document the results of impact assessments and retain them for a defined period.
- **Individual and Group Impacts** — Assess and document potential impacts to individuals or groups of individuals throughout the system's life cycle.
- **Societal Impacts** — Assess and document potential societal impacts throughout the system's life cycle.

**For RecoveryLM:** Impact assessment is critical here. Assess impacts on people in active recovery (crisis response accuracy, emotional safety), on marginalized communities (bias, equitable access), on support networks (trust, confidentiality), and on the broader recovery ecosystem (does the system complement or undermine professional treatment?).

---

## AI System Life Cycle

**Objective:** Identify and implement responsible processes for the design, development, deployment, operation, and retirement of AI systems.

### Development Guidance

- **Objectives for Responsible Development** — Identify and document objectives that guide responsible development, and integrate measures to achieve them throughout the development life cycle.
- **Processes for Responsible Design and Development** — Define and document the specific processes for responsible design and development of the AI system.

### Life Cycle Management

- **Requirements and Specification** — Specify and document requirements for new AI systems or material enhancements to existing systems.
- **Design and Development Documentation** — Document the AI system design and development based on organizational objectives, documented requirements, and specification criteria.
- **Verification and Validation** — Define and document verification and validation measures for the AI system, and specify criteria for their use.
- **Deployment** — Document a deployment plan and ensure that appropriate requirements are met prior to deployment.
- **Operation and Monitoring** — Define and document the necessary elements for ongoing operation, including system and performance monitoring, repairs, updates, and support.
- **Technical Documentation** — Determine what technical documentation is needed for each category of interested party (users, partners, authorities) and provide it in the appropriate form.
- **Event Logging** — Determine at which phases of the life cycle event logging should be enabled; at minimum, keep event logs when the AI system is in use.

**For RecoveryLM:** The crisis detection system and the conversational AI (Remmi) each have distinct life cycle considerations. Prompt changes, model updates, and widget additions all constitute material enhancements that warrant specification, testing, and documented deployment decisions. Event logging must balance safety monitoring with the privacy-first architecture — log what's needed for safety without compromising user confidentiality.

---

## Data for AI Systems

**Objective:** Understand the role and impacts of data in the development, provision, and use of AI systems throughout their life cycles.

### Controls

- **Data Management Processes** — Define, document, and implement data management processes related to the development of AI systems.
- **Data Acquisition** — Determine and document details about the acquisition and selection of data used in AI systems.
- **Data Quality** — Define and document requirements for data quality, and ensure that data used to develop and operate the AI system meets those requirements.
- **Data Provenance** — Define and document a process for recording the provenance of data used in AI systems over the life cycles of both the data and the system.
- **Data Preparation** — Define and document criteria for selecting data preparations and the data preparation methods to be used.

**For RecoveryLM:** RecoveryLM's privacy-first architecture means user conversation data is encrypted at rest and never leaves the device unencrypted. The AI system relies on the Anthropic API for inference — we don't train on user data. Data governance here focuses on what context is sent to the API, how system prompts are constructed, and ensuring the crisis detection patterns are based on validated clinical indicators.

---

## Information for Interested Parties

**Objective:** Ensure relevant interested parties have the information they need to understand and assess the AI system's risks and impacts.

### Controls

- **System Documentation and User Information** — Determine and provide the necessary information to users of the AI system.
- **External Reporting** — Provide capabilities for interested parties to report adverse impacts of the AI system.
- **Communication of Incidents** — Determine and document a plan for communicating incidents to users.
- **Information for Interested Parties** — Determine and document obligations to report information about the AI system to interested parties.

**For RecoveryLM:** Users need to understand that Remmi is an AI companion, not a therapist or counselor. The crisis detection modal already communicates this boundary in emergencies. Beyond that, the public governance folder itself serves as transparency documentation. Incident communication is especially important — if a safety issue is discovered, users and the community need to know.

---

## Use of AI Systems

**Objective:** Ensure AI systems are used responsibly and in accordance with organizational policies.

### Controls

- **Processes for Responsible Use** — Define and document processes for the responsible use of AI systems.
- **Objectives for Responsible Use** — Identify and document objectives to guide the responsible use of AI systems.
- **Intended Use** — Ensure the AI system is used according to its intended uses and accompanying documentation.

**For RecoveryLM:** The system is intended as a supportive companion for people in addiction recovery — not as a diagnostic tool, crisis hotline replacement, or substitute for professional treatment. Responsible use means making these boundaries clear in the product, in documentation, and in the system prompt that guides Remmi's behavior.

---

## Third-Party and Customer Relationships

**Objective:** Understand responsibilities, remain accountable, and ensure risks are appropriately apportioned when third parties are involved.

### Controls

- **Allocating Responsibilities** — Ensure that responsibilities within the AI system life cycle are allocated between the organization, its partners, suppliers, customers, and third parties.
- **Suppliers** — Establish a process to ensure that services, products, or materials provided by suppliers align with the organization's responsible AI approach.
- **Customers** — Ensure that the responsible approach to AI development and use considers customer expectations and needs.

**For RecoveryLM:** The primary third-party relationship is with Anthropic as the inference provider. We depend on their model for response quality and safety. We need to understand what Anthropic's own safety measures cover, where gaps exist that we must fill (crisis detection, response filtering), and how model updates or policy changes from Anthropic affect our risk profile. On the customer side, users of RecoveryLM are in a vulnerable position — their expectations for safety, privacy, and reliability must be treated as non-negotiable inputs to governance decisions.
