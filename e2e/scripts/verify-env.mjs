#!/usr/bin/env node
/**
 * Verify E2E Environment Configuration
 * Run this script to check if .env.test is properly configured
 * 
 * Usage: npm run test:e2e:verify
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.test from project root
const envPath = path.resolve(__dirname, "../../.env.test");

console.log("🔍 Verifying E2E Environment Configuration\n");
console.log(`📁 Looking for .env.test at: ${envPath}\n`);

if (!existsSync(envPath)) {
  console.log("❌ .env.test file not found!\n");
  console.log("💡 To fix:");
  console.log("1. Copy env.test.example to .env.test");
  console.log("   cp env.test.example .env.test");
  console.log("2. Fill in all required variables");
  console.log("3. Run this script again to verify\n");
  process.exit(1);
}

dotenv.config({ path: envPath });

const errors = [];
const warnings = [];

// Required E2E variables
const required = [
  { key: "E2E_USERNAME_ID", description: "Test user UUID" },
  { key: "E2E_USERNAME", description: "Test user email" },
  { key: "E2E_PASSWORD", description: "Test user password" },
];

// Application variables (not validated, just shown)
const appVariables = [
  { key: "SUPABASE_URL", description: "Supabase project URL" },
  { key: "OPENROUTER_API_KEY", description: "OpenRouter API key" },
  { key: "DAILY_GENERATION_LIMIT", description: "Daily generation limit" },
  { key: "OPENROUTER_DEFAULT_MODEL", description: "OpenRouter default model" },
];

function maskValue(value) {
  if (value.length <= 8) {
    return "***";
  }
  if (value.includes("@")) {
    // Email: show first 2 chars and domain
    const [local, domain] = value.split("@");
    return `${local.substring(0, 2)}***@${domain}`;
  }
  // Other values: show first 4 and last 4 chars
  return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
}

// Check required E2E variables
console.log("✅ Required E2E variables:");
for (const { key, description } of required) {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    errors.push(`❌ Missing required variable: ${key} (${description})`);
  } else {
    console.log(`   ${key}: ${maskValue(value)}`);
  }
}

// Check application variables (informational only)
console.log("\n📋 Application variables:");
for (const { key, description } of appVariables) {
  const value = process.env[key];
  if (value && value.trim() !== "") {
    console.log(`   ${key}: ${maskValue(value)}`);
  } else {
    console.log(`   ${key}: Not set (${description})`);
  }
}

console.log("\n" + "=".repeat(60));

if (errors.length > 0) {
  console.log("\n❌ ERRORS:\n");
  errors.forEach(error => console.log(error));
}

if (warnings.length > 0) {
  console.log("\n⚠️  WARNINGS:\n");
  warnings.forEach(warning => console.log(warning));
}

const isValid = errors.length === 0;

if (isValid) {
  console.log("\n✅ All required E2E variables are properly configured!");
  console.log("Tests can be run with: npm run test:e2e");
} else {
  console.log("\n❌ Configuration is incomplete. Please fix the errors above.");
  console.log("\n💡 To fix:");
  console.log("1. Copy .env.test.example to .env.test");
  console.log("   cp .env.test.example .env.test");
  console.log("2. Fill in all required E2E variables:");
  console.log("   - E2E_USERNAME_ID (test user UUID)");
  console.log("   - E2E_USERNAME (test user email)");
  console.log("   - E2E_PASSWORD (test user password)");
  console.log("3. Run this script again to verify");
  console.log("   npm run test:e2e:verify");
}

console.log("\n" + "=".repeat(60) + "\n");

// Exit with error code if validation failed
process.exit(isValid ? 0 : 1);
