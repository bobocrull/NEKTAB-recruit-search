import http from 'http';
import https from 'https';

const targetUrl = process.argv[2] || 'http://localhost:5173';

console.log('====================================================');
console.log('  NEKTAB DevSecOps DAST Scanner (OWASP & SDL) ');
console.log(`  Targeting URL: ${targetUrl}`);
console.log('====================================================\n');

const client = targetUrl.startsWith('https') ? https : http;

const req = client.get(targetUrl, (res) => {
  const headers = res.headers;
  let issues = [];

  console.log(`Status Code: ${res.statusCode} ${res.statusMessage}`);
  console.log('Inspecting HTTP Response Headers...\n');

  // 1. Content-Security-Policy (CSP)
  if (!headers['content-security-policy']) {
    issues.push({
      name: 'Missing Content-Security-Policy (CSP) Header',
      desc: 'No Content-Security-Policy header was detected. Ensure the hosting server sets a strict CSP to prevent XSS attacks.',
      severity: 'HIGH'
    });
  } else {
    console.log('✅ Content-Security-Policy header detected.');
  }

  // 2. X-Frame-Options (Clickjacking)
  if (!headers['x-frame-options']) {
    issues.push({
      name: 'Missing X-Frame-Options Header',
      desc: 'No X-Frame-Options header was detected. This allows the application to be embedded in iframes and exposes users to Clickjacking.',
      severity: 'MEDIUM'
    });
  } else {
    console.log('✅ X-Frame-Options header detected.');
  }

  // 3. X-Content-Type-Options (MIME Sniffing)
  if (!headers['x-content-type-options'] || headers['x-content-type-options'].toLowerCase() !== 'nosniff') {
    issues.push({
      name: 'Missing/Insecure X-Content-Type-Options Header',
      desc: 'The X-Content-Type-Options header should be set to "nosniff" to prevent the browser from interpreting files as a different MIME type.',
      severity: 'LOW'
    });
  } else {
    console.log('✅ X-Content-Type-Options: nosniff header detected.');
  }

  // 4. Strict-Transport-Security (HSTS)
  if (targetUrl.startsWith('https') && !headers['strict-transport-security']) {
    issues.push({
      name: 'Missing HSTS (Strict-Transport-Security)',
      desc: 'HTTPS is active but HSTS is missing. HSTS enforces browsers to connect via HTTPS only, protecting against SSL stripping.',
      severity: 'HIGH'
    });
  } else if (targetUrl.startsWith('https')) {
    console.log('✅ HSTS header detected.');
  }

  // 5. CORS Wildcard Check
  const allowOrigin = headers['access-control-allow-origin'];
  if (allowOrigin === '*') {
    issues.push({
      name: 'Wildcard CORS Header',
      desc: 'Access-Control-Allow-Origin is set to "*". For applications handling authenticated user data, restrict this to authorized domains.',
      severity: 'MEDIUM'
    });
  }

  // Summary and Output
  console.log('\n====================================================');
  console.log('DAST Scan Summary:');
  
  if (issues.length === 0) {
    console.log('✅ All checked dynamic headers are secure!');
    console.log('====================================================');
    process.exit(0);
  } else {
    let high = 0, med = 0, low = 0;
    issues.forEach(issue => {
      console.log(`[${issue.severity}] ${issue.name}`);
      console.log(`  Details: ${issue.desc}\n`);
      if (issue.severity === 'HIGH') high++;
      else if (issue.severity === 'MEDIUM') med++;
      else if (issue.severity === 'LOW') low++;
    });
    console.log('====================================================');
    console.log(`Found ${issues.length} potential security recommendations:`);
    console.log(`  HIGH Severity:   ${high}`);
    console.log(`  MEDIUM Severity: ${med}`);
    console.log(`  LOW Severity:    ${low}`);
    console.log('====================================================');
    console.log('\n> NOTE: If scanning a local development server, some headers may be');
    console.log('  missing since Vite serves assets in dev mode. Ensure your production');
    console.log('  environment (e.g. Vercel, Nginx, or Supabase Hosting) enforces them.');
    process.exit(0); // DAST reports suggestions without breaking development builds
  }
});

req.on('error', (err) => {
  console.error(`❌ Error connecting to target URL ${targetUrl}: ${err.message}`);
  console.log('Make sure your development server is running ("npm run dev") or supply a live URL.');
  process.exit(1);
});
