#!/usr/bin/env node

/**
 * Test script for the consignor sales report API endpoint
 * Run this script after applying the database fixes to verify the API works correctly
 */

const https = require('https');
const http = require('http');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const CONSIGNOR_ID = process.env.CONSIGNOR_ID || '6400f9c4-e8ef-4f1a-8fa4-ad93c63161cb';

// Test cases
const testCases = [
  {
    name: 'Basic request without filters',
    url: `${API_BASE_URL}/api/consignors/${CONSIGNOR_ID}/sales-report?page=1&limit=20&sortBy=createdAt&sortOrder=desc`
  },
  {
    name: 'Request with date filters',
    url: `${API_BASE_URL}/api/consignors/${CONSIGNOR_ID}/sales-report?page=1&limit=10&startDate=2024-01-01&endDate=2024-12-31`
  },
  {
    name: 'Request sorting by total amount',
    url: `${API_BASE_URL}/api/consignors/${CONSIGNOR_ID}/sales-report?page=1&limit=10&sortBy=total&sortOrder=desc`
  },
  {
    name: 'Request with created_at sort',
    url: `${API_BASE_URL}/api/consignors/${CONSIGNOR_ID}/sales-report?page=1&limit=10&sortBy=created_at&sortOrder=asc`
  }
];

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            data: JSON.parse(data)
          };
          resolve(response);
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
            parseError: error.message
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function runTests() {
  console.log('🧪 Testing Consignor Sales Report API\n');
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Consignor ID: ${CONSIGNOR_ID}\n`);
  
  let passedTests = 0;
  let totalTests = testCases.length;
  
  for (const testCase of testCases) {
    console.log(`📋 Test: ${testCase.name}`);
    console.log(`   URL: ${testCase.url}`);
    
    try {
      const response = await makeRequest(testCase.url);
      
      if (response.statusCode === 200) {
        console.log(`   ✅ Status: ${response.statusCode}`);
        
        if (response.data && response.data.success) {
          console.log(`   ✅ Success flag: true`);
          
          if (response.data.data) {
            const { consignor, sales, summary, pagination } = response.data.data;
            
            console.log(`   ✅ Data structure: valid`);
            console.log(`   📊 Consignor: ${consignor?.name || 'N/A'}`);
            console.log(`   📈 Sales count: ${sales?.length || 0}`);
            console.log(`   💰 Total revenue: $${summary?.totalRevenue || 0}`);
            console.log(`   📄 Page: ${pagination?.page || 1}/${Math.ceil((pagination?.total || 0) / (pagination?.limit || 20))}`);
            
            passedTests++;
          } else {
            console.log(`   ❌ Data structure: missing data object`);
          }
        } else {
          console.log(`   ❌ Success flag: false or missing`);
          console.log(`   📄 Error: ${response.data?.error || 'Unknown error'}`);
        }
      } else {
        console.log(`   ❌ Status: ${response.statusCode}`);
        console.log(`   📄 Error: ${response.data?.error || response.data || 'Unknown error'}`);
        
        if (response.data?.details) {
          console.log(`   🔍 Details: ${response.data.details}`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log('');
  }
  
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! The API is working correctly.');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Please check the errors above.');
    process.exit(1);
  }
}

// Check if required environment variables are set
if (!API_BASE_URL) {
  console.error('❌ ERROR: API_BASE_URL environment variable is not set');
  console.log('   Example: API_BASE_URL=http://localhost:3000 node test-consignor-sales-report.js');
  process.exit(1);
}

if (!CONSIGNOR_ID) {
  console.error('❌ ERROR: CONSIGNOR_ID environment variable is not set');
  console.log('   Example: CONSIGNOR_ID=6400f9c4-e8ef-4f1a-8fa4-ad93c63161cb node test-consignor-sales-report.js');
  process.exit(1);
}

// Run the tests
runTests().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});