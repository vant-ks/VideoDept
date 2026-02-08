// Frontend State Debug Tool
// Add this to your browser console to trace state issues

(function() {
  console.log('🔍 FRONTEND STATE DEBUGGER LOADED');
  console.log('=====================================');
  
  // Hook into localStorage to see state changes
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key, value) {
    if (key.includes('source') || key.includes('production')) {
      console.log(`📦 LocalStorage SET: ${key}`, value);
    }
    return originalSetItem.apply(this, arguments);
  };
  
  // Monitor fetch calls
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    const options = args[1] || {};
    
    if (url.includes('/sources')) {
      console.log('🌐 API Call:', options.method || 'GET', url);
      if (options.body) {
        console.log('   Request body:', JSON.parse(options.body));
      }
    }
    
    return originalFetch.apply(this, arguments).then(response => {
      const cloned = response.clone();
      if (url.includes('/sources')) {
        cloned.json().then(data => {
          console.log('   Response:', response.status, data);
        }).catch(() => {});
      }
      return response;
    });
  };
  
  // Function to inspect current React state
  window.debugSourcesState = function() {
    // Try to find the Sources component instance
    const sourcesPage = document.querySelector('[class*="space-y-6"]');
    if (!sourcesPage) {
      console.error('Could not find Sources page element');
      return;
    }
    
    // Get React fiber
    const fiberKey = Object.keys(sourcesPage).find(key => key.startsWith('__reactFiber'));
    if (!fiberKey) {
      console.error('Could not find React fiber');
      return;
    }
    
    let fiber = sourcesPage[fiberKey];
    while (fiber) {
      if (fiber.memoizedState && fiber.memoizedState.memoizedState) {
        console.log('📊 Current Sources State:', fiber.memoizedState);
        break;
      }
      fiber = fiber.return;
    }
  };
  
  // Function to manually trigger state inspection
  window.inspectFormModal = function() {
    console.log('🔍 Form Modal State Inspection');
    const modalInput = document.querySelector('input[placeholder="SRC 1"]');
    if (modalInput) {
      console.log('   ID Input Value:', modalInput.value);
      
      // Try to get React props
      const fiberKey = Object.keys(modalInput).find(key => key.startsWith('__reactProps'));
      if (fiberKey) {
        console.log('   Input Props:', modalInput[fiberKey]);
      }
    } else {
      console.log('   Modal not open or input not found');
    }
  };
  
  console.log('');
  console.log('Available commands:');
  console.log('  window.debugSourcesState() - Inspect sources state');
  console.log('  window.inspectFormModal() - Inspect form modal state');
  console.log('=====================================');
})();
