# Security Policy

## The Privacy Model

RecoveryLM is designed with a zero-knowledge architecture. Understanding this model is important for evaluating security concerns:

- **All user data is encrypted locally** using AES-GCM-256 with keys derived via PBKDF2 (100,000 iterations)
- **Encryption keys exist only in browser memory** — they are never persisted to disk or transmitted
- **No server-side storage** — there is no RecoveryLM backend. The only external service is the Anthropic API, which receives conversation context but no encryption keys or historical data
- **Recovery phrases** use BIP39-style mnemonics for self-sovereign key recovery

This means:

- We cannot access your data (we never have it)
- A server breach cannot expose your conversations (there is no server storing them)
- Your security depends on your password strength and device security

## Reporting a Vulnerability

If you discover a security vulnerability in RecoveryLM, please report it responsibly.

### What to Report

- Vulnerabilities in the encryption implementation (`src/services/crypto.ts`)
- Ways that data could be exfiltrated or keys could be exposed
- Issues with the crisis detection system that could cause harm
- XSS, injection, or other web security issues
- Dependencies with known vulnerabilities

### How to Report

**For sensitive vulnerabilities**, please email the maintainer directly rather than opening a public issue. Include:

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (if you have one)

**For lower-severity issues** (e.g., outdated dependencies, minor UI issues), opening a GitHub issue is fine.

### What to Expect

- Acknowledgment within 48 hours
- Assessment of severity and impact
- Timeline for fix (if applicable)
- Credit in release notes (unless you prefer anonymity)

## Security Considerations for Users

### Your Password

Your encryption password is the primary protection for your data. Choose a strong, unique password. If someone gains access to your device and your password, they can decrypt your data.

### Your Recovery Phrase

Your 12-word recovery phrase can restore access to all your data. Store it securely offline. Anyone with this phrase and access to your browser's IndexedDB can decrypt your data.

### Device Security

Because data is stored locally, your device's security matters:

- Use device encryption
- Keep your browser updated
- Be cautious about browser extensions with broad permissions

### API Key

If self-hosting, your Anthropic API key is stored in `.env.local`. This file should never be committed to version control. The key allows API usage billed to your account.

## Scope

This security policy covers the RecoveryLM application code. It does not cover:

- The Anthropic API (report issues to Anthropic)
- Your device or browser security
- Third-party dependencies (though we welcome reports about vulnerable dependencies)

## Acknowledgments

We appreciate security researchers who help keep RecoveryLM safe for its users. Responsible disclosure helps protect people during vulnerable moments.
