# Security Policy

## Supported Versions

We release security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| Latest  | ✅ Yes             |
| Older   | ❌ No              |

## Reporting a Vulnerability

If you discover a security vulnerability in SGC-DM, please report it responsibly.

**Please do not:**
- Create public GitHub issues for security vulnerabilities
- Share vulnerability details in public forums
- Attempt to exploit the vulnerability

**Instead, please:**
1. Email the vulnerability details to: `security@sgc-dm.example.com`
2. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if known)
3. Allow reasonable time for assessment and remediation

We aim to:
- Acknowledge receipt within 48 hours
- Provide initial assessment within 7 days
- Release patches for critical vulnerabilities within 30 days

## Security Best Practices for Contributors

- Never commit credentials, API keys, or secrets to the repository
- Use `.env` files for local development (already in `.gitignore`)
- Use GitHub Secrets for CI/CD credentials
- Rotate credentials periodically
- Keep dependencies updated

## Supported Versions

Security updates are provided for the latest release branch only. Older versions do not receive security patches.

## Disclosure Policy

We follow responsible disclosure practices. We will coordinate with the reporter on disclosure timing and will credit the reporter if desired.

---

*This security policy follows industry best practices for open source projects.*