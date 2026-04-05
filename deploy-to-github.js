#!/usr/bin/env node
// ═══════════════════════════════════════════════════════
//  TailorCV — GitHub Deployment Helper
//  Run: node deploy-to-github.js YOUR_TOKEN YOUR_USERNAME
// ═══════════════════════════════════════════════════════
const { execSync } = require('child_process');

const token    = process.argv[2];
const username = process.argv[3];
const repoName = 'tailorcv';

if (!token || !username) {
  console.log('\nUsage: node deploy-to-github.js YOUR_TOKEN YOUR_USERNAME\n');
  console.log('Example: node deploy-to-github.js ghp_abc123 johndoe\n');
  process.exit(1);
}

async function run() {
  console.log('\n📦 TailorCV — Deploying to GitHub\n');

  // 1. Create GitHub repo via API
  console.log('1️⃣  Creating GitHub repository "tailorcv"...');
  const createRes = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'TailorCV-Deploy',
    },
    body: JSON.stringify({
      name: repoName,
      description: 'TailorCV — AI-powered resume tailoring web app',
      private: false,
      auto_init: false,
    }),
  });

  const repoData = await createRes.json();
  if (!createRes.ok && createRes.status !== 422) {
    console.error('❌ Failed to create repo:', repoData.message || createRes.status);
    process.exit(1);
  }
  if (createRes.status === 422) {
    console.log('   ℹ️  Repo already exists — using it.');
  } else {
    console.log(`   ✅ Repo created at: ${repoData.html_url}`);
  }

  // 2. Set git remote and push
  const remoteUrl = `https://${token}@github.com/${username}/${repoName}.git`;
  console.log('\n2️⃣  Pushing code to GitHub...');

  try {
    // Remove existing remote if any
    try { execSync('git remote remove origin', { stdio: 'pipe' }); } catch(e) {}

    execSync(`git remote add origin ${remoteUrl}`, { stdio: 'pipe' });
    execSync('git push -u origin main --force', { stdio: 'inherit' });
    console.log('\n✅ Code pushed successfully!\n');
  } catch(err) {
    console.error('❌ Push failed:', err.message);
    process.exit(1);
  }

  // 3. Print next steps
  const repoUrl = `https://github.com/${username}/${repoName}`;
  console.log('══════════════════════════════════════════════════');
  console.log('🎉 GitHub repo ready!');
  console.log(`   ${repoUrl}`);
  console.log('');
  console.log('Now deploy to Render.com:');
  console.log('');
  console.log('  1. Go to https://render.com and create a free account');
  console.log('  2. Click "New +" → "Web Service"');
  console.log('  3. Connect GitHub and select the "tailorcv" repo');
  console.log('  4. Settings:');
  console.log('       Runtime:         Node');
  console.log('       Build Command:   npm install');
  console.log('       Start Command:   npm start');
  console.log('  5. Add these Environment Variables:');
  console.log('       NODE_ENV         production');
  console.log('       JWT_SECRET       (generate: run "node -e \\"console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))\\"")');
  console.log('       CLAUDE_API_KEY   sk-ant-... (your key)');
  console.log('       APP_URL          https://tailorcv.onrender.com (your Render URL)');
  console.log('  6. Click "Create Web Service" — live in ~2 minutes!');
  console.log('══════════════════════════════════════════════════\n');
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
