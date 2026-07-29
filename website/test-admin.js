const baseUrl = 'http://169.58.77.61/api/v1';

async function runTests() {
  console.log('Testing Admin API Endpoints...');
  
  // 1. Authenticate (Login)
  console.log('\n--- Logging in ---');
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@insan-platform.com', password: 'INSAN@Admin2026!' })
  });
  
  if (!loginRes.ok) {
    console.error(`Login failed! Status: ${loginRes.status}`);
    const text = await loginRes.text();
    console.error(text);
    return;
  }
  
  const authData = await loginRes.json();
  const token = authData.data.accessToken;
  console.log('Login successful!');
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const endpoints = [
    { name: 'Hospitals', url: '/hospitals?pageSize=50' },
    { name: 'Doctors', url: '/doctors?pageSize=50' },
    { name: 'Medical Centers', url: '/medical-centers?pageSize=50' },
    { name: 'News', url: '/news?pageSize=50' },
    { name: 'Testimonials', url: '/testimonials?pageSize=50' },
    { name: 'AI Knowledge Base', url: '/ai/knowledge-base' },
    { name: 'Settings', url: '/settings' },
  ];

  let passed = 0;
  for (const ep of endpoints) {
    try {
      const res = await fetch(`${baseUrl}${ep.url}`, { headers });
      if (res.ok) {
        console.log(`✅ ${ep.name} OK (${res.status})`);
        passed++;
      } else {
        console.log(`❌ ${ep.name} FAILED (${res.status})`);
        const err = await res.text();
        console.log(`   Error: ${err}`);
      }
    } catch (e) {
      console.log(`❌ ${ep.name} ERROR: ${e.message}`);
    }
  }
  
  console.log(`\nResults: ${passed}/${endpoints.length} endpoints passed.`);
}

runTests();
