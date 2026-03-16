# Operation

## Operational Planning and Control

**Purpose:** Make governance real in day-to-day work, not just in documents.

Plan and control the processes needed to meet governance requirements. Set criteria for how things should work, implement controls, and keep records showing that processes ran as planned. When changes happen — planned or unplanned — review the consequences and mitigate adverse effects. For RecoveryLM, this means governance is part of the development workflow: crisis detection changes trigger risk reassessment, prompt modifications get reviewed for safety implications, and third-party dependencies (like the Anthropic API) are monitored for changes that affect our risk profile.

## Risk Assessment in Operation

**Purpose:** Risk assessment isn't a one-time activity — reassess when things change.

Perform risk assessments on a regular cadence and whenever significant changes occur. Triggers for RecoveryLM include: model updates or prompt changes, new feature development (especially new widgets), changes in user population or usage patterns, external events (regulatory changes, new research on AI safety), and incidents or near-misses. Document the results every time.

## Risk Treatment in Operation

**Purpose:** Implement treatment plans and verify they're actually working.

Put the risk treatment plan into action. Track whether controls are effective and whether residual risk stays within acceptable levels. For RecoveryLM, this means monitoring crisis detection accuracy, reviewing AI response quality, verifying encryption is functioning, and confirming that safety guardrails haven't regressed. Document the evidence.

## Impact Assessment in Operation

**Purpose:** Reassess real-world consequences as the system and its context evolve.

Perform impact assessments regularly and when significant changes occur — new capabilities, new user populations, feedback from users, incidents, or shifts in the societal context around AI and mental health. Feed findings back into risk assessment. For RecoveryLM, a new therapeutic widget or a change in the crisis detection model should trigger a fresh look at potential impacts on users.
