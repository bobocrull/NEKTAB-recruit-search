import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workspaceRoot = path.resolve(__dirname, '..');
const srcDir = path.join(workspaceRoot, 'src');
const indexHtmlPath = path.join(workspaceRoot, 'index.html');

function scanDir(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      scanDir(filePath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

const VULN_PATTERNS = [
  {
    name: 'Hardcoded Secret / API Key',
    regex: /(service_role|serviceRole|secret_key|privateKey|private_key|api_key|apiKey)\s*=\s*['"`][a-zA-Z0-9_-]{30,}['"`]/gi,
    severity: 'HIGH'
  },
  {
    name: 'Unsafe innerHTML (Potential XSS)',
    regex: /dangerouslySetInnerHTML/g,
    severity: 'MEDIUM'
  },
  {
    name: 'Insecure eval() execution',
    regex: /\beval\s*\(/g,
    severity: 'HIGH'
  },
  {
    name: 'Insecure storage of sensitive credentials',
    regex: /localStorage\.setItem\(['"`](password|token|session|auth|credential)/gi,
    severity: 'MEDIUM'
  },
  {
    name: 'HTTP protocol used instead of HTTPS',
    regex: /http:\/\/[a-z0-9]/gi,
    severity: 'LOW'
  }
];

console.log('====================================================');
console.log('  NEKTAB DevSecOps SAST Scanner (OWASP & SDL)  ');
console.log('====================================================');

const files = scanDir(srcDir);
if (fs.existsSync(indexHtmlPath)) {
  files.push(indexHtmlPath);
}

console.log(`Scanning ${files.length} files in workspace...\n`);

let highSeverityCount = 0;
let mediumSeverityCount = 0;
let lowSeverityCount = 0;

// Scan code files
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // Custom checks for HTML files (verify secure meta headers)
  if (file.endsWith('index.html')) {
    const hasCSP = /http-equiv="Content-Security-Policy"/gi.test(content);
    const hasXContentType = /http-equiv="X-Content-Type-Options"/gi.test(content);
    const hasReferrer = /http-equiv="Referrer-Policy"/gi.test(content);

    if (!hasCSP) {
      console.log(`[MEDIUM] Missing Content-Security-Policy (CSP) meta header`);
      console.log(`  File: ${path.relative(workspaceRoot, file)}`);
      console.log(`  Guidance: Add <meta http-equiv="Content-Security-Policy" content="..." /> to prevent XSS.\n`);
      mediumSeverityCount++;
    }
    if (!hasXContentType) {
      console.log(`[LOW] Missing X-Content-Type-Options: nosniff meta header`);
      console.log(`  File: ${path.relative(workspaceRoot, file)}\n`);
      lowSeverityCount++;
    }
    if (!hasReferrer) {
      console.log(`[LOW] Missing Referrer-Policy meta header`);
      console.log(`  File: ${path.relative(workspaceRoot, file)}\n`);
      lowSeverityCount++;
    }
  }

  VULN_PATTERNS.forEach(pattern => {
    let match;
    pattern.regex.lastIndex = 0; // reset regex index
    while ((match = pattern.regex.exec(content)) !== null) {
      // Exclusions
      // Exclude standard chart library styling
      if (file.endsWith('chart.tsx') && pattern.name === 'Unsafe innerHTML (Potential XSS)') {
        continue;
      }
      // Exclude schema namespaces inside HTML files
      if (file.endsWith('index.html') && pattern.name === 'HTTP protocol used instead of HTTPS') {
        if (match[0].includes('w3.org') || match[0].includes('gmpg.org')) {
          continue;
        }
      }

      const lines = content.slice(0, match.index).split('\n');
      const lineNum = lines.length;
      const codeLine = lines[lineNum - 1]?.trim() || '';

      console.log(`[${pattern.severity}] ${pattern.name}`);
      console.log(`  File: ${path.relative(workspaceRoot, file)}:line ${lineNum}`);
      console.log(`  Code: ${codeLine}\n`);

      if (pattern.severity === 'HIGH') highSeverityCount++;
      else if (pattern.severity === 'MEDIUM') mediumSeverityCount++;
      else if (pattern.severity === 'LOW') lowSeverityCount++;
    }
  });
});

console.log('====================================================');
console.log('Scan Summary:');
console.log(`  HIGH Severity:   ${highSeverityCount}`);
console.log(`  MEDIUM Severity: ${mediumSeverityCount}`);
console.log(`  LOW Severity:    ${lowSeverityCount}`);
console.log('====================================================');

// Fail build if high severity vulnerabilities are found
if (highSeverityCount > 0) {
  console.log('❌ HIGH severity vulnerabilities detected. Failing SAST check.');
  process.exit(1);
} else {
  console.log('✅ SAST check passed successfully.');
  process.exit(0);
}

