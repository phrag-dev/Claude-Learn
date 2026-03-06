# Security Analysis: Dashboard GitHub API Sync

> Related to: Learning Dashboard (003), Capture System
> Created: 2026-03-06
> Classification: Security-sensitive — review before any changes

---

## What We're Protecting

A GitHub fine-grained Personal Access Token (PAT) that can write to ONE repository (Claude_Learn). This token lives in the user's browser and is used to commit captured notes directly to the repo.

---

## Attack Vector Analysis

### VECTOR 1: Token in source code
**Risk:** Token accidentally committed to repo or visible in page source.
**Likelihood:** Preventable.
**Mitigation:** Token NEVER exists in source files. Only entered by user into browser. Build script and templates contain zero token references. `.gitignore` updated to block any token files.
**Status:** FULLY MITIGATED

### VECTOR 2: XSS stealing token from localStorage
**Risk:** Injected JavaScript reads localStorage and exfiltrates the token.
**Likelihood:** Low — no user-generated content rendered, no external scripts loaded.
**Mitigation:**
- Strict Content Security Policy (CSP) via `<meta>` tag in every page
- `script-src 'self'` — only scripts from our own origin can execute
- `connect-src 'self' https://api.github.com` — only connections to GitHub API allowed
- No inline scripts (all JS in external files)
- No external CDN dependencies (no third-party scripts)
- No `eval()`, no `Function()`, no dynamic script creation
**Status:** FULLY MITIGATED (within the limits of CSP)

### VECTOR 3: Browser extensions reading localStorage
**Risk:** A malicious or compromised browser extension reads localStorage directly.
**Likelihood:** Low but possible — extensions run with elevated privileges.
**Mitigation:**
- Token is ENCRYPTED in localStorage using AES-GCM (Web Crypto API)
- Encrypted with a user passphrase entered once per session
- Even if localStorage is dumped, the token is unreadable without the passphrase
- Decrypted token exists only in sessionStorage (cleared on tab/browser close)
**Status:** MITIGATED (attacker would need passphrase + localStorage access)

### VECTOR 4: Physical access to the browser
**Risk:** Someone with access to the computer opens DevTools and reads storage.
**Likelihood:** Depends on physical security.
**Mitigation:**
- Encrypted in localStorage (passphrase required)
- Decrypted version in sessionStorage (cleared on close)
- A "Lock" button on the dashboard clears sessionStorage immediately
- Passphrase is never stored — exists only in memory during encryption/decryption
**Status:** MITIGATED (same protection as Vector 3)

### VECTOR 5: In-transit interception
**Risk:** Token captured during transmission to GitHub API.
**Likelihood:** Very low — TLS encryption.
**Mitigation:**
- GitHub API enforces HTTPS (TLS 1.2+)
- GitHub Pages enforces HTTPS
- Token sent as `Authorization: Bearer <token>` header over TLS
- CSP `connect-src` restricts API calls to `https://api.github.com` only — token cannot be sent elsewhere
**Status:** MITIGATED BY TLS — cannot be further mitigated client-side. This is the accepted residual risk.

### VECTOR 6: Token scope over-privilege
**Risk:** Stolen token used to damage other repos, access settings, etc.
**Likelihood:** Preventable via scope.
**Mitigation:**
- Fine-grained PAT (not classic)
- Scoped to ONE repository only (Claude_Learn)
- Permission: `Contents: Read and Write` only
- NO access to: settings, admin, actions, secrets, issues, pull requests, or any other repo
- Expiry: set to 90 days maximum, force rotation
**Status:** FULLY MITIGATED

### VECTOR 7: Token exposed via GitHub auto-detection
**Risk:** GitHub detects a PAT in a committed file and revokes it.
**Likelihood:** Zero — token is never in any file.
**Mitigation:** Token only exists in browser memory/storage.
**Status:** N/A

### VECTOR 8: Man-in-the-middle (MITM)
**Risk:** Attacker intercepts HTTPS connection.
**Likelihood:** Very low with modern TLS.
**Mitigation:** HTTPS enforced on both ends. Certificate pinning handled by browser.
**Status:** MITIGATED BY TLS

---

## Residual Risk Summary

| Vector | Status | Residual Risk |
|--------|--------|---------------|
| Token in source | Fully mitigated | None |
| XSS | Fully mitigated (CSP) | None (assuming no CSP bypass) |
| Browser extensions | Mitigated (encryption) | Attacker needs passphrase |
| Physical access | Mitigated (encryption + session) | Attacker needs passphrase |
| In transit | TLS | Accepted — cannot eliminate without breaking functionality |
| Token scope | Fully mitigated | Worst case: someone edits learning notes in one repo |
| GitHub detection | N/A | None |
| MITM | TLS | Accepted — standard web security |

**Worst case scenario if ALL mitigations fail:** An attacker gains write access to markdown files in the Claude_Learn repository. No access to secrets, settings, other repos, or anything beyond file contents in one repo.

---

## Implementation Requirements

### PAT Creation Instructions (for user)

1. Go to GitHub → Settings → Developer Settings → Fine-grained tokens
2. Token name: `claude-learn-dashboard`
3. Expiration: 90 days
4. Repository access: **Only select repositories** → `Claude_Learn`
5. Permissions: **Contents** → Read and Write
6. All other permissions: No access
7. Generate → copy token

### Encryption Scheme

- Algorithm: AES-GCM (256-bit) via Web Crypto API
- Key derivation: PBKDF2 with SHA-256, 100,000 iterations
- Salt: random 16 bytes, stored alongside ciphertext in localStorage
- IV: random 12 bytes, stored alongside ciphertext in localStorage
- Passphrase: user-entered, never stored

### Storage Layout

```
localStorage:
  claude_learn_token_encrypted: {
    ciphertext: "<base64>",
    salt: "<base64>",
    iv: "<base64>"
  }
  claude_learn_notes: [...]        ← captured notes (not sensitive)

sessionStorage:
  claude_learn_token: "<PAT>"      ← decrypted, cleared on close
```

### CSP Meta Tag

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'none';
               script-src 'self';
               style-src 'self';
               connect-src 'self' https://api.github.com;
               img-src 'self';
               font-src 'self';
               base-uri 'self';
               form-action 'none';">
```

This blocks:
- All inline scripts
- All external scripts
- All connections except GitHub API
- All form submissions
- All inline styles (we use external CSS)
- All resources from external origins
