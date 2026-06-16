# Secure Development & Compliance Policy (OWASP, NIST SSDF & SDL)

This document establishes the Secure Development Lifecycle (SDL) and environment guidelines for the NEKTAB Candidate Search application. All developers contributing to this project must adhere to these practices to maintain the integrity, availability, and confidentiality of the system.

---

## 1. Compliance Framework Mapping

This policy maps our development practices directly to major cybersecurity frameworks:

| Security Framework | Domain/Chapter | Implementation in NEKTAB |
| :--- | :--- | :--- |
| **CIS Controls v8** | Chapter 16 (Application Software Security) | Integrated static analysis (SAST), automated dependency audits, and strict Row-Level Security (RLS) policies. |
| **NIST SSDF** | Mitigate Vulnerabilities (PW) & Secure Software (PO) | Implemented pre-commit hooks to scan code and prevent secret leakage; automated dependency updates. |
| **SAFECode** | AppSec Addendum to CIS Controls | Developer security reviews, validation of user input, secure database integration. |
| **BSA Alliance** | Framework for Secure Software | Established secure development guidelines, access controls, and code verification procedures. |
| **OWASP** | Secure Coding Practices / ASVS | Input sanitization, XSS mitigation (CSP meta headers), BOLA/IDOR prevention, secure local storage practices. |
| **Microsoft SDL** | Core Practices (Design, Code, Test, Release) | Threat modeling reference, SAST/DAST automation, and continuous security audits. |

---

## 2. Secure Development Environment (SDE) Setup

To maintain a secure development environment, all developers must initialize the automated pre-commit hook before making any contributions:

```bash
# Install development dependencies and build tools
npm install

# Set up Git pre-commit hooks
npm run security-setup
```

### Git Pre-Commit Security Checks
The hook (`scripts/install_hooks.js`) automatically executes the following checks upon every `git commit`:
1.  **SAST Scan (`npm run sast`)**: Scans for secrets, API keys, unsafe innerHTML (XSS vectors), insecure `eval()`, and insecure localStorage usage.
2.  **Lint Check (`npm run lint`)**: Ensures code follows strict type safety and quality controls.
3.  **Abortion on Failure**: If any high-severity issue or syntax violation is found, the commit is aborted.

---

## 3. Secure Coding Guidelines (OWASP & Microsoft SDL)

### 3.1 Input Sanitization & XSS Mitigation
-   **React Auto-Escaping**: React automatically escapes values rendered as children of text nodes, protecting against basic Cross-Site Scripting (XSS).
-   **innerHTML Prohibited**: Never use `dangerouslySetInnerHTML` in application code. If HTML rendering is absolutely required, use a tested sanitization library like DOMPurify.
-   **CSP Headers**: The `index.html` file defines a strict Content-Security-Policy (CSP) that limits scripts, styles, and connections to trusted origins only (`'self'`, Google Fonts, and the Supabase API).

### 3.2 Authorization & BOLA (IDOR) Prevention
-   **Supabase Row-Level Security (RLS)**: RLS must remain enabled on all tables in the `public` schema.
-   **Owner-Based Policies**: Ensure queries check user identity using `auth.uid() = owner_id` rather than trusting user-supplied request payloads.
-   **Indirect Object Reference Checks**: Tables referencing parent structures (e.g. `search_candidates` linking to `recruitment_searches`) must use nested SQL joins/exists checks in their RLS policies to confirm the authenticated user owns the parent record.

### 3.3 Protection of Secrets & Configurations
-   **No Hardcoded Secrets**: Under no circumstances should database keys, JWT secrets, or cloud service keys be hardcoded in the codebase.
-   **Environment Configuration**: Load variables via Vite's `import.meta.env` system.
-   **Configuration Template**: A template file (`.env.example`) is provided. Real secrets must only be kept in local `.env` files which are explicitly excluded from Git in `.gitignore`.

---

## 4. Static & Dynamic Security Auditing (SAST & DAST)

### Static Application Security Testing (SAST)
Our custom SAST tool (`scripts/run_sast.js`) scans TypeScript and HTML source code for structural vulnerability patterns:
```bash
npm run sast
```

### Dynamic Application Security Testing (DAST)
Our dynamic security testing script (`scripts/run_dast.js`) verifies HTTP headers and SSL settings on running deployments:
```bash
# Scan a live staging website or local development server
npm run dast https://your-staging-url.vercel.app
```
The DAST tool checks for:
-   `Content-Security-Policy` header presence.
-   `X-Frame-Options` and `X-Content-Type-Options` (preventing Clickjacking and MIME sniffing).
-   `Strict-Transport-Security` (HSTS) on HTTPS connections.
-   CORS policies (preventing wildcard origins containing session credentials).

---

## 5. Security Patching & Vulnerability Disclosure

### Dependency Audit
We run dependency vulnerability auditing using:
```bash
npm run security-check
```
This runs our SAST scanner followed by `npm audit`. Any vulnerability detected in production dependencies must be resolved immediately by upgrading the affected package or setting an override in `package.json` if a transitive package is affected.
