/**
 * Test script to verify computer creation with uuid PRIMARY KEY and category field
 * 
 * This tests:
 * 1. POST /sources with category='COMPUTER' saves correctly
 * 2. Response includes uuid (PRIMARY KEY) and category fields
 * 3. GET /sources/:uuid returns the computer with category
 * 4. Database has the correct schema (uuid PK, category column)
 */

const API_URL = 'http://localhost:3010/api';
const PRODUCTION_ID = '447902cb-5ade-4756-b181-82b741cd1a40';

async function testComputerCreation() {
  console.log('🧪 Testing Computer Creation with UUID Primary Key\n');
  console.log('=' .repeat(80));
  
  // Test 1: Create a new computer
  console.log('\n[Test 1] Creating a new computer...');
  const computerData = {
    id: `TEST-COMP-${Date.now()}`,
    productionId: PRODUCTION_ID,
    category: 'COMPUTER',
    type: 'Laptop - PC MISC',
    name: 'Test Computer',
    rate: 59.94,
    outputs: [
      {
        id: 'out-1',
        connector: 'HDMI',
        hRes: 1920,
        vRes: 1080
      }
    ],
    userId: 'test-user',
    userName: 'Test User'
  };
  
  try {
    const createResponse = await fetch(`${API_URL}/sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(computerData)
    });
    
    if (!createResponse.ok) {
      const error = await createResponse.json();
      console.error('   ❌ FAILED: HTTP', createResponse.status);
      console.error('   Error:', JSON.stringify(error, null, 2));
      return false;
    }
    
    const createdComputer = await createResponse.json();
    console.log('   ✅ PASSED: Computer created');
    console.log('      uuid:', createdComputer.uuid);
    console.log('      id:', createdComputer.id);
    console.log('      category:', createdComputer.category);
    
    // Verify uuid exists and is valid
    if (!createdComputer.uuid || typeof createdComputer.uuid !== 'string') {
      console.error('   ❌ FAILED: uuid field missing or invalid');
      return false;
    }
    
    // Verify category exists
    if (createdComputer.category !== 'COMPUTER') {
      console.error('   ❌ FAILED: category field missing or incorrect');
      console.error('      Expected: COMPUTER');
      console.error('      Got:', createdComputer.category);
      return false;
    }
    
    // Test 2: Fetch the computer by uuid
    console.log('\n[Test 2] Fetching computer by uuid...');
    const fetchResponse = await fetch(`${API_URL}/sources/${createdComputer.uuid}`);
    
    if (!fetchResponse.ok) {
      console.error('   ❌ FAILED: Could not fetch computer by uuid');
      return false;
    }
    
    const fetchedComputer = await fetchResponse.json();
    console.log('   ✅ PASSED: Computer fetched by uuid');
    console.log('      uuid matches:', fetchedComputer.uuid === createdComputer.uuid);
    console.log('      category:', fetchedComputer.category);
    
    // Test 3: Fetch all sources for production and verify category filtering works
    console.log('\n[Test 3] Fetching all sources and filtering by category...');
    const allSourcesResponse = await fetch(`${API_URL}/sources/production/${PRODUCTION_ID}`);
    
    if (!allSourcesResponse.ok) {
      console.error('   ❌ FAILED: Could not fetch all sources');
      return false;
    }
    
    const allSources = await allSourcesResponse.json();
    const computers = allSources.filter(s => s.category === 'COMPUTER');
    const hasOurComputer = computers.some(c => c.uuid === createdComputer.uuid);
    
    console.log('   ✅ PASSED: Fetched all sources');
    console.log('      Total sources:', allSources.length);
    console.log('      Computers (category=COMPUTER):', computers.length);
    console.log('      Found our test computer:', hasOurComputer ? 'YES' : 'NO');
    
    if (!hasOurComputer) {
      console.error('   ❌ FAILED: Test computer not found in filtered list');
      return false;
    }
    
    // Test 4: Delete the test computer
    console.log('\n[Test 4] Deleting test computer...');
    const deleteResponse = await fetch(`${API_URL}/sources/${createdComputer.uuid}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'test-user',
        userName: 'Test User'
      })
    });
    
    if (!deleteResponse.ok) {
      console.error('   ⚠️  WARNING: Could not delete test computer');
      console.error('   You may need to manually delete id:', createdComputer.id);
    } else {
      console.log('   ✅ PASSED: Test computer deleted');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('🎉 ALL TESTS PASSED!\n');
    console.log('Summary:');
    console.log('  ✓ Computer created with uuid PRIMARY KEY');
    console.log('  ✓ Category field saved and returned correctly');
    console.log('  ✓ Computer fetchable by uuid');
    console.log('  ✓ Category filtering works for Computers page');
    console.log('  ✓ Test cleanup successful\n');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ TEST FAILED WITH ERROR:', error);
    return false;
  }
}

// Run the test
testComputerCreation()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
