# Contributing to RecoveryLM

Thank you for your interest in contributing to RecoveryLM. This project exists to help people in recovery, and thoughtful contributions can extend that help to more people.

## What This Project Is

RecoveryLM is a **focused tool**, not a platform. It's designed to do a few things well:

- Provide a private, local-first space for recovery support
- Operationalize evidence-based techniques (CBT, SMART Recovery, Stoic practices)
- Be a companion between therapy sessions and support group meetings—not a replacement for them

Contributions should align with this focus.

## Before Contributing

**Read the [Self-Intervention Recovery Framework](docs/independent-recovery-framework.md).** Understanding the philosophical foundation will help you understand why things are built the way they are.

## What We're Looking For

### High Priority

- **Tests for crisis detection** — This is the most safety-critical code in the app. If you can write comprehensive tests for `src/services/crisisHandler.ts`, that would be a significant contribution.
- **Accessibility improvements** — ARIA labels, keyboard navigation, screen reader support. Recovery tools should be accessible to everyone.
- **Offline capability** — Service worker implementation so grounding exercises and crisis resources are available without network access.
- **Documentation** — Deployment guides, self-hosting instructions, translations.

### Welcome

- Bug fixes
- Performance improvements
- UI/UX refinements that maintain the current design philosophy
- Additional evidence-based widgets (with citations)

### Please Discuss First

Open an issue before working on:

- New features that expand the app's scope
- Changes to the recovery framework or Remi's personality
- Architectural changes
- Anything that affects the privacy model

## Privacy Is Non-Negotiable

RecoveryLM's privacy architecture is not a feature—it's a core principle. Contributions that would compromise it will not be accepted. This includes:

- Sending data to external services (beyond the AI API call)
- Persisting encryption keys
- Adding analytics or tracking
- Changing the zero-knowledge design

If you're unsure whether something affects privacy, ask.

## Development Guidelines

### Code Style

- TypeScript strict mode — all types must be explicit
- Vue 3 Composition API with `<script setup>`
- Follow existing patterns in the codebase

### Before Submitting

```bash
# Ensure types are correct
npm run typecheck

# Test your changes manually
npm run dev
```

### Commit Messages

Write clear, descriptive commit messages. The format isn't strict, but the message should explain *what* changed and *why*.

### Pull Requests

- Keep PRs focused — one feature or fix per PR
- Describe what you changed and why
- Note any areas where you'd like feedback

## Sensitive Domain Considerations

This is a recovery app. People will use it during some of the hardest moments of their lives. Keep this in mind:

- **Tone matters.** Remi is warm but direct, not saccharine or preachy. Changes to prompts or UI copy should maintain this.
- **Don't add friction during crisis.** The SOS button and crisis resources should always be immediately accessible.
- **Test with empathy.** Imagine using the feature you're building at 2am when you're struggling.

## Questions?

Open an issue. There are no stupid questions, especially in a domain this nuanced.

---

Thank you for helping make recovery support more accessible.
