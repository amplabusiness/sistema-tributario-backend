const express = require('express');

const app = express();

console.log('🔍 Testing imports...');

// Test if multi-empresa route can be imported
try {
  const multiEmpresaRouter = require('./src/routes/multi-empresa');
  console.log('✅ Multi-empresa route imported successfully');
} catch (error) {
  console.error('❌ Error importing multi-empresa route:', error.message);
  console.error('Stack:', error.stack);
}

// Test other dependencies
try {
  const auth = require('./src/middleware/auth');
  console.log('✅ Auth middleware imported successfully');
} catch (error) {
  console.error('❌ Error importing auth middleware:', error.message);
}

try {
  const logger = require('./src/utils/logger');
  console.log('✅ Logger imported successfully');
} catch (error) {
  console.error('❌ Error importing logger:', error.message);
}
