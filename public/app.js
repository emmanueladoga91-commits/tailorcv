// ── State ──────────────────────────────────────────────────────────────────
var fileBuffer = null, fileName = '', busy = false, selectedPages = 2, extractedText = '';
var resumeBlobRef = null, resumeNameRef = '';
var tailoredRef = null, jdRef = '', atsResultRef = null;
var selectedProfile = null;
var selectedTemplate = 'classic';
var clLength   = 'medium';  // 'short' | 'medium' | 'long'
var clTemplate = 'classic'; // one of 10 cover letter template names
var selectedFontFamily = '';   // '' = use template default
var selectedFontSize   = 0;    // 0  = use template default (half-points)
var selectedFontStyle  = '';   // '' | 'italic' | 'bold' | 'bold-italic'

// ══════════════════════════════════════════════════════════════════════════════
// ── 18 PROFESSIONAL PROFILES ──────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
var PROFILES = {
  tech: {
    name: 'Software & Tech',
    extraRules: [
      'TECH PROFILE RULES:',
      '- Lead every bullet with the specific technology, language, framework, or platform used.',
      '- Quantify with system-scale metrics: users served, requests/sec, uptime %, latency improvements, code coverage %, build time reductions.',
      '- TECHNICAL SKILLS & TOOLS is the most critical section — list comprehensively by category: Languages, Frameworks, Cloud Platforms, Databases, DevOps, Testing, APIs.',
      '- Use engineering verbs: architected, implemented, optimised, refactored, deployed, automated, integrated, migrated, containerised.',
      '- Core Competencies must reflect technical disciplines and methodologies, not generic soft skills.',
      '- Mirror the exact tech stack terminology from the JD (e.g., if JD says "Kubernetes", do not write "container orchestration").'
    ].join('\n')
  },
  business: {
    name: 'Business & Operations',
    extraRules: [
      'BUSINESS PROFILE RULES:',
      '- Every bullet must name the specific methodology or tool used (Lean Six Sigma DMAIC, BPMN process maps, Power BI dashboards, SQL queries, workshop facilitation guides).',
      '- Quantify with: cost savings $, efficiency gains %, process cycle time reduction, headcount managed, stakeholder counts, project dollar values, KPI improvements.',
      '- Focus on process improvement, requirements analysis, stakeholder engagement, and data-driven recommendations.',
      '- Use language: optimised, streamlined, aligned, facilitated, drove, implemented, analysed, developed, coordinated, documented.',
      '- Core Competencies: BA tools, process methodologies, stakeholder management, data analytics.'
    ].join('\n')
  },
  finance: {
    name: 'Finance & Accounting',
    extraRules: [
      'FINANCE PROFILE RULES:',
      '- Name specific financial systems, standards, or regulations in every bullet (GAAP, IFRS, SOX, SAP, Oracle Financials, Hyperion, Bloomberg).',
      '- Quantify with: dollar amounts, budget sizes, forecast accuracy %, variance reductions %, audit findings eliminated, cost savings, revenue impact.',
      '- Focus on financial impact, reporting accuracy, compliance adherence, and risk management.',
      '- Use precise language: prepared, analysed, reconciled, forecasted, audited, reported, modelled, consolidated, mitigated, advised.',
      '- Core Competencies: financial systems, accounting standards, analytical tools, regulatory frameworks, reporting tools.'
    ].join('\n')
  },
  healthcare: {
    name: 'Healthcare & Clinical',
    extraRules: [
      'HEALTHCARE PROFILE RULES:',
      '- Reference specific clinical procedures, standards, or regulations in every bullet (JCAHO, HIPAA, evidence-based protocols, EHR systems like Epic or Cerner).',
      '- Quantify with: patient volumes, outcome improvement %, readmission rate reductions, compliance scores, staff trained, adverse event reductions, wait time decreases.',
      '- Focus on patient outcomes, clinical quality, safety standards, and regulatory compliance.',
      '- Use clinical language: administered, assessed, coordinated, implemented, improved, ensured compliance, educated, monitored, documented, triaged.',
      '- Core Competencies: clinical skills, certifications (list specific ones), care delivery methodologies, regulatory frameworks.'
    ].join('\n')
  },
  marketing: {
    name: 'Marketing & Creative',
    extraRules: [
      'MARKETING PROFILE RULES:',
      '- Name specific platforms, tools, or channels in every bullet (Google Analytics 4, HubSpot, Salesforce Marketing Cloud, Meta Ads, SEMrush, Mailchimp, Figma).',
      '- Quantify with: engagement rates, conversion rates, revenue attributed, MQL/SQL generated, CPL/CPA improvements, ROAS, follower growth, open rates.',
      '- Focus on campaign performance, brand growth, content strategy, and measurable ROI.',
      '- Use results language: launched, grew, optimised, created, drove, managed, produced, A/B tested, scaled, rebranded.',
      '- Core Competencies: marketing platforms, content channels, analytics tools, campaign types, creative disciplines.'
    ].join('\n')
  },
  pm: {
    name: 'Project Management',
    extraRules: [
      'PROJECT MANAGEMENT PROFILE RULES:',
      '- Name specific methodologies and tools in every bullet (PRINCE2, PMP, Agile, Scrum, SAFe, Waterfall, Hybrid, Jira, MS Project, Asana, Confluence, RAID logs).',
      '- Quantify with: project values ($), on-time delivery %, budget variance %, team sizes, risks mitigated, stakeholder counts, milestones delivered.',
      '- Focus on project delivery, governance, stakeholder management, risk mitigation, and team leadership.',
      '- Use delivery language: delivered, managed, coordinated, mitigated, facilitated, led, tracked, governed, escalated, reported.',
      '- Core Competencies: PM methodologies, risk frameworks, governance tools, change management, leadership.'
    ].join('\n')
  },
  sales: {
    name: 'Sales & Business Dev',
    extraRules: [
      'SALES PROFILE RULES:',
      '- Include specific sales metrics in every bullet: quota attainment %, deal values ($), pipeline value, win rates, ARR/MRR, accounts won, revenue growth %.',
      '- Lead with highest revenue impact achievements first within each role.',
      '- Quantify relationships: accounts managed, territories covered, team size led, deals closed per quarter.',
      '- Use results language: closed, generated, grew, achieved, cultivated, drove, secured, negotiated, presented, prospected, retained.',
      '- Core Competencies: CRM tools (Salesforce, HubSpot), sales methodologies (SPIN, Challenger, MEDDIC), territory management, pipeline, negotiation.'
    ].join('\n')
  },
  legal: {
    name: 'Legal & Compliance',
    extraRules: [
      'LEGAL PROFILE RULES:',
      '- Name specific legal areas, regulations, or jurisdiction frameworks in every bullet (GDPR, AML, ASIC regulations, contract law, employment law, corporate governance).',
      '- Quantify where possible: cases handled, contracts reviewed and negotiated, compliance rates improved, penalties avoided ($), settlements achieved, cost savings.',
      '- Focus on legal expertise, regulatory compliance, risk mitigation, and client advisory or representation.',
      '- Use precise language: advised, drafted, negotiated, represented, ensured compliance, mitigated, researched, argued, interpreted, reviewed.',
      '- Core Competencies: practice areas, regulatory frameworks, legal research tools (LexisNexis, Westlaw), drafting expertise.'
    ].join('\n')
  },
  data: {
    name: 'Data Science & AI',
    extraRules: [
      'DATA SCIENCE & AI PROFILE RULES:',
      '- Every bullet must name specific tools, libraries, algorithms, or platforms (Python, R, TensorFlow, PyTorch, scikit-learn, Spark, Databricks, Snowflake, dbt, Tableau, Power BI).',
      '- Quantify with: model accuracy %, precision/recall, AUC-ROC, % reduction in prediction error, data volume (TB/PB processed), business impact of models deployed, time savings.',
      '- Focus on model development lifecycle, data engineering, statistical analysis, and translating insights into business value.',
      '- Use data science language: developed models, trained, validated, deployed, engineered features, queried, visualised, predicted, automated pipelines, productionised.',
      '- Core Competencies: ML/AI frameworks, statistical methods, data platforms, programming languages, visualisation tools.'
    ].join('\n')
  },
  engineering: {
    name: 'Engineering (Civil/Mech/Elec)',
    extraRules: [
      'ENGINEERING PROFILE RULES:',
      '- Every bullet must reference specific engineering standards, tools, or methodologies (AutoCAD, SolidWorks, MATLAB, AS/NZS standards, ISO standards, FEA, CFD, PLC programming, SCADA).',
      '- Quantify with: project values ($), engineering tolerances, load capacities, energy efficiency improvements %, cost reductions, safety incident reductions, on-time delivery %.',
      '- Focus on technical design, systems engineering, safety compliance, and project delivery.',
      '- Use engineering language: designed, specified, modelled, commissioned, inspected, optimised, tested, certified, supervised, coordinated.',
      '- Core Competencies: engineering software, technical standards, design methodologies, project delivery tools, HSE frameworks.'
    ].join('\n')
  },
  education: {
    name: 'Education & Teaching',
    extraRules: [
      'EDUCATION PROFILE RULES:',
      '- Every bullet must name specific curriculum frameworks, assessment tools, or pedagogical approaches (Australian Curriculum, IB, differentiated instruction, UDL, formative assessment strategies).',
      '- Quantify with: student cohort sizes, improvement in assessment outcomes %, attendance improvements, programs developed, colleagues mentored, community partnerships built.',
      '- Focus on student outcomes, curriculum design, differentiated learning, classroom management, and professional collaboration.',
      '- Use education language: designed, delivered, implemented, assessed, differentiated, mentored, collaborated, developed, coached, evaluated.',
      '- Core Competencies: curriculum frameworks, assessment methodologies, classroom technology, learning management systems, student support strategies.'
    ].join('\n')
  },
  hr: {
    name: 'Human Resources',
    extraRules: [
      'HUMAN RESOURCES PROFILE RULES:',
      '- Every bullet must name specific HR systems, frameworks, or methodologies (Workday, SAP SuccessFactors, HRIS, competency frameworks, performance review cycles, EVP, organisational design).',
      '- Quantify with: headcount managed, time-to-hire reductions, attrition rate improvements %, engagement score improvements, training participants, cost-per-hire reductions, policies developed.',
      '- Focus on talent acquisition, employee lifecycle, culture, compliance, and organisational effectiveness.',
      '- Use HR language: partnered, developed, implemented, recruited, coached, facilitated, designed, advised, ensured compliance, reported.',
      '- Core Competencies: HR systems, employment legislation, talent management, L&D, employee relations, organisational development.'
    ].join('\n')
  },
  ux: {
    name: 'UX/UI & Product Design',
    extraRules: [
      'UX/UI & PRODUCT DESIGN PROFILE RULES:',
      '- Every bullet must name specific design tools, research methods, or frameworks (Figma, Sketch, Adobe XD, InVision, Miro, user interviews, usability testing, design systems, accessibility WCAG 2.1).',
      '- Quantify with: usability test improvements %, task completion rates, conversion rate improvements, user satisfaction scores, design system components built, time saved through design tooling.',
      '- Focus on user research, interaction design, prototyping, usability testing, and design system development.',
      '- Use design language: designed, prototyped, researched, tested, iterated, shipped, facilitated, collaborated, defined, validated.',
      '- Core Competencies: design tools, research methodologies, prototyping, accessibility standards, design systems, product thinking.'
    ].join('\n')
  },
  cyber: {
    name: 'Cybersecurity & IT',
    extraRules: [
      'CYBERSECURITY & IT PROFILE RULES:',
      '- Every bullet must name specific security frameworks, tools, or certifications (NIST CSF, ISO 27001, SOC 2, SIEM tools like Splunk/Sentinel, OWASP, penetration testing tools, zero-trust architecture).',
      '- Quantify with: vulnerabilities identified and remediated, incidents responded to, downtime reduced %, systems secured, compliance audits passed, mean time to detect/respond improvements.',
      '- Focus on threat detection, incident response, security architecture, compliance, and risk management.',
      '- Use security language: identified, mitigated, detected, responded to, hardened, audited, implemented, governed, assessed, remediated.',
      '- Core Competencies: security tools, compliance frameworks, network security, identity management, threat intelligence, incident response.'
    ].join('\n')
  },
  supplychain: {
    name: 'Supply Chain & Logistics',
    extraRules: [
      'SUPPLY CHAIN & LOGISTICS PROFILE RULES:',
      '- Every bullet must name specific tools, platforms, or methodologies (SAP ERP, Oracle SCM, WMS, TMS, Lean manufacturing, Six Sigma, demand planning tools, S&OP processes).',
      '- Quantify with: cost reductions ($), on-time delivery %, inventory turns, lead time reductions, fill rates, supplier performance improvements, warehouse efficiency gains.',
      '- Focus on procurement, inventory optimisation, supplier management, logistics, and end-to-end supply chain visibility.',
      '- Use supply chain language: managed, optimised, sourced, negotiated, coordinated, reduced, improved, streamlined, analysed, tracked.',
      '- Core Competencies: ERP systems, supply chain methodologies, procurement tools, logistics platforms, demand planning.'
    ].join('\n')
  },
  government: {
    name: 'Government & Public Sector',
    extraRules: [
      'GOVERNMENT & PUBLIC SECTOR PROFILE RULES:',
      '- Reference specific government frameworks, legislation, or policies in every bullet (APS Code of Conduct, Westminster principles, Budget Management Act, FOI, service delivery frameworks).',
      '- Quantify with: program budget managed ($), stakeholder and community groups engaged, policy documents developed, efficiency savings, service delivery improvements, staff managed.',
      '- Focus on policy development, stakeholder engagement, public value, program delivery, and ministerial support.',
      '- Use public sector language: developed, advised, coordinated, consulted, evaluated, managed, reported, drafted, implemented, engaged.',
      '- Core Competencies: policy frameworks, government legislation, stakeholder engagement methods, program governance, reporting tools.'
    ].join('\n')
  },
  nonprofit: {
    name: 'Non-Profit & Social Impact',
    extraRules: [
      'NON-PROFIT & SOCIAL IMPACT PROFILE RULES:',
      '- Every bullet must name specific programs, funding bodies, impact frameworks, or tools (Theory of Change, logic models, grant writing, CRM tools, community development models, SROI).',
      '- Quantify with: funds raised ($), beneficiaries served, community programs delivered, volunteers managed, grant success rates, partnership outcomes, impact metrics.',
      '- Focus on mission delivery, fundraising, community engagement, partnerships, and stakeholder reporting.',
      '- Use sector language: facilitated, advocated, coordinated, fundraised, engaged, partnered, delivered, reported, evaluated, mobilised.',
      '- Core Competencies: program management, grant writing, community engagement, impact measurement, fundraising platforms, stakeholder reporting.'
    ].join('\n')
  },
  realestate: {
    name: 'Real Estate & Property',
    extraRules: [
      'REAL ESTATE & PROPERTY PROFILE RULES:',
      '- Every bullet must name specific property types, market conditions, tools, or legislation (residential/commercial/industrial, CRM platforms like Rex or Salesforce, Property Management software, tenancy legislation, planning frameworks).',
      '- Quantify with: sales volumes ($), properties managed, lease values, occupancy rates %, days on market reductions, portfolio value ($), client satisfaction scores, commission earned.',
      '- Focus on sales performance, property management, client relationships, market analysis, and regulatory compliance.',
      '- Use real estate language: sold, leased, negotiated, managed, appraised, marketed, advised, coordinated, listed, settled.',
      '- Core Competencies: real estate CRM, property management platforms, market appraisal, negotiation, tenancy law, financial analysis.'
    ].join('\n')
  }
};


// ── Web app auth ────────────────────────────────────────────────────────────
var currentUser = null;
var _umPlan = 'monthly';

function getToken() { return localStorage.getItem('tc_token') || ''; }

function loadCurrentUser() {
  try {
    var u = localStorage.getItem('tc_user');
    if (u) currentUser = JSON.parse(u);
  } catch(e) {}
  if (currentUser) renderUserMenu();
  fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + getToken() } })
    .then(function(r){ return r.json(); })
    .then(function(d){
      if (d.user) {
        currentUser = d.user;
        localStorage.setItem('tc_user', JSON.stringify(d.user));
        renderUserMenu();
        // Load vault in background once we know user is authenticated
        setTimeout(eagerLoadVault, 600);
      }
    }).catch(function(){});
}

function renderUserMenu() {
  if (!currentUser) return;
  var isPro = currentUser.is_owner || (currentUser.plan === 'pro' && ['active','beta'].includes(currentUser.subscriptionStatus || currentUser.subscription_status));
  window._tcUserIsPro = isPro;
  var badge = document.getElementById('userPlanBadge');
  var emailEl = document.getElementById('userEmailDisplay');
  if (badge) { badge.textContent = isPro ? 'PRO' : 'FREE'; badge.className = 'user-plan-badge' + (isPro ? ' pro' : ''); }
  if (emailEl) emailEl.textContent = currentUser.email || '';
  var ftb = document.getElementById('freeTierBanner');
  if (ftb && !isPro && (currentUser.tailoringCount || 0) >= 1) ftb.classList.add('on');
}

function doLogout() {
  localStorage.removeItem('tc_token');
  localStorage.removeItem('tc_user');
  window.location.href = '/auth.html';
}

function showUpgradeModal(msg) {
  var modal = document.getElementById('upgradeModal');
  var msgEl = document.getElementById('upgradeModalMsg');
  if (msgEl && msg) msgEl.textContent = msg;
  if (modal) modal.style.display = 'flex';
}

function closeUpgradeModal() {
  var modal = document.getElementById('upgradeModal');
  if (modal) modal.style.display = 'none';
}

function umSelectPlan(plan) {
  _umPlan = plan;
  document.getElementById('umOptMonthly').style.borderColor = plan === 'monthly' ? '#4f6ef7' : '#e2e8f0';
  document.getElementById('umOptMonthly').style.background  = plan === 'monthly' ? '#eef2ff' : '#fff';
  document.getElementById('umOptAnnual').style.borderColor  = plan === 'annual'  ? '#4f6ef7' : '#e2e8f0';
  document.getElementById('umOptAnnual').style.background   = plan === 'annual'  ? '#eef2ff' : '#fff';
}

async function startUpgradeCheckout() {
  var btn = document.getElementById('umUpgradeBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Redirecting…'; }
  try {
    var res = await fetch('/api/billing/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken() },
      body: JSON.stringify({ plan: _umPlan }),
    });
    var data = await res.json();
    if (data.url) { window.location.href = data.url; }
    else { alert(data.error || 'Could not start checkout. Please try from Account page.'); }
  } catch(e) { alert('Network error. Please try again.'); }
  if (btn) { btn.disabled = false; btn.textContent = 'Upgrade to Pro →'; }
}


// ── Page length instructions ────────────────────────────────────────────────
var PAGE_INSTR = {
  1: 'PAGE LENGTH: MUST fit exactly 1 page. Summary: 2 sentences max. Competencies: exactly 12 short items. Experience: 2 most recent roles only, 1 project max per role, 3 bullets max per role. Technical Skills: one short line per category. Certifications: 2 most relevant. Omit anything not critical.',
  2: 'PAGE LENGTH: MUST fit exactly 2 pages. Summary: 3-4 sentences. Competencies: exactly 12 items. Experience: up to 3 roles, 1-2 projects, 4-5 bullets each. Full technical skills. Full certifications and education.',
  3: 'PAGE LENGTH: approximately 3 pages. Summary: 4-5 sentences. Competencies: 12 items. Experience: all relevant roles, 2-3 projects each, 6-8 bullets with specifics. Comprehensive technical skills.',
  4: 'PAGE LENGTH: approximately 4 pages. Comprehensive. Summary: 5-6 sentences. Experience: all roles, 3-4 projects each, 8-10 rich bullets with context and outcomes. Full all sections.',
  5: 'PAGE LENGTH: approximately 5 pages. Exhaustive. Summary: 6+ sentences. Experience: every role, 4-5 projects, 10-12 bullets with full context, tools, and outcomes.'
};

// ── Profile style: which profiles use project-block structure ──────────────
// Tech-forward and business-project profiles get:
//   Role → Project summaries → "Roles/Responsibilities" → bullets
// All other profiles get flat bullets directly under each role (no project headers).
var PROJECT_STYLE_PROFILES = ['tech','business','pm','data','engineering'];
function isProjectProfile(profileKey) {
  return PROJECT_STYLE_PROFILES.indexOf(profileKey) !== -1;
}

// ── System prompt builder ──────────────────────────────────────────────────
function getSystemPrompt(profileKey, pages) {
  var profile = PROFILES[profileKey] || PROFILES.business;
  var projectRule = isProjectProfile(profileKey)
    ? '7. WORK EXPERIENCE FORMAT — PROJECT STYLE: For each role, first list 1-3 key project summaries in the "projects" array (format: title "Project N: [Descriptive Name]", description 1-2 sentences on scope and outcome). Then list detailed "Roles/Responsibilities" bullets in the "responsibilities" array. Every bullet must name the specific tool or technique used.'
    : '7. WORK EXPERIENCE FORMAT — DIRECT BULLET STYLE: The "projects" array MUST be empty [] for every role. Do NOT use any project groupings, "Project 1:", "Project 2:" headers, or "Roles/Responsibilities" labels. Write ALL work content as strong, quantified achievement bullets directly in the "responsibilities" array. Each bullet opens with an action verb and names the specific tool, method, or outcome. This profile does not suit project-based formatting.';

  return [
    'You are a specialist resume writer. You parse resumes and tailor them precisely to job descriptions without ever inventing facts.',
    '',
    'JD ANALYSIS PROCESS (apply before writing each section):',
    '- BLUE keywords → Professional Summary: people-centred language, role mandate, working style',
    '- GREEN keywords → Key Skills / Core Competence: skills, tools, behaviours the JD names or implies',
    '- RED keywords → Work Experience: specific responsibilities, deliverables, and tools the JD requires',
    '- INDIGO keywords → Cover Letter: motivation, values, org competencies, personal tone',
    '',
    'UNIVERSAL RULES:',
    '1. NEVER fabricate achievements, tools, metrics, or experiences not present in the original resume.',
    '2. Natural human tone. No corporate filler phrases ("synergised", "leveraged", "holistic", "robust", etc.).',
    '3. SPECIFICITY RULE: Every bullet must name the specific technique, tool, or metric. Never say "analysed" without saying how. Never say "managed" without saying what and at what scale.',
    '4. NO EM DASHES anywhere. Use commas, parentheses, or restructure sentences.',
    '5. PROFESSIONAL SUMMARY: Open with "A [adjective] [exact job title from JD]..." — set summaryTitle to "PROFESSIONAL SUMMARY - [exact job title from JD]". HARD LIMIT: maximum 5 lines (≈60 words). No matter the page count, keep the summary concise and punchy.',
    '6. KEY SKILLS / CORE COMPETENCE: Exactly 12 items. Front-load the most JD-relevant ones.',
    projectRule,
    '8. Keep all real metrics from the original resume. Do not water down quantified achievements.',
    '9. COVER LETTER: Conversational tone. 4 body paragraphs. Closing starts "Thank you for your time and consideration." Sign-off: "Warm regards,".',
    '10. ' + (PAGE_INSTR[pages] || PAGE_INSTR[2]),
    '11. Return ONLY valid JSON — no markdown fences, no explanation, no text before or after the JSON object.',
    '',
    profile.extraRules
  ].join('\n');
}

// ══════════════════════════════════════════════════════════════════════════════
// ── 13 TEMPLATE CONFIGURATIONS ─────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
// Visual fields:
//   hdrStyle: 'plain-center'|'banner'|'gradient-banner'|'dark-banner'|
//             'top-stripe'|'light-banner'|'double-border'|'accent-top'|
//             'color-left'|'plain-left'
//   headerBg/headerFg: colours for banner headers
//   secHdr:  'underline'|'double'|'left-bar'|'block-bg'|'caps-gray'|'dots'|'color-underline'
//   secCase: 'upper'|'title'
//   skillsRender: 'grid2'|'pills'|'tags'|'inline'|'single'
var TEMPLATES = {
  classic: {
    FONT:'Calibri', B:20, NP:56, nameAlign:'CENTER',
    secBorder:'SINGLE', secColor:'000000', secBorderSz:6,
    MAR:1080, secBefore:220, secAfter:100, bodyAfter:120, roleAfter:180,
    order:['summary','skills','experience','tech','certs','edu'],
    names:{ summary:'PROFESSIONAL SUMMARY', skills:'KEY SKILLS / CORE COMPETENCE', experience:'WORK EXPERIENCE', tech:'TECHNICAL SKILLS & TOOLS', certs:'CERTIFICATIONS AND TRAINING', edu:'EDUCATION' },
    pvAccent:'#111111',
    hdrStyle:'plain-center', secHdr:'underline', secCase:'upper', skillsRender:'grid2'
  },
  executive: {
    FONT:'Times New Roman', B:20, NP:60, nameAlign:'CENTER',
    secBorder:'DOUBLE', secColor:'1b3a2f', secBorderSz:6,
    MAR:1080, secBefore:280, secAfter:120, bodyAfter:140, roleAfter:200,
    order:['summary','skills','experience','tech','certs','edu'],
    names:{ summary:'EXECUTIVE SUMMARY', skills:'LEADERSHIP COMPETENCIES', experience:'PROFESSIONAL EXPERIENCE', tech:'TECHNICAL CAPABILITIES', certs:'PROFESSIONAL CREDENTIALS', edu:'EDUCATION & QUALIFICATIONS' },
    pvAccent:'#1b3a2f',
    hdrStyle:'banner', headerBg:'#1b3a2f', headerFg:'#ffffff',
    secHdr:'double', secCase:'upper', skillsRender:'grid2'
  },
  modern: {
    FONT:'Calibri', B:20, NP:56, nameAlign:'CENTER',
    secBorder:'SINGLE', secColor:'6366f1', secBorderSz:6,
    MAR:1080, secBefore:220, secAfter:100, bodyAfter:120, roleAfter:180,
    order:['summary','skills','experience','tech','certs','edu'],
    names:{ summary:'Profile', skills:'Competencies', experience:'Experience', tech:'Skills & Technologies', certs:'Certifications', edu:'Education' },
    pvAccent:'#6366f1', accentBar:true,
    hdrStyle:'gradient-banner', headerBg:'linear-gradient(135deg,#6366f1,#2d5a8e)', headerFg:'#ffffff',
    secHdr:'color-underline', secCase:'title', skillsRender:'pills'
  },
  professional: {
    FONT:'Calibri', B:20, NP:56, nameAlign:'CENTER',
    secBorder:'SINGLE', secColor:'1e3a5f', secBorderSz:6,
    MAR:1080, secBefore:240, secAfter:100, bodyAfter:120, roleAfter:180,
    order:['summary','skills','experience','tech','certs','edu'],
    names:{ summary:'PROFESSIONAL SUMMARY', skills:'CORE COMPETENCIES', experience:'PROFESSIONAL EXPERIENCE', tech:'TECHNICAL PROFICIENCIES', certs:'CREDENTIALS & TRAINING', edu:'EDUCATION' },
    pvAccent:'#1e3a5f',
    hdrStyle:'plain-center', secHdr:'left-bar', secCase:'upper', skillsRender:'grid2'
  },
  minimal: {
    FONT:'Arial', B:20, NP:52, nameAlign:'LEFT',
    secBorder:'NONE', secColor:'111111', secBorderSz:0,
    MAR:1080, secBefore:260, secAfter:80, bodyAfter:120, roleAfter:160,
    order:['summary','skills','experience','tech','certs','edu'],
    names:{ summary:'Summary', skills:'Skills', experience:'Experience', tech:'Technical', certs:'Certifications', edu:'Education' },
    pvAccent:'#555555', minimal:true,
    hdrStyle:'plain-left', secHdr:'caps-gray', secCase:'upper', skillsRender:'inline'
  },
  tech: {
    FONT:'Calibri', B:20, NP:56, nameAlign:'LEFT',
    secBorder:'SINGLE', secColor:'0284c7', secBorderSz:6,
    MAR:1080, secBefore:220, secAfter:100, bodyAfter:120, roleAfter:180,
    order:['summary','tech','skills','experience','certs','edu'],
    names:{ summary:'PROFILE', skills:'COMPETENCIES', experience:'EXPERIENCE', tech:'TECH STACK', certs:'CERTIFICATIONS', edu:'EDUCATION' },
    pvAccent:'#0284c7',
    hdrStyle:'dark-banner', headerBg:'#0f172a', headerFg:'#38bdf8',
    secHdr:'left-bar', secCase:'upper', skillsRender:'tags'
  },
  consulting: {
    FONT:'Calibri', B:20, NP:56, nameAlign:'CENTER',
    secBorder:'THICK', secColor:'7f1d1d', secBorderSz:12,
    MAR:1080, secBefore:240, secAfter:80, bodyAfter:100, roleAfter:180,
    order:['summary','skills','experience','tech','certs','edu'],
    names:{ summary:'PROFESSIONAL SUMMARY', skills:'CORE COMPETENCIES', experience:'PROFESSIONAL EXPERIENCE', tech:'TECHNICAL SKILLS', certs:'CERTIFICATIONS & TRAINING', edu:'EDUCATION' },
    pvAccent:'#7f1d1d',
    hdrStyle:'accent-top', headerBg:'#7f1d1d',
    secHdr:'left-bar', secCase:'upper', skillsRender:'grid2'
  },
  academic: {
    FONT:'Georgia', B:20, NP:56, nameAlign:'CENTER',
    secBorder:'SINGLE', secColor:'78350f', secBorderSz:6,
    MAR:1080, secBefore:220, secAfter:100, bodyAfter:120, roleAfter:180,
    order:['summary','edu','skills','certs','experience','tech'],
    names:{ summary:'Academic Profile', skills:'Areas of Expertise', experience:'Professional Experience', tech:'Research & Technical Skills', certs:'Qualifications & Licences', edu:'Education & Academic Credentials' },
    pvAccent:'#78350f',
    hdrStyle:'plain-center', secHdr:'dots', secCase:'title', skillsRender:'single'
  },
  entrylevel: {
    FONT:'Calibri', B:20, NP:54, nameAlign:'CENTER',
    secBorder:'SINGLE', secColor:'0369a1', secBorderSz:6,
    MAR:1080, secBefore:220, secAfter:100, bodyAfter:120, roleAfter:180,
    order:['summary','edu','skills','experience','tech','certs'],
    names:{ summary:'Objective', skills:'Skills & Competencies', experience:'Experience', tech:'Technical Skills', certs:'Certifications', edu:'Education' },
    pvAccent:'#0369a1',
    hdrStyle:'light-banner', headerBg:'#e0f2fe', headerFg:'#0369a1',
    secHdr:'underline', secCase:'title', skillsRender:'grid2'
  },
  government: {
    FONT:'Times New Roman', B:20, NP:56, nameAlign:'CENTER',
    secBorder:'THICK', secColor:'1e3a5f', secBorderSz:10,
    MAR:1080, secBefore:240, secAfter:100, bodyAfter:130, roleAfter:190,
    order:['summary','skills','experience','tech','certs','edu'],
    names:{ summary:'PROFESSIONAL SUMMARY', skills:'KEY CAPABILITIES', experience:'EMPLOYMENT HISTORY', tech:'TECHNICAL SKILLS & SYSTEMS', certs:'QUALIFICATIONS & PROFESSIONAL DEVELOPMENT', edu:'EDUCATION' },
    pvAccent:'#1e3a5f',
    hdrStyle:'double-border',
    secHdr:'block-bg', secCase:'upper', skillsRender:'single'
  },
  creative: {
    FONT:'Calibri', B:20, NP:54, nameAlign:'LEFT',
    secBorder:'SINGLE', secColor:'0d9488', secBorderSz:6,
    MAR:1080, secBefore:220, secAfter:100, bodyAfter:120, roleAfter:180,
    order:['summary','skills','experience','tech','certs','edu'],
    names:{ summary:'ABOUT ME', skills:'SKILLS & EXPERTISE', experience:'EXPERIENCE', tech:'TOOLS & TECHNOLOGIES', certs:'CERTIFICATIONS', edu:'EDUCATION' },
    pvAccent:'#0d9488',
    hdrStyle:'color-left', headerBg:'#0d9488', headerFg:'#ffffff',
    secHdr:'color-underline', secCase:'upper', skillsRender:'pills'
  },
  healthcare: {
    FONT:'Calibri', B:20, NP:56, nameAlign:'CENTER',
    secBorder:'SINGLE', secColor:'0f766e', secBorderSz:6,
    MAR:1080, secBefore:220, secAfter:100, bodyAfter:120, roleAfter:180,
    order:['summary','skills','experience','tech','certs','edu'],
    names:{ summary:'Clinical Profile', skills:'Clinical Competencies', experience:'Clinical & Professional Experience', tech:'Clinical Systems & Tools', certs:'Licences, Registrations & Certifications', edu:'Education & Training' },
    pvAccent:'#0f766e',
    hdrStyle:'top-stripe', headerBg:'#0f766e',
    secHdr:'underline', secCase:'title', skillsRender:'single'
  },
  compact: {
    FONT:'Calibri', B:18, NP:48, nameAlign:'LEFT',
    secBorder:'SINGLE', secColor:'4b5563', secBorderSz:4,
    MAR:720, secBefore:160, secAfter:60, bodyAfter:80, roleAfter:120,
    order:['summary','skills','experience','tech','certs','edu'],
    names:{ summary:'SUMMARY', skills:'SKILLS', experience:'EXPERIENCE', tech:'TECHNICAL', certs:'CERTS', edu:'EDUCATION' },
    pvAccent:'#4b5563', compact:true,
    hdrStyle:'plain-left', secHdr:'caps-gray', secCase:'upper', skillsRender:'inline'
  }
};

// ── Custom template config (mutable — edited live by the customizer UI) ───────
var customConfig = {
  FONT:'Calibri', B:22, NP:56, nameAlign:'CENTER',
  secBorder:'SINGLE', secColor:'1a2744', secBorderSz:6,
  MAR:900, secBefore:200, secAfter:80, bodyAfter:100, roleAfter:140,
  order:['summary','skills','experience','tech','certs','edu'],
  names:{ summary:'PROFESSIONAL SUMMARY', skills:'KEY SKILLS', experience:'WORK EXPERIENCE', tech:'TECHNICAL SKILLS', certs:'CERTIFICATIONS', edu:'EDUCATION' },
  hidden:{},          // { sectionKey: true } — hidden sections
  pvAccent:'#1a2744',
  headerBg:'#1a2744', headerFg:'#ffffff',
  hdrStyle:'banner', secHdr:'underline', secCase:'upper', skillsRender:'grid2',
  spacing:'normal'    // 'compact' | 'normal' | 'spacious'
};

// ── Custom template helpers ───────────────────────────────────────────────
function isLightColor(hex){
  hex = hex.replace('#','');
  var r = parseInt(hex.substring(0,2),16);
  var g = parseInt(hex.substring(2,4),16);
  var b = parseInt(hex.substring(4,6),16);
  return (r*299 + g*587 + b*114) / 1000 > 155;
}

function applyCustomConfig(){
  // Rebuild preview if custom template is selected
  if(selectedTemplate !== 'custom') return;
  var data = tailoredRef || getLoremData();
  var pvPage = document.getElementById('pvPage');
  if(pvPage) pvPage.innerHTML = buildResumeHtml(data, 'custom');
  var tpvPage = document.getElementById('tpvPage');
  if(tpvPage) tpvPage.innerHTML = buildResumeHtml(data, 'custom');
}

function initCustomizer(){
  var panel = document.getElementById('custPanel');
  if(!panel) return;

  // ── Header layout ──
  document.getElementById('custHdrStyle').addEventListener('change', function(){
    customConfig.hdrStyle = this.value;
    // Show/hide banner color row for layouts that use a background color
    var hasBanner = ['banner','gradient-banner','dark-banner','light-banner'].indexOf(this.value) !== -1;
    document.getElementById('custBannerRow').style.display = hasBanner ? '' : 'none';
    applyCustomConfig();
  });

  // ── Accent colour swatches ──
  panel.querySelectorAll('[data-color]').forEach(function(sw){
    sw.addEventListener('click', function(){
      panel.querySelectorAll('[data-color]').forEach(function(s){ s.classList.remove('on'); });
      sw.classList.add('on');
      customConfig.pvAccent = sw.getAttribute('data-color');
      customConfig.secColor = sw.getAttribute('data-color').replace('#','');
      document.getElementById('custAccentPicker').value = sw.getAttribute('data-color');
      applyCustomConfig();
    });
  });
  document.getElementById('custAccentPicker').addEventListener('input', function(){
    panel.querySelectorAll('[data-color]').forEach(function(s){ s.classList.remove('on'); });
    customConfig.pvAccent = this.value;
    customConfig.secColor = this.value.replace('#','');
    applyCustomConfig();
  });

  // ── Banner/header colour swatches ──
  panel.querySelectorAll('[data-bcolor]').forEach(function(sw){
    sw.addEventListener('click', function(){
      panel.querySelectorAll('[data-bcolor]').forEach(function(s){ s.classList.remove('on'); });
      sw.classList.add('on');
      var col = sw.getAttribute('data-bcolor');
      customConfig.headerBg = col;
      customConfig.headerFg = isLightColor(col) ? '#1a2744' : '#ffffff';
      document.getElementById('custBannerPicker').value = col;
      applyCustomConfig();
    });
  });
  document.getElementById('custBannerPicker').addEventListener('input', function(){
    panel.querySelectorAll('[data-bcolor]').forEach(function(s){ s.classList.remove('on'); });
    customConfig.headerBg = this.value;
    customConfig.headerFg = isLightColor(this.value) ? '#1a2744' : '#ffffff';
    applyCustomConfig();
  });

  // ── Section dividers ──
  panel.querySelectorAll('[data-sechdr]').forEach(function(btn){
    btn.addEventListener('click', function(){
      panel.querySelectorAll('[data-sechdr]').forEach(function(b){ b.classList.remove('on'); });
      btn.classList.add('on');
      customConfig.secHdr = btn.getAttribute('data-sechdr');
      applyCustomConfig();
    });
  });

  // ── Section case ──
  panel.querySelectorAll('[data-seccase]').forEach(function(btn){
    btn.addEventListener('click', function(){
      panel.querySelectorAll('[data-seccase]').forEach(function(b){ b.classList.remove('on'); });
      btn.classList.add('on');
      customConfig.secCase = btn.getAttribute('data-seccase');
      applyCustomConfig();
    });
  });

  // ── Skills display ──
  panel.querySelectorAll('[data-skills]').forEach(function(btn){
    btn.addEventListener('click', function(){
      panel.querySelectorAll('[data-skills]').forEach(function(b){ b.classList.remove('on'); });
      btn.classList.add('on');
      customConfig.skillsRender = btn.getAttribute('data-skills');
      applyCustomConfig();
    });
  });

  // ── Page spacing ──
  panel.querySelectorAll('[data-spacing]').forEach(function(btn){
    btn.addEventListener('click', function(){
      panel.querySelectorAll('[data-spacing]').forEach(function(b){ b.classList.remove('on'); });
      btn.classList.add('on');
      customConfig.spacing = btn.getAttribute('data-spacing');
      applyCustomConfig();
    });
  });

  // ── Section order — drag-and-drop ──
  var secList = document.getElementById('custSecList');
  var dragSrc = null;
  secList.querySelectorAll('.sec-ord-item').forEach(function(item){
    item.addEventListener('dragstart', function(e){
      dragSrc = item;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', function(){
      item.classList.remove('dragging');
      secList.querySelectorAll('.sec-ord-item').forEach(function(i){ i.classList.remove('drag-over'); });
      // Sync order to customConfig
      var order = [];
      secList.querySelectorAll('.sec-ord-item').forEach(function(i){ order.push(i.getAttribute('data-sec')); });
      customConfig.order = order;
      applyCustomConfig();
    });
    item.addEventListener('dragover', function(e){
      e.preventDefault();
      if(item !== dragSrc){
        secList.querySelectorAll('.sec-ord-item').forEach(function(i){ i.classList.remove('drag-over'); });
        item.classList.add('drag-over');
        // Insert before or after based on mouse position
        var rect = item.getBoundingClientRect();
        var mid  = rect.top + rect.height/2;
        if(e.clientY < mid){
          secList.insertBefore(dragSrc, item);
        } else {
          secList.insertBefore(dragSrc, item.nextSibling);
        }
      }
    });
    item.addEventListener('drop', function(e){ e.preventDefault(); });
  });

  // ── Visibility toggle buttons ──
  secList.querySelectorAll('.sec-vis-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      var sec = btn.getAttribute('data-sec');
      var item = secList.querySelector('.sec-ord-item[data-sec="'+sec+'"]');
      if(customConfig.hidden[sec]){
        delete customConfig.hidden[sec];
        btn.classList.remove('hidden');
        if(item) item.classList.remove('sec-hidden');
      } else {
        customConfig.hidden[sec] = true;
        btn.classList.add('hidden');
        if(item) item.classList.add('sec-hidden');
      }
      applyCustomConfig();
    });
  });

  // ── Rename section labels ──
  secList.querySelectorAll('.sec-ord-rename').forEach(function(inp){
    inp.addEventListener('input', function(){
      var sec = inp.getAttribute('data-sec');
      customConfig.names[sec] = inp.value;
      applyCustomConfig();
    });
  });

  // ── Preview button ──
  document.getElementById('custPreviewBtn').addEventListener('click', function(){
    // Open carousel at the custom template entry
    openTmplCarousel('resume', 'custom');
  });
}

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('pageSel').addEventListener('change', function() {
    selectedPages = parseInt(this.value, 10);
  });
  document.getElementById('changeBtn').addEventListener('click', resetFile);

  var dz = document.getElementById('dz');
  dz.addEventListener('click', function() { document.getElementById('fileInput').click(); });
  dz.addEventListener('dragover',  function(e) { e.preventDefault(); dz.classList.add('over'); });
  dz.addEventListener('dragleave', function()  { dz.classList.remove('over'); });
  dz.addEventListener('drop', function(e) { e.preventDefault(); dz.classList.remove('over'); loadFile(e.dataTransfer.files[0]); });
  document.getElementById('fileInput').addEventListener('change', function(e) { loadFile(e.target.files[0]); });

  // ── Font toolbar ───────────────────────────────────────────────────────
  function updateFontSample(){
    var fam = document.getElementById('ftFont').value || 'inherit';
    var sty = document.getElementById('ftStyle').value;
    var smp = document.getElementById('ftSample');
    smp.style.fontFamily = fam;
    smp.style.fontStyle  = (sty==='italic'||sty==='bold-italic') ? 'italic' : 'normal';
    smp.style.fontWeight = (sty==='bold'||sty==='bold-italic')   ? '700'    : '400';
    // Live-update open preview if resume already built
    if(tailoredRef){
      var pvPage = document.getElementById('pvPage');
      if(pvPage && pvPage.innerHTML) pvPage.innerHTML = buildResumeHtml(tailoredRef, selectedTemplate);
      var tpvPage = document.getElementById('tpvPage');
      if(tpvPage && tpvPage.innerHTML) tpvPage.innerHTML = buildResumeHtml(tailoredRef, selectedTemplate);
    }
  }
  document.getElementById('ftFont').addEventListener('change', function(){
    selectedFontFamily = this.value;
    updateFontSample();
  });
  document.getElementById('ftSize').addEventListener('change', function(){
    selectedFontSize = parseInt(this.value,10) || 0;
    updateFontSample();
  });
  document.getElementById('ftStyle').addEventListener('change', function(){
    selectedFontStyle = this.value;
    updateFontSample();
  });

  document.getElementById('buildBtn').addEventListener('click', build);
  document.getElementById('previewBtn').addEventListener('click', openPreview);
  document.getElementById('pvClose').addEventListener('click', closePreview);
  document.getElementById('previewModal').addEventListener('click', function(e) { if (e.target === this) closePreview(); });
  document.getElementById('pvDlBtn').addEventListener('click', function() {
    if (!resumeBlobRef) return;
    var a = document.createElement('a'); a.href = URL.createObjectURL(resumeBlobRef); a.download = resumeNameRef; a.click();
  });

  // Profile card selection
  document.querySelectorAll('.profile-card').forEach(function(card) {
    card.addEventListener('click', function() {
      document.querySelectorAll('.profile-card').forEach(function(c) { c.classList.remove('selected'); });
      card.classList.add('selected');
      selectedProfile = card.getAttribute('data-profile');
      document.getElementById('sn0').classList.add('done');
      setStepDone(0);
      // Show recommended templates for this profile
      highlightRecommendedTemplates(selectedProfile);
    });
  });

  // Template card selection
  document.querySelectorAll('.template-card').forEach(function(card) {
    card.addEventListener('click', function() {
      document.querySelectorAll('.template-card').forEach(function(c) { c.classList.remove('selected'); });
      card.classList.add('selected');
      selectedTemplate = card.getAttribute('data-template');
      // Show customizer panel only when Custom ✦ template is selected
      var custPanel = document.getElementById('custPanel');
      if(custPanel) custPanel.classList.toggle('on', selectedTemplate === 'custom');
    });
  });

  // Live stepper updates
  ['jd','company','role'].forEach(function(id) {
    document.getElementById(id).addEventListener('input', refreshStepper);
  });

  // ── Template Preview (eye buttons) — open new carousel ──
  document.querySelectorAll('.t-eye-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      openTmplCarousel('resume', btn.getAttribute('data-preview'));
    });
  });
  document.getElementById('tpvClose').addEventListener('click', closeTmplPreview);
  document.getElementById('tmplPreviewModal').addEventListener('click', function(e) { if(e.target===this) closeTmplPreview(); });
  document.getElementById('tpvPrev').addEventListener('click', function() { navigateTmplPreview(-1); });
  document.getElementById('tpvNext').addEventListener('click', function() { navigateTmplPreview(1); });
  document.getElementById('tpvSelectBtn').addEventListener('click', selectPreviewedTemplate);

  // ── Save Progress button ──
  document.getElementById('saveProgressBtn').addEventListener('click', function() {
    var display = saveSession(true);
    var btn = document.getElementById('saveProgressBtn');
    btn.textContent = '✅ Saved at ' + display;
    btn.classList.add('saved');
    setTimeout(function() { btn.innerHTML = '💾 Save Progress'; btn.classList.remove('saved'); }, 3000);
  });

  // ── Tracker toggle ──
  document.getElementById('trackerToggle').addEventListener('click', openTracker);
  document.getElementById('trackerClose').addEventListener('click', closeTracker);
  document.getElementById('trackerOverlay').addEventListener('click', closeTracker);

  // ── Init tracker display and check saved session ──
  renderTracker();
  checkForSavedSession();

  // ── Onboarding guide — hide permanently on dismiss ──
  var guideCard = document.getElementById('guideCard');
  if (localStorage.getItem('tailorcv_guide_dismissed') === '1') {
    guideCard.style.display = 'none';
  }
  document.getElementById('guideDismiss').addEventListener('click', function() {
    guideCard.style.transition = 'opacity .3s, max-height .4s';
    guideCard.style.opacity = '0';
    guideCard.style.overflow = 'hidden';
    guideCard.style.maxHeight = guideCard.offsetHeight + 'px';
    requestAnimationFrame(function() {
      guideCard.style.maxHeight = '0';
      guideCard.style.marginBottom = '0';
    });
    setTimeout(function() { guideCard.style.display = 'none'; }, 420);
    localStorage.setItem('tailorcv_guide_dismissed', '1');
  });

  // ── Custom template builder ──
  initCustomizer();
});

// ── Stepper ────────────────────────────────────────────────────────────────
function setStepDone(idx) {
  var el = document.getElementById('st'+idx);
  if (el) { el.classList.remove('s-active'); el.classList.add('s-done'); el.querySelector('.step-dot').textContent='✓'; }
}
function refreshStepper() {
  if (selectedProfile)                                    setStepDone(0);
  if (fileBuffer || extractedText)                        setStepDone(1);
  if (document.getElementById('jd').value.trim())         setStepDone(2);
  if (selectedTemplate)                                   setStepDone(3);
}

// ── File handling ──────────────────────────────────────────────────────────
function loadFile(file) {
  if (!file) return;
  if (!file.name.match(/\.(pdf|docx)$/i)) return showAlert('warn','Wrong file type.','Upload a .docx or .pdf resume.');
  clearAlert();
  var reader = new FileReader();
  reader.onload = function(e) {
    fileBuffer = e.target.result; fileName = file.name;
    var dz = document.getElementById('dz');
    dz.classList.add('loaded');
    document.getElementById('dzIcon').textContent  = '✅';
    document.getElementById('dzTitle').textContent = file.name;
    document.getElementById('dzSub').textContent   = 'Ready — click Change to swap';
    document.getElementById('badge').classList.add('on');
    document.getElementById('badgeName').textContent = file.name;
    document.getElementById('sn1').classList.add('done');
    setStepDone(1);
  };
  reader.readAsArrayBuffer(file);
}
function resetFile() {
  fileBuffer = null; fileName = ''; extractedText = '';
  var dz = document.getElementById('dz');
  dz.classList.remove('loaded');
  document.getElementById('dzIcon').textContent  = '📎';
  document.getElementById('dzTitle').textContent = 'Drop your resume here';
  document.getElementById('dzSub').innerHTML     = 'Accepts <b>.docx</b> and <b>.pdf</b> &nbsp;·&nbsp; or click to browse';
  document.getElementById('badge').classList.remove('on');
  document.getElementById('sn1').classList.remove('done');
  document.getElementById('fileInput').value = '';
}

// ── PDF extraction (PDF.js) ────────────────────────────────────────────────
// Cache extracted text so PDF.js only processes the file once per upload.
// PDF.js transfers the ArrayBuffer to its worker (detaching it), so caching
// prevents "detached ArrayBuffer" errors on repeated calls (Match Score + Build).
var _pdfTextCache = null;      // cached text string
var _pdfCacheKey  = null;      // fileName at extraction time

async function extractPdfText(buffer) {
  // Return cached text if the same file is still loaded
  if (_pdfTextCache && _pdfCacheKey === fileName) return _pdfTextCache;

  var pdfjsLib = window['pdfjs-dist/build/pdf'];
  if (!pdfjsLib) throw new Error('PDF reader not loaded. Please refresh the page and try again.');
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  // Uint8Array from a fresh copy — avoids detaching the stored fileBuffer
  var data = new Uint8Array(buffer.byteLength);
  data.set(new Uint8Array(buffer));

  var pdf = await pdfjsLib.getDocument({ data: data }).promise;
  var parts = [];
  for (var p = 1; p <= pdf.numPages; p++) {
    var page    = await pdf.getPage(p);
    var content = await page.getTextContent();
    var pageText = content.items.map(function(item) { return item.str; }).join(' ');
    parts.push(pageText);
  }
  var text = parts.join('\n').replace(/\s+/g, ' ').trim();
  if (text.length < 50) throw new Error(
    'Could not extract text from this PDF. Make sure it has selectable text — scanned image PDFs are not supported. Try the .docx version instead.'
  );
  _pdfTextCache = text;
  _pdfCacheKey  = fileName;
  return text;
}

async function extractDocxText(buffer) {
  var zip=await JSZip.loadAsync(buffer);
  var xmlFile=zip.file('word/document.xml');
  if(!xmlFile) throw new Error('Could not read this DOCX. Try re-saving in Microsoft Word format.');
  var xml=await xmlFile.async('string');
  var xmlDoc=new DOMParser().parseFromString(xml,'application/xml');
  var texts=[];
  xmlDoc.querySelectorAll('w\\:t, t').forEach(function(n){if(n.textContent)texts.push(n.textContent);});
  var text=texts.join(' ').replace(/\s+/g,' ').trim();
  if(text.length<50) throw new Error('Could not read text from DOCX. Make sure it has actual text (not just images).');
  return text;
}
// ── LinkedIn PDF Detection & Smart Parsing ────────────────────────────────
function detectLinkedIn(text) {
  // LinkedIn profile PDFs have several reliable signatures
  var lower = text.toLowerCase();
  return (
    lower.includes('linkedin.com/in/') ||
    lower.includes('linkedin profile') ||
    // LinkedIn section headers in their exported PDFs
    (lower.includes('contact') && lower.includes('experience') && lower.includes('education') && lower.includes('skills') && text.length < 12000)
  );
}

function parseLinkedInFields(text) {
  // Try to extract the most recent job title and company from LinkedIn text
  // LinkedIn PDF format: Name at top, then Experience section with "Title\nCompany\nDates"
  var result = { role: null, company: null };
  try {
    // Find Experience section
    var expIdx = text.search(/\bExperience\b/i);
    if (expIdx === -1) return result;
    var expSection = text.slice(expIdx, expIdx + 800);
    var lines = expSection.split(/\n|\r/).map(function(l){ return l.trim(); }).filter(Boolean);
    // Skip the "Experience" heading itself
    var start = 0;
    for (var i = 0; i < lines.length; i++) {
      if (/^Experience$/i.test(lines[i])) { start = i + 1; break; }
    }
    // The first entry is typically: Role\nCompany\nDate Range
    if (lines[start]) result.role    = lines[start];
    if (lines[start + 1]) result.company = lines[start + 1];
  } catch(e) {}
  return result;
}

function showLinkedInBanner(fields) {
  // Remove any existing banner
  var existing = document.getElementById('linkedInBanner');
  if (existing) existing.remove();

  var banner = document.createElement('div');
  banner.id = 'linkedInBanner';
  banner.style.cssText = 'background:#eef2ff;border:1.5px solid #a5b4fc;border-radius:10px;padding:12px 16px;margin:10px 0;display:flex;align-items:flex-start;gap:10px;font-size:.88rem;';
  var msg = '<span style="font-size:1.2rem;flex-shrink:0">🔗</span><div><strong style="color:#1a2744">LinkedIn profile detected!</strong> We\'ve optimised the text extraction for LinkedIn\'s export format.';
  if (fields.role || fields.company) {
    msg += '<br><span style="color:#475569">Auto-filled: ';
    if (fields.role)    msg += '<strong>' + fields.role    + '</strong> (role)';
    if (fields.role && fields.company) msg += ' at ';
    if (fields.company) msg += '<strong>' + fields.company + '</strong> (company)';
    msg += ' — edit if needed.</span>';
  }
  msg += '</div>';
  banner.innerHTML = msg;

  // Insert after the dropzone
  var dz = document.getElementById('dz');
  if (dz && dz.parentNode) dz.parentNode.insertBefore(banner, dz.nextSibling);
}

async function extractText(buffer, name) {
  if (name.match(/\.pdf$/i)) {
    var text = await extractPdfText(buffer);
    // Check for LinkedIn PDF
    if (detectLinkedIn(text)) {
      var fields = parseLinkedInFields(text);
      // Auto-fill Company and Role if the fields are empty
      var roleEl    = document.getElementById('role');
      var companyEl = document.getElementById('company');
      if (roleEl    && !roleEl.value.trim()    && fields.role)    roleEl.value    = fields.role;
      if (companyEl && !companyEl.value.trim() && fields.company) companyEl.value = fields.company;
      showLinkedInBanner(fields);
    }
    return text;
  }
  return extractDocxText(buffer);
}

// ── Claude API helper ──────────────────────────────────────────────────────
// ── Claude API proxy (calls our backend) ────────────────────────────────
async function callClaude(type, sys, userMsg, maxTok, model) {
  var res = await fetch('/api/claude', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + getToken(),
    },
    body: JSON.stringify({
      type: type,
      system: sys,
      userMsg: userMsg,
      maxTokens: maxTok || 8000,
      model: model || 'claude-sonnet-4-6',
    }),
  });

  if (res.status === 402) {
    var errData = await res.json().catch(function(){ return {}; });
    showUpgradeModal(errData.message || 'Upgrade to Pro to access this feature.');
    throw new Error('upgrade_required');
  }

  if (!res.ok) {
    var err = await res.json().catch(function(){ return {}; });
    throw new Error(err.error || 'AI request failed. Please try again.');
  }

  var json = await res.json();
  var text = (json.text || '').trim();

  // Parse JSON from response text
  var fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return JSON.parse(fenced[1].trim());
  var start = text.indexOf('{');
  if (start !== -1) {
    var depth = 0, end = -1;
    for (var i = start; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end !== -1) return JSON.parse(text.slice(start, end + 1));
  }
  throw new Error('Could not read AI response. Please try again.');
}

// ══════════════════════════════════════════════════════════════════════════════
// ── DOCX BUILDER (data-driven, 13 templates) ──────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
var Document=docx.Document, Packer=docx.Packer, Paragraph=docx.Paragraph, TextRun=docx.TextRun;
var Table=docx.Table, TableRow=docx.TableRow, TableCell=docx.TableCell;
var AlignmentType=docx.AlignmentType, LevelFormat=docx.LevelFormat, WidthType=docx.WidthType;
var BorderStyle=docx.BorderStyle, TabStopType=docx.TabStopType, TabStopPosition=docx.TabStopPosition;

var PW=12240, PH=15840;

function mkBul(ref){ return {reference:ref,levels:[{level:0,format:LevelFormat.BULLET,text:'\u2022',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:360,hanging:360}}}}]}; }

function getTmplCfg(tmplKey){
  var base = (tmplKey === 'custom') ? customConfig : (TEMPLATES[tmplKey] || TEMPLATES.classic);
  // Apply user font overrides (font toolbar selections override template defaults)
  var cfg = Object.assign({}, base, {
    FONT: selectedFontFamily || base.FONT,
    B:    selectedFontSize   || base.B,
    _italic: selectedFontStyle === 'italic' || selectedFontStyle === 'bold-italic',
    _bold:   selectedFontStyle === 'bold'   || selectedFontStyle === 'bold-italic',
  });
  // Apply spacing multiplier for custom template
  if(tmplKey === 'custom' && customConfig.spacing){
    var mult = customConfig.spacing === 'compact' ? 0.7 : customConfig.spacing === 'spacious' ? 1.4 : 1;
    if(mult !== 1){
      cfg.secBefore  = Math.round(base.secBefore  * mult);
      cfg.secAfter   = Math.round(base.secAfter   * mult);
      cfg.bodyAfter  = Math.round(base.bodyAfter  * mult);
      cfg.roleAfter  = Math.round(base.roleAfter  * mult);
      cfg.NP         = Math.round(base.NP         * mult);
    }
  }
  return cfg;
}

// Section header paragraph
function makeHdr(title, cfg) {
  var border = {};
  if(cfg.secBorder !== 'NONE') {
    var bs = BorderStyle[cfg.secBorder] || BorderStyle.SINGLE;
    border = { bottom:{ style:bs, size:cfg.secBorderSz||6, color:cfg.secColor||'000000', space:2 } };
  }
  return new Paragraph({
    children:[new TextRun({text:title, bold:true, size:cfg.B, font:cfg.FONT, color:cfg.secColor||'000000'})],
    border:border,
    spacing:{before:cfg.secBefore||220, after:cfg.secAfter||100}
  });
}

function makeGap(a, cfg){ return new Paragraph({children:[new TextRun({text:'',size:cfg.B,font:cfg.FONT})],spacing:{after:a||60}}); }

function makeBul(text, ref, cfg){
  return new Paragraph({
    numbering:{reference:ref,level:0},
    children:[new TextRun({text:text, size:cfg.B, font:cfg.FONT})],
    alignment:AlignmentType.JUSTIFIED,
    spacing:{after:cfg.compact?40:60}
  });
}

function makeCompTable(list, cfg){
  var CW=PW-(cfg.MAR||1080)*2, COL=Math.floor(CW/2);
  var pad=list.slice(); while(pad.length%2!==0) pad.push('');
  var nb={style:BorderStyle.NIL}, bords={top:nb,bottom:nb,left:nb,right:nb,insideH:nb,insideV:nb}, rows=[];
  for(var r=0;r<pad.length/2;r++){
    var cells=[];
    for(var c=0;c<2;c++) cells.push(new TableCell({borders:bords,width:{size:COL,type:WidthType.DXA},margins:{top:40,bottom:40,left:80,right:80},children:[new Paragraph({children:[new TextRun({text:pad[r*2+c],size:cfg.B,font:cfg.FONT})]})]}));
    rows.push(new TableRow({children:cells}));
  }
  return new Table({width:{size:CW,type:WidthType.DXA},columnWidths:[COL,COL],rows:rows});
}

function makeRoleBlock(role, cfg){
  var ps=[], projs=role.projects||[], resps=role.responsibilities||[];
  var align=cfg.nameAlign==='LEFT' ? AlignmentType.LEFT : AlignmentType.CENTER;
  ps.push(new Paragraph({
    children:[
      new TextRun({text:role.title,bold:true,size:cfg.B,font:cfg.FONT}),
      new TextRun({text:'  |  '+role.company+'  |  '+role.location,size:cfg.B,font:cfg.FONT}),
      new TextRun({text:'\t',size:cfg.B,font:cfg.FONT}),
      new TextRun({text:role.dates,italics:true,size:cfg.B,font:cfg.FONT})
    ],
    tabStops:[{type:TabStopType.RIGHT,position:TabStopPosition.MAX}],
    spacing:{before:cfg.roleAfter||180,after:80}
  }));
  for(var i=0;i<projs.length;i++) ps.push(new Paragraph({
    children:[new TextRun({text:projs[i].title+': ',bold:true,size:cfg.B,font:cfg.FONT}),new TextRun({text:projs[i].description,size:cfg.B,font:cfg.FONT})],
    alignment:AlignmentType.JUSTIFIED,spacing:{before:60,after:60}
  }));
  if(resps.length){
    // Only render the "Roles/Responsibilities" sub-header when there are project blocks above it.
    // For direct-bullet profiles Claude returns projects:[], so bullets flow straight from the role header.
    if(projs.length > 0){
      ps.push(new Paragraph({children:[new TextRun({text:'Roles/Responsibilities',bold:true,size:cfg.B,font:cfg.FONT})],spacing:{before:80,after:60}}));
    }
    for(var j=0;j<resps.length;j++) ps.push(makeBul(resps[j],'bw',cfg));
  }
  return ps;
}

// Section renderers
function renderSummary(d, cfg){ return [makeHdr(d.summaryTitle||cfg.names.summary,cfg), new Paragraph({children:[new TextRun({text:d.summary,size:cfg.B,font:cfg.FONT})],alignment:AlignmentType.JUSTIFIED,spacing:{after:cfg.bodyAfter||120}})]; }
function renderSkills(d, cfg){ return [makeHdr(cfg.names.skills,cfg), makeGap(40,cfg), makeCompTable(d.coreCompetencies||[],cfg), makeGap(80,cfg)]; }
function renderExperience(d, cfg){
  var out=[makeHdr(cfg.names.experience,cfg)];
  (d.workExperience||[]).forEach(function(role){ makeRoleBlock(role,cfg).forEach(function(p){out.push(p);}); });
  return out;
}
function renderTech(d, cfg){
  var out=[makeHdr(cfg.names.tech,cfg)];
  (d.technicalSkills||[]).forEach(function(t){ out.push(new Paragraph({children:[new TextRun({text:t.category+': ',bold:true,size:cfg.B,font:cfg.FONT}),new TextRun({text:t.items,size:cfg.B,font:cfg.FONT})],spacing:{after:cfg.compact?40:60}})); });
  return out;
}
function renderCerts(d, cfg){
  var out=[makeGap(40,cfg), makeHdr(cfg.names.certs,cfg)];
  (d.certifications||[]).forEach(function(c){ out.push(makeBul(c,'bc',cfg)); });
  return out;
}
function renderEdu(d, cfg){
  var out=[makeGap(40,cfg), makeHdr(cfg.names.edu,cfg), makeGap(40,cfg)];
  (d.education||[]).forEach(function(e){ out.push(new Paragraph({children:[new TextRun({text:e.degree+'  |  ',bold:true,size:cfg.B,font:cfg.FONT}),new TextRun({text:e.institution+', ',size:cfg.B,font:cfg.FONT}),new TextRun({text:e.location,italics:true,size:cfg.B,font:cfg.FONT})],spacing:{before:60,after:80}})); });
  return out;
}

var SECTION_RENDERERS = { summary:renderSummary, skills:renderSkills, experience:renderExperience, tech:renderTech, certs:renderCerts, edu:renderEdu };

function buildResumeDoc(d, tmplKey){
  var cfg = getTmplCfg(tmplKey||'classic');
  var ch = [];
  var nameAlign = cfg.nameAlign==='LEFT' ? AlignmentType.LEFT : AlignmentType.CENTER;

  // Accent bar for modern-style templates
  if(cfg.accentBar){
    // simulate with a thick top border on the name paragraph — use coloured border trick
  }

  // Name & contact header
  ch.push(new Paragraph({alignment:nameAlign,children:[new TextRun({text:d.name,bold:true,size:cfg.NP,font:cfg.FONT})],spacing:{after:60}}));
  ch.push(new Paragraph({alignment:nameAlign,children:[new TextRun({text:d.phone+' \u00b7 '+d.email,size:cfg.B,font:cfg.FONT})],spacing:{after:40}}));
  if(d.locationPreference) ch.push(new Paragraph({alignment:nameAlign,children:[new TextRun({text:d.locationPreference,italics:true,size:cfg.B,font:cfg.FONT})],spacing:{after:120}}));

  // Sections in template order
  cfg.order.forEach(function(sec){
    if(cfg.hidden && cfg.hidden[sec]) return; // skip hidden sections (custom template)
    var renderer = SECTION_RENDERERS[sec];
    if(renderer){ renderer(d,cfg).forEach(function(p){ ch.push(p); }); }
  });

  // Free-tier watermark footer
  if (!window._tcUserIsPro) {
    ch.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240 },
      children: [
        new TextRun({
          text: 'Created with TailorCV.com — AI-powered resumes tailored for every job',
          size: 16, color: 'AAAAAA', italics: true, font: cfg.FONT
        })
      ]
    }));
  }

  return new Document({
    numbering:{config:[mkBul('bw'),mkBul('bc')]},
    sections:[{properties:{page:{size:{width:PW,height:PH},margin:{top:cfg.MAR,right:cfg.MAR,bottom:cfg.MAR,left:cfg.MAR}}},children:ch}]
  });
}

// Cover letter builder
// ── 10 Cover Letter Template Configurations ────────────────────────────────
var CL_TMPL_DEFS = {
  classic:    { label:'Classic',      font:'Calibri',          sz:20, bodyAfter:160, bodyAlign:AlignmentType.JUSTIFIED, margin:1080, accent:'000000', bold:true,  nameTop:null,           divider:false, prefix:'' },
  modern:     { label:'Modern',       font:'Arial',            sz:20, bodyAfter:160, bodyAlign:AlignmentType.JUSTIFIED, margin:1080, accent:'1D4ED8', bold:true,  nameTop:null,           divider:true,  prefix:'' },
  executive:  { label:'Executive',    font:'Arial',            sz:20, bodyAfter:180, bodyAlign:AlignmentType.JUSTIFIED, margin:1080, accent:'1F2937', bold:true,  nameTop:'center',       divider:false, prefix:'' },
  minimalist: { label:'Minimalist',   font:'Arial',            sz:19, bodyAfter:200, bodyAlign:AlignmentType.LEFT,      margin:1200, accent:'9CA3AF', bold:false, nameTop:null,           divider:false, prefix:'' },
  bold:       { label:'Bold',         font:'Arial',            sz:20, bodyAfter:160, bodyAlign:AlignmentType.JUSTIFIED, margin:1080, accent:'111827', bold:true,  nameTop:'left-big',     divider:false, prefix:'' },
  creative:   { label:'Creative',     font:'Arial',            sz:20, bodyAfter:160, bodyAlign:AlignmentType.JUSTIFIED, margin:1080, accent:'7C3AED', bold:true,  nameTop:null,           divider:true,  prefix:'' },
  technical:  { label:'Technical',    font:'Courier New',      sz:18, bodyAfter:120, bodyAlign:AlignmentType.LEFT,      margin:1080, accent:'0F766E', bold:false, nameTop:null,           divider:false, prefix:'// ' },
  elegant:    { label:'Elegant',      font:'Georgia',          sz:20, bodyAfter:180, bodyAlign:AlignmentType.JUSTIFIED, margin:1080, accent:'92400E', bold:true,  nameTop:'center-italic',divider:false, prefix:'' },
  corporate:  { label:'Corporate',    font:'Times New Roman',  sz:22, bodyAfter:160, bodyAlign:AlignmentType.JUSTIFIED, margin:1440, accent:'1E3A5F', bold:true,  nameTop:'sender-right', divider:false, prefix:'' },
  compact:    { label:'Compact',      font:'Calibri',          sz:18, bodyAfter:100, bodyAlign:AlignmentType.JUSTIFIED, margin:864,  accent:'374151', bold:true,  nameTop:null,           divider:false, prefix:'' }
};

function buildCoverDoc(d, tmplName){
  var tc = CL_TMPL_DEFS[tmplName] || CL_TMPL_DEFS.classic;
  var cl = d.coverLetter || {};
  // Use top-level date (overridden with today in build()), fall back to cl.date, then compute
  var dateStr = d.date || cl.date || new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  var ch = [];

  function r(t,o){ return new TextRun(Object.assign({text:String(t||''),size:tc.sz,font:tc.font},o||{})); }
  function lp(c,a,align){ return new Paragraph({children:c,alignment:align||AlignmentType.LEFT,spacing:{after:a||80}}); }
  function bp(t,a){ return new Paragraph({children:[r(t)],alignment:tc.bodyAlign,spacing:{after:a||tc.bodyAfter}}); }
  function lbl(text){ return r(tc.prefix+text,{bold:tc.bold,color:tc.accent}); }
  function hr(){
    return new Paragraph({border:{bottom:{style:BorderStyle.SINGLE,size:8,color:tc.accent,space:4}},spacing:{after:180}});
  }

  // ── Name header block (template-specific) ──
  if(tc.nameTop==='center'){
    ch.push(new Paragraph({children:[r(d.name||'',{bold:true,size:28})],alignment:AlignmentType.CENTER,spacing:{after:40}}));
    ch.push(new Paragraph({children:[r([d.phone,d.email].filter(Boolean).join(' · '),{size:18,color:'666666'})],alignment:AlignmentType.CENTER,spacing:{after:180}}));
  } else if(tc.nameTop==='center-italic'){
    ch.push(new Paragraph({children:[r(d.name||'',{bold:true,italics:true,size:30,color:tc.accent})],alignment:AlignmentType.CENTER,spacing:{after:40}}));
    ch.push(new Paragraph({children:[r([d.phone,d.email].filter(Boolean).join(' · '),{size:18,italics:true,color:tc.accent})],alignment:AlignmentType.CENTER,spacing:{after:180}}));
  } else if(tc.nameTop==='left-big'){
    ch.push(new Paragraph({children:[r(d.name||'',{bold:true,size:30})],alignment:AlignmentType.LEFT,spacing:{after:40}}));
    ch.push(new Paragraph({children:[r([d.phone,d.email].filter(Boolean).join(' · '),{size:18,color:'555555'})],alignment:AlignmentType.LEFT,spacing:{after:180}}));
  } else if(tc.nameTop==='sender-right'){
    // Corporate: sender block right-aligned at top
    [d.name,d.phone,d.email].filter(Boolean).forEach(function(v,i){
      ch.push(lp([r(v,{bold:i===0})],i===0?4:i<2?4:180,AlignmentType.RIGHT));
    });
  }

  // ── Main letter body ──
  ch.push(lp([lbl('Date: '),r(dateStr)],180));
  ch.push(lp([lbl('To: '),r((cl.recipientTitle||'Hiring Manager')+',')],40));
  if(cl.recipientDepartment) ch.push(lp([r(cl.recipientDepartment)],40));
  if(cl.recipientOrg)        ch.push(lp([r(cl.recipientOrg)],40));
  if(cl.recipientLocation)   ch.push(lp([r(cl.recipientLocation)],180));
  if(cl.reLine)              ch.push(lp([lbl('RE: '),r(cl.reLine)],tc.divider?40:180));
  if(tc.divider)             ch.push(hr());
  ch.push(lp([r('Dear Hiring Manager,')],160));
  if(cl.openingParagraph) ch.push(bp(cl.openingParagraph));
  if(cl.bodyParagraph1)   ch.push(bp(cl.bodyParagraph1));
  if(cl.bodyParagraph2)   ch.push(bp(cl.bodyParagraph2));
  if(cl.bodyParagraph3)   ch.push(bp(cl.bodyParagraph3));
  if(cl.closingParagraph) ch.push(bp(cl.closingParagraph,200));
  ch.push(lp([r('Warm regards,')],200));
  ch.push(lp([r(d.name||'',{bold:true})],40));
  if(d.phone) ch.push(lp([r(d.phone)],40));
  if(d.email) ch.push(lp([r(d.email)],40));

  return new Document({sections:[{properties:{page:{size:{width:PW,height:PH},margin:{top:tc.margin,right:tc.margin,bottom:tc.margin,left:tc.margin}}},children:ch}]});
}

// ── Main build ─────────────────────────────────────────────────────────────
async function build(){
  if(busy) return;
  clearAlert(); clearOutputs();
  
  var company = document.getElementById('company').value.trim()||'the company';
  var role    = document.getElementById('role').value.trim()||'the role';
  var jd      = document.getElementById('jd').value.trim();

  if(!selectedProfile)                  return showAlert('warn','No profile selected.','Choose a professional profile at Step 1.');
  if(!fileBuffer && !extractedText)     return showAlert('warn','No resume loaded.','Upload a file in Step 2, or load your Career Vault.');
  if(!jd)                               return showAlert('warn','Job description missing.','Paste the job description in Step 3.');

  busy=true;
  document.getElementById('buildBtn').disabled=true;
  document.getElementById('buildBtn').innerHTML='<span class="spin"></span> Building\u2026';
  document.getElementById('prog').classList.add('on');

  try {
    // 1. Extract text (or use vault text directly)
    step(1,'active');
    var resumeText = extractedText && !fileBuffer ? extractedText : await extractText(fileBuffer, fileName);
    step(1,'done');

    // 2. Tailor with Claude
    step(2,'active');
    var sys = getSystemPrompt(selectedProfile,selectedPages);
    var maxTok = selectedPages===1?4000:selectedPages===2?8000:selectedPages===3?12000:selectedPages===4?16000:20000;

    // Work experience JSON structure differs by profile style
    var expStructure = isProjectProfile(selectedProfile)
      ? '  "workExperience": [{"title":"","company":"","location":"","dates":"","projects":[{"title":"Project N: [Descriptive Name]","description":"1-2 sentences on scope and outcome."}],"responsibilities":["Roles/Responsibilities bullet — names specific tool or technique. No em dashes."]}],'
      : '  "workExperience": [{"title":"","company":"","location":"","dates":"","projects":[],"responsibilities":["Strong achievement or responsibility bullet. Quantified where possible. Opens with action verb. Names specific tool, method, or metric. No em dashes. No project headers."]}],';

    var prompt = [
      'Analyse this JD and resume, then tailor the resume for the role. The resume must be '+selectedPages+' page'+(selectedPages>1?'s':'')+' long.',
      '',
      'TARGET ROLE: '+role,
      'COMPANY: '+company,
      'PROFESSIONAL PROFILE: '+(PROFILES[selectedProfile]||PROFILES.business).name,
      'EXPERIENCE FORMAT: ' + (isProjectProfile(selectedProfile) ? 'PROJECT-STYLE (projects[] then responsibilities[])' : 'DIRECT BULLETS (projects must be [], all content in responsibilities[])'),
      '',
      'JOB DESCRIPTION:',jd,
      '',
      'RESUME TEXT:',resumeText,
      '',
      (function(){
        var lInstr = {
          short:  'COVER LETTER: Short (~150-200 words total). Write openingParagraph and bodyParagraph1 only. Leave bodyParagraph2 and bodyParagraph3 as empty strings "". closingParagraph is 1-2 sentences.',
          medium: 'COVER LETTER: Medium (~300-350 words total). Write openingParagraph, bodyParagraph1, and bodyParagraph2. Leave bodyParagraph3 as empty string "".',
          long:   'COVER LETTER: Long (~500-600 words total). Write all four body paragraphs (openingParagraph, bodyParagraph1, bodyParagraph2, bodyParagraph3), each 100-150 words.'
        }[clLength] || 'COVER LETTER: Medium (~300-350 words). Fill openingParagraph, bodyParagraph1, bodyParagraph2. Leave bodyParagraph3 as empty string.';
        return lInstr;
      })(),
      '',
      'Return this exact JSON structure (no em dashes anywhere):',
      '{',
      '  "name": "",',
      '  "summaryTitle": "PROFESSIONAL SUMMARY - [exact job title from JD]",',
      '  "phone": "",',
      '  "email": "",',
      '  "locationPreference": "",',
      '  "summary": "Tailored summary. No em dashes.",',
      '  "coreCompetencies": ["exactly 12 items reordered to match JD"],',
      expStructure,
      '  "technicalSkills": [{"category":"","items":""}],',
      '  "certifications": [""],',
      '  "education": [{"degree":"","institution":"","location":""}],',
      '  "coverLetter": {"date":"","recipientTitle":"Hiring Manager","recipientDepartment":"","recipientOrg":"","recipientLocation":"City, State","reLine":"[Job Title] - [Req ID if in JD]","openingParagraph":"","bodyParagraph1":"","bodyParagraph2":"","bodyParagraph3":"","closingParagraph":"Start with: Thank you for your time and consideration."}',
      '}'
    ].join('\n');

    var tailored = await callClaude('tailor',sys,prompt,maxTok,'claude-sonnet-4-6');
    tailoredRef=tailored; jdRef=jd;
    step(2,'done');

    // 3. Build resume DOCX
    step(3,'active');
    var resumeBlob = await Packer.toBlob(buildResumeDoc(tailored,selectedTemplate));
    var rName = (tailored.name||'Resume').replace(/\s+/g,'_')+'_Resume_'+company.replace(/\s+/g,'_')+'.docx';
    resumeBlobRef=resumeBlob; resumeNameRef=rName;
    step(3,'done');

    // 4. Build cover letter
    step(4,'active');
    var today = new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
    // Always override AI-generated date with today's actual date
    if(tailored.coverLetter) tailored.coverLetter.date = today;
    var clData = Object.assign({},tailored,tailored.coverLetter||{},{date:today});
    var clBlob = await Packer.toBlob(buildCoverDoc(clData, clTemplate));
    _clBlobRef = clBlob;
    _clNameRef = (tailored.name||'Resume').replace(/\s+/g,'_')+'_Cover_Letter_'+company.replace(/\s+/g,'_')+'.docx';
    var cName = _clNameRef;
    step(4,'done');

    // Show downloads
    document.getElementById('pvPage').innerHTML = buildResumeHtml(tailored,selectedTemplate);
    addDownload(resumeBlob,rName,'📄','Resume (.docx)');
    addDownload(clBlob,cName,'✉️','Cover Letter (.docx)');
    document.getElementById('dlCard').style.display='block';

    // 5. ATS Score
    step(5,'active');
    showAtsLoading();
    try { var ats=await scoreResume(tailored,jd); atsResultRef=ats; renderAtsScore(ats); }
    catch(e){ renderAtsError(e.message); }
    step(5,'done');

    // 6. Skills Gap
    step(6,'active');
    try { var gaps=await getSkillsGap(tailored,jd,role); renderSkillsGap(gaps); }
    catch(e){ document.getElementById('gapCard').style.display='none'; }
    step(6,'done');

    // 7. Interview Questions
    step(7,'active');
    try { var qs=await getInterviewQuestions(tailored,jd,role); renderInterviewQuestions(qs); }
    catch(e){ document.getElementById('iqCard').style.display='none'; }
    step(7,'done');

    document.getElementById('dlCard').scrollIntoView({behavior:'smooth',block:'start'});

    // ── Auto-save session & add tracker entry ──────────────────────────────
    saveSession(true);
    var trackerAts = (atsResultRef && atsResultRef.overallScore !== undefined) ? atsResultRef.overallScore : null;
    addTrackerEntry(company, role, selectedTemplate, selectedProfile, trackerAts);

    // Save interview context so Interview Coach can auto-load JD + role
    try {
      localStorage.setItem('tc_interview_ctx', JSON.stringify({
        role:    role,
        company: company,
        jd:      jd,
      }));
    } catch(e) {}

  } catch(err){
    showAlert('error','Something went wrong.',err.message);
    console.error(err);
  } finally {
    busy=false;
    document.getElementById('buildBtn').disabled=false;
    document.getElementById('buildBtn').innerHTML='\u26A1 Build Resume, Cover Letter &amp; Full Analysis';
  }
}

// ── Skills Gap ─────────────────────────────────────────────────────────────
async function getSkillsGap(tailored,jd,role){
  var summary='Skills: '+(tailored.coreCompetencies||[]).join(', ')+'\nTech: '+(tailored.technicalSkills||[]).map(function(t){return t.items;}).join(', ')+'\nCerts: '+(tailored.certifications||[]).join(', ');
  var sys='You are a career coach specialising in skills gap analysis. Return ONLY valid JSON.';
  var prompt=['Identify 4-6 skills gaps between the JD requirements and the candidate\'s current profile.','','JOB DESCRIPTION:',jd,'','CANDIDATE PROFILE:',summary,'','Return: {"gaps":[{"skill":"Short name","priority":"high|medium|low","description":"1-2 sentences about the gap","actionable":"One concrete step to address it"}]}','high=explicitly required+absent, medium=implied/preferred, low=nice-to-have. Return ONLY the JSON.'].join('\n');
  return await callClaude('tailor',sys,prompt,2000,'claude-haiku-4-5-20251001');
}
function renderSkillsGap(data){
  var gaps=(data&&data.gaps)?data.gaps:[];
  if(!gaps.length) return;
  var icons={high:'🔴',medium:'🟡',low:'🟢'};
  var pillCls={high:'gap-high',medium:'gap-med',low:'gap-low'};
  var pillLbl={high:'High Priority',medium:'Medium Priority',low:'Nice to Have'};
  var h='';
  gaps.forEach(function(g){
    var p=g.priority||'medium';
    h+='<div class="gap-item"><div class="gap-icon">'+(icons[p]||'🟡')+'</div><div>';
    h+='<div class="gap-skill">'+esc(g.skill)+' <span class="gap-pill '+(pillCls[p]||'gap-med')+'">'+(pillLbl[p]||'Medium')+'</span></div>';
    h+='<div class="gap-desc">'+esc(g.description)+'</div>';
    if(g.actionable) h+='<div class="gap-desc" style="margin-top:5px;color:var(--navy);font-style:italic">\u2192 '+esc(g.actionable)+'</div>';
    h+='</div></div>';
  });
  document.getElementById('gapContent').innerHTML=h;
  document.getElementById('gapCard').style.display='block';
}

// ── Interview Questions ─────────────────────────────────────────────────────
async function getInterviewQuestions(tailored,jd,role){
  var sys='You are an expert interview coach. Generate targeted interview questions. Return ONLY valid JSON.';
  var prompt=['Generate 6 interview questions for this role.','','ROLE: '+role,'JD (excerpt):',jd.slice(0,1500),'','CANDIDATE SUMMARY: '+(tailored.summary||'').slice(0,400),'','Return: {"questions":[{"question":"Full question","type":"Behavioural|Technical|Situational|Motivational","tip":"1 sentence coaching tip"}]}','Mix types. Make specific to the JD. Return ONLY JSON.'].join('\n');
  return await callClaude('tailor',sys,prompt,2000,'claude-haiku-4-5-20251001');
}
function renderInterviewQuestions(data){
  var qs=(data&&data.questions)?data.questions:[];
  if(!qs.length) return;
  var typeColors={Behavioural:'#7c3aed',Technical:'#1d4ed8',Situational:'#065f46',Motivational:'#92400e'};
  var h='';
  qs.forEach(function(q,i){
    var color=typeColors[q.type]||'#4b5563';
    h+='<div class="iq-item"><div class="iq-num">Q'+(i+1)+' &nbsp;\u00b7&nbsp; <span style="color:'+color+'">'+esc(q.type||'General')+'</span></div>';
    h+='<div class="iq-q">'+esc(q.question)+'</div>';
    if(q.tip) h+='<div class="iq-hint">\uD83D\uDCA1 '+esc(q.tip)+'</div>';
    h+='</div>';
  });
  document.getElementById('iqContent').innerHTML=h;
  document.getElementById('iqCard').style.display='block';
}

// ── ATS Scoring ────────────────────────────────────────────────────────────
async function scoreResume(tailored, jd){
  var txt='Summary: '+(tailored.summary||'');
  txt+='\nCore Competencies: '+(tailored.coreCompetencies||[]).join(', ');
  (tailored.workExperience||[]).forEach(function(r){txt+='\n\nRole: '+r.title+' at '+r.company;(r.responsibilities||[]).forEach(function(b){txt+='\n- '+b;});});
  txt+='\n\nTechnical Skills: '+(tailored.technicalSkills||[]).map(function(t){return t.category+': '+t.items;}).join('; ');
  txt+='\nCertifications: '+(tailored.certifications||[]).join(', ');
  var sys='You are an ATS scoring expert. Respond with ONLY a raw JSON object — no markdown, no extra text.';
  var prompt=[
    'Score the resume against the JD. Respond with ONLY the JSON object — no markdown, no explanation.',
    '',
    'JOB DESCRIPTION:',jd,
    '',
    'RESUME:',txt,
    '',
    'Return exactly this JSON shape:',
    '{',
    '  "overallScore": <0-100>,',
    '  "scoreLabel": "Strong Match"|"Good Match"|"Partial Match"|"Needs Work",',
    '  "breakdown": {',
    '    "keywordMatch": <0-100>,',
    '    "skillsAlignment": <0-100>,',
    '    "experienceRelevance": <0-100>,',
    '    "summaryAlignment": <0-100>',
    '  },',
    '  "matchedKeywords": [<up to 10 matched keywords/phrases>],',
    '  "missingKeywords": [<up to 8 missing keywords/phrases>],',
    '  "strengths": [<2-3 one-sentence strengths>],',
    '  "topFixes": [',
    '    {"priority": 1, "fix": "<specific one-sentence action>", "impact": "High|Medium"},',
    '    {"priority": 2, "fix": "<specific one-sentence action>", "impact": "High|Medium"},',
    '    {"priority": 3, "fix": "<specific one-sentence action>", "impact": "High|Medium"},',
    '    {"priority": 4, "fix": "<specific one-sentence action>", "impact": "High|Medium"},',
    '    {"priority": 5, "fix": "<specific one-sentence action>", "impact": "High|Medium"}',
    '  ]',
    '}',
  ].join('\n');
  var raw = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
    body: JSON.stringify({ type: 'ats', system: sys, userMsg: prompt, maxTokens: 3500, model: 'claude-haiku-4-5-20251001' }),
  });
  if (raw.status === 402) {
    var ed = await raw.json().catch(function(){ return {}; });
    showUpgradeModal(ed.message || 'ATS scoring requires a Pro subscription.');
    throw new Error('upgrade_required');
  }
  if (!raw.ok) { var e2 = await raw.json().catch(function(){ return {}; }); throw new Error(e2.error || 'API error'); }
  var rawText = (await raw.json()).text || '';
  var jsonStr=null;
  var fenced=rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if(fenced){jsonStr=fenced[1].trim();}
  else{var start=rawText.indexOf('{');if(start!==-1){var depth=0,end=-1;for(var i=start;i<rawText.length;i++){if(rawText[i]==='{')depth++;else if(rawText[i]==='}'){depth--;if(depth===0){end=i;break;}}}if(end!==-1)jsonStr=rawText.slice(start,end+1);}}
  if(!jsonStr) throw new Error('Could not extract JSON from ATS response.');
  return JSON.parse(jsonStr);
}

function showAtsLoading(){
  document.getElementById('atsContent').innerHTML='<div style="display:flex;align-items:center;gap:10px;color:var(--muted);font-size:14px"><span class="spin" style="border-color:rgba(45,90,142,.3);border-top-color:var(--mid);width:18px;height:18px"></span>Scoring your resume against the JD\u2026</div>';
  document.getElementById('atsCard').style.display='block';
}
function renderAtsError(msg){
  document.getElementById('atsContent').innerHTML='<div style="font-size:13.5px;color:var(--red);background:var(--red-bg);border:1px solid #fca5a5;border-radius:8px;padding:12px 14px;margin-bottom:12px"><strong>ATS scoring failed.</strong> '+esc(msg||'Unknown error')+'</div><button type="button" id="retryAtsBtn" style="padding:10px 18px;background:var(--navy);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;font-family:inherit;cursor:pointer">\u21ba Retry ATS Score</button>';
  document.getElementById('atsCard').style.display='block';
  var btn=document.getElementById('retryAtsBtn');
  if(btn) btn.addEventListener('click',retryAts);
}
async function retryAts(){
  if(!tailoredRef||!jdRef) return;
  showAtsLoading();
  try{var r=await scoreResume(tailoredRef,jdRef);atsResultRef=r;renderAtsScore(r);}catch(e){if(e.message!=='upgrade_required')renderAtsError(e.message);}
}
function renderAtsScore(ats){
  var score=ats.overallScore||0;
  var color=score>=80?'#16a34a':score>=60?'#d97706':'#dc2626';
  var r=46, circ=+(2*Math.PI*r).toFixed(2), offset=+(circ-(score/100)*circ).toFixed(2);
  var bd=ats.breakdown||{};
  var bars=[
    {label:'Keyword Match',      ico:'🔑', val:bd.keywordMatch||0},
    {label:'Skills Alignment',   ico:'⚙️', val:bd.skillsAlignment||0},
    {label:'Experience Relevance',ico:'💼', val:bd.experienceRelevance||0},
    {label:'Summary Alignment',  ico:'📝', val:bd.summaryAlignment||bd.summaryRelevance||0}
  ];
  var scoreLabel=ats.scoreLabel||(score>=80?'Strong Match':score>=60?'Good Match':score>=40?'Partial Match':'Needs Work');
  var labelColor=score>=80?'#16a34a':score>=60?'#d97706':'#dc2626';
  var labelBg   =score>=80?'#dcfce7':score>=60?'#fef3c7':'#fee2e2';

  // ── Ring + sub-scores ──
  var h='<div class="ats-wrap"><div class="ats-ring-wrap">'
    +'<svg viewBox="0 0 114 114"><circle class="ats-track" cx="57" cy="57" r="'+r+'"/>'
    +'<circle class="ats-fill" cx="57" cy="57" r="'+r+'" stroke="'+color+'" stroke-dasharray="'+circ+'" stroke-dashoffset="'+offset+'"/></svg>'
    +'<div class="ats-center"><div class="ats-num" style="color:'+color+'">'+score+'</div><div class="ats-pct">/ 100</div></div></div>';
  h+='<div class="ats-right">';
  h+='<div style="display:inline-block;padding:4px 12px;border-radius:50px;font-size:12px;font-weight:800;background:'+labelBg+';color:'+labelColor+';margin-bottom:12px">'+esc(scoreLabel)+'</div>';
  bars.forEach(function(b){
    var bc=b.val>=80?'#16a34a':b.val>=60?'#d97706':'#dc2626';
    h+='<div class="ats-bar-row">'
      +'<div class="ats-bar-top"><span>'+b.ico+' '+b.label+'</span><span style="color:'+bc+';font-weight:700">'+b.val+'%</span></div>'
      +'<div class="ats-bg"><div class="ats-fg" style="width:'+b.val+'%;background:'+bc+';transition:width .8s ease"></div></div></div>';
  });
  h+='</div></div>';

  // ── Keywords ──
  var matched=ats.matchedKeywords||[], missing=ats.missingKeywords||[];
  if(matched.length||missing.length){
    h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px">';
    if(matched.length){
      h+='<div class="kw-sec"><div class="kw-title">\u2705 Matched Keywords ('+matched.length+')</div><div class="kw-chips">';
      matched.forEach(function(k){h+='<span class="kw-chip kw-match">'+esc(k)+'</span>';});
      h+='</div></div>';
    }
    if(missing.length){
      h+='<div class="kw-sec"><div class="kw-title">\u26a0\ufe0f Missing Keywords ('+missing.length+')</div><div class="kw-chips">';
      missing.forEach(function(k){h+='<span class="kw-chip kw-miss">'+esc(k)+'</span>';});
      h+='</div></div>';
    }
    h+='</div>';
  }

  // ── Strengths ──
  var st=ats.strengths||[];
  if(st.length){
    h+='<div class="ats-insights" style="margin-top:14px">';
    h+='<div class="kw-title">\uD83D\uDCAA Strengths</div><ul>';
    st.forEach(function(s){h+='<li>'+esc(s)+'</li>';});
    h+='</ul></div>';
  }

  // ── Top 5 Fixes (the new star feature) ──
  var fixes=ats.topFixes||[];
  if(fixes.length){
    h+='<div style="margin-top:18px;border:1.5px solid #e2e8f0;border-radius:10px;overflow:hidden">';
    h+='<div style="background:#1a2744;padding:10px 16px;display:flex;align-items:center;gap:8px">';
    h+='<span style="font-size:1.1rem">📋</span>';
    h+='<span style="color:#fff;font-weight:800;font-size:.95rem">Top '+fixes.length+' Things to Fix</span>';
    h+='<span style="margin-left:auto;font-size:.75rem;color:rgba(255,255,255,.5)">Prioritised by impact</span>';
    h+='</div>';
    fixes.forEach(function(f,i){
      var impColor=f.impact==='High'?'#dc2626':'#d97706';
      var impBg   =f.impact==='High'?'#fee2e2':'#fef3c7';
      h+='<div style="display:flex;align-items:flex-start;gap:12px;padding:12px 16px;border-bottom:'+(i<fixes.length-1?'1px solid #f1f5f9':0)+'">';
      h+='<div style="flex-shrink:0;width:24px;height:24px;border-radius:50%;background:#1a2744;color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center">'+(i+1)+'</div>';
      h+='<div style="flex:1;font-size:.88rem;color:#334155;line-height:1.55">'+esc(f.fix)+'</div>';
      h+='<div style="flex-shrink:0;font-size:.72rem;font-weight:700;padding:2px 8px;border-radius:50px;background:'+impBg+';color:'+impColor+'">'+esc(f.impact||'Medium')+'</div>';
      h+='</div>';
    });
    h+='</div>';
  }

  // ── Improve button ──
  if(missing.length){
    h+='<hr class="improve-sep">'
      +'<p class="improve-note">Want a higher score? Claude can naturally weave the missing keywords into your resume wherever your experience genuinely supports them.</p>'
      +'<button type="button" class="improve-btn" id="improveBtn">\u2728 Improve Resume with Missing Keywords</button>'
      +'<div id="improveMsg"></div>';
  }

  document.getElementById('atsContent').innerHTML=h;
  document.getElementById('atsCard').style.display='block';
  var btn=document.getElementById('improveBtn');
  if(btn) btn.addEventListener('click',improveResume);
}

// ── Improve resume ─────────────────────────────────────────────────────────
async function improveResume(){
  if(!tailoredRef||!jdRef||!atsResultRef) return;
  var missing=(atsResultRef.missingKeywords||[]);
  if(!missing.length) return;
  var btn=document.getElementById('improveBtn'), msg=document.getElementById('improveMsg');
  btn.disabled=true; btn.innerHTML='<span class="spin"></span> Improving\u2026';
  if(msg) msg.innerHTML='';
  try{
    var sys='You are a specialist resume writer. Improve a tailored resume by naturally incorporating missing keywords ONLY where existing experience genuinely supports it. NEVER invent facts. Return ONLY valid JSON with the exact same structure.';
    var prompt='Missing keywords: '+missing.join(', ')+'\n\nJOB DESCRIPTION:\n'+jdRef+'\n\nCURRENT RESUME JSON:\n'+JSON.stringify(tailoredRef)+'\n\nReturn improved resume. ONLY valid JSON.';
    var improved=await callClaude('tailor',sys,prompt,16000,'claude-sonnet-4-6');
    tailoredRef=improved;
    btn.innerHTML='<span class="spin"></span> Rebuilding\u2026';
    var newBlob=await Packer.toBlob(buildResumeDoc(improved,selectedTemplate));
    resumeBlobRef=newBlob;
    var resumeLink=document.querySelector('#dlGrid a.dl-card');
    if(resumeLink) resumeLink.href=URL.createObjectURL(newBlob);
    document.getElementById('pvPage').innerHTML=buildResumeHtml(improved,selectedTemplate);
    btn.innerHTML='<span class="spin"></span> Re-scoring\u2026';
    var newAts=null;
    try{newAts=await scoreResume(improved,jdRef);}catch(e){}
    atsResultRef=newAts;
    if(newAts){renderAtsScore(newAts);var s=document.getElementById('improveMsg');if(s)s.innerHTML='<div class="improve-success">\u2705 Resume improved! New ATS score shown above.</div>';}
    else{if(msg)msg.innerHTML='<div class="improve-success">\u2705 Updated with missing keywords. Download the new version above.</div>';btn.disabled=false;btn.innerHTML='\u2728 Improve Again';}
  }catch(err){btn.disabled=false;btn.innerHTML='\u2728 Improve Resume with Missing Keywords';if(msg)msg.innerHTML='<div style="font-size:13px;color:var(--red);margin-top:10px">Error: '+esc(err.message)+'</div>';}
}

// ── Resume HTML preview (unique per template) ─────────────────────────────────
function buildResumeHtml(d, tmplKey){
  var cfg = getTmplCfg(tmplKey||'classic');
  var ac  = cfg.pvAccent || '#111';
  var fam = (cfg.FONT||'Calibri')+',serif';
  var fsz = (cfg.B || 20) / 2;   // half-points → pt
  var bodyStyle = 'font-family:'+fam+';font-size:'+fsz+'pt;'
    + (cfg._italic ? 'font-style:italic;' : '')
    + (cfg._bold   ? 'font-weight:bold;'  : '');
  var h = '<div style="'+bodyStyle+'">';

  // ── HEADER ────────────────────────────────────────────────────────────
  var hs = cfg.hdrStyle || 'plain-center';
  var na = cfg.nameAlign === 'LEFT' ? 'left' : 'center';

  if (hs === 'banner' || hs === 'gradient-banner') {
    // Full-bleed coloured/gradient banner
    h += '<div style="background:'+cfg.headerBg+';margin:-52px -62px 24px;padding:26px 62px;text-align:'+na+'">';
    h += '<div class="pv-name" style="color:'+cfg.headerFg+'">'+esc(d.name)+'</div>';
    h += '<div style="text-align:'+na+';font-size:'+fsz+'pt;color:'+cfg.headerFg+';opacity:.75;margin:4px 0 2px">'+esc(d.phone)+' &middot; '+esc(d.email)+'</div>';
    if(d.locationPreference) h += '<div style="text-align:'+na+';font-style:italic;font-size:'+(fsz-0.5)+'pt;color:'+cfg.headerFg+';opacity:.6">'+esc(d.locationPreference)+'</div>';
    h += '</div>';

  } else if (hs === 'dark-banner') {
    // Dark slate banner (tech)
    h += '<div style="background:'+cfg.headerBg+';margin:-52px -62px 22px;padding:22px 62px">';
    h += '<div class="pv-name" style="color:'+cfg.headerFg+';text-align:left;letter-spacing:-.3px">'+esc(d.name)+'</div>';
    h += '<div style="font-size:'+(fsz-0.5)+'pt;color:rgba(56,189,248,.65);margin:4px 0 2px">'+esc(d.phone)+' &middot; '+esc(d.email)+'</div>';
    if(d.locationPreference) h += '<div style="font-style:italic;font-size:'+(fsz-0.5)+'pt;color:rgba(56,189,248,.45)">'+esc(d.locationPreference)+'</div>';
    h += '</div>';

  } else if (hs === 'light-banner') {
    // Pale coloured banner (entry level)
    h += '<div style="background:'+cfg.headerBg+';margin:-52px -62px 22px;padding:22px 62px;text-align:center;border-bottom:2px solid '+ac+'">';
    h += '<div class="pv-name" style="color:'+cfg.headerFg+'">'+esc(d.name)+'</div>';
    h += '<div style="text-align:center;font-size:'+fsz+'pt;color:'+cfg.headerFg+';opacity:.8;margin:4px 0 2px">'+esc(d.phone)+' &middot; '+esc(d.email)+'</div>';
    if(d.locationPreference) h += '<div style="text-align:center;font-style:italic;font-size:'+(fsz-0.5)+'pt;color:'+cfg.headerFg+';opacity:.65">'+esc(d.locationPreference)+'</div>';
    h += '</div>';

  } else if (hs === 'top-stripe') {
    // Thick coloured top stripe (healthcare)
    h += '<div style="border-top:5px solid '+ac+';padding:16px 0 12px;text-align:center;margin-bottom:4px">';
    h += '<div class="pv-name" style="color:'+ac+'">'+esc(d.name)+'</div>';
    h += '<div class="pv-contact">'+esc(d.phone)+' &middot; '+esc(d.email)+'</div>';
    if(d.locationPreference) h += '<div class="pv-loc">'+esc(d.locationPreference)+'</div>';
    h += '</div>';

  } else if (hs === 'double-border') {
    // Double navy lines above and below (government — formal)
    h += '<div style="border-top:3px solid '+ac+';border-bottom:3px solid '+ac+';padding:14px 0;margin-bottom:16px;text-align:center">';
    h += '<div class="pv-name" style="font-size:18pt;letter-spacing:2.5px;text-transform:uppercase">'+esc(d.name)+'</div>';
    h += '<div class="pv-contact" style="margin-top:6px">'+esc(d.phone)+' &middot; '+esc(d.email)+'</div>';
    if(d.locationPreference) h += '<div class="pv-loc">'+esc(d.locationPreference)+'</div>';
    h += '</div>';

  } else if (hs === 'accent-top') {
    // Coloured bar at top then plain centre (consulting)
    h += '<div style="background:'+cfg.headerBg+';height:7px;margin:-52px -62px 0"></div>';
    h += '<div style="text-align:center;padding:18px 0 12px;border-bottom:2.5px solid '+ac+';margin-bottom:4px">';
    h += '<div class="pv-name">'+esc(d.name)+'</div>';
    h += '<div class="pv-contact">'+esc(d.phone)+' &middot; '+esc(d.email)+'</div>';
    if(d.locationPreference) h += '<div class="pv-loc">'+esc(d.locationPreference)+'</div>';
    h += '</div>';

  } else if (hs === 'color-left') {
    // Vertical coloured stripe left of name (creative)
    h += '<div style="display:flex;margin:-52px -62px 22px -62px">';
    h += '<div style="background:'+cfg.headerBg+';width:9px;flex-shrink:0"></div>';
    h += '<div style="padding:22px 28px;flex:1">';
    h += '<div class="pv-name" style="color:'+ac+';text-align:left;font-size:26pt">'+esc(d.name)+'</div>';
    h += '<div style="font-size:'+fsz+'pt;color:#555;margin:4px 0 2px">'+esc(d.phone)+' &middot; '+esc(d.email)+'</div>';
    if(d.locationPreference) h += '<div style="font-style:italic;font-size:'+(fsz-0.5)+'pt;color:#888">'+esc(d.locationPreference)+'</div>';
    h += '</div></div>';

  } else if (hs === 'plain-left') {
    // Left-aligned, thin divider (minimal / compact)
    h += '<div style="text-align:left;padding-bottom:10px;margin-bottom:8px;border-bottom:1px solid #ddd">';
    h += '<div class="pv-name" style="text-align:left;font-size:20pt">'+esc(d.name)+'</div>';
    h += '<div class="pv-contact" style="text-align:left">'+esc(d.phone)+' &middot; '+esc(d.email)+'</div>';
    if(d.locationPreference) h += '<div class="pv-loc" style="text-align:left">'+esc(d.locationPreference)+'</div>';
    h += '</div>';

  } else {
    // plain-center (classic, professional, academic, government fallback)
    h += '<div style="text-align:center;padding-bottom:12px;margin-bottom:4px">';
    h += '<div class="pv-name">'+esc(d.name)+'</div>';
    h += '<div class="pv-contact">'+esc(d.phone)+' &middot; '+esc(d.email)+'</div>';
    if(d.locationPreference) h += '<div class="pv-loc">'+esc(d.locationPreference)+'</div>';
    h += '</div>';
  }

  // ── SECTION HEADER helper ──────────────────────────────────────────────
  function secHdr(name){
    var label = cfg.secCase === 'title' ? name : name.toUpperCase();
    switch(cfg.secHdr){
      case 'double':
        return '<div style="font-weight:700;border-top:1px solid '+ac+';border-bottom:1px solid '+ac+';padding:3px 0;margin:16px 0 8px;color:'+ac+';font-size:10.5pt">'+esc(label)+'</div>';
      case 'left-bar':
        return '<div style="font-weight:700;border-left:3.5px solid '+ac+';padding:2px 0 2px 10px;margin:16px 0 8px;color:'+ac+';font-size:10.5pt">'+esc(label)+'</div>';
      case 'block-bg':
        return '<div style="font-weight:700;background:'+ac+';color:#fff;padding:5px 10px;margin:14px 0 8px;font-size:10pt;letter-spacing:.4px">'+esc(label)+'</div>';
      case 'caps-gray':
        return '<div style="font-weight:700;font-size:8.5pt;color:#888;letter-spacing:1.2px;margin:14px 0 5px;text-transform:uppercase;border-bottom:1px solid #eee;padding-bottom:3px">'+esc(name)+'</div>';
      case 'dots':
        return '<div style="font-weight:700;border-bottom:2px dotted '+ac+';margin:16px 0 8px;padding-bottom:4px;font-size:10.5pt;color:'+ac+';font-style:italic">'+esc(label)+'</div>';
      case 'color-underline':
        return '<div style="font-weight:700;border-bottom:2px solid '+ac+';margin:16px 0 8px;padding-bottom:3px;font-size:10.5pt;color:'+ac+'">'+esc(label)+'</div>';
      default: // underline
        return '<div style="font-weight:700;border-bottom:1.5px solid '+ac+';margin:16px 0 8px;padding-bottom:3px;font-size:10.5pt;color:'+ac+'">'+esc(label)+'</div>';
    }
  }

  // ── SKILLS renderer ────────────────────────────────────────────────────
  function renderSkills(items){
    if(!items||!items.length) return '';
    switch(cfg.skillsRender){
      case 'pills':
        var pH='<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px">';
        items.forEach(function(s){ pH+='<span style="background:'+ac+'1a;border:1px solid '+ac+'55;color:'+ac+';padding:2px 11px;border-radius:99px;font-size:9pt">'+esc(s)+'</span>'; });
        return pH+'</div>';
      case 'tags':
        var tH='<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px">';
        items.forEach(function(s){ tH+='<span style="background:#162032;color:#38bdf8;border:1px solid #38bdf8;padding:2px 9px;border-radius:3px;font-size:8.5pt;font-family:monospace">'+esc(s)+'</span>'; });
        return tH+'</div>';
      case 'inline':
        return '<div style="margin-bottom:10px;color:#444;font-size:'+fsz+'pt">'+items.map(function(s){return esc(s);}).join(' &middot; ')+'</div>';
      case 'single':
        var sH='<div style="margin-bottom:10px">';
        items.forEach(function(s){ sH+='<div style="font-size:'+fsz+'pt;margin-bottom:2px">&#8212; '+esc(s)+'</div>'; });
        return sH+'</div>';
      default: // grid2
        var gH='<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 20px;margin-bottom:10px">';
        items.forEach(function(s){ gH+='<div style="font-size:'+fsz+'pt;padding:1px 0">&bull; '+esc(s)+'</div>'; });
        return gH+'</div>';
    }
  }

  // ── SECTIONS in template order ────────────────────────────────────────
  cfg.order.forEach(function(sec){
    // Skip hidden sections (only applicable for custom template)
    if(cfg.hidden && cfg.hidden[sec]) return;
    if(sec==='summary'){
      h+=secHdr(d.summaryTitle||cfg.names.summary);
      h+='<div class="pv-para">'+esc(d.summary)+'</div>';
    } else if(sec==='skills'){
      h+=secHdr(cfg.names.skills);
      h+=renderSkills(d.coreCompetencies);
    } else if(sec==='experience'){
      h+=secHdr(cfg.names.experience);
      (d.workExperience||[]).forEach(function(role){
        h+='<div class="pv-role-hdr"><span class="pv-rtitle">'+esc(role.title)+'&nbsp;&nbsp;|&nbsp;&nbsp;'+esc(role.company)+'&nbsp;&nbsp;|&nbsp;&nbsp;'+esc(role.location)+'</span><span class="pv-rdates">'+esc(role.dates)+'</span></div>';
        var projs=role.projects||[];
        projs.forEach(function(p){ h+='<div class="pv-proj"><strong>'+esc(p.title)+':</strong> '+esc(p.description)+'</div>'; });
        if((role.responsibilities||[]).length){
          if(projs.length>0) h+='<div class="pv-resp-lbl">Roles/Responsibilities</div>';
          h+='<ul class="pv-ul">';
          role.responsibilities.forEach(function(b){ h+='<li>'+esc(b)+'</li>'; });
          h+='</ul>';
        }
      });
    } else if(sec==='tech'){
      h+=secHdr(cfg.names.tech);
      (d.technicalSkills||[]).forEach(function(t){ h+='<div class="pv-tech"><strong>'+esc(t.category)+':</strong> '+esc(t.items)+'</div>'; });
    } else if(sec==='certs'){
      h+=secHdr(cfg.names.certs);
      h+='<ul class="pv-ul">';
      (d.certifications||[]).forEach(function(c){ h+='<li>'+esc(c)+'</li>'; });
      h+='</ul>';
    } else if(sec==='edu'){
      h+=secHdr(cfg.names.edu);
      (d.education||[]).forEach(function(e){ h+='<div class="pv-edu"><strong>'+esc(e.degree)+'</strong>&nbsp;&nbsp;|&nbsp;&nbsp;'+esc(e.institution)+', <em>'+esc(e.location)+'</em></div>'; });
    }
  });

  h += '</div>';
  return h;
}

// ── Preview modal ──────────────────────────────────────────────────────────
function openPreview(){ document.getElementById('previewModal').classList.add('on'); document.body.style.overflow='hidden'; }
function closePreview(){ document.getElementById('previewModal').classList.remove('on'); document.body.style.overflow=''; }

// ── UI helpers ─────────────────────────────────────────────────────────────
var stepIcons=['📂','🧠','📄','✉️','🎯','🔍','💬'];
function step(n,state){
  var el=document.getElementById('ps'+n);
  el.className='ps'+(state?' '+state:'');
  el.querySelector('.ps-ic').textContent=state==='done'?'✅':state==='active'?'⏳':stepIcons[n-1];
}
function showAlert(type,title,detail){
  var a=document.getElementById('alert'); a.className='alert on '+type;
  document.getElementById('alertIcon').textContent=type==='error'?'❌':type==='info'?'ℹ️':'⚠️';
  document.getElementById('alertT').textContent=title;
  document.getElementById('alertD').textContent=detail;
}
function clearAlert(){ document.getElementById('alert').className='alert'; }
function clearOutputs(){
  document.getElementById('dlGrid').innerHTML='';
  ['dlCard','atsCard','gapCard','iqCard'].forEach(function(id){document.getElementById(id).style.display='none';});
  document.getElementById('atsContent').innerHTML='';
  document.getElementById('gapContent').innerHTML='';
  document.getElementById('iqContent').innerHTML='';
  resumeBlobRef=null; resumeNameRef='';
}
function addDownload(blob,fname,icon,label){
  var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=fname; a.className='dl-card';
  a.innerHTML='<span class="di">'+icon+'</span><span>'+label+'</span><span class="dn">'+fname+'</span>';
  document.getElementById('dlGrid').appendChild(a);
}
function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ══════════════════════════════════════════════════════════════════════════════
// ── PROFILE → TEMPLATE RECOMMENDATIONS ───────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
// Each profile maps to [top pick, 2nd, 3rd] with a short reason for each.
var PROFILE_TEMPLATES = {
  tech:        { recs:['tech','modern','compact'],
                 why:['Skills-first layout — perfect for engineers','Indigo accent bar, modern & clean','Dense format fits all your tech stacks'] },
  business:    { recs:['professional','consulting','classic'],
                 why:['Sidebar structure suits BA & ops roles','Impact-first — great for process wins','Universal ATS-safe format'] },
  finance:     { recs:['executive','government','classic'],
                 why:['Formal serif conveys financial seniority','Thick borders suit compliance-heavy roles','Conservative — expected in finance'] },
  healthcare:  { recs:['healthcare','minimal','classic'],
                 why:['Clinical section names built in','Clean layout — credentials speak clearly','Standard format for clinical CVs'] },
  marketing:   { recs:['creative','modern','minimal'],
                 why:['Teal accent shows creative personality','Vibrant contemporary feel','Clean canvas — let the metrics shine'] },
  pm:          { recs:['professional','consulting','modern'],
                 why:['Sidebar suits PM delivery portfolios','Impact-first for roadmap achievements','Modern for tech-adjacent PM roles'] },
  sales:       { recs:['consulting','executive','professional'],
                 why:['Impact-first — perfect for quota wins','Formal serif for enterprise sales roles','Clean structure for B2B sales'] },
  legal:       { recs:['executive','government','classic'],
                 why:['Formal serif — standard in legal profession','Federal style suits regulatory roles','Conservative — expected by law firms'] },
  data:        { recs:['tech','modern','compact'],
                 why:['Tech-first puts ML skills front & centre','Clean layout for data-heavy profiles','Fits all your tools & frameworks concisely'] },
  engineering: { recs:['professional','government','compact'],
                 why:['Clean sidebar suits technical CVs','Formal thick borders for standards-heavy roles','Compact fits all technical project detail'] },
  education:   { recs:['academic','minimal','classic'],
                 why:['Education-first — built for academics','Clean focus — credentials do the talking','Standard format for school applications'] },
  hr:          { recs:['professional','modern','minimal'],
                 why:['Professional sidebar suits HR leaders','Modern accent for progressive HR roles','Minimalist — shows design sensibility'] },
  ux:          { recs:['creative','modern','minimal'],
                 why:['Left accent strip shows design awareness','Contemporary feel for product designers','White space is a design statement'] },
  cyber:       { recs:['tech','government','compact'],
                 why:['Tech-first for certs & security tools','Government style suits InfoSec roles','Dense format fits all certifications'] },
  supplychain: { recs:['professional','government','compact'],
                 why:['Clean sidebar for operations leaders','Formal structure for regulated industries','Compact fits supply chain metrics well'] },
  government:  { recs:['government','executive','classic'],
                 why:['Federal style — expected in public sector','Formal serif conveys seniority','APS-standard conservative format'] },
  nonprofit:   { recs:['minimal','creative','professional'],
                 why:['Clean focus on mission & community impact','Teal accent conveys social purpose','Professional — suits senior sector roles'] },
  realestate:  { recs:['professional','consulting','modern'],
                 why:['Clean sidebar for property professionals','Impact-first for sales volumes & deals','Contemporary feel for progressive agents'] }
};

function highlightRecommendedTemplates(profileKey) {
  // Clear previous badges and highlights
  document.querySelectorAll('.template-card').forEach(function(c) {
    c.classList.remove('rec-top','rec-good');
    var b = c.querySelector('.t-rec-badge');
    if (b) b.remove();
  });

  var entry = PROFILE_TEMPLATES[profileKey];
  var profileName = (PROFILES[profileKey]||{}).name || profileKey;

  // Hide message if no mapping
  if (!entry) { document.getElementById('profileRecMsg').classList.remove('on'); return; }

  // Badge the top-3 template cards
  var badgeLabels = ['⭐ Top Pick', '✓ Great fit', '✓ Good fit'];
  entry.recs.forEach(function(tmplKey, idx) {
    var card = document.querySelector('.template-card[data-template="'+tmplKey+'"]');
    if (!card) return;
    var b = document.createElement('div');
    b.className = 't-rec-badge ' + (idx === 0 ? 'rec-top' : 'rec-good');
    b.textContent = badgeLabels[idx];
    card.insertBefore(b, card.firstChild);
    card.classList.add(idx === 0 ? 'rec-top' : 'rec-good');
  });

  // Auto-select the #1 recommended template
  var topKey = entry.recs[0];
  document.querySelectorAll('.template-card').forEach(function(c) { c.classList.remove('selected'); });
  var topCard = document.querySelector('.template-card[data-template="'+topKey+'"]');
  if (topCard) { topCard.classList.add('selected'); selectedTemplate = topKey; }

  // Build pick chips in the recommendation bar
  document.getElementById('prmTitle').textContent = 'Best templates for ' + profileName + ':';
  var picsHtml = '';
  entry.recs.forEach(function(tmplKey, idx) {
    var label = (TEMPLATE_LABELS[tmplKey]||tmplKey).split('\u2014')[0].trim();
    var why   = entry.why[idx] || '';
    picsHtml += '<span class="prm-pick'+(idx===0?' prm-top':'')+'" data-jump="'+tmplKey+'" title="'+esc(why)+'">';
    picsHtml += (idx===0 ? '⭐ ' : '✓ ') + esc(label) + '</span>';
  });
  document.getElementById('prmPicks').innerHTML = picsHtml;
  document.getElementById('profileRecMsg').classList.add('on');

  // Clicking a pick chip selects that template and scrolls to it
  document.querySelectorAll('#prmPicks .prm-pick').forEach(function(chip) {
    chip.addEventListener('click', function() {
      var key = chip.getAttribute('data-jump');
      document.querySelectorAll('.template-card').forEach(function(c) { c.classList.remove('selected'); });
      var target = document.querySelector('.template-card[data-template="'+key+'"]');
      if (target) {
        target.classList.add('selected');
        selectedTemplate = key;
        target.scrollIntoView({behavior:'smooth', block:'center'});
      }
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// ── TEMPLATE PREVIEW (Lorem Ipsum sample data) ────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
var LOREM_DATA = {
  name: 'Alexandra Reynolds',
  phone: '+1 (555) 234-5678',
  email: 'alexandra.reynolds@email.com',
  locationPreference: 'New York, NY  |  Open to Remote',
  summaryTitle: 'PROFESSIONAL SUMMARY — SENIOR PRODUCT MANAGER',
  summary: 'A results-driven Senior Product Manager with 8+ years of experience leading cross-functional teams to deliver enterprise SaaS products at scale. Proven track record of translating complex customer needs into clear product roadmaps, achieving a 40% reduction in time-to-market and growing ARR by $2.4M. Adept at stakeholder management, data-driven prioritisation, and agile delivery in high-growth environments.',
  coreCompetencies: [
    'Product Strategy & Roadmapping',  'Agile / Scrum Methodologies',
    'Stakeholder Management',           'Data-Driven Decision Making',
    'User Research & UX Collaboration', 'Cross-Functional Leadership',
    'Go-to-Market Planning',            'OKR Framework Implementation',
    'Revenue Growth Strategy',          'API & Platform Products',
    'A/B Testing & Experimentation',   'Product Analytics (Mixpanel, Amplitude)'
  ],
  workExperience: [
    {
      title: 'Senior Product Manager',
      company: 'TechVision Corp',
      location: 'New York, NY',
      dates: 'Jan 2021 — Present',
      projects: [
        { title: 'Project 1: Enterprise Analytics Dashboard', description: 'Led end-to-end delivery of a real-time analytics platform serving 500+ enterprise clients, achieving a 35% improvement in customer retention within 12 months of launch.' },
        { title: 'Project 2: Mobile SDK Redesign', description: 'Drove complete overhaul of the mobile SDK, reducing client integration time from 6 weeks to 3 days and cutting onboarding support tickets by 60%.' }
      ],
      responsibilities: [
        'Defined and maintained the quarterly product roadmap using Jira and Confluence, aligning 4 engineering squads and 2 design pods to strategic OKRs.',
        'Conducted 60+ user interviews via UserTesting.com and synthesised findings into actionable product requirements that increased DAU by 28%.',
        'Partnered with Sales and Marketing to launch 3 major product releases, coordinating go-to-market strategy that generated $1.2M in new pipeline within 90 days.',
        'Implemented A/B testing framework using Optimizely, running 15+ experiments per quarter to optimise onboarding flow and reduce 30-day churn by 18%.'
      ]
    },
    {
      title: 'Product Manager',
      company: 'Innovate Solutions',
      location: 'Boston, MA',
      dates: 'Mar 2018 — Dec 2020',
      projects: [
        { title: 'Project 1: Payment Integration Platform', description: 'Scoped and delivered Stripe and PayPal integration across 3 product lines, enabling $4.8M in new transaction volume across 12 international markets.' }
      ],
      responsibilities: [
        'Managed full product lifecycle from discovery through delivery for a B2B SaaS platform with 200+ enterprise customers and $18M ARR.',
        'Collaborated with UX team in Figma to prototype and validate 12 new features through usability testing, achieving 92% user acceptance in beta.',
        'Wrote detailed PRDs, user stories, and acceptance criteria in Confluence, maintaining a well-groomed backlog of 150+ items across 3 workstreams.'
      ]
    }
  ],
  technicalSkills: [
    { category: 'Product Tools', items: 'Jira, Confluence, Productboard, Aha!, Notion, Linear' },
    { category: 'Analytics',     items: 'Mixpanel, Amplitude, Google Analytics 4, Tableau, Looker' },
    { category: 'Design',        items: 'Figma, InVision, Miro, Sketch' },
    { category: 'Development',   items: 'SQL, REST APIs, Git (basic), Postman' },
    { category: 'CRM / GTM',     items: 'Salesforce, HubSpot, Intercom, Pendo' }
  ],
  certifications: [
    'Certified Scrum Product Owner (CSPO) — Scrum Alliance, 2022',
    'Google Project Management Certificate — Coursera, 2021',
    'Product Management Certificate — Pragmatic Institute, 2020'
  ],
  education: [
    { degree: 'Bachelor of Business Administration (Marketing)', institution: 'Boston University', location: 'Boston, MA' }
  ]
};

// Direct-bullet Lorem data — used when selected profile is NOT project-style.
// projects:[] on every role; all content is in responsibilities[] as flat bullets.
var LOREM_DATA_BULLET = {
  name: 'Alexandra Reynolds',
  phone: '+1 (555) 234-5678',
  email: 'alexandra.reynolds@email.com',
  locationPreference: 'New York, NY  |  Open to Remote',
  summaryTitle: 'CLINICAL PROFILE — SENIOR NURSE MANAGER',
  summary: 'A compassionate and outcomes-focused Senior Nurse Manager with 10+ years of acute care experience delivering evidence-based patient care in high-acuity hospital settings. Proven record of reducing hospital-acquired pressure injuries by 44%, improving JCAHO compliance scores to 98%, and leading multidisciplinary teams of 25+ clinical staff. Adept at implementing evidence-based protocols, managing complex caseloads using Epic EHR, and driving continuous quality improvement across the care continuum.',
  coreCompetencies: [
    'Patient Assessment & Triage',        'Clinical Quality Improvement',
    'JCAHO Compliance & Accreditation',   'Multidisciplinary Team Leadership',
    'Epic EHR & Cerner Documentation',    'Medication Administration & Safety',
    'Evidence-Based Clinical Protocols',  'Staff Education & Mentoring',
    'Infection Control & Prevention',     'Patient & Family Education',
    'Risk Management & Incident Reporting','Regulatory & CMS Compliance'
  ],
  workExperience: [
    {
      title: 'Senior Nurse Manager — Acute Care Unit',
      company: 'Metro General Hospital',
      location: 'New York, NY',
      dates: 'Jan 2019 — Present',
      projects: [],
      responsibilities: [
        'Supervised and mentored a multidisciplinary team of 25 RNs, LPNs, and patient care technicians across a 40-bed acute care unit, maintaining a 96% staff satisfaction score in annual surveys.',
        'Implemented evidence-based pressure injury prevention protocols using the Braden Scale assessment tool, reducing hospital-acquired pressure injuries by 44% over 18 months.',
        'Managed patient caseloads of 8-12 high-acuity patients per shift, conducting head-to-toe clinical assessments and documenting all observations in Epic EHR in real time.',
        'Led JCAHO accreditation preparation across the unit, achieving a 98% compliance score with zero deficiencies noted in the most recent triennial survey.',
        'Administered and reconciled medications for 30+ patients daily using the 5 Rights protocol and facility-specific double-check procedures for high-alert medications.',
        'Educated patients and families on discharge instructions, post-procedure care, and medication adherence using the teach-back method, contributing to an 18% reduction in 30-day readmissions.'
      ]
    },
    {
      title: 'Registered Nurse — Emergency Department',
      company: 'Riverside Medical Centre',
      location: 'Boston, MA',
      dates: 'Jun 2015 — Dec 2018',
      projects: [],
      responsibilities: [
        'Triaged and assessed 40-60 patients per 12-hour shift in a Level II Trauma Centre using the Emergency Severity Index (ESI), reducing patient wait times by 22%.',
        'Coordinated care for critically ill patients with attending physicians, surgeons, and allied health professionals, achieving a 91% patient satisfaction rating across the department.',
        'Documented all clinical observations, interventions, and patient responses in Cerner EHR, maintaining 100% compliance with charting timeliness standards across 3 years.',
        'Responded to 15+ Code Blue events per month, performing BLS and ACLS interventions including defibrillation, IV medication administration, and airway management.'
      ]
    }
  ],
  technicalSkills: [
    { category: 'Clinical Systems',  items: 'Epic EHR, Cerner, Meditech, Pyxis MedStation' },
    { category: 'Clinical Tools',    items: 'Braden Scale, ESI Triage, SBAR, Glasgow Coma Scale, NEWS2' },
    { category: 'Compliance',        items: 'JCAHO, HIPAA, CMS Conditions of Participation, OSHA Bloodborne Pathogens Standard' }
  ],
  certifications: [
    'Registered Nurse (RN) License — New York State Board of Nursing, Active',
    'Advanced Cardiovascular Life Support (ACLS) — American Heart Association, 2024',
    'Certified Medical-Surgical Registered Nurse (CMSRN) — AMSN, 2022',
    'Trauma Nursing Core Course (TNCC) — ENA, 2021'
  ],
  education: [
    { degree: 'Master of Science in Nursing (MSN) — Nurse Leadership', institution: 'New York University', location: 'New York, NY' }
  ]
};

// Returns the correct lorem sample based on the currently selected profile style.
// Project-style profiles get the PM/Tech sample; all others get the direct-bullet sample.
function getLoremData() {
  return (!selectedProfile || isProjectProfile(selectedProfile)) ? LOREM_DATA : LOREM_DATA_BULLET;
}

var TEMPLATE_ORDER  = ['classic','executive','modern','professional','minimal','tech','consulting','academic','entrylevel','government','creative','healthcare','compact','custom'];
var TEMPLATE_LABELS = {
  classic:'Classic — Traditional, centered',    executive:'Executive — Serif, double rule',
  modern:'Modern — Indigo accent bar',           professional:'Professional — Navy sidebar',
  minimal:'Minimal — Clean, no borders',         tech:'Tech First — Skills lead',
  consulting:'Consulting — Burgundy, impact-first', academic:'Academic — Education first',
  entrylevel:'Entry Level — Education & skills first', government:'Government — Formal, federal',
  creative:'Creative — Teal left accent',        healthcare:'Healthcare — Clinical teal',
  compact:'Compact — Dense, 1-page optimised',   custom:'Custom ✦ — Design from scratch'
};
var currentPreviewTemplate = 'classic';

function openTmplPreview(tmplKey) {
  currentPreviewTemplate = tmplKey || 'classic';
  renderTmplPreview();
  document.getElementById('tmplPreviewModal').classList.add('on');
  document.body.style.overflow = 'hidden';
}
function closeTmplPreview() {
  document.getElementById('tmplPreviewModal').classList.remove('on');
  document.body.style.overflow = '';
}
function renderTmplPreview() {
  var data = getLoremData(); // project-style or direct-bullet depending on selected profile
  var styleLabel = (!selectedProfile || isProjectProfile(selectedProfile)) ? ' · Project style' : ' · Direct bullet style';
  document.getElementById('tpvTitle').textContent = (TEMPLATE_LABELS[currentPreviewTemplate] || currentPreviewTemplate) + styleLabel;
  document.getElementById('tpvPage').innerHTML = buildResumeHtml(data, currentPreviewTemplate);
}
function navigateTmplPreview(dir) {
  var idx = TEMPLATE_ORDER.indexOf(currentPreviewTemplate);
  idx = (idx + dir + TEMPLATE_ORDER.length) % TEMPLATE_ORDER.length;
  currentPreviewTemplate = TEMPLATE_ORDER[idx];
  renderTmplPreview();
}
function selectPreviewedTemplate() {
  document.querySelectorAll('.template-card').forEach(function(c) { c.classList.remove('selected'); });
  var card = document.querySelector('.template-card[data-template="'+currentPreviewTemplate+'"]');
  if (card) card.classList.add('selected');
  selectedTemplate = currentPreviewTemplate;
  closeTmplPreview();
}

// ══════════════════════════════════════════════════════════════════════════════
// ── TEMPLATE CAROUSEL MODAL ───────────────────────────────────────────────────
// Gold-background 3-card slider with Resumes + Cover Letters tabs
// ══════════════════════════════════════════════════════════════════════════════
var _tmcTab  = 'resume';
var _tmcIdx  = 0;
var _tmcHtmlCache = {};  // cacheKey → rendered html string

// Template lists for each tab
var _tmcResumeList = ['classic','executive','modern','professional','minimal','tech','consulting','academic','entrylevel','government','creative','healthcare','compact','custom'];
var _tmcCLList     = ['classic','modern','executive','minimalist','bold','creative','technical','elegant','corporate','compact'];

// Sample cover letter data used in previews
var _tmcCLSample = {
  name:'Alex Chen', phone:'(555) 123-4567', email:'alex.chen@email.com',
  coverLetter:{
    recipientTitle:'Hiring Manager', recipientOrg:'Acme Corp', recipientLocation:'New York, NY',
    reLine:'Senior Marketing Manager - Competition #MKT-25',
    openingParagraph:'I am writing to apply for the Senior Marketing Manager position at Acme Corp. With 7+ years driving growth across B2B and B2C channels, I bring a proven track record of integrated campaigns that consistently exceed pipeline targets.',
    bodyParagraph1:'In my current role at WeWork, I led a team of 12 across demand generation, content, and brand — hitting 120% of pipeline targets. I designed campaigns across paid, organic, and email that grew MQL volume by 45% year-over-year while reducing cost-per-acquisition by 22%.',
    bodyParagraph2:'',
    closingParagraph:'Thank you for your time and consideration. I would welcome the opportunity to discuss how my background aligns with your goals.'
  }
};

function openTmplCarousel(tab, key) {
  _tmcTab = tab || 'resume';
  var list = _tmcTab === 'cl' ? _tmcCLList : _tmcResumeList;
  _tmcIdx  = (key && list.indexOf(key) >= 0) ? list.indexOf(key) : 0;
  _tmcSyncTabs();
  _tmcRender();
  document.getElementById('tmplCarouselModal').classList.add('on');
  document.body.style.overflow = 'hidden';
}

function closeTmplCarousel() {
  document.getElementById('tmplCarouselModal').classList.remove('on');
  document.body.style.overflow = '';
}

function switchCarouselTab(tab) {
  _tmcTab = tab;
  _tmcIdx = 0;
  _tmcSyncTabs();
  _tmcRender();
}

function _tmcSyncTabs() {
  document.querySelectorAll('.tmc-tab').forEach(function(t) {
    t.classList.toggle('active', t.dataset.tab === _tmcTab);
  });
}

function tmcNav(dir) {
  var list = _tmcTab === 'cl' ? _tmcCLList : _tmcResumeList;
  _tmcIdx = (_tmcIdx + dir + list.length) % list.length;
  _tmcRender();
}

function tmcNavTo(idx) {
  _tmcIdx = idx;
  _tmcRender();
}

function tmcUseTemplate() {
  var list = _tmcTab === 'cl' ? _tmcCLList : _tmcResumeList;
  var key  = list[_tmcIdx];
  if (_tmcTab === 'cl') {
    setCLTemplate(key);
    showAlert('info','Cover letter template set','Switched to the ' + ((CL_TMPL_DEFS[key]||{}).label || key) + ' template.');
  } else {
    document.querySelectorAll('.template-card').forEach(function(c){ c.classList.remove('selected'); });
    var card = document.querySelector('.template-card[data-template="'+key+'"]');
    if(card){ card.classList.add('selected'); card.scrollIntoView({behavior:'smooth',block:'nearest'}); }
    selectedTemplate = key;
    // Refresh live previews
    var pv = document.getElementById('pvPage');
    if(pv && pv.innerHTML) pv.innerHTML = buildResumeHtml(tailoredRef || getLoremData(), key);
    var tp = document.getElementById('tpvPage');
    if(tp && tp.innerHTML) tp.innerHTML = buildResumeHtml(getLoremData(), key);
    showAlert('info','Template selected',(TEMPLATE_LABELS[key]||key).split('\u2014')[0].trim()+' template is now active.');
  }
  closeTmplCarousel();
}

// Build preview HTML for a given template key and tab
function _tmcBuildHtml(key) {
  var cacheKey = _tmcTab + ':' + key;
  if(_tmcHtmlCache[cacheKey]) return _tmcHtmlCache[cacheKey];
  var html;
  if(_tmcTab === 'cl') {
    // CL templates carry their own internal padding — fix width + ensure full A4 height
    html = '<div style="width:860px;background:#fff;box-sizing:border-box;min-height:1122px">' + buildCoverLetterHtml(_tmcCLSample, key) + '</div>';
  } else {
    // Resume templates use margin:-52px -62px on banners — they MUST be inside
    // a 52px/62px padded container or the bleed overflows incorrectly.
    html = '<div style="padding:52px 62px;background:#fff;box-sizing:border-box;min-height:1122px">' + buildResumeHtml(getLoremData(), key) + '</div>';
  }
  _tmcHtmlCache[cacheKey] = html;
  return html;
}

// Fill one slot with scaled preview content
function _tmcFillSlot(elId, key, cardW) {
  var el = document.getElementById(elId);
  if(!el) return;
  var NATURAL_W = 860;
  var scale = (cardW / NATURAL_W).toFixed(4);
  el.innerHTML = '<div class="tmc-scaler" style="width:'+NATURAL_W+'px;transform:scale('+scale+')">' + _tmcBuildHtml(key) + '</div>';
}

function _tmcRender() {
  var list = _tmcTab === 'cl' ? _tmcCLList : _tmcResumeList;
  var n    = list.length;
  var prev = list[(_tmcIdx - 1 + n) % n];
  var curr = list[_tmcIdx];
  var next = list[(_tmcIdx + 1) % n];

  // Side cards (265px wide)
  _tmcFillSlot('tmcLeft',  prev, 265);
  _tmcFillSlot('tmcRight', next, 265);

  // Center card (312px wide)
  var centerContent = document.getElementById('tmcCenterContent');
  if(centerContent){
    var NATURAL_W = 860;
    var scale = (312 / NATURAL_W).toFixed(4);
    centerContent.innerHTML = '<div class="tmc-scaler" style="width:'+NATURAL_W+'px;transform:scale('+scale+')">' + _tmcBuildHtml(curr) + '</div>';
  }

  // Label
  var label = _tmcTab === 'cl'
    ? ((CL_TMPL_DEFS[curr]||{}).label || curr)
    : (TEMPLATE_LABELS[curr]||curr).split('\u2014')[0].trim();
  var labelEl = document.getElementById('tmcCenterLabel');
  if(labelEl) labelEl.textContent = label;

  // Dots
  var dotsEl = document.getElementById('tmcDots');
  if(dotsEl){
    var dHtml = '';
    for(var i = 0; i < n; i++){
      dHtml += '<button class="tmc-dot'+(i===_tmcIdx?' active':'')+'" onclick="tmcNavTo('+i+')" title="'+list[i]+'"></button>';
    }
    dotsEl.innerHTML = dHtml;
  }
}

// Keyboard nav for carousel
document.addEventListener('keydown', function(e) {
  var zModal = document.getElementById('tmcZoomModal');
  if(zModal && zModal.classList.contains('on')) {
    if(e.key === 'Escape') closeTmcZoom();
    return; // zoom modal takes priority
  }
  var modal = document.getElementById('tmplCarouselModal');
  if(!modal || !modal.classList.contains('on')) return;
  if(e.key === 'ArrowLeft')  tmcNav(-1);
  if(e.key === 'ArrowRight') tmcNav(1);
  if(e.key === 'Escape')     closeTmplCarousel();
});

// ── ZOOM MODAL ────────────────────────────────────────────────────────────────
var _tmcZoomLevel = 100;

function openTmcZoom() {
  var list  = _tmcTab === 'cl' ? _tmcCLList : _tmcResumeList;
  var key   = list[_tmcIdx];
  var label = _tmcTab === 'cl'
    ? ((CL_TMPL_DEFS[key]||{}).label || key)
    : (TEMPLATE_LABELS[key]||key).split('\u2014')[0].trim();
  var subtitle = _tmcTab === 'cl' ? 'Cover letter' : 'Resume';
  var titleEl = document.getElementById('tmczTitle');
  if(titleEl) titleEl.innerHTML = esc(label) + '<span class="tmcz-subtitle"> \u00b7 ' + subtitle + ' template</span>';
  var inner = document.getElementById('tmczPageInner');
  if(inner) inner.innerHTML = _tmcBuildHtml(key);
  setTmcZoom(_tmcZoomLevel);
  var zm = document.getElementById('tmcZoomModal');
  if(zm) zm.classList.add('on');
}

function closeTmcZoom() {
  var zm = document.getElementById('tmcZoomModal');
  if(zm) zm.classList.remove('on');
}

function setTmcZoom(level) {
  _tmcZoomLevel = level;
  document.querySelectorAll('.tmcz-zoom-btn').forEach(function(b) {
    b.classList.toggle('active', b.textContent.trim() === level + '%');
  });
  // CSS zoom resizes the element AND its layout footprint — scroll works correctly
  var wrap = document.getElementById('tmczPageWrap');
  if(wrap) wrap.style.zoom = level + '%';
}

// ══════════════════════════════════════════════════════════════════════════════
// ── SESSION SAVE / RESTORE ────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
var SESSION_KEY = 'proresume_session_v2';

function saveSession(includeTailored) {
  var company = document.getElementById('company').value.trim();
  var role    = document.getElementById('role').value.trim();
  var jd      = document.getElementById('jd').value.trim();
  var now     = new Date();
  var display = now.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
              + ' at ' + now.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
  var data = {
    v:2, savedAt:now.toISOString(), savedAtDisplay:display,
    profile:selectedProfile, template:selectedTemplate,
    company:company, role:role, jd:jd, pages:selectedPages
  };
  if (includeTailored && tailoredRef) {
    data.tailored    = tailoredRef;
    data.resumeName  = resumeNameRef;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  return display;
}

function restoreSession(data) {
  if (!data) return;
  if (data.profile) {
    document.querySelectorAll('.profile-card').forEach(function(c) { c.classList.remove('selected'); });
    var pc = document.querySelector('.profile-card[data-profile="'+data.profile+'"]');
    if (pc) { pc.classList.add('selected'); selectedProfile = data.profile; setStepDone(0); }
  }
  if (data.template) {
    document.querySelectorAll('.template-card').forEach(function(c) { c.classList.remove('selected'); });
    var tc = document.querySelector('.template-card[data-template="'+data.template+'"]');
    if (tc) { tc.classList.add('selected'); selectedTemplate = data.template; }
  }
  if (data.company) document.getElementById('company').value = data.company;
  if (data.role)    document.getElementById('role').value    = data.role;
  if (data.jd)      document.getElementById('jd').value      = data.jd;
  if (data.pages) {
    selectedPages = data.pages;
    document.getElementById('pageSel').value = data.pages;
  }
  if (data.tailored) {
    tailoredRef   = data.tailored;
    jdRef         = data.jd || '';
    resumeNameRef = data.resumeName || '';
    document.getElementById('pvPage').innerHTML = buildResumeHtml(tailoredRef, selectedTemplate);
  }
  refreshStepper();
}

function checkForSavedSession() {
  try {
    var raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return;
    var data = JSON.parse(raw);
    if (!data || !data.v) return;
    var banner = document.getElementById('restoreBanner');
    document.getElementById('rbDetail').textContent =
      'Last saved ' + (data.savedAtDisplay || 'recently') +
      (data.company ? ' \u00b7 ' + data.company : '') +
      (data.role    ? ' \u2014 ' + data.role    : '');
    banner.classList.add('on');
    document.getElementById('rbRestoreBtn').onclick = function() {
      restoreSession(data);
      banner.classList.remove('on');
    };
    document.getElementById('rbDismissBtn').onclick = function() {
      banner.classList.remove('on');
    };
  } catch(e) {}
}

// ══════════════════════════════════════════════════════════════════════════════
// ── JOB APPLICATION TRACKER ───────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
var TRACKER_KEY = 'proresume_tracker_v2';
var STATUS_COLORS = {
  'Applied':'#2d5a8e','Phone Screen':'#0369a1','Interview':'#7c3aed',
  'Final Round':'#92400e','Offer':'#166534','Rejected':'#991b1b','Withdrawn':'#4b5563'
};

function loadTracker() {
  try { return JSON.parse(localStorage.getItem(TRACKER_KEY)) || []; } catch(e) { return []; }
}
function saveTracker(entries) { localStorage.setItem(TRACKER_KEY, JSON.stringify(entries)); }

function addTrackerEntry(company, role, template, profile, atsScore) {
  var entries = loadTracker();
  var now = new Date();
  entries.unshift({
    id: Date.now().toString(),
    company: company || 'Unknown Company',
    role:    role    || 'Unknown Role',
    date:    now.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),
    template: template || 'classic',
    templateLabel: (TEMPLATE_LABELS[template]||template).split('\u2014')[0].trim(),
    profile:  profile || '',
    profileLabel: (PROFILES[profile] ? PROFILES[profile].name : (profile||'General')),
    atsScore: (atsScore !== null && atsScore !== undefined) ? atsScore : null,
    status: 'Applied'
  });
  saveTracker(entries);
  renderTracker();
}

function renderTracker() {
  var entries = loadTracker();
  var list  = document.getElementById('trackerList');
  var badge = document.getElementById('trackerBadge');
  var interviews = entries.filter(function(e){ return e.status==='Interview'||e.status==='Final Round'||e.status==='Phone Screen'; }).length;
  var offers     = entries.filter(function(e){ return e.status==='Offer'; }).length;
  document.getElementById('tStatTotal').textContent     = entries.length;
  document.getElementById('tStatInterview').textContent = interviews;
  document.getElementById('tStatOffer').textContent     = offers;
  if (entries.length > 0) { badge.textContent = entries.length > 99 ? '99+' : entries.length; badge.classList.add('on'); }
  else { badge.classList.remove('on'); }

  if (!entries.length) {
    list.innerHTML = '<div class="tracker-empty"><span class="te-icon">📝</span>No applications yet.<br>Build your first resume to start tracking!</div>';
    return;
  }
  var statuses = ['Applied','Phone Screen','Interview','Final Round','Offer','Rejected','Withdrawn'];
  var h = '';
  entries.forEach(function(e) {
    var atsHtml = '';
    if (e.atsScore !== null && e.atsScore !== undefined) {
      var cls = e.atsScore >= 80 ? 'tj-ats-g' : e.atsScore >= 60 ? 'tj-ats-a' : 'tj-ats-r';
      atsHtml = '<span class="tj-ats '+cls+'">ATS '+e.atsScore+'</span>';
    }
    var statusColor = STATUS_COLORS[e.status] || '#4b5563';
    h += '<div class="tj">';
    h += '<div class="tj-top"><div class="tj-company">'+esc(e.company)+'</div>';
    h += '<button class="tj-del" data-del="'+esc(e.id)+'" title="Remove">✕</button></div>';
    h += '<div class="tj-role">'+esc(e.role)+'</div>';
    h += '<div class="tj-meta">';
    h += '<span class="tj-chip">'+esc(e.templateLabel||e.template)+'</span>';
    if (e.profileLabel) h += '<span class="tj-chip">'+esc(e.profileLabel)+'</span>';
    if (atsHtml) h += atsHtml;
    h += '<span class="tj-date" style="margin-left:auto">'+esc(e.date)+'</span>';
    h += '</div>';
    h += '<div class="tj-status-wrap">';
    h += '<div class="status-dot" style="background:'+statusColor+'"></div>';
    h += '<select class="tj-status" data-status-id="'+esc(e.id)+'">';
    statuses.forEach(function(s){ h += '<option value="'+s+'"'+(e.status===s?' selected':'')+'>'+s+'</option>'; });
    h += '</select></div></div>';
  });
  list.innerHTML = h;

  list.querySelectorAll('[data-del]').forEach(function(btn) {
    btn.addEventListener('click', function(ev) {
      ev.stopPropagation();
      var id = btn.getAttribute('data-del');
      saveTracker(loadTracker().filter(function(e){ return e.id !== id; }));
      renderTracker();
    });
  });
  list.querySelectorAll('[data-status-id]').forEach(function(sel) {
    sel.addEventListener('change', function() {
      var id = sel.getAttribute('data-status-id');
      var all = loadTracker();
      all.forEach(function(e){ if(e.id===id) e.status=sel.value; });
      saveTracker(all);
      renderTracker();
    });
  });
}

function openTracker()  { document.getElementById('trackerSidebar').classList.add('open');    document.getElementById('trackerOverlay').classList.add('on'); }
function closeTracker() { document.getElementById('trackerSidebar').classList.remove('open'); document.getElementById('trackerOverlay').classList.remove('on'); }

// ══════════════════════════════════════════════════════════════════════════════
// ── NEW FEATURES: RESUME LIBRARY · MATCH SCORE · PDF EXPORT · LINKEDIN ───────
// ══════════════════════════════════════════════════════════════════════════════

// Wire up new features once DOM ready
document.addEventListener('DOMContentLoaded', function() {
  // LinkedIn file input
  var fileInputLi = document.getElementById('fileInputLi');
  if (fileInputLi) {
    fileInputLi.addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (file) {
        loadFile(file);
        switchUploadTab('upload'); // jump to upload tab to show success badge
      }
    });
  }

  // PDF button in preview modal
  var pvPdfBtn = document.getElementById('pvPdfBtn');
  if (pvPdfBtn) pvPdfBtn.addEventListener('click', downloadResumePDF);

  // Load resume library from server
  loadResumeLibrary();

  // Eager-load career vault in background (silent — populates form before user opens tab)
  setTimeout(eagerLoadVault, 800);

  // Inject real template HTML previews after first paint so offsetWidth is available
  requestAnimationFrame(function(){ requestAnimationFrame(initTemplatePreviews); });
});

// ── Real template thumbnail previews ─────────────────────────────────────────
function initTemplatePreviews() {
  var grid = document.getElementById('resumeTemplateGrid');
  if(!grid) return;
  var cards = grid.querySelectorAll('.template-card[data-template]');
  // Temporarily force tab to 'resume' for _tmcBuildHtml cache key
  var prevTab = _tmcTab;
  _tmcTab = 'resume';
  cards.forEach(function(card) {
    var key = card.getAttribute('data-template');
    if(key === 'custom') return; // custom has its own placeholder
    var previewEl = card.querySelector('.t-preview');
    if(!previewEl) return;
    var cardW = previewEl.offsetWidth || previewEl.parentElement.offsetWidth || 200;
    var scale = (cardW / 860).toFixed(4);
    var html = _tmcBuildHtml(key);
    previewEl.innerHTML = '<div class="t-preview-scaler" style="width:860px;transform:scale('+scale+')">' + html + '</div>';
  });
  _tmcTab = prevTab;
}

// ── Upload tab switching ────────────────────────────────────────────────────
function switchUploadTab(name) {
  ['upload','library','linkedin','vault'].forEach(function(t) {
    var tabEl  = document.getElementById('tab'+capitalize(t));
    var paneEl = document.getElementById('pane'+capitalize(t));
    if (tabEl)  tabEl.classList.toggle('active', t===name);
    if (paneEl) paneEl.classList.toggle('active', t===name);
  });
  if (name === 'library') loadResumeLibrary();
  if (name === 'vault')   openVaultPane();
}
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ── Show/hide the "Save to Library" row after a file loads ─────────────────
// We hook this into the existing loadFile flow by watching for the badge
var _origLoadFile = loadFile;
loadFile = function(file) {
  _origLoadFile(file);
  // Show save row after a short delay (let loadFile finish)
  setTimeout(function() {
    var saveRow = document.getElementById('libSaveRow');
    if (saveRow && fileBuffer) {
      var nameInput = document.getElementById('libNameInput');
      if (nameInput && !nameInput.value) {
        // Pre-fill with filename minus extension
        nameInput.value = (file.name || '').replace(/\.(pdf|docx)$/i,'').replace(/[_-]+/g,' ').trim();
      }
      saveRow.style.display = 'flex';
    }
  }, 200);
};

// ── Resume Library: load from server ───────────────────────────────────────
var _resumeLibraryCache = [];

async function loadResumeLibrary() {
  var listEl = document.getElementById('libList');
  if (!listEl) return;
  var tok = getToken();
  if (!tok) { renderLibraryList([]); return; }
  try {
    var res = await fetch('/api/resumes', { headers: { Authorization: 'Bearer ' + tok } });
    if (!res.ok) { renderLibraryList([]); return; }
    var data = await res.json();
    _resumeLibraryCache = data.resumes || [];
    renderLibraryList(_resumeLibraryCache);
  } catch(e) {
    renderLibraryList([]);
  }
}

function renderLibraryList(list) {
  var listEl = document.getElementById('libList');
  if (!listEl) return;
  if (!list || !list.length) {
    listEl.innerHTML = '<div class="lib-empty"><span class="lib-empty-icon">📂</span>No saved resumes yet.<br>Upload a resume and save it to your library.</div>';
    return;
  }
  var h = '';
  list.forEach(function(r) {
    var d = r.created_at ? new Date(r.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '';
    h += '<div class="lib-item" data-lib-id="'+esc(String(r.id))+'" onclick="loadFromLibrary('+r.id+',\''+esc(r.name)+'\')">';
    h += '<span class="lib-item-icon">📄</span>';
    h += '<span class="lib-item-name">'+esc(r.name)+'</span>';
    h += '<span class="lib-item-date">'+esc(d)+'</span>';
    h += '<button class="lib-del-btn" title="Delete" onclick="event.stopPropagation();deleteFromLibrary('+r.id+')">🗑</button>';
    h += '</div>';
  });
  listEl.innerHTML = h;
}

async function saveResumeToLibrary() {
  if (!fileBuffer) return showAlert('warn','No resume loaded.','Upload a resume first, then save it to your library.');
  var nameInput = document.getElementById('libNameInput');
  var name = (nameInput ? nameInput.value.trim() : '') || 'My Resume';
  var btn = document.getElementById('libSaveBtn');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    var resumeText = await extractText(fileBuffer, fileName);
    var res = await fetch('/api/resumes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken() },
      body: JSON.stringify({ name: name, content: resumeText })
    });
    var data = await res.json();
    if (!res.ok) {
      if (data.error === 'upgrade_required') {
        showUpgradeModal(data.message || 'Upgrade to Pro to save more resumes.');
      } else {
        showAlert('warn', 'Could not save.', data.error || 'Please try again.');
      }
      btn.disabled = false; btn.textContent = '💾 Save to Library';
      return;
    }
    btn.textContent = '✅ Saved!';
    setTimeout(function() { btn.disabled = false; btn.textContent = '💾 Save to Library'; }, 2500);
    loadResumeLibrary();
  } catch(e) {
    showAlert('warn','Save failed.', e.message);
    btn.disabled = false; btn.textContent = '💾 Save to Library';
  }
}

async function loadFromLibrary(id, name) {
  var tok = getToken();
  if (!tok) return;
  try {
    var res = await fetch('/api/resumes/' + id, { headers: { Authorization: 'Bearer ' + tok } });
    if (!res.ok) return showAlert('warn', 'Could not load resume.', 'Please try again.');
    var data = await res.json();
    var r = data.resume;
    // Fake the file flow: store content as a text file buffer so extractText works
    // We'll store the raw text directly and flag that it's pre-extracted
    fileBuffer = null;   // clear file buffer — we'll use preExtractedText
    fileName = (r.name || 'Resume') + '.txt';
    window._preExtractedResumeText = r.content; // stash pre-extracted text
    // Show badge
    var dz = document.getElementById('dz');
    dz.classList.add('loaded');
    document.getElementById('dzIcon').textContent  = '✅';
    document.getElementById('dzTitle').textContent = r.name;
    document.getElementById('dzSub').textContent   = 'Loaded from library — click Change to swap';
    document.getElementById('badge').classList.add('on');
    document.getElementById('badgeName').textContent = r.name;
    document.getElementById('sn1').classList.add('done');
    setStepDone(1);
    // Highlight active item
    document.querySelectorAll('.lib-item').forEach(function(el) {
      el.classList.toggle('active-lib', el.getAttribute('data-lib-id') === String(id));
    });
    switchUploadTab('upload');
    showAlert('warn', '📂 ' + r.name + ' loaded.', 'Fill in the job details, then click Build.');
    setTimeout(clearAlert, 3000);
  } catch(e) {
    showAlert('warn', 'Load failed.', e.message);
  }
}

async function deleteFromLibrary(id) {
  if (!confirm('Delete this saved resume? This cannot be undone.')) return;
  try {
    var res = await fetch('/api/resumes/' + id, {
      method: 'DELETE', headers: { Authorization: 'Bearer ' + getToken() }
    });
    if (!res.ok) return showAlert('warn', 'Delete failed.', 'Please try again.');
    _resumeLibraryCache = _resumeLibraryCache.filter(function(r){ return r.id !== id; });
    renderLibraryList(_resumeLibraryCache);
    // Clear pre-extracted text if this was the active resume
    if (window._preExtractedResumeText) window._preExtractedResumeText = null;
  } catch(e) {
    showAlert('warn', 'Delete failed.', e.message);
  }
}

// Patch extractText to support pre-extracted library resumes
var _origExtractText = extractText;
extractText = async function(buffer, name) {
  if (window._preExtractedResumeText) {
    var text = window._preExtractedResumeText;
    window._preExtractedResumeText = null; // consume once
    return text;
  }
  return _origExtractText(buffer, name);
};

// Patch build() to allow library-loaded resumes (no file buffer needed)
var _origBuild = build;
build = async function() {
  if (window._preExtractedResumeText) {
    // Treat as if fileBuffer is valid so validation passes
    fileBuffer = true;
  }
  await _origBuild();
  // Restore fileBuffer if we faked it
  if (fileBuffer === true) fileBuffer = null;
};

// ── Pre-Tailoring Match Score ───────────────────────────────────────────────
async function checkMatchScore() {
  var jd = document.getElementById('jd').value.trim();
  // For match score we need either a real file, vault text, or pre-extracted text
  var hasResume = fileBuffer || extractedText || window._preExtractedResumeText;
  if (!hasResume) return showAlert('warn', 'Upload your resume first.', 'Load your resume in Step 2 or use your Career Vault, then check your match score.');
  if (!jd)        return showAlert('warn', 'Paste a job description first.', 'Add the job description in Step 3 before checking your match.');

  var btn = document.getElementById('checkMatchBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span> Checking match…';
  document.getElementById('matchPanel').classList.remove('on');

  try {
    var resumeText;
    if (extractedText && !fileBuffer) {
      resumeText = extractedText; // vault-loaded text
    } else if (window._preExtractedResumeText) {
      resumeText = window._preExtractedResumeText;
    } else {
      resumeText = await extractText(fileBuffer, fileName);
    }

    var sys = 'You are a resume ATS specialist. Quickly assess how well a resume matches a job description BEFORE tailoring. Return ONLY valid JSON.';
    var prompt = [
      'Score how well this resume currently matches this job description on a 0-100 scale.',
      '',
      'JOB DESCRIPTION:', jd,
      '',
      'RESUME:', resumeText.slice(0, 3000),
      '',
      'Return: {"score":42,"label":"Fair Match","summary":"1 sentence on overall fit","matched":["up to 5 keywords already in resume"],"missing":["up to 5 important keywords missing"],"verdict":"One action sentence on biggest improvement opportunity."}'
    ].join('\n');

    var result = await callClaude('score', sys, prompt, 1000, 'claude-haiku-4-5-20251001');
    renderMatchScore(result);
  } catch(e) {
    if (e.message !== 'upgrade_required') {
      document.getElementById('matchPanel').classList.add('on');
      document.getElementById('matchContent').innerHTML = '<p style="font-size:13px;color:var(--red)">Could not check match score. Please try again.</p>';
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🎯 Check My Match Score (Free Preview)';
  }
}

function renderMatchScore(r) {
  if (!r) return;
  var score = Math.max(0, Math.min(100, r.score || 0));
  var color = score >= 70 ? '#166534' : score >= 45 ? '#92400e' : '#991b1b';
  var bgColor = score >= 70 ? '#dcfce7' : score >= 45 ? '#fffbeb' : '#fef2f2';
  var circ = 2 * Math.PI * 46;
  var fill = circ - (score / 100) * circ;
  var matched = (r.matched || []).slice(0,5);
  var missing = (r.missing || []).slice(0,5);
  var h = '<div class="ats-wrap">';
  h += '<div class="ats-ring-wrap"><svg viewBox="0 0 114 114"><circle class="ats-track" cx="57" cy="57" r="46"/><circle class="ats-fill" cx="57" cy="57" r="46" stroke="'+color+'" stroke-dasharray="'+circ+'" stroke-dashoffset="'+fill+'"/></svg>';
  h += '<div class="ats-center"><div class="ats-num" style="color:'+color+'">'+score+'</div><div class="ats-pct">/ 100</div></div></div>';
  h += '<div class="ats-right">';
  h += '<div style="font-size:14px;font-weight:800;color:'+color+';margin-bottom:4px">'+(r.label||'Current Match')+'</div>';
  h += '<div style="font-size:12.5px;color:var(--muted);margin-bottom:10px;line-height:1.5">'+(r.summary||'')+'</div>';
  if (matched.length) {
    h += '<div class="kw-sec"><div class="kw-title">Already matched ✓</div><div class="kw-chips">';
    matched.forEach(function(k){ h += '<span class="kw-chip kw-match">'+esc(k)+'</span>'; });
    h += '</div></div>';
  }
  if (missing.length) {
    h += '<div class="kw-sec"><div class="kw-title">Missing keywords ✗</div><div class="kw-chips">';
    missing.forEach(function(k){ h += '<span class="kw-chip kw-miss">'+esc(k)+'</span>'; });
    h += '</div></div>';
  }
  h += '</div></div>';
  if (r.verdict) {
    h += '<div style="margin-top:14px;background:'+bgColor+';border-radius:8px;padding:11px 14px;font-size:13px;color:'+color+';font-weight:600">💡 '+esc(r.verdict)+'</div>';
  }
  h += '<div style="margin-top:12px;font-size:12px;color:var(--muted);text-align:center">Hit <strong>⚡ Build Resume</strong> below — TailorCV AI will close this gap for you automatically.</div>';
  document.getElementById('matchContent').innerHTML = h;
  document.getElementById('matchPanel').classList.add('on');
  document.getElementById('matchPanel').scrollIntoView({behavior:'smooth', block:'nearest'});
}

// ── PDF Export ─────────────────────────────────────────────────────────────
function downloadResumePDF(e) {
  if (e) e.preventDefault();
  if (!tailoredRef) return;
  var html = buildResumeHtml(tailoredRef, selectedTemplate);
  var winContent = '<!DOCTYPE html><html><head><meta charset="UTF-8">'
    + '<title>Resume</title>'
    + '<style>'
    + 'body{font-family:Calibri,Georgia,serif;font-size:10pt;line-height:1.45;color:#111;margin:0;padding:0;}'
    + '.pv-name{font-size:22pt;font-weight:700;margin:0 0 5px;}'
    + '.pv-contact{font-size:10pt;margin-bottom:4px;}'
    + '.pv-loc{font-style:italic;font-size:10pt;margin-bottom:18px;}'
    + '.pv-sec{font-weight:700;border-bottom:1.5px solid #111;margin:16px 0 7px;padding-bottom:3px;font-size:10.5pt;}'
    + '.pv-para{text-align:justify;margin-bottom:10px;font-size:10pt;}'
    + '.pv-grid2{display:grid;grid-template-columns:1fr 1fr;gap:3px 20px;margin-bottom:8px;}'
    + '.pv-comp{font-size:10pt;padding:1px 0;}'
    + '.pv-role-hdr{display:flex;justify-content:space-between;align-items:baseline;margin:12px 0 3px;flex-wrap:wrap;gap:4px;}'
    + '.pv-rtitle{font-weight:700;font-size:10.5pt;}'
    + '.pv-rdates{font-style:italic;font-size:10pt;}'
    + '.pv-ul{margin:0 0 6px 20px;padding:0;}'
    + '.pv-ul li{font-size:10pt;margin-bottom:2px;text-align:justify;}'
    + '.pv-tech{font-size:10pt;margin-bottom:4px;}'
    + '.pv-edu{font-size:10pt;margin-bottom:5px;}'
    + '.pv-proj{font-size:10pt;margin:4px 0;text-align:justify;}'
    + '.pv-resp-lbl{font-weight:700;font-size:10pt;margin:7px 0 3px;}'
    + '.tc-brand-footer{text-align:center;color:#aaa;font-size:8pt;font-style:italic;margin-top:24px;padding-top:10px;border-top:1px solid #eee;}'
    + '@page{margin:1in;}'
    + '@media print{body{padding:0;margin:0;}}'
    + '</style></head>'
    + '<body>' + html
    + (!window._tcUserIsPro ? '<div class="tc-brand-footer">Created with <a href="https://tailorcv.com" style="color:#4f6ef7;text-decoration:none;">TailorCV.com</a> — AI-powered resumes tailored for every job</div>' : '')
    + '</body></html>';
  var printWin = window.open('', '_blank', 'width=850,height=1100');
  printWin.document.write(winContent);
  printWin.document.close();
  printWin.focus();
  setTimeout(function() { printWin.print(); }, 500);
}

// Hide PDF cards + CL preview when outputs are cleared
var _origClearOutputs = clearOutputs;
clearOutputs = function() {
  _origClearOutputs();
  var pdfCard = document.getElementById('pdfDlCard');
  if (pdfCard) pdfCard.style.display = 'none';
  var clPdfCard = document.getElementById('pdfClDlCard');
  if (clPdfCard) clPdfCard.style.display = 'none';
  var clPrevBtn = document.getElementById('previewClBtn');
  if (clPrevBtn) clPrevBtn.style.display = 'none';
  _clBlobRef = null; _clNameRef = null;
  document.getElementById('matchPanel').classList.remove('on');
};

// Clear pre-extracted text and PDF cache on file reset
var _origResetFile = resetFile;
resetFile = function() {
  _origResetFile();
  window._preExtractedResumeText = null;
  _pdfTextCache = null;
  _pdfCacheKey  = null;
  // Remove LinkedIn banner if present
  var liBanner = document.getElementById('linkedInBanner');
  if (liBanner) liBanner.remove();
  var saveRow = document.getElementById('libSaveRow');
  if (saveRow) saveRow.style.display = 'none';
};

// Show PDF download cards + cover letter preview after build
var _origAddDownload = addDownload;
addDownload = function(blob, fname, icon, label) {
  _origAddDownload(blob, fname, icon, label);
  if (icon === '📄') {
    // Resume PDF card
    var pdfCard = document.getElementById('pdfDlCard');
    if (pdfCard) pdfCard.style.display = 'flex';
  }
  if (icon === '✉️') {
    // Capture CL blob for preview/PDF
    _clBlobRef = blob;
    _clNameRef = fname;
    // Show CL PDF card + preview button
    var clPdfCard = document.getElementById('pdfClDlCard');
    if (clPdfCard) clPdfCard.style.display = 'flex';
    var clPrevBtn = document.getElementById('previewClBtn');
    if (clPrevBtn) clPrevBtn.style.display = '';
  }
};

// ── JD URL fetcher ────────────────────────────────────────────
function onJdUrlInput() {
  var url = (document.getElementById('jdUrl').value || '').trim();
  var btn = document.getElementById('fetchJdBtn');
  var status = document.getElementById('jdFetchStatus');
  if (btn) btn.disabled = !url;
  if (status) { status.style.display = 'none'; status.textContent = ''; }
}

async function fetchJdFromUrl() {
  var url = (document.getElementById('jdUrl').value || '').trim();
  if (!url) return;
  var token = localStorage.getItem('tc_token');
  if (!token) return;

  var btn    = document.getElementById('fetchJdBtn');
  var status = document.getElementById('jdFetchStatus');
  var jdArea = document.getElementById('jd');

  btn.disabled = true;
  btn.textContent = '⏳ Fetching…';
  status.style.display = 'block';
  status.style.color = 'var(--muted)';
  status.textContent = 'Reading job posting…';

  try {
    var res = await fetch('/api/fetch-jd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ url: url }),
    });
    var data = await res.json();
    if (!res.ok) throw new Error(data.error || ('Error ' + res.status));

    jdArea.value = data.text;
    status.style.color = '#166534';
    status.textContent = '✅ Job description loaded! Review it below, then build your resume.';
    // Scroll textarea into view
    jdArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch(err) {
    status.style.color = '#991b1b';
    status.textContent = '❌ ' + err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = '🔗 Fetch';
  }
}

// ── Cover Letter preview & PDF ────────────────────────────────
var _clBlobRef = null;
var _clNameRef = null;

// ── HTML preview template configurations ──────────────────────────────────
var CL_HTML_DEFS = {
  classic:    { font:"Calibri,sans-serif",           accent:'#1e3a5f', bold:true,  pad:'32px 40px', nameTop:null,            divider:false, prefix:'' },
  modern:     { font:"Arial,sans-serif",             accent:'#1D4ED8', bold:true,  pad:'32px 40px', nameTop:null,            divider:true,  prefix:'' },
  executive:  { font:"Arial,sans-serif",             accent:'#1F2937', bold:true,  pad:'32px 40px', nameTop:'center',        divider:false, prefix:'' },
  minimalist: { font:"Arial,sans-serif",             accent:'#9ca3af', bold:false, pad:'40px 50px', nameTop:null,            divider:false, prefix:'' },
  bold:       { font:"Arial,sans-serif",             accent:'#111827', bold:true,  pad:'32px 40px', nameTop:'left-big',      divider:false, prefix:'' },
  creative:   { font:"Arial,sans-serif",             accent:'#7C3AED', bold:true,  pad:'32px 40px', nameTop:null,            divider:true,  prefix:'' },
  technical:  { font:"'Courier New',monospace",      accent:'#0F766E', bold:false, pad:'32px 40px', nameTop:null,            divider:false, prefix:'// ' },
  elegant:    { font:"Georgia,serif",                accent:'#92400E', bold:true,  pad:'36px 44px', nameTop:'center-italic', divider:false, prefix:'' },
  corporate:  { font:"'Times New Roman',Times,serif",accent:'#1E3A5F', bold:true,  pad:'32px 48px', nameTop:'sender-right',  divider:false, prefix:'' },
  compact:    { font:"Calibri,sans-serif",           accent:'#374151', bold:true,  pad:'24px 30px', nameTop:null,            divider:false, prefix:'' }
};

function buildCoverLetterHtml(tailored, tmpl) {
  tmpl = tmpl || clTemplate || 'classic';
  var hc = CL_HTML_DEFS[tmpl] || CL_HTML_DEFS.classic;
  var cl   = (tailored && tailored.coverLetter) ? tailored.coverLetter : {};
  var name  = tailored ? (tailored.name  || '') : '';
  var phone = tailored ? (tailored.phone || '') : '';
  var email = tailored ? (tailored.email || '') : '';
  // Always use today's date — never the AI-generated placeholder
  var today = new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  var es = function(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };

  function p(text, style) {
    if (!text) return '';
    return '<p style="margin:0 0 14px;' + (style||'') + '">' + es(text) + '</p>';
  }
  function lbl(labelText, restText, style) {
    if (!restText && restText !== '') return '';
    var bw = hc.bold ? '700' : '400';
    return '<p style="margin:0 0 14px;' + (style||'') + '">' +
      '<span style="font-weight:'+bw+';color:'+hc.accent+'">' + hc.prefix + es(labelText) + '</span>' +
      es(restText) + '</p>';
  }

  var out = '<div style="font-family:' + hc.font + ';font-size:13.5px;line-height:1.75;color:#1a1a2e;padding:' + hc.pad + '">';

  // Name / contact header for templates that use it
  if(hc.nameTop === 'center'){
    out += '<p style="text-align:center;font-size:20px;font-weight:700;margin:0 0 4px">' + es(name) + '</p>';
    out += '<p style="text-align:center;color:#888;font-size:12px;margin:0 0 24px">' + es([phone,email].filter(Boolean).join(' · ')) + '</p>';
  } else if(hc.nameTop === 'center-italic'){
    out += '<p style="text-align:center;font-size:22px;font-weight:700;font-style:italic;color:'+hc.accent+';margin:0 0 4px">' + es(name) + '</p>';
    out += '<p style="text-align:center;color:'+hc.accent+';opacity:.7;font-size:12px;font-style:italic;margin:0 0 24px">' + es([phone,email].filter(Boolean).join(' · ')) + '</p>';
  } else if(hc.nameTop === 'left-big'){
    out += '<p style="font-size:22px;font-weight:700;margin:0 0 4px">' + es(name) + '</p>';
    out += '<p style="color:#888;font-size:12px;margin:0 0 24px">' + es([phone,email].filter(Boolean).join(' · ')) + '</p>';
  } else if(hc.nameTop === 'sender-right'){
    [name,phone,email].filter(Boolean).forEach(function(v,i){
      out += '<p style="text-align:right;margin:0 0 2px;font-weight:' + (i===0?'700':'400') + '">' + es(v) + '</p>';
    });
    out += '<div style="margin-bottom:20px"></div>';
  }

  // Main letter content
  out += lbl('Date: ', today, 'margin-bottom:20px');
  out += lbl('To: ', (cl.recipientTitle || 'Hiring Manager') + ',');
  if(cl.recipientDepartment) out += p(cl.recipientDepartment, 'margin-bottom:2px');
  if(cl.recipientOrg)        out += p(cl.recipientOrg,        'margin-bottom:2px');
  if(cl.recipientLocation)   out += p(cl.recipientLocation,   'margin-bottom:20px');

  // RE: line — "RE: " is bold/colored; the rest is plain weight (the bug was escaping <strong>)
  if(cl.reLine){
    out += '<p style="margin:0 0 14px;margin-bottom:' + (hc.divider ? '4px' : '20px') + '">' +
      '<strong style="font-weight:700;color:'+hc.accent+'">' + hc.prefix + 'RE: </strong>' + es(cl.reLine) + '</p>';
  }

  // Divider line (modern / creative templates)
  if(hc.divider){
    out += '<hr style="border:none;border-top:2px solid '+hc.accent+';margin:8px 0 20px"/>';
  }

  out += p('Dear Hiring Manager,');
  out += p(cl.openingParagraph);
  out += p(cl.bodyParagraph1);
  out += p(cl.bodyParagraph2);
  out += p(cl.bodyParagraph3);
  out += p(cl.closingParagraph);
  out += '<p style="margin:20px 0 4px">Warm regards,</p>';
  out += '<p style="margin:0;font-weight:700">' + es(name) + '</p>';
  if(phone) out += '<p style="margin:2px 0">' + es(phone) + '</p>';
  if(email) out += '<p style="margin:2px 0">' + es(email) + '</p>';
  out += '</div>';
  return out;
}

function openCoverPreview() {
  var modal = document.getElementById('clPreviewModal');
  var page  = document.getElementById('clPvPage');
  if (!modal || !page) return;

  page.innerHTML = tailoredRef ? buildCoverLetterHtml(tailoredRef, clTemplate) : '<p style="color:#888">Cover letter not available.</p>';

  // Wire download buttons
  var dlBtn  = document.getElementById('clDlBtn');
  var pdfBtn = document.getElementById('clPdfBtn');
  if (dlBtn) dlBtn.onclick = function() {
    if (!_clBlobRef) return;
    var a = document.createElement('a');
    a.href = URL.createObjectURL(_clBlobRef);
    a.download = _clNameRef || 'Cover_Letter.docx';
    a.click();
  };
  if (pdfBtn) pdfBtn.onclick = downloadCoverPDF;

  modal.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function closeCoverPreview() {
  var modal = document.getElementById('clPreviewModal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}

function downloadCoverPDF(e) {
  if (e) e.preventDefault();
  if (!tailoredRef) return;
  var cl = tailoredRef.coverLetter || {};
  var win = window.open('', '_blank');
  if (!win) { alert('Please allow pop-ups for PDF export.'); return; }
  var hcPdf = CL_HTML_DEFS[clTemplate] || CL_HTML_DEFS.classic;
  win.document.write([
    '<!DOCTYPE html><html><head><meta charset="UTF-8">',
    '<title>Cover Letter</title>',
    '<style>',
    '  body{font-family:'+hcPdf.font+';font-size:12pt;line-height:1.7;',
    '       color:#1a1a2e;max-width:720px;margin:40px auto;padding:0 40px}',
    '  p{margin:0 0 12pt}',
    '  @media print{body{margin:0;padding:20pt 40pt}}',
    '</style>',
    '</head><body>',
    buildCoverLetterHtml(tailoredRef, clTemplate),
    '<script>window.onload=function(){window.print();}<\/script>',
    '</body></html>',
  ].join(''));
  win.document.close();
}

// Close CL modal on backdrop click
document.addEventListener('click', function(e) {
  var modal = document.getElementById('clPreviewModal');
  if (modal && e.target === modal) closeCoverPreview();
});

// ── Cover Letter Settings ─────────────────────────────────────────────────
function setCLLength(len) {
  clLength = len;
  document.querySelectorAll('.cl-len-btn').forEach(function(b){ b.classList.toggle('active', b.dataset.len === len); });
  var hints = { short:'~150-200 words · 2 paragraphs', medium:'~300-350 words · 3 paragraphs', long:'~500-600 words · 4 paragraphs' };
  var hint = document.getElementById('clLenHint');
  if(hint) hint.textContent = hints[len] || '';
}

function setCLTemplate(tmpl) {
  clTemplate = tmpl;
  // Update chip UI
  document.querySelectorAll('.cl-tmpl-chip').forEach(function(c){ c.classList.toggle('active', c.dataset.tmpl === tmpl); });
  // Update preview modal strip
  document.querySelectorAll('.cl-pv-tmpl-chip').forEach(function(c){ c.classList.toggle('active', c.dataset.tmpl === tmpl); });
  // Live-update the preview if open
  var page = document.getElementById('clPvPage');
  if(page && document.getElementById('clPreviewModal') && document.getElementById('clPreviewModal').style.display !== 'none'){
    if(tailoredRef) page.innerHTML = buildCoverLetterHtml(tailoredRef, tmpl);
  }
  // Rebuild the DOCX blob so the download button reflects the new template
  if(tailoredRef && tailoredRef.coverLetter){
    var today = new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
    var clData = Object.assign({},tailoredRef,tailoredRef.coverLetter,{date:today});
    Packer.toBlob(buildCoverDoc(clData, tmpl)).then(function(blob){
      _clBlobRef = blob;
      var nm = (tailoredRef.name||'Resume').replace(/\s+/g,'_');
      _clNameRef = nm+'_Cover_Letter_'+CL_TMPL_DEFS[tmpl].label+'.docx';
    });
  }
}

// ════════════════════════════════════════════════════════════════
//  CAREER DATA VAULT
//  Persistent storage for the user's complete career history.
//  Lets the AI tailor from saved data instead of requiring a
//  fresh file upload every session.
// ════════════════════════════════════════════════════════════════

// In-memory mirror of the vault (synced on load/save)
var _vault = {
  name:'', email:'', phone:'', location:'', linkedin:'', website:'',
  summary:'', skills:'',
  jobs:[], education:[], certs:[],
  updatedAt: null
};
var _vaultLoaded = false; // true once we've fetched from server
var _vaultJobIdCounter  = 0;
var _vaultEduIdCounter  = 0;
var _vaultCertIdCounter = 0;

// ── Helpers ────────────────────────────────────────────────────
function vaultEl(id) { return document.getElementById(id); }

function setVaultStatusUI(status) {
  // status: 'empty' | 'partial' | 'complete'
  var dot   = vaultEl('vaultStatusDot');
  var label = vaultEl('vaultStatusLabel');
  var tabDot = document.querySelector('#tabVault .vault-tab-dot');
  if (!dot || !label) return;
  dot.className   = 'vault-status-dot' + (status !== 'empty' ? ' ' + status : '');
  label.textContent = status === 'complete' ? 'Complete' : status === 'partial' ? 'Partial' : 'Empty';
  if (tabDot) tabDot.className = 'vault-tab-dot' + (status !== 'empty' ? ' ' + status : '');
}

function vaultComputeStatus() {
  var hasContact = (_vault.name || '').trim().length > 0;
  var hasJobs    = _vault.jobs.length > 0;
  var hasSkills  = (_vault.skills || '').trim().length > 0;
  if (hasContact && hasJobs && hasSkills) return 'complete';
  if (hasContact || hasJobs || hasSkills) return 'partial';
  return 'empty';
}

// ── Accordion toggle ────────────────────────────────────────────
function toggleVaultSec(hdrEl) {
  var body   = hdrEl.nextElementSibling;
  var toggle = hdrEl.querySelector('.vault-sec-toggle');
  var isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  if (toggle) toggle.classList.toggle('open', !isOpen);
}

// ── Skills count badge ──────────────────────────────────────────
function updateVaultSkillCount() {
  var val = (vaultEl('vSkills') || {}).value || '';
  var count = val.split(',').map(function(s){ return s.trim(); }).filter(Boolean).length;
  var badge = vaultEl('vSkillCount');
  if (badge) badge.textContent = count;
  _vault.skills = val;
  setVaultStatusUI(vaultComputeStatus());
}

// ── Jobs ───────────────────────────────────────────────────────
function addVaultJob(data) {
  data = data || {};
  var id = data.id || ('j' + (++_vaultJobIdCounter));
  var emptyEl = vaultEl('vJobEmpty');
  var listEl  = vaultEl('vJobList');
  if (!listEl) return;

  var entry = document.createElement('div');
  entry.className = 'vault-entry';
  entry.dataset.vid = id;
  // Bullets HTML
  var bulletsHtml = '';
  var bullets = data.bullets || [''];
  bullets.forEach(function(b) {
    bulletsHtml += bulletRowHtml(b);
  });

  entry.innerHTML = [
    '<div class="vault-entry-hdr">',
      '<div class="vault-entry-title">Position</div>',
      '<button class="vault-entry-del" title="Remove" onclick="removeVaultJob(this)">✕</button>',
    '</div>',
    '<div class="vault-field-row">',
      '<div class="vault-field"><label>Job Title</label><input type="text" class="vj-title" placeholder="Senior Software Engineer" value="'+vaultEsc(data.title||'')+'"/></div>',
      '<div class="vault-field"><label>Company</label><input type="text" class="vj-company" placeholder="Acme Corp" value="'+vaultEsc(data.company||'')+'"/></div>',
    '</div>',
    '<div class="vault-field-row">',
      '<div class="vault-field"><label>Location</label><input type="text" class="vj-location" placeholder="Remote / San Francisco, CA" value="'+vaultEsc(data.location||'')+'"/></div>',
      '<div class="vault-field" style="max-width:115px"><label>Start</label><input type="text" class="vj-start" placeholder="Jan 2021" value="'+vaultEsc(data.start||'')+'"/></div>',
      '<div class="vault-field" style="max-width:115px"><label>End</label><input type="text" class="vj-end" placeholder="Present" value="'+vaultEsc(data.end||'Present')+'"/></div>',
    '</div>',
    '<div class="vault-bullets-label">Key Achievements / Responsibilities</div>',
    '<div class="vj-bullets">',
      bulletsHtml,
    '</div>',
    '<button class="vault-add-bullet" onclick="addBulletToJob(this)">＋ Add bullet</button>',
  ].join('');

  // Insert before the "Add Position" button (last child of listEl)
  var addBtn = listEl.querySelector('.vault-add-btn');
  if (addBtn) listEl.insertBefore(entry, addBtn);
  else listEl.appendChild(entry);

  if (emptyEl) emptyEl.style.display = 'none';
  updateVaultJobCount();
}

function bulletRowHtml(text) {
  return '<div class="vault-bullet-row"><input type="text" class="vj-bullet-input" placeholder="Led team of 6 to deliver X, resulting in 30% improvement…" value="'+vaultEsc(text)+'"/><button class="vault-bullet-del" onclick="removeBullet(this)" title="Remove">✕</button></div>';
}

function addBulletToJob(btn) {
  var container = btn.previousElementSibling; // .vj-bullets
  var row = document.createElement('div');
  row.innerHTML = bulletRowHtml('');
  container.appendChild(row.firstElementChild);
}

function removeBullet(btn) {
  var row = btn.parentElement;
  var container = row.parentElement;
  if (container.querySelectorAll('.vault-bullet-row').length > 1) {
    row.remove();
  } else {
    // Keep at least one empty bullet
    row.querySelector('.vj-bullet-input').value = '';
  }
}

function removeVaultJob(btn) {
  var entry = btn.closest('.vault-entry');
  if (entry) entry.remove();
  var listEl  = vaultEl('vJobList');
  var emptyEl = vaultEl('vJobEmpty');
  if (emptyEl && listEl && listEl.querySelectorAll('.vault-entry').length === 0) {
    emptyEl.style.display = '';
  }
  updateVaultJobCount();
}

function updateVaultJobCount() {
  var listEl = vaultEl('vJobList');
  var count  = listEl ? listEl.querySelectorAll('.vault-entry').length : 0;
  var badge  = vaultEl('vJobCount');
  if (badge) badge.textContent = count;
  setVaultStatusUI(vaultComputeStatus());
}

// ── Education ─────────────────────────────────────────────────
function addVaultEdu(data) {
  data = data || {};
  var id = data.id || ('e' + (++_vaultEduIdCounter));
  var emptyEl = vaultEl('vEduEmpty');
  var listEl  = vaultEl('vEduList');
  if (!listEl) return;

  var entry = document.createElement('div');
  entry.className = 'vault-entry';
  entry.dataset.vid = id;
  entry.innerHTML = [
    '<div class="vault-entry-hdr">',
      '<div class="vault-entry-title">Education</div>',
      '<button class="vault-entry-del" onclick="removeVaultEdu(this)">✕</button>',
    '</div>',
    '<div class="vault-field-row">',
      '<div class="vault-field"><label>Degree / Qualification</label><input type="text" class="ve-degree" placeholder="B.Sc. Computer Science" value="'+vaultEsc(data.degree||'')+'"/></div>',
      '<div class="vault-field"><label>School / University</label><input type="text" class="ve-school" placeholder="MIT" value="'+vaultEsc(data.school||'')+'"/></div>',
    '</div>',
    '<div class="vault-field-row">',
      '<div class="vault-field" style="max-width:110px"><label>Year</label><input type="text" class="ve-year" placeholder="2019" value="'+vaultEsc(data.year||'')+'"/></div>',
      '<div class="vault-field" style="max-width:110px"><label>GPA (optional)</label><input type="text" class="ve-gpa" placeholder="3.8 / 4.0" value="'+vaultEsc(data.gpa||'')+'"/></div>',
    '</div>',
  ].join('');

  var addBtn = listEl.querySelector('.vault-add-btn');
  if (addBtn) listEl.insertBefore(entry, addBtn);
  else listEl.appendChild(entry);

  if (emptyEl) emptyEl.style.display = 'none';
  updateVaultEduCount();
}

function removeVaultEdu(btn) {
  var entry = btn.closest('.vault-entry');
  if (entry) entry.remove();
  var listEl  = vaultEl('vEduList');
  var emptyEl = vaultEl('vEduEmpty');
  if (emptyEl && listEl && listEl.querySelectorAll('.vault-entry').length === 0) emptyEl.style.display = '';
  updateVaultEduCount();
}

function updateVaultEduCount() {
  var listEl = vaultEl('vEduList');
  var count  = listEl ? listEl.querySelectorAll('.vault-entry').length : 0;
  var badge  = vaultEl('vEduCount');
  if (badge) badge.textContent = count;
}

// ── Certifications ────────────────────────────────────────────
function addVaultCert(data) {
  data = data || {};
  var id = data.id || ('c' + (++_vaultCertIdCounter));
  var emptyEl = vaultEl('vCertEmpty');
  var listEl  = vaultEl('vCertList');
  if (!listEl) return;

  var entry = document.createElement('div');
  entry.className = 'vault-entry';
  entry.dataset.vid = id;
  entry.innerHTML = [
    '<div class="vault-entry-hdr">',
      '<div class="vault-entry-title">Certification</div>',
      '<button class="vault-entry-del" onclick="removeVaultCert(this)">✕</button>',
    '</div>',
    '<div class="vault-field-row">',
      '<div class="vault-field"><label>Certification Name</label><input type="text" class="vc-name" placeholder="AWS Solutions Architect – Associate" value="'+vaultEsc(data.name||'')+'"/></div>',
      '<div class="vault-field"><label>Issuing Body</label><input type="text" class="vc-issuer" placeholder="Amazon / Google / PMI…" value="'+vaultEsc(data.issuer||'')+'"/></div>',
      '<div class="vault-field" style="max-width:100px"><label>Year</label><input type="text" class="vc-year" placeholder="2023" value="'+vaultEsc(data.year||'')+'"/></div>',
    '</div>',
  ].join('');

  var addBtn = listEl.querySelector('.vault-add-btn');
  if (addBtn) listEl.insertBefore(entry, addBtn);
  else listEl.appendChild(entry);

  if (emptyEl) emptyEl.style.display = 'none';
  updateVaultCertCount();
}

function removeVaultCert(btn) {
  var entry = btn.closest('.vault-entry');
  if (entry) entry.remove();
  var listEl  = vaultEl('vCertList');
  var emptyEl = vaultEl('vCertEmpty');
  if (emptyEl && listEl && listEl.querySelectorAll('.vault-entry').length === 0) emptyEl.style.display = '';
  updateVaultCertCount();
}

function updateVaultCertCount() {
  var listEl = vaultEl('vCertList');
  var count  = listEl ? listEl.querySelectorAll('.vault-entry').length : 0;
  var badge  = vaultEl('vCertCount');
  if (badge) badge.textContent = count;
}

// ── HTML escape helper (vault-specific) ───────────────────────
function vaultEsc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Read vault data from DOM form ──────────────────────────────
function readVaultFromForm() {
  var vault = {
    name:     (vaultEl('vName')     || {}).value || '',
    email:    (vaultEl('vEmail')    || {}).value || '',
    phone:    (vaultEl('vPhone')    || {}).value || '',
    location: (vaultEl('vLocation') || {}).value || '',
    linkedin: (vaultEl('vLinkedin') || {}).value || '',
    website:  (vaultEl('vWebsite')  || {}).value || '',
    summary:  (vaultEl('vSummary')  || {}).value || '',
    skills:   (vaultEl('vSkills')   || {}).value || '',
    jobs: [], education: [], certs: []
  };

  // Jobs
  var jobEntries = document.querySelectorAll('#vJobList .vault-entry');
  jobEntries.forEach(function(entry) {
    var bullets = [];
    entry.querySelectorAll('.vj-bullet-input').forEach(function(inp) {
      if (inp.value.trim()) bullets.push(inp.value.trim());
    });
    vault.jobs.push({
      id:       entry.dataset.vid,
      title:    (entry.querySelector('.vj-title')    || {}).value || '',
      company:  (entry.querySelector('.vj-company')  || {}).value || '',
      location: (entry.querySelector('.vj-location') || {}).value || '',
      start:    (entry.querySelector('.vj-start')    || {}).value || '',
      end:      (entry.querySelector('.vj-end')      || {}).value || '',
      bullets:  bullets
    });
  });

  // Education
  var eduEntries = document.querySelectorAll('#vEduList .vault-entry');
  eduEntries.forEach(function(entry) {
    vault.education.push({
      id:     entry.dataset.vid,
      degree: (entry.querySelector('.ve-degree') || {}).value || '',
      school: (entry.querySelector('.ve-school') || {}).value || '',
      year:   (entry.querySelector('.ve-year')   || {}).value || '',
      gpa:    (entry.querySelector('.ve-gpa')    || {}).value || ''
    });
  });

  // Certs
  var certEntries = document.querySelectorAll('#vCertList .vault-entry');
  certEntries.forEach(function(entry) {
    vault.certs.push({
      id:     entry.dataset.vid,
      name:   (entry.querySelector('.vc-name')   || {}).value || '',
      issuer: (entry.querySelector('.vc-issuer') || {}).value || '',
      year:   (entry.querySelector('.vc-year')   || {}).value || ''
    });
  });

  return vault;
}

// ── Populate vault form from data object ───────────────────────
function populateVaultForm(vault) {
  if (!vault) return;
  _vault = vault;

  var set = function(id, val) { var el = vaultEl(id); if (el) el.value = val || ''; };
  set('vName',     vault.name);
  set('vEmail',    vault.email);
  set('vPhone',    vault.phone);
  set('vLocation', vault.location);
  set('vLinkedin', vault.linkedin);
  set('vWebsite',  vault.website);
  set('vSummary',  vault.summary);
  set('vSkills',   vault.skills);

  // Clear existing dynamic entries
  var clearSection = function(listId, emptyId, addBtnClass) {
    var listEl = vaultEl(listId);
    if (!listEl) return;
    listEl.querySelectorAll('.vault-entry').forEach(function(e){ e.remove(); });
    var emptyEl = vaultEl(emptyId);
    if (emptyEl) emptyEl.style.display = '';
  };
  clearSection('vJobList',  'vJobEmpty');
  clearSection('vEduList',  'vEduEmpty');
  clearSection('vCertList', 'vCertEmpty');
  _vaultJobIdCounter  = 0;
  _vaultEduIdCounter  = 0;
  _vaultCertIdCounter = 0;

  (vault.jobs       || []).forEach(function(j) { addVaultJob(j); });
  (vault.education  || []).forEach(function(e) { addVaultEdu(e); });
  (vault.certs      || []).forEach(function(c) { addVaultCert(c); });

  updateVaultSkillCount();
  setVaultStatusUI(vaultComputeStatus());
}

// ── Save vault to server ───────────────────────────────────────
async function saveVault() {
  var btn = vaultEl('vaultSaveBtn');
  var msgEl = vaultEl('vaultSaveMsg');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving…'; }
  if (msgEl) msgEl.style.display = 'none';

  var vault = readVaultFromForm();
  _vault = vault;

  var tok = getToken();
  if (!tok) {
    showAlert('warn', 'Sign in required', 'Please sign in to save your Career Vault.');
    if (btn) { btn.disabled = false; btn.innerHTML = '💾 Save Vault'; }
    return;
  }

  try {
    var res = await fetch('/api/career', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
      body: JSON.stringify({ vault: vault })
    });
    if (!res.ok) {
      var err = await res.json().catch(function(){ return {}; });
      throw new Error(err.error || 'Save failed');
    }
    var data = await res.json();
    _vault = data.vault;
    setVaultStatusUI(vaultComputeStatus());
    if (msgEl) { msgEl.style.display = 'block'; setTimeout(function(){ msgEl.style.display='none'; }, 4000); }
  } catch(e) {
    showAlert('error', 'Save failed', 'Could not save vault: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '💾 Save Vault'; }
  }
}

// ── Convert vault to plain-text resume ─────────────────────────
function vaultToResumeText(vault) {
  var lines = [];

  // Header
  var header = [vault.name, vault.email, vault.phone, vault.location].filter(Boolean).join(' | ');
  if (header) lines.push(header);
  var links = [vault.linkedin, vault.website].filter(Boolean).join(' | ');
  if (links) lines.push(links);
  if (lines.length) lines.push('');

  // Summary
  if ((vault.summary || '').trim()) {
    lines.push('PROFESSIONAL SUMMARY');
    lines.push(vault.summary.trim());
    lines.push('');
  }

  // Skills
  if ((vault.skills || '').trim()) {
    lines.push('KEY SKILLS');
    lines.push(vault.skills.trim());
    lines.push('');
  }

  // Experience
  if ((vault.jobs || []).length) {
    lines.push('WORK EXPERIENCE');
    vault.jobs.forEach(function(job) {
      var titleLine = [job.title, job.company].filter(Boolean).join(' — ');
      if (job.location) titleLine += ' | ' + job.location;
      lines.push(titleLine);
      var dates = [job.start, job.end].filter(Boolean).join(' – ');
      if (dates) lines.push(dates);
      (job.bullets || []).filter(Boolean).forEach(function(b) {
        lines.push('• ' + b);
      });
      lines.push('');
    });
  }

  // Education
  if ((vault.education || []).length) {
    lines.push('EDUCATION');
    vault.education.forEach(function(edu) {
      var line = [edu.degree, edu.school].filter(Boolean).join(', ');
      if (edu.year) line += ' (' + edu.year + ')';
      if (edu.gpa)  line += ' — GPA: ' + edu.gpa;
      lines.push(line);
    });
    lines.push('');
  }

  // Certifications
  if ((vault.certs || []).length) {
    lines.push('CERTIFICATIONS');
    vault.certs.forEach(function(cert) {
      var line = cert.name || '';
      if (cert.issuer) line += ' — ' + cert.issuer;
      if (cert.year)   line += ' (' + cert.year + ')';
      lines.push(line);
    });
    lines.push('');
  }

  return lines.join('\n').trim();
}

// ── Use vault as resume ────────────────────────────────────────
function useVaultAsResume() {
  var vault = readVaultFromForm();
  _vault = vault;

  var status = vaultComputeStatus();
  if (status === 'empty') {
    showAlert('warn', 'Vault is empty', 'Fill in your Career Vault with at least your name and one work experience before using it.');
    return;
  }

  var text = vaultToResumeText(vault);
  if (!text || text.length < 30) {
    showAlert('warn', 'Not enough data', 'Add more information to your vault — at least a name, skills, and one position.');
    return;
  }

  // Store in the global resume buffer as text
  extractedText = text;
  fileBuffer    = null; // clear any previous file

  // Show the badge
  var badge     = vaultEl('badge');
  var badgeName = vaultEl('badgeName');
  var dz        = vaultEl('dz');
  var dzIcon    = vaultEl('dzIcon');
  var dzTitle   = vaultEl('dzTitle');

  if (badgeName) badgeName.textContent = 'Career Vault (' + (vault.name || 'Profile') + ')';
  if (badge)     badge.classList.add('on');
  if (dz)        dz.classList.add('loaded');
  if (dzIcon)    dzIcon.textContent = '🗄️';
  if (dzTitle)   dzTitle.textContent = 'Career Vault loaded';

  // Switch to the upload tab to show the badge
  switchUploadTab('upload');

  // Show success alert
  showAlert('info', 'Career Vault loaded!', 'Your vault data is ready. Fill in the job details and hit Build Resume.');

  // Trigger match score update if JD is present
  var jdEl = vaultEl('jd');
  if (jdEl && jdEl.value.trim().length > 80) setTimeout(checkMatchScore, 300);
}

// ── Load vault from server (called when vault tab is opened) ──
async function openVaultPane() {
  if (_vaultLoaded) return; // already fetched
  var tok = getToken();
  if (!tok) return;

  try {
    var res = await fetch('/api/career', { headers: { Authorization: 'Bearer ' + tok } });
    if (!res.ok) return;
    var data = await res.json();
    if (data.vault) {
      populateVaultForm(data.vault);
    }
    _vaultLoaded = true;
  } catch(e) {
    // silently ignore — user can still fill in the form
  }
}

// ── Eager-load vault in background after auth ──────────────────
function eagerLoadVault() {
  var tok = getToken();
  if (!tok || _vaultLoaded) return;
  fetch('/api/career', { headers: { Authorization: 'Bearer ' + tok } })
    .then(function(res) { return res.ok ? res.json() : null; })
    .then(function(data) {
      if (data && data.vault) {
        populateVaultForm(data.vault);
        _vaultLoaded = true;
        // Sync status tab dot even if vault pane not open
        setVaultStatusUI(vaultComputeStatus());
      }
    })
    .catch(function(){ /* silent */ });
}

// ════════════════════════════════════════════════════════════════
//  VAULT — AUTO-FILL FROM UPLOADED RESUME
//  Accepts a .docx or .pdf, extracts text, sends it to Claude
//  to parse into structured vault JSON, then populates the form.
// ════════════════════════════════════════════════════════════════

(function initVaultImport() {
  document.addEventListener('DOMContentLoaded', function() {
    var fileInput = document.getElementById('vaultFileInput');
    if (!fileInput) return;
    fileInput.addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (!file) return;
      if (!file.name.match(/\.(pdf|docx)$/i)) {
        showAlert('warn', 'Wrong file type', 'Upload a .docx or .pdf resume.');
        fileInput.value = '';
        return;
      }
      importResumeToVault(file);
      fileInput.value = ''; // reset so same file can be re-selected
    });
  });
})();

async function importResumeToVault(file) {
  var progressEl = document.getElementById('vaultImportProgress');
  var statusEl   = document.getElementById('vaultImportStatus');
  var importBar  = document.getElementById('vaultImportBar');
  var importBtn  = document.getElementById('vaultImportBtn');

  // Show progress
  if (progressEl) progressEl.style.display = 'flex';
  if (importBar)  importBar.style.display  = 'none';
  if (statusEl)   statusEl.textContent = 'Extracting text from ' + file.name + '…';

  try {
    // Step 1: Read the file
    var buffer = await new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function(e) { resolve(e.target.result); };
      reader.onerror = function() { reject(new Error('Could not read file.')); };
      reader.readAsArrayBuffer(file);
    });

    // Step 2: Extract text using existing extractText function
    var text;
    if (file.name.match(/\.pdf$/i)) {
      text = await extractPdfText(buffer);
    } else {
      text = await extractDocxText(buffer);
    }

    if (!text || text.trim().length < 50) {
      throw new Error('Could not extract enough text from the file. Try a different resume.');
    }

    // Step 3: Send to Claude to parse into vault structure
    if (statusEl) statusEl.textContent = 'AI is parsing your career data…';

    var tok = getToken();
    if (!tok) throw new Error('Please sign in first.');

    var sys = [
      'You are an expert resume parser. Your job is to extract EVERY piece of career data from a resume into structured JSON.',
      'You must be EXHAUSTIVE — capture every single job, every bullet point, every education entry, every certification, every skill.',
      'NEVER skip, truncate, summarize, or abbreviate anything. If the resume has 10 jobs, return 10 jobs. If a job has 8 bullets, return all 8.',
      'Return ONLY valid JSON — no markdown fencing, no commentary, no explanation before or after the JSON.',
    ].join(' ');

    var prompt = [
      'Parse this COMPLETE resume text into structured career data. Read the ENTIRE text carefully from start to end before generating output.',
      '',
      '=== COMPLETE RESUME TEXT (read every line) ===',
      text.slice(0, 15000),
      '=== END OF RESUME TEXT ===',
      '',
      'CRITICAL INSTRUCTIONS:',
      '1. Extract EVERY job/position in the resume — do NOT stop after 2-3 jobs. Count them all.',
      '2. For each job, extract EVERY bullet point / achievement / responsibility VERBATIM. Do not paraphrase.',
      '3. Extract ALL education entries (degrees, diplomas, bootcamps, courses).',
      '4. Extract ALL certifications, licenses, and professional credentials.',
      '5. Extract ALL skills from every section (technical skills, soft skills, tools, languages, frameworks).',
      '6. Education and certifications are usually near the BOTTOM of the resume — scroll all the way down.',
      '',
      'Return this exact JSON structure (fill every field):',
      '{',
      '  "name": "Full Name",',
      '  "email": "email@example.com",',
      '  "phone": "+1 555-000-0000",',
      '  "location": "City, State or Country",',
      '  "linkedin": "linkedin.com/in/... or empty string",',
      '  "website": "portfolio URL or empty string",',
      '  "summary": "Professional summary / objective paragraph if present, otherwise empty string",',
      '  "skills": "Skill1, Skill2, Skill3, ... (ALL skills as a single comma-separated string)",',
      '  "jobs": [',
      '    {',
      '      "title": "Exact Job Title",',
      '      "company": "Company Name",',
      '      "location": "City, State or Remote",',
      '      "start": "Mon YYYY",',
      '      "end": "Mon YYYY or Present",',
      '      "bullets": ["Exact bullet 1 verbatim", "Exact bullet 2 verbatim", "Every single bullet"]',
      '    }',
      '  ],',
      '  "education": [',
      '    { "degree": "Full degree name e.g. Bachelor of Science in Computer Science", "school": "University / Institution Name", "year": "Graduation year or date range", "gpa": "GPA if listed, otherwise empty string" }',
      '  ],',
      '  "certs": [',
      '    { "name": "Full Certification Name", "issuer": "Issuing Organization", "year": "Year obtained or empty string" }',
      '  ]',
      '}',
      '',
      'FINAL CHECK before returning:',
      '- Did you include ALL jobs? Count: the resume has approximately ' + (text.match(/\b(20[0-2]\d|19\d\d)\b/g) || []).length + ' year references.',
      '- Did you include education? Look for words like: degree, bachelor, master, MBA, PhD, university, college, school, diploma, GPA',
      '- Did you include certifications? Look for words like: certified, certification, license, credential, AWS, PMP, CPA, CISSP',
      '- Return ONLY the JSON object. No markdown. No ```.',
    ].join('\n');

    var res = await fetch('/api/claude', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + tok,
      },
      body: JSON.stringify({
        type: 'score',
        system: sys,
        userMsg: prompt,
        maxTokens: 8000,
        model: 'claude-sonnet-4-6'
      })
    });

    if (!res.ok) {
      var errData = await res.json().catch(function(){ return {}; });
      throw new Error(errData.error || 'AI parsing failed (HTTP ' + res.status + ')');
    }

    var data = await res.json();
    var rawText = (data.text || '').trim();

    // Extract JSON robustly (handle markdown fencing)
    var jsonStr = null;
    var fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) {
      jsonStr = fenced[1].trim();
    } else {
      var startIdx = rawText.indexOf('{');
      if (startIdx !== -1) jsonStr = rawText.slice(startIdx, rawText.lastIndexOf('}') + 1);
    }
    if (!jsonStr) throw new Error('AI did not return valid JSON. Please try again.');

    var parsed = JSON.parse(jsonStr);

    // Step 4: Generate IDs for each entry
    var jobId = 0, eduId = 0, certId = 0;
    (parsed.jobs || []).forEach(function(j) { j.id = 'j' + (++jobId); });
    (parsed.education || []).forEach(function(e) { e.id = 'e' + (++eduId); });
    (parsed.certs || []).forEach(function(c) { c.id = 'c' + (++certId); });

    // Step 5: Populate the vault form
    if (statusEl) statusEl.textContent = 'Populating your vault…';
    populateVaultForm(parsed);
    setVaultStatusUI(vaultComputeStatus());

    // Done — show success
    if (progressEl) progressEl.style.display = 'none';
    if (importBar)  importBar.style.display  = 'flex';
    showAlert('info', 'Vault auto-filled!', 'Your resume data has been imported. Review the entries, then hit Save Vault.');

  } catch (err) {
    console.error('Vault import error:', err);
    if (progressEl) progressEl.style.display = 'none';
    if (importBar)  importBar.style.display  = 'flex';
    showAlert('error', 'Import failed', err.message || 'Could not parse resume. Try again or fill in manually.');
  }
}

// ═══════════════════════════════════════════════════════════════
//  JOB MATCH ENGINE
// ═══════════════════════════════════════════════════════════════
var _jmSource   = 'vault'; // 'vault' | 'resume'
var _jmWorkType = 'any';  // 'any' | 'remote' | 'hybrid' | 'onsite'

function openJobMatch() {
  document.getElementById('jmOverlay').classList.add('on');
  document.body.style.overflow = 'hidden';
  // Auto-select source based on what's loaded
  if (extractedText && !fileBuffer) {
    // vault text is loaded
    jmSetSource('vault');
  } else if (fileBuffer || extractedText) {
    jmSetSource('resume');
  }
}

function closeJobMatch(e) {
  if (e && e.target !== document.getElementById('jmOverlay')) return;
  document.getElementById('jmOverlay').classList.remove('on');
  document.body.style.overflow = '';
}

function jmSetSource(src) {
  _jmSource = src;
  document.getElementById('jmSrcVault').classList.toggle('active', src === 'vault');
  document.getElementById('jmSrcResume').classList.toggle('active', src === 'resume');
}

function jmSetWorkType(wt) {
  _jmWorkType = wt;
  document.querySelectorAll('#jmWtGroup .jm-wt-chip').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.wt === wt);
  });
}

async function runJobMatch() {
  var body   = document.getElementById('jmBody');
  var runBtn = document.getElementById('jmRunBtn');
  var tok    = getToken();
  if (!tok) { body.innerHTML = '<div class="jm-error">Please sign in to use Job Match.</div>'; return; }

  // ── Build resume text from selected source ────────────────
  var resumeText = '';
  if (_jmSource === 'vault') {
    var vault = readVaultFromForm();
    if (!vault.name && !vault.jobs.length && !vault.skills) {
      body.innerHTML = '<div class="jm-error">Your Career Vault appears to be empty. Fill it in or switch source to "Uploaded Resume".</div>';
      return;
    }
    resumeText = vaultToResumeText(vault);
  } else {
    resumeText = extractedText;
    if (!resumeText || resumeText.length < 80) {
      body.innerHTML = '<div class="jm-error">No resume loaded. Upload a resume file or switch source to "Career Vault".</div>';
      return;
    }
  }

  // ── Location + work type preferences ─────────────────────
  var locPref = (document.getElementById('jmLocInput') || {}).value || '';
  locPref = locPref.trim();
  var wtLabel = { any: 'any work type', remote: 'Remote only', hybrid: 'Hybrid', onsite: 'On-site only' }[_jmWorkType] || 'any work type';

  // ── Show loading ──────────────────────────────────────────
  runBtn.disabled = true;
  runBtn.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:jmSpin .7s linear infinite"></span> Analysing…';
  body.innerHTML = '<div class="jm-loading"><div class="jm-spinner"></div><span>Analysing your profile…</span></div>';

  // ── Step 1: Claude extracts best-fit job title keywords ───
  var locInstruction = '';
  if (locPref) locInstruction += ' Location preference: ' + locPref + '.';
  if (_jmWorkType !== 'any') locInstruction += ' Work type: ' + wtLabel + '.';

  var systemPrompt = 'You are a career coach. Analyse the resume and return ONLY a valid JSON object — no markdown, no explanation. Format:\n{\n  "searches": [\n    { "query": "Business Analyst ERP", "title": "Business Analyst", "why": "One sentence why this fits.", "skills": ["Skill1","Skill2","Skill3"] }\n  ],\n  "top_keywords": ["kw1","kw2","kw3","kw4","kw5"]\n}\nReturn 5 diverse, highly relevant search queries ranked by fit. Queries should be concise (2-4 words) for job board searches.' + locInstruction;

  var userMsg = 'Resume:\n\n' + resumeText.slice(0, 4000)
    + (locPref ? '\n\nLocation: ' + locPref : '')
    + (_jmWorkType !== 'any' ? '\nWork type: ' + wtLabel : '');

  try {
    // ── Call Claude for search queries ────────────────────────
    var claudeRes = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
      body: JSON.stringify({ type: 'jobs', system: systemPrompt, userMsg: userMsg, maxTokens: 800 })
    });

    if (claudeRes.status === 402) {
      body.innerHTML = '<div class="jm-error" style="text-align:center;padding:32px 20px"><div style="font-size:2rem;margin-bottom:12px">🔒</div><div style="font-size:.95rem;font-weight:700;color:#fff;margin-bottom:8px">Pro Feature</div><p style="color:rgba(255,255,255,.5);font-size:.85rem;line-height:1.6">Job Match Engine is available on TailorCV Pro.</p><a href="/app.html#upgrade" style="display:inline-block;margin-top:16px;background:linear-gradient(135deg,#7c3aed,#5b63f0);color:#fff;padding:10px 24px;border-radius:99px;font-weight:700;font-size:.85rem;text-decoration:none">Upgrade to Pro →</a></div>';
      return;
    }
    if (!claudeRes.ok) throw new Error('Analysis error ' + claudeRes.status);

    var claudeData = await claudeRes.json();
    var raw = (claudeData.text || '').trim()
      .replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/```\s*$/,'').trim();
    var parsed = JSON.parse(raw);
    var searches = parsed.searches || [];
    var topKeywords = parsed.top_keywords || [];

    if (!searches.length) throw new Error('No search queries returned');

    // ── Step 2: Fetch real listings for top 5 search queries ──
    body.innerHTML = '<div class="jm-loading"><div class="jm-spinner"></div><span>Fetching real job listings…</span></div>';

    var allJobs = [];
    var seenIds = {};

    await Promise.all(searches.slice(0, 5).map(async function(s) {
      try {
        var r = await fetch('/api/jobs-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
          body: JSON.stringify({ query: s.query, location: locPref, workType: _jmWorkType })
        });
        if (!r.ok) return;
        var d = await r.json();
        (d.jobs || []).forEach(function(job) {
          var dedupKey = (job.company + '|' + job.title).toLowerCase();
          if (!seenIds[dedupKey]) {
            seenIds[dedupKey] = true;
            job._searchMeta = s; // attach why/skills from Claude
            allJobs.push(job);
          }
        });
      } catch(e) { /* skip failed search */ }
    }));

    renderRealJobs(allJobs, topKeywords, locPref, searches);

  } catch (err) {
    console.error('Job match error:', err);
    body.innerHTML = '<div class="jm-error">Something went wrong: ' + (err.message || 'Unknown error') + '. Please try again.</div>';
  } finally {
    runBtn.disabled = false;
    runBtn.innerHTML = '<span>✨</span> Find Matching Jobs';
  }
}

// Helper: encode with + for spaces
function jmEnc(s) { return encodeURIComponent(String(s || '')).replace(/%20/g, '+'); }

function renderRealJobs(jobs, keywords, locPref, searches) {
  var body = document.getElementById('jmBody');

  if (!jobs.length) {
    // No real listings — fall back to showing search links for each identified role
    var fbHtml = '<div style="font-size:.8rem;color:rgba(255,255,255,.4);margin-bottom:16px;text-align:center">No live listings found for your region — search directly on job boards:</div>';
    fbHtml += '<div class="jm-cards">';
    (searches || []).forEach(function(s) {
      var q = jmEnc(s.query);
      var locStr = locPref || '';
      var liWt = { remote:'&f_WT=2', hybrid:'&f_WT=3', onsite:'&f_WT=1' }[_jmWorkType] || '';
      var indLoc = _jmWorkType === 'remote' ? 'remote' : locStr;
      var liUrl  = 'https://www.linkedin.com/jobs/search/?keywords=' + q + (locStr ? '&location=' + jmEnc(locStr) : '') + liWt;
      var indUrl = 'https://www.indeed.com/jobs?q=' + q + (indLoc ? '&l=' + jmEnc(indLoc) : '') + (_jmWorkType === 'remote' ? '&remotejob=1' : '');
      var gdUrl  = 'https://www.glassdoor.com/Job/jobs.htm?sc.keyword=' + jmEnc(locStr ? s.query + ' ' + locStr : s.query);
      var hcUrl  = 'https://hiring.cafe/?searchState=' + encodeURIComponent(JSON.stringify({ searchQuery: locStr ? s.query + ' ' + locStr : s.query }));
      fbHtml += '<div class="jm-card">';
      fbHtml += '<div class="jm-card-title" style="margin-bottom:6px">' + escJm(s.title || s.query) + '</div>';
      if (s.why) fbHtml += '<div class="jm-why">' + escJm(s.why) + '</div>';
      if ((s.skills||[]).length) {
        fbHtml += '<div class="jm-skills">';
        s.skills.forEach(function(sk){ fbHtml += '<span class="jm-skill-chip">' + escJm(sk) + '</span>'; });
        fbHtml += '</div>';
      }
      fbHtml += '<div class="jm-actions">';
      fbHtml += '<button class="jm-action-btn primary" onclick="jmUseRole(\'' + escJmAttr(s.title||s.query) + '\',\'' + escJmAttr(s.query) + '\')">🎯 Tailor resume</button>';
      fbHtml += '<a class="jm-action-btn" href="' + liUrl + '" target="_blank" rel="noopener">🔗 LinkedIn</a>';
      fbHtml += '<a class="jm-action-btn" href="' + indUrl + '" target="_blank" rel="noopener">🔍 Indeed</a>';
      fbHtml += '<a class="jm-action-btn" href="' + gdUrl + '" target="_blank" rel="noopener">📊 Glassdoor</a>';
      fbHtml += '<a class="jm-action-btn" href="' + hcUrl + '" target="_blank" rel="noopener">☕ Hiring.cafe</a>';
      fbHtml += '</div></div>';
    });
    fbHtml += '</div>';
    body.innerHTML = fbHtml;
    return;
  }

  // ── Meta header ──────────────────────────────────────────────
  var wtLabels = { any: '', remote: '🌐 Remote', hybrid: '🏠 Hybrid', onsite: '🏢 On-site' };
  var metaLine = [locPref ? '📍 ' + locPref : '', wtLabels[_jmWorkType] || ''].filter(Boolean).join('  ·  ');
  var html = '';
  if (metaLine) html += '<div style="font-size:.75rem;color:rgba(255,255,255,.35);margin-bottom:14px;font-weight:600">' + escJm(metaLine) + ' · ' + jobs.length + ' live listings</div>';

  html += '<div class="jm-cards">';
  jobs.forEach(function(job) {
    var locStr = locPref || '';
    var q = jmEnc(job.title);
    var liWt = { remote:'&f_WT=2', hybrid:'&f_WT=3', onsite:'&f_WT=1' }[_jmWorkType] || '';
    var indLoc = _jmWorkType === 'remote' ? 'remote' : locStr;
    var liUrl  = 'https://www.linkedin.com/jobs/search/?keywords=' + q + (locStr ? '&location=' + jmEnc(locStr) : '') + liWt;
    var indUrl = 'https://www.indeed.com/jobs?q=' + q + (indLoc ? '&l=' + jmEnc(indLoc) : '') + (_jmWorkType === 'remote' ? '&remotejob=1' : '');
    var gdUrl  = 'https://www.glassdoor.com/Job/jobs.htm?sc.keyword=' + jmEnc(locStr ? job.title + ' ' + locStr : job.title);
    var hcUrl  = 'https://hiring.cafe/?searchState=' + encodeURIComponent(JSON.stringify({ searchQuery: locStr ? job.title + ' ' + locStr : job.title }));

    // Posted date
    var postedStr = '';
    if (job.posted) {
      var daysAgo = Math.round((Date.now() - new Date(job.posted).getTime()) / 86400000);
      postedStr = daysAgo <= 0 ? 'Today' : daysAgo === 1 ? '1 day ago' : daysAgo + ' days ago';
    }

    html += '<div class="jm-card">';
    html += '<div class="jm-card-top">';
    html += '<div class="jm-card-left">';

    // Company logo
    if (job.companyLogo) {
      html += '<img src="' + escJm(job.companyLogo) + '" alt="" style="height:28px;width:auto;max-width:90px;object-fit:contain;border-radius:4px;margin-bottom:6px;filter:brightness(1.1)" onerror="this.style.display=\'none\'">';
    }

    html += '<div class="jm-card-title">' + escJm(job.title) + '</div>';
    html += '<div style="font-size:.82rem;color:rgba(255,255,255,.6);font-weight:600;margin-bottom:6px">' + escJm(job.company) + '</div>';
    html += '<div class="jm-card-meta">';
    if (job.location) html += '<span class="jm-tag">📍 ' + escJm(job.location) + '</span>';
    if (job.isRemote) html += '<span class="jm-tag" style="background:rgba(16,185,129,.12);color:#6ee7b7;border-color:rgba(16,185,129,.3)">🌐 Remote</span>';
    if (job.employmentType) html += '<span class="jm-tag">' + escJm(job.employmentType.replace(/_/g,' ')) + '</span>';
    if (job.salary) html += '<span class="jm-tag salary">💰 ' + escJm(job.salary) + '</span>';
    if (postedStr) html += '<span class="jm-tag" style="background:rgba(255,255,255,.05);color:rgba(255,255,255,.35)">🕒 ' + postedStr + '</span>';
    html += '</div></div>';
    html += '</div>'; // .jm-card-top

    // Description snippet
    if (job.description) {
      html += '<div class="jm-why">' + escJm(job.description.slice(0, 280)) + (job.description.length > 280 ? '…' : '') + '</div>';
    }

    // Why match (from Claude's search meta)
    if (job._searchMeta && job._searchMeta.why) {
      html += '<div style="font-size:.76rem;color:#a5b4fc;margin-bottom:10px;font-style:italic">🤖 ' + escJm(job._searchMeta.why) + '</div>';
    }

    // Skills from Claude
    if (job._searchMeta && (job._searchMeta.skills||[]).length) {
      html += '<div class="jm-skills">';
      job._searchMeta.skills.forEach(function(sk){ html += '<span class="jm-skill-chip">' + escJm(sk) + '</span>'; });
      html += '</div>';
    }

    html += '<div class="jm-actions">';
    if (job.applyUrl) {
      html += '<a class="jm-action-btn primary" href="' + escJm(job.applyUrl) + '" target="_blank" rel="noopener">🚀 Apply Now</a>';
    }
    html += '<button class="jm-action-btn" onclick="jmUseRole(\'' + escJmAttr(job.title) + '\',\'' + escJmAttr(job.title) + '\')">🎯 Tailor resume</button>';
    html += '<a class="jm-action-btn" href="' + liUrl + '" target="_blank" rel="noopener">🔗 LinkedIn</a>';
    html += '<a class="jm-action-btn" href="' + indUrl + '" target="_blank" rel="noopener">🔍 Indeed</a>';
    html += '<a class="jm-action-btn" href="' + gdUrl + '" target="_blank" rel="noopener">📊 Glassdoor</a>';
    html += '<a class="jm-action-btn" href="' + hcUrl + '" target="_blank" rel="noopener">☕ Hiring.cafe</a>';
    html += '</div>';
    html += '</div>'; // .jm-card
  });
  html += '</div>'; // .jm-cards

  // Top keywords
  if (keywords.length) {
    html += '<div class="jm-kw-section">';
    html += '<div class="jm-kw-title">Top keywords to add to your resume</div>';
    html += '<div class="jm-kw-chips">';
    keywords.forEach(function(kw){ html += '<span class="jm-kw-chip">' + escJm(kw) + '</span>'; });
    html += '</div></div>';
  }

  body.innerHTML = html;
}

function jmUseRole(title, searchQuery) {
  // Pre-fill the "Role you're applying for" field and close modal
  var roleEl = document.getElementById('role');
  if (roleEl) roleEl.value = title;
  closeJobMatch();
  // Scroll to job details section and focus JD textarea
  var jdEl = document.getElementById('jd');
  if (jdEl) {
    jdEl.focus();
    jdEl.placeholder = 'Paste a job description for "' + title + '" here, or use the URL field above to fetch one…';
    jdEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function escJm(s)     { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escJmAttr(s) { return String(s||'').replace(/'/g,'&#39;').replace(/"/g,'&quot;'); }
