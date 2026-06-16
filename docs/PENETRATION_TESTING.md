# Penetration Testing Guide & Security Verification Checklist

This document details the security verification checklists and penetration testing procedures for the NEKTAB Candidate Search application. These tests ensure that the application is resilient against the OWASP Top 10 vulnerabilities and passes standard black-box and white-box penetration testing.

---

## 1. Broken Object Level Authorization (BOLA / IDOR) Testing

Since the application utilizes Supabase for database storage, client-side requests connect directly to the PostgREST API. This makes Row-Level Security (RLS) policies the primary security control.

### Verification Objective
Ensure a user cannot access, modify, or insert database records owned by another user.

### Testing Procedure (Authenticated Bypass Test)
1.  **Obtain Two Test Users**: Register/login to two distinct accounts (`User A` and `User B`).
2.  **Capture Token**: Extract the JWT access token for `User A` and `User B` from browser local storage/network panel.
3.  **Generate a Resource**: Create a recruitment search under `User A` and note the UUID `search_id`.
4.  **Attempt Read (Cross-Account)**:
    - Send an HTTP `GET` request to the Supabase REST endpoint:
      `GET /rest/v1/recruitment_searches?id=eq.<search_id>`
    - Include the Authorization header with `User B`'s JWT:
      `Authorization: Bearer <User_B_JWT>`
    - **Expected Outcome**: The request must return an empty list `[]` (HTTP 200 with no data) or an HTTP 403, indicating that `User B` cannot read `User A`'s search.
5.  **Attempt Insert (Cross-Account)**:
    - Send an HTTP `POST` request to `search_candidates` trying to link a candidate to `User A`'s `search_id` using `User B`'s JWT.
    - **Expected Outcome**: The request must fail with an authorization check violation (`new row violates row-level security policy`).
6.  **Attempt Update (Cross-Account)**:
    - Try to edit a note (`candidate_notes`) belonging to `User A`'s candidate using `User B`'s JWT.
    - **Expected Outcome**: The update must fail or update 0 rows.

---

## 2. Cross-Site Scripting (XSS) Testing

### Verification Objective
Verify that user-supplied input fields (such as manual candidate names, titles, skills, notes, or CSV uploads) cannot execute malicious JavaScript in other users' browsers.

### Testing Procedure
1.  **Inject XSS Payloads**: Try to insert the following payloads into the name field, notes textarea, or CSV import columns:
    - `<script>alert(document.cookie)</script>`
    - `<img src=x onerror=alert('XSS')>`
    - `javascript:alert(1)` (in links or urls)
2.  **Observe Rendered Output**:
    - Navigate to the page containing the injected candidates or notes.
    - Inspect the DOM of the candidate list.
    - **Expected Outcome**: React must render the payload as plain text strings (`&lt;script&gt;...`), and no alert boxes or custom script execution should trigger. The console should remain clear of unauthorized script execution errors.
3.  **URL Injection Check**:
    - Try to supply `javascript:alert(1)` as the `linkedin_url` on a candidate.
    - Click the LinkedIn profile icon on the candidate card.
    - **Expected Outcome**: The application must sanitize or prefix the URL to prevent execution of javascript scheme handlers, or the browser's Content-Security-Policy must block it.

---

## 3. Broken Authentication (JWT Validation) Testing

### Verification Objective
Verify that client-side requests require a valid, non-expired, signed JWT token from Supabase.

### Testing Procedure
1.  **Expired Token Test**:
    - Modify the authorization token in local storage to be expired.
    - **Expected Outcome**: The Supabase client should automatically log out the user, or the backend API must reject requests with `JWT expired`.
2.  **Signature Tampering Test**:
    - Intercept a database query request and modify one character of the JWT signature part.
    - Send the request to the Supabase database.
    - **Expected Outcome**: The database must reject the request with HTTP 401 Unauthorized (`invalid signature`).
3.  **Missing Token Test**:
    - Send a request to public REST endpoints without the Authorization bearer token.
    - **Expected Outcome**: The database must return HTTP 401 or empty lists due to RLS policies restricting access to authenticated sessions.

---

## 4. Cross-Site Request Forgery (CSRF) Testing

### Verification Objective
Verify that attackers cannot trigger state-changing actions on behalf of a victim user via malicious third-party websites.

### Testing Procedure & Verification
- **Architecture Audit**: The frontend communicates with Supabase and other APIs using custom headers:
  `Authorization: Bearer <JWT>`
- Since these tokens are stored in application state or local storage (and are not sent automatically in cookie payloads by the browser during cross-site requests), the application is **by design immune to CSRF**.
- **Check**: Verify that the application does not rely on ambient session credentials (like session cookies) for state-changing operations without explicit header-based tokens.

---

## 5. Security Header Verification (DAST)

### Verification Objective
Ensure security response headers are configured on staging and production hosting environments.

### Testing Procedure
Run the automated DAST tool against the target deployment environment:
```bash
npm run dast https://your-production-url.vercel.app
```
**Required Verification Checkpoints**:
- [ ] `Content-Security-Policy`: Restricts scripts and styles to trusted origins.
- [ ] `X-Frame-Options: DENY` or `SAMEORIGIN`: Prevents Clickjacking.
- [ ] `X-Content-Type-Options: nosniff`: Prevents MIME-type sniffing.
- [ ] `Strict-Transport-Security` (HSTS): Enforces HTTPS connections.
