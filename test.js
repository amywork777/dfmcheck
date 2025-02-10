console.log("Testing Node.js environment...");
console.log("Node version:", process.version);

try {
  // Test importing a core module
  const path = require('path');
  console.log("Core module 'path' loaded successfully");
  
  // Test filesystem access
  const fs = require('fs');
  fs.writeFileSync('test.txt', 'Test file content');
  console.log("Filesystem operations working");
  
  // Test environment variables
  console.log("Environment check:", {
    nodeEnv: process.env.NODE_ENV,
    platform: process.platform,
    arch: process.arch
  });
  
  console.log("All tests passed successfully!");
} catch (error) {
  console.error("Test failed:", error);
  process.exit(1);
}
