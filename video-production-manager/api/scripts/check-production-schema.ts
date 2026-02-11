/**
 * Check if production database has the latest schema changes
 * Verifies: uuid columns, field_versions columns
 */

const checkProductionSchema = async () => {
  const RAILWAY_API = 'https://videodept-api-production.up.railway.app';
  
  console.log('🔍 Checking Railway production schema...\n');
  
  try {
    // 1. Check health endpoint
    const healthResponse = await fetch(`${RAILWAY_API}/health`);
    const health = await healthResponse.json();
    console.log('✅ API Health:', health.status);
    console.log('📊 Database:', health.database);
    console.log('🕐 Uptime:', Math.floor(health.uptime / 60), 'minutes\n');
    
    // 2. Try to fetch a camera to check if uuid field exists
    // This will fail if uuid column doesn't exist yet
    const camerasResponse = await fetch(`${RAILWAY_API}/api/cameras`);
    
    if (camerasResponse.ok) {
      const cameras = await camerasResponse.json();
      console.log('✅ Cameras API accessible');
      
      if (cameras.length > 0) {
        const firstCamera = cameras[0];
        console.log('\n📸 Sample camera structure:');
        console.log('  - Has uuid:', 'uuid' in firstCamera ? '✅' : '❌');
        console.log('  - Has id:', 'id' in firstCamera ? '✅' : '❌');
        console.log('  - Has field_versions:', 'fieldVersions' in firstCamera ? '✅' : '❌');
        
        if ('uuid' in firstCamera && 'fieldVersions' in firstCamera) {
          console.log('\n✅ Production database has latest schema!');
        } else {
          console.log('\n⚠️  Production database missing new columns!');
          console.log('   Migrations may not have run yet.');
        }
      } else {
        console.log('  No cameras in production yet - cannot verify schema');
        console.log('  Will need to create a test camera to verify');
      }
    } else {
      console.log('❌ Failed to fetch cameras:', camerasResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Error checking schema:', error);
  }
};

checkProductionSchema();
