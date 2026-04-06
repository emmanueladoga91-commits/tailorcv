// ── State ──────────────────────────────────────────────────────────────────
var fileBuffer = null, fileName = '', busy = false, selectedPages = 2;
var resumeBlobRef = null, resumeNameRef = '';
var tailoredRef = null, jdRef = '', atsResultRef = null;
var selectedProfile = null;
var selectedTemplate = 'classic';

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
      }
    }).catch(function(){});
}

function renderUserMenu() {
  if (!currentUser) return;
  var isPro = (currentUser.plan === 'pro' && currentUser.subscriptionStatus === 'active');
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
    '5. PROFESSIONAL SUMMARY: Open with "A [adjective] [exact job title from JD]..." — set summaryTitle to "PROFESSIONAL SUMMARY - [exact job title from JD]".',
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
var TEMPLATES = {
  classic: {
    FONT:'Calibri', B:20, NP:56, nameAlign:'CENTER',
    secBorder:'SINGLE', secColor:'000000', secBorderSz:6,
    MAR:1080, secBefore:220, secAfter:100, bodyAfter:120, roleAfter:180,
    order:['summary','skills','experience','tech','certs','edu'],
    names:{ summary:'PROFESSIONAL SUMMARY', skills:'KEY SKILLS / CORE COMPETENCE', experience:'WORK EXPERIENCE', tech:'TECHNICAL SKILLS & TOOLS', certs:'CERTIFICATIONS AND TRAINING', edu:'EDUCATION' },
    pvAccent:'#111111'
  },
  executive: {
    FONT:'Times New Roman', B:20, NP:60, nameAlign:'CENTER',
    secBorder:'DOUBLE', secColor:'1b3a2f', secBorderSz:6,
    MAR:1080, secBefore:280, secAfter:120, bodyAfter:140, roleAfter:200,
    order:['summary','skills','experience','tech','certs','edu'],
    names:{ summary:'EXECUTIVE SUMMARY', skills:'LEADERSHIP COMPETENCIES', experience:'PROFESSIONAL EXPERIENCE', tech:'TECHNICAL CAPABILITIES', certs:'PROFESSIONAL CREDENTIALS', edu:'EDUCATION & QUALIFICATIONS' },
    pvAccent:'#1b3a2f'
  },
  modern: {
    FONT:'Calibri', B:20, NP:56, nameAlign:'CENTER',
    secBorder:'SINGLE', secColor:'6366f1', secBorderSz:6,
    MAR:1080, secBefore:220, secAfter:100, bodyAfter:120, roleAfter:180,
    order:['summary','skills','experience','tech','certs','edu'],
    names:{ summary:'PROFESSIONAL SUMMARY', skills:'KEY COMPETENCIES', experience:'CAREER EXPERIENCE', tech:'SKILLS & TECHNOLOGIES', certs:'CERTIFICATIONS', edu:'EDUCATION' },
    pvAccent:'#6366f1', accentBar:true
  },
  professional: {
    FONT:'Calibri', B:20, NP:56, nameAlign:'CENTER',
    secBorder:'SINGLE', secColor:'1e3a5f', secBorderSz:6,
    MAR:1080, secBefore:240, secAfter:100, bodyAfter:120, roleAfter:180,
    order:['summary','skills','experience','tech','certs','edu'],
    names:{ summary:'PROFESSIONAL SUMMARY', skills:'CORE COMPETENCIES', experience:'PROFESSIONAL EXPERIENCE', tech:'TECHNICAL PROFICIENCIES', certs:'CREDENTIALS & TRAINING', edu:'EDUCATION' },
    pvAccent:'#1e3a5f'
  },
  minimal: {
    FONT:'Arial', B:20, NP:52, nameAlign:'LEFT',
    secBorder:'NONE', secColor:'111111', secBorderSz:0,
    MAR:1080, secBefore:260, secAfter:80, bodyAfter:120, roleAfter:160,
    order:['summary','skills','experience','tech','certs','edu'],
    names:{ summary:'Summary', skills:'Core Skills', experience:'Experience', tech:'Technical Skills', certs:'Certifications', edu:'Education' },
    pvAccent:'#555555', minimal:true
  },
  tech: {
    FONT:'Calibri', B:20, NP:56, nameAlign:'LEFT',
    secBorder:'SINGLE', secColor:'0284c7', secBorderSz:6,
    MAR:1080, secBefore:220, secAfter:100, bodyAfter:120, roleAfter:180,
    order:['summary','tech','skills','experience','certs','edu'],
    names:{ summary:'PROFESSIONAL PROFILE', skills:'TECHNICAL COMPETENCIES', experience:'WORK EXPERIENCE', tech:'TECHNICAL SKILLS & STACK', certs:'CERTIFICATIONS', edu:'EDUCATION' },
    pvAccent:'#0284c7'
  },
  consulting: {
    FONT:'Calibri', B:20, NP:56, nameAlign:'CENTER',
    secBorder:'THICK', secColor:'7f1d1d', secBorderSz:12,
    MAR:1080, secBefore:240, secAfter:80, bodyAfter:100, roleAfter:180,
    order:['summary','skills','experience','tech','certs','edu'],
    names:{ summary:'PROFESSIONAL SUMMARY', skills:'CORE COMPETENCIES', experience:'PROFESSIONAL EXPERIENCE', tech:'TECHNICAL SKILLS', certs:'CERTIFICATIONS & TRAINING', edu:'EDUCATION' },
    pvAccent:'#7f1d1d'
  },
  academic: {
    FONT:'Georgia', B:20, NP:56, nameAlign:'CENTER',
    secBorder:'SINGLE', secColor:'78350f', secBorderSz:6,
    MAR:1080, secBefore:220, secAfter:100, bodyAfter:120, roleAfter:180,
    order:['summary','edu','skills','certs','experience','tech'],
    names:{ summary:'ACADEMIC PROFILE', skills:'AREAS OF EXPERTISE', experience:'PROFESSIONAL EXPERIENCE', tech:'RESEARCH & TECHNICAL SKILLS', certs:'QUALIFICATIONS & LICENCES', edu:'EDUCATION & ACADEMIC CREDENTIALS' },
    pvAccent:'#78350f'
  },
  entrylevel: {
    FONT:'Calibri', B:20, NP:54, nameAlign:'CENTER',
    secBorder:'SINGLE', secColor:'0369a1', secBorderSz:6,
    MAR:1080, secBefore:220, secAfter:100, bodyAfter:120, roleAfter:180,
    order:['summary','edu','skills','experience','tech','certs'],
    names:{ summary:'PROFESSIONAL OBJECTIVE', skills:'SKILLS & COMPETENCIES', experience:'EXPERIENCE', tech:'TECHNICAL SKILLS', certs:'CERTIFICATIONS', edu:'EDUCATION' },
    pvAccent:'#0369a1'
  },
  government: {
    FONT:'Times New Roman', B:20, NP:56, nameAlign:'CENTER',
    secBorder:'THICK', secColor:'1e3a5f', secBorderSz:10,
    MAR:1080, secBefore:240, secAfter:100, bodyAfter:130, roleAfter:190,
    order:['summary','skills','experience','tech','certs','edu'],
    names:{ summary:'PROFESSIONAL SUMMARY', skills:'KEY CAPABILITIES', experience:'EMPLOYMENT HISTORY', tech:'TECHNICAL SKILLS & SYSTEMS', certs:'QUALIFICATIONS & PROFESSIONAL DEVELOPMENT', edu:'EDUCATION' },
    pvAccent:'#1e3a5f'
  },
  creative: {
    FONT:'Calibri', B:20, NP:54, nameAlign:'LEFT',
    secBorder:'SINGLE', secColor:'0d9488', secBorderSz:6,
    MAR:1080, secBefore:220, secAfter:100, bodyAfter:120, roleAfter:180,
    order:['summary','skills','experience','tech','certs','edu'],
    names:{ summary:'ABOUT ME', skills:'SKILLS & EXPERTISE', experience:'EXPERIENCE', tech:'TOOLS & TECHNOLOGIES', certs:'CERTIFICATIONS', edu:'EDUCATION' },
    pvAccent:'#0d9488'
  },
  healthcare: {
    FONT:'Calibri', B:20, NP:56, nameAlign:'CENTER',
    secBorder:'SINGLE', secColor:'0f766e', secBorderSz:6,
    MAR:1080, secBefore:220, secAfter:100, bodyAfter:120, roleAfter:180,
    order:['summary','skills','experience','tech','certs','edu'],
    names:{ summary:'CLINICAL PROFILE', skills:'CLINICAL COMPETENCIES', experience:'CLINICAL & PROFESSIONAL EXPERIENCE', tech:'CLINICAL SYSTEMS & TOOLS', certs:'LICENCES, REGISTRATIONS & CERTIFICATIONS', edu:'EDUCATION & TRAINING' },
    pvAccent:'#0f766e'
  },
  compact: {
    FONT:'Calibri', B:18, NP:48, nameAlign:'CENTER',
    secBorder:'SINGLE', secColor:'4b5563', secBorderSz:4,
    MAR:720, secBefore:160, secAfter:60, bodyAfter:80, roleAfter:120,
    order:['summary','skills','experience','tech','certs','edu'],
    names:{ summary:'PROFESSIONAL SUMMARY', skills:'CORE COMPETENCIES', experience:'WORK EXPERIENCE', tech:'TECHNICAL SKILLS', certs:'CERTIFICATIONS', edu:'EDUCATION' },
    pvAccent:'#4b5563', compact:true
  }
};

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
    });
  });

  // Live stepper updates
  ['jd','company','role'].forEach(function(id) {
    document.getElementById(id).addEventListener('input', refreshStepper);
  });

  // ── Template Preview (eye buttons) ──
  document.querySelectorAll('.t-eye-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation(); // don't also trigger card selection
      openTmplPreview(btn.getAttribute('data-preview'));
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
});

// ── Stepper ────────────────────────────────────────────────────────────────
function setStepDone(idx) {
  var el = document.getElementById('st'+idx);
  if (el) { el.classList.remove('s-active'); el.classList.add('s-done'); el.querySelector('.step-dot').textContent='✓'; }
}
function refreshStepper() {
  if (selectedProfile)                                    setStepDone(0);
  if (fileBuffer)                                         setStepDone(1);
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
  fileBuffer = null; fileName = '';
  var dz = document.getElementById('dz');
  dz.classList.remove('loaded');
  document.getElementById('dzIcon').textContent  = '📎';
  document.getElementById('dzTitle').textContent = 'Drop your resume here';
  document.getElementById('dzSub').innerHTML     = 'Accepts <b>.docx</b> and <b>.pdf</b> &nbsp;·&nbsp; or click to browse';
  document.getElementById('badge').classList.remove('on');
  document.getElementById('sn1').classList.remove('done');
  document.getElementById('fileInput').value = '';
}

// ── PDF extraction ─────────────────────────────────────────────────────────
async function inflatePdfStream(bytes) {
  try {
    var ds = new DecompressionStream('deflate-raw');
    var writer = ds.writable.getWriter(); var reader = ds.readable.getReader();
    writer.write(bytes); writer.close();
    var chunks = [], total = 0;
    while (true) { var r = await reader.read(); if (r.done) break; chunks.push(r.value); total += r.value.length; }
    var out = new Uint8Array(total), off = 0;
    for (var i = 0; i < chunks.length; i++) { out.set(chunks[i], off); off += chunks[i].length; }
    return new TextDecoder('latin1').decode(out);
  } catch(e) { return null; }
}
function decodePdfStr(s) {
  return s.replace(/\\n/g,' ').replace(/\\r/g,'').replace(/\\t/g,' ')
    .replace(/\\\(/g,'(').replace(/\\\)/g,')').replace(/\\\\/g,'\\')
    .replace(/\\(\d{3})/g, function(_,o){ return String.fromCharCode(parseInt(o,8)); });
}
function extractTextFromContent(content) {
  var parts=[], m;
  var btBlocks = content.match(/BT[\s\S]*?ET/g)||[];
  for (var b=0;b<btBlocks.length;b++) {
    var block=btBlocks[b];
    var tjRe=/\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*Tj/g;
    while((m=tjRe.exec(block))!==null) parts.push(decodePdfStr(m[1]));
    var tjArrRe=/\[([^\]]*)\]\s*TJ/g;
    while((m=tjArrRe.exec(block))!==null){
      var strRe=/\(([^)\\]*(?:\\.[^)\\]*)*)\)/g, sm;
      while((sm=strRe.exec(m[1]))!==null) parts.push(decodePdfStr(sm[1]));
    }
  }
  return parts.join(' ');
}
async function extractPdfText(buffer) {
  var bytes=new Uint8Array(buffer);
  var raw=new TextDecoder('latin1').decode(bytes);
  var parts=[], m;
  var streamRe=/stream\r?\n([\s\S]*?)\r?\nendstream/g;
  while((m=streamRe.exec(raw))!==null){
    var sd=m[1];
    if(/BT[\s\S]{0,10000}ET/.test(sd)){parts.push(extractTextFromContent(sd));continue;}
    var sb=new Uint8Array(sd.length);
    for(var i=0;i<sd.length;i++) sb[i]=sd.charCodeAt(i)&0xff;
    var dc=await inflatePdfStream(sb);
    if(dc&&/BT[\s\S]{0,10000}ET/.test(dc)) parts.push(extractTextFromContent(dc));
  }
  var text=parts.join(' ').replace(/\s+/g,' ').trim();
  if(text.length<50) throw new Error('Could not extract text from this PDF. Try uploading the .docx version instead.');
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
async function extractText(buffer, name) {
  return name.match(/\.pdf$/i) ? extractPdfText(buffer) : extractDocxText(buffer);
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

function getTmplCfg(tmplKey){ return TEMPLATES[tmplKey] || TEMPLATES.classic; }

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
    var renderer = SECTION_RENDERERS[sec];
    if(renderer){ renderer(d,cfg).forEach(function(p){ ch.push(p); }); }
  });

  return new Document({
    numbering:{config:[mkBul('bw'),mkBul('bc')]},
    sections:[{properties:{page:{size:{width:PW,height:PH},margin:{top:cfg.MAR,right:cfg.MAR,bottom:cfg.MAR,left:cfg.MAR}}},children:ch}]
  });
}

// Cover letter builder
function buildCoverDoc(d){
  var cfg = getTmplCfg('classic'); // cover letter always classic
  var ch=[];
  function r(t,o){ return new TextRun(Object.assign({text:t,size:cfg.B,font:cfg.FONT},o||{})); }
  function lp(c,a){ return new Paragraph({children:c,alignment:AlignmentType.LEFT,spacing:{after:a||80}}); }
  function bp(t,a){ return new Paragraph({children:[r(t)],alignment:AlignmentType.JUSTIFIED,spacing:{after:a||160}}); }
  var cl=d.coverLetter||{};
  ch.push(lp([r('Date: ',{bold:true}),r(cl.date||new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}))],180));
  ch.push(lp([r('To: ',{bold:true}),r((cl.recipientTitle||'Hiring Manager')+',')],40));
  if(cl.recipientDepartment) ch.push(lp([r(cl.recipientDepartment)],40));
  if(cl.recipientOrg)        ch.push(lp([r(cl.recipientOrg)],40));
  if(cl.recipientLocation)   ch.push(lp([r(cl.recipientLocation)],180));
  if(cl.reLine) ch.push(lp([r('RE: ',{bold:true}),r(cl.reLine)],180));
  ch.push(lp([r('Dear Hiring Manager,')],160));
  if(cl.openingParagraph) ch.push(bp(cl.openingParagraph));
  if(cl.bodyParagraph1)   ch.push(bp(cl.bodyParagraph1));
  if(cl.bodyParagraph2)   ch.push(bp(cl.bodyParagraph2));
  if(cl.bodyParagraph3)   ch.push(bp(cl.bodyParagraph3));
  if(cl.closingParagraph) ch.push(bp(cl.closingParagraph,200));
  ch.push(lp([r('Warm regards,')],200));
  ch.push(lp([r(d.name,{bold:true})],40));
  ch.push(lp([r(d.phone)],40));
  ch.push(lp([r(d.email)],40));
  return new Document({sections:[{properties:{page:{size:{width:PW,height:PH},margin:{top:1080,right:1080,bottom:1080,left:1080}}},children:ch}]});
}

// ── Main build ─────────────────────────────────────────────────────────────
async function build(){
  if(busy) return;
  clearAlert(); clearOutputs();
  
  var company = document.getElementById('company').value.trim()||'the company';
  var role    = document.getElementById('role').value.trim()||'the role';
  var jd      = document.getElementById('jd').value.trim();

  if(!selectedProfile)             return showAlert('warn','No profile selected.','Choose a professional profile at Step 1.');
  if(!fileBuffer)                  return showAlert('warn','No resume uploaded.','Drop your .docx or .pdf in Step 2.');
  if(!jd)                          return showAlert('warn','Job description missing.','Paste the job description in Step 3.');
  
  

  busy=true;
  document.getElementById('buildBtn').disabled=true;
  document.getElementById('buildBtn').innerHTML='<span class="spin"></span> Building\u2026';
  document.getElementById('prog').classList.add('on');

  try {
    // 1. Extract text
    step(1,'active');
    var resumeText = await extractText(fileBuffer,fileName);
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
      '  "coverLetter": {"date":"Month DD, YYYY","recipientTitle":"Hiring Manager","recipientDepartment":"","recipientOrg":"","recipientLocation":"City, State","reLine":"[Job Title] - [Req ID if in JD]","openingParagraph":"","bodyParagraph1":"","bodyParagraph2":"","bodyParagraph3":"","closingParagraph":"Start with: Thank you for your time and consideration."}',
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
    var clData = Object.assign({},tailored,tailored.coverLetter||{},{date:today});
    var clBlob = await Packer.toBlob(buildCoverDoc(clData));
    var cName = (tailored.name||'Resume').replace(/\s+/g,'_')+'_Cover_Letter_'+company.replace(/\s+/g,'_')+'.docx';
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
  var prompt=['Score the resume against the JD. Respond with ONLY the JSON object.','','JOB DESCRIPTION:',jd,'','RESUME:',txt,'','JSON format:','{"overallScore":<0-100>,"breakdown":{"keywordMatch":<0-100>,"skillsAlignment":<0-100>,"experienceRelevance":<0-100>,"summaryRelevance":<0-100>},"matchedKeywords":[<up to 8>],"missingKeywords":[<up to 5>],"strengths":[<2-3>],"improvements":[<1-2>]}'].join('\n');
  var raw = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
    body: JSON.stringify({ type: 'ats', system: sys, userMsg: prompt, maxTokens: 2500, model: 'claude-haiku-4-5-20251001' }),
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
  var bars=[{label:'Keyword Match',val:(ats.breakdown||{}).keywordMatch||0},{label:'Skills Alignment',val:(ats.breakdown||{}).skillsAlignment||0},{label:'Experience Relevance',val:(ats.breakdown||{}).experienceRelevance||0},{label:'Summary Relevance',val:(ats.breakdown||{}).summaryRelevance||0}];
  var h='<div class="ats-wrap"><div class="ats-ring-wrap"><svg viewBox="0 0 114 114"><circle class="ats-track" cx="57" cy="57" r="'+r+'"/><circle class="ats-fill" cx="57" cy="57" r="'+r+'" stroke="'+color+'" stroke-dasharray="'+circ+'" stroke-dashoffset="'+offset+'"/></svg><div class="ats-center"><div class="ats-num" style="color:'+color+'">'+score+'</div><div class="ats-pct">/ 100</div></div></div>';
  h+='<div class="ats-right">';
  bars.forEach(function(b){var bc=b.val>=80?'#16a34a':b.val>=60?'#d97706':'#dc2626';h+='<div class="ats-bar-row"><div class="ats-bar-top"><span>'+b.label+'</span><span style="color:'+bc+'">'+b.val+'%</span></div><div class="ats-bg"><div class="ats-fg" style="width:'+b.val+'%;background:'+bc+'"></div></div></div>';});
  h+='</div></div>';
  var matched=ats.matchedKeywords||[], missing=ats.missingKeywords||[];
  if(matched.length){h+='<div class="kw-sec"><div class="kw-title">\u2705 Keywords Found</div><div class="kw-chips">';matched.forEach(function(k){h+='<span class="kw-chip kw-match">'+esc(k)+'</span>';});h+='</div></div>';}
  if(missing.length){h+='<div class="kw-sec" style="margin-top:10px"><div class="kw-title">\u26a0\ufe0f Keywords Missing</div><div class="kw-chips">';missing.forEach(function(k){h+='<span class="kw-chip kw-miss">'+esc(k)+'</span>';});h+='</div></div>';}
  var st=ats.strengths||[], im=ats.improvements||[];
  if(st.length||im.length){h+='<div class="ats-insights">';if(st.length){h+='<div class="kw-title" style="margin-top:14px">\uD83D\uDCAA Strengths</div><ul>';st.forEach(function(s){h+='<li>'+esc(s)+'</li>';});h+='</ul>';}if(im.length){h+='<div class="kw-title" style="margin-top:10px">\uD83D\uDCA1 Suggestions</div><ul>';im.forEach(function(s){h+='<li>'+esc(s)+'</li>';});h+='</ul>';}h+='</div>';}
  if(missing.length){h+='<hr class="improve-sep"><p class="improve-note">Want a higher score? Claude can naturally weave the missing keywords into your resume wherever your experience genuinely supports them.</p><button type="button" class="improve-btn" id="improveBtn">\u2728 Improve Resume with Missing Keywords</button><div id="improveMsg"></div>';}
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

// ── Resume HTML preview (template-aware) ─────────────────────────────────────
function buildResumeHtml(d, tmplKey){
  var cfg = getTmplCfg(tmplKey||'classic');
  var ac = cfg.pvAccent||'#111';
  var nameAlign = cfg.nameAlign==='LEFT' ? 'left' : 'center';
  var secStyle = 'font-weight:700;border-bottom:1.5px solid '+ac+';margin:16px 0 7px;padding-bottom:3px;font-size:10.5pt;color:'+ac;
  if(cfg.minimal) secStyle = 'font-weight:700;margin:14px 0 5px;font-size:10.5pt;color:'+ac+';border:none;';
  var h='';
  if(cfg.accentBar) h+='<div style="height:5px;background:linear-gradient(90deg,#6366f1,#2d5a8e);border-radius:3px;margin-bottom:20px"></div>';
  h+='<div class="pv-name" style="text-align:'+nameAlign+';font-family:'+(cfg.FONT||'Calibri')+',serif">'+esc(d.name)+'</div>';
  h+='<div class="pv-contact" style="text-align:'+nameAlign+'">'+esc(d.phone)+' &middot; '+esc(d.email)+'</div>';
  if(d.locationPreference) h+='<div class="pv-loc" style="text-align:'+nameAlign+'">'+esc(d.locationPreference)+'</div>';
  // Render sections in template order
  cfg.order.forEach(function(sec){
    if(sec==='summary'){
      h+='<div class="pv-sec" style="'+secStyle+'">'+esc(d.summaryTitle||cfg.names.summary)+'</div>';
      h+='<div class="pv-para">'+esc(d.summary)+'</div>';
    } else if(sec==='skills'){
      h+='<div class="pv-sec" style="'+secStyle+'">'+esc(cfg.names.skills)+'</div><div class="pv-grid2">';
      (d.coreCompetencies||[]).forEach(function(c){h+='<div class="pv-comp">&bull; '+esc(c)+'</div>';});
      h+='</div>';
    } else if(sec==='experience'){
      h+='<div class="pv-sec" style="'+secStyle+'">'+esc(cfg.names.experience)+'</div>';
      (d.workExperience||[]).forEach(function(role){
        h+='<div class="pv-role-hdr"><span class="pv-rtitle">'+esc(role.title)+'&nbsp;&nbsp;|&nbsp;&nbsp;'+esc(role.company)+'&nbsp;&nbsp;|&nbsp;&nbsp;'+esc(role.location)+'</span><span class="pv-rdates">'+esc(role.dates)+'</span></div>';
        var projs = role.projects||[];
        projs.forEach(function(p){h+='<div class="pv-proj"><strong>'+esc(p.title)+':</strong> '+esc(p.description)+'</div>';});
        if((role.responsibilities||[]).length){
          // Only show "Roles/Responsibilities" sub-label when project blocks sit above it
          if(projs.length > 0) h+='<div class="pv-resp-lbl">Roles/Responsibilities</div>';
          h+='<ul class="pv-ul">';
          role.responsibilities.forEach(function(b){h+='<li>'+esc(b)+'</li>';});
          h+='</ul>';
        }
      });
    } else if(sec==='tech'){
      h+='<div class="pv-sec" style="'+secStyle+'">'+esc(cfg.names.tech)+'</div>';
      (d.technicalSkills||[]).forEach(function(t){h+='<div class="pv-tech"><strong>'+esc(t.category)+':</strong> '+esc(t.items)+'</div>';});
    } else if(sec==='certs'){
      h+='<div class="pv-sec" style="'+secStyle+'">'+esc(cfg.names.certs)+'</div><ul class="pv-ul">';
      (d.certifications||[]).forEach(function(c){h+='<li>'+esc(c)+'</li>';});
      h+='</ul>';
    } else if(sec==='edu'){
      h+='<div class="pv-sec" style="'+secStyle+'">'+esc(cfg.names.edu)+'</div>';
      (d.education||[]).forEach(function(e){h+='<div class="pv-edu"><strong>'+esc(e.degree)+'</strong>&nbsp;&nbsp;|&nbsp;&nbsp;'+esc(e.institution)+', <em>'+esc(e.location)+'</em></div>';});
    }
  });
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
  document.getElementById('alertIcon').textContent=type==='error'?'❌':'⚠️';
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

var TEMPLATE_ORDER  = ['classic','executive','modern','professional','minimal','tech','consulting','academic','entrylevel','government','creative','healthcare','compact'];
var TEMPLATE_LABELS = {
  classic:'Classic — Traditional, centered',    executive:'Executive — Serif, double rule',
  modern:'Modern — Indigo accent bar',           professional:'Professional — Navy sidebar',
  minimal:'Minimal — Clean, no borders',         tech:'Tech First — Skills lead',
  consulting:'Consulting — Burgundy, impact-first', academic:'Academic — Education first',
  entrylevel:'Entry Level — Education & skills first', government:'Government — Formal, federal',
  creative:'Creative — Teal left accent',        healthcare:'Healthcare — Clinical teal',
  compact:'Compact — Dense, 1-page optimised'
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
});

// ── Upload tab switching ────────────────────────────────────────────────────
function switchUploadTab(name) {
  ['upload','library','linkedin'].forEach(function(t) {
    document.getElementById('tab'+capitalize(t)).classList.toggle('active', t===name);
    document.getElementById('pane'+capitalize(t)).classList.toggle('active', t===name);
  });
  if (name === 'library') loadResumeLibrary();
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
  // For match score we need either a real file or pre-extracted text
  var hasResume = fileBuffer || window._preExtractedResumeText;
  if (!hasResume) return showAlert('warn', 'Upload your resume first.', 'Load your resume in Step 2, then check your match score.');
  if (!jd)        return showAlert('warn', 'Paste a job description first.', 'Add the job description in Step 3 before checking your match.');

  var btn = document.getElementById('checkMatchBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span> Checking match…';
  document.getElementById('matchPanel').classList.remove('on');

  try {
    var resumeText;
    if (window._preExtractedResumeText) {
      resumeText = window._preExtractedResumeText;
    } else {
      resumeText = await extractText(fileBuffer, fileName);
      // After extraction keep for future use
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
    + '@page{margin:1in;}'
    + '@media print{body{padding:0;margin:0;}}'
    + '</style></head>'
    + '<body>' + html + '</body></html>';
  var printWin = window.open('', '_blank', 'width=850,height=1100');
  printWin.document.write(winContent);
  printWin.document.close();
  printWin.focus();
  setTimeout(function() { printWin.print(); }, 500);
}

// Hide PDF card when outputs are cleared
var _origClearOutputs = clearOutputs;
clearOutputs = function() {
  _origClearOutputs();
  var pdfCard = document.getElementById('pdfDlCard');
  if (pdfCard) pdfCard.style.display = 'none';
  document.getElementById('matchPanel').classList.remove('on');
};

// Clear pre-extracted text on file reset
var _origResetFile = resetFile;
resetFile = function() {
  _origResetFile();
  window._preExtractedResumeText = null;
  var saveRow = document.getElementById('libSaveRow');
  if (saveRow) saveRow.style.display = 'none';
};

// Show PDF download card after build
var _origAddDownload = addDownload;
addDownload = function(blob, fname, icon, label) {
  _origAddDownload(blob, fname, icon, label);
  // Show PDF card once we have a resume blob (first call)
  if (icon === '📄') {
    var pdfCard = document.getElementById('pdfDlCard');
    if (pdfCard) pdfCard.style.display = 'flex';
  }
};
