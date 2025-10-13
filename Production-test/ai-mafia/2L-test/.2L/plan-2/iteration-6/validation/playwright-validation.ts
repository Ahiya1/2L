/**
 * Playwright Validation Script for Iteration 6
 * Validates transparency features in a real browser
 */

import { chromium, Browser, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:3001';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

interface ValidationResult {
  testName: string;
  status: 'PASS' | 'FAIL';
  details: string;
  screenshotPath?: string;
  errors?: string[];
}

const results: ValidationResult[] = [];

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function captureScreenshot(page: Page, name: string): Promise<string> {
  const screenshotPath = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`📸 Screenshot saved: ${name}.png`);
  return screenshotPath;
}

async function validateRoleDisplay(page: Page): Promise<ValidationResult> {
  console.log('\n🧪 Test 1: Role Display Validation');
  const errors: string[] = [];

  try {
    // Wait for player grid to load
    await page.waitForSelector('[data-testid="player-grid"], .grid', { timeout: 5000 });

    // Check for role badges
    const mafiaElements = await page.$$('[data-role="MAFIA"], .bg-red-500, .text-red-500, .border-red-500');
    const villagerElements = await page.$$('[data-role="VILLAGER"], .bg-blue-500, .text-blue-500, .border-blue-500');

    console.log(`  Found ${mafiaElements.length} Mafia indicators`);
    console.log(`  Found ${villagerElements.length} Villager indicators`);

    if (mafiaElements.length === 0) {
      errors.push('No Mafia role indicators found (expected red badges/borders)');
    }

    if (villagerElements.length === 0) {
      errors.push('No Villager role indicators found (expected blue badges/borders)');
    }

    // Check for role text
    const pageText = await page.textContent('body');
    const hasMafiaText = pageText?.toLowerCase().includes('mafia');
    const hasVillagerText = pageText?.toLowerCase().includes('villager');

    if (!hasMafiaText) {
      errors.push('No "Mafia" text found on page');
    }

    if (!hasVillagerText) {
      errors.push('No "Villager" text found on page');
    }

    const screenshotPath = await captureScreenshot(page, 'role-display');

    return {
      testName: 'Role Display',
      status: errors.length === 0 ? 'PASS' : 'FAIL',
      details: errors.length === 0
        ? `Roles visible: ${mafiaElements.length} Mafia indicators, ${villagerElements.length} Villager indicators`
        : 'Role display incomplete',
      screenshotPath,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    return {
      testName: 'Role Display',
      status: 'FAIL',
      details: 'Failed to validate role display',
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

async function validateMafiaChatPanel(page: Page): Promise<ValidationResult> {
  console.log('\n🧪 Test 2: Mafia Chat Panel Validation');
  const errors: string[] = [];

  try {
    // Wait for Night phase (check phase indicator)
    console.log('  ⏳ Waiting for Night phase (up to 60 seconds)...');

    let nightPhaseDetected = false;
    let attempts = 0;
    const maxAttempts = 12; // 60 seconds

    while (!nightPhaseDetected && attempts < maxAttempts) {
      await page.waitForTimeout(5000);
      const pageText = await page.textContent('body');
      nightPhaseDetected = pageText?.toLowerCase().includes('night') || false;

      if (nightPhaseDetected) {
        console.log('  ✓ Night phase detected');
        break;
      }

      attempts++;
      console.log(`  Attempt ${attempts}/${maxAttempts}...`);
    }

    if (!nightPhaseDetected) {
      errors.push('Night phase not detected within 60 seconds');
      return {
        testName: 'Mafia Chat Panel',
        status: 'FAIL',
        details: 'Could not reach Night phase to validate Mafia chat',
        errors
      };
    }

    // Wait a moment for Mafia chat panel to appear
    await page.waitForTimeout(3000);

    // Look for Mafia chat panel
    const mafiaPanel = await page.$('[data-testid="mafia-chat-panel"], [class*="MafiaChat"]');

    if (!mafiaPanel) {
      // Check if it's in the page HTML
      const html = await page.content();
      const hasMafiaChat = html.toLowerCase().includes('mafia') &&
                          (html.includes('chat') || html.includes('coordination'));

      if (!hasMafiaChat) {
        errors.push('Mafia chat panel not found during Night phase');
      }
    } else {
      console.log('  ✓ Mafia chat panel found');
    }

    const screenshotPath = await captureScreenshot(page, 'night-phase-mafia-chat');

    return {
      testName: 'Mafia Chat Panel',
      status: errors.length === 0 ? 'PASS' : 'FAIL',
      details: errors.length === 0
        ? 'Mafia chat panel visible during Night phase'
        : 'Mafia chat panel not detected',
      screenshotPath,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    return {
      testName: 'Mafia Chat Panel',
      status: 'FAIL',
      details: 'Failed to validate Mafia chat panel',
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

async function validatePhaseVisualization(page: Page): Promise<ValidationResult> {
  console.log('\n🧪 Test 3: Enhanced Phase Visualization');
  const errors: string[] = [];

  try {
    // Look for phase indicator
    const phaseIndicator = await page.$('[data-testid="phase-indicator"], [class*="PhaseIndicator"]');

    if (!phaseIndicator) {
      errors.push('Phase indicator not found');
    }

    // Look for phase timeline
    const phaseTimeline = await page.$('[data-testid="phase-timeline"], [class*="PhaseTimeline"]');

    if (!phaseTimeline) {
      // Check if timeline elements exist in HTML
      const html = await page.content();
      const hasTimelineMarkers = html.includes('timeline') ||
                                 (html.includes('phase') && html.includes('progression'));

      if (!hasTimelineMarkers) {
        errors.push('Phase timeline not found');
      }
    }

    const screenshotPath = await captureScreenshot(page, 'phase-visualization');

    return {
      testName: 'Enhanced Phase Visualization',
      status: errors.length === 0 ? 'PASS' : 'FAIL',
      details: errors.length === 0
        ? 'Phase visualization components detected'
        : 'Phase visualization incomplete',
      screenshotPath,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    return {
      testName: 'Enhanced Phase Visualization',
      status: 'FAIL',
      details: 'Failed to validate phase visualization',
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

async function validateConsoleErrors(page: Page): Promise<ValidationResult> {
  console.log('\n🧪 Test 4: Console Error Check');
  const consoleErrors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Let the page run for a moment
  await page.waitForTimeout(3000);

  return {
    testName: 'Console Errors',
    status: consoleErrors.length === 0 ? 'PASS' : 'FAIL',
    details: consoleErrors.length === 0
      ? 'No console errors detected'
      : `${consoleErrors.length} console errors found`,
    errors: consoleErrors.length > 0 ? consoleErrors : undefined
  };
}

async function runValidation() {
  console.log('🎭 Starting Playwright Validation for Iteration 6\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Screenshots: ${SCREENSHOTS_DIR}\n`);

  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    // Launch browser
    console.log('🚀 Launching browser...');
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();

    // Navigate to app
    console.log(`📱 Navigating to ${BASE_URL}...`);
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');

    // Take initial screenshot
    await captureScreenshot(page, '01-homepage');

    // Create game
    console.log('\n🎮 Creating game...');
    const createButton = await page.$('button:has-text("Create Game")');
    if (!createButton) {
      throw new Error('Create Game button not found');
    }
    await createButton.click();

    // Wait for navigation to game page
    await page.waitForURL('**/game/**', { timeout: 10000 });
    console.log('✓ Game created successfully');

    // Wait for game to initialize
    await page.waitForTimeout(3000);
    await captureScreenshot(page, '02-game-initialized');

    // Run validation tests
    results.push(await validateRoleDisplay(page));
    results.push(await validatePhaseVisualization(page));
    results.push(await validateConsoleErrors(page));
    results.push(await validateMafiaChatPanel(page)); // This one takes longest

  } catch (error) {
    console.error('\n❌ Validation failed:', error);
    results.push({
      testName: 'Browser Automation',
      status: 'FAIL',
      details: 'Failed to complete browser automation',
      errors: [error instanceof Error ? error.message : String(error)]
    });
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }

  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('📊 VALIDATION RESULTS');
  console.log('='.repeat(60) + '\n');

  let passCount = 0;
  let failCount = 0;

  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.testName}: ${result.status}`);
    console.log(`   ${result.details}`);
    if (result.screenshotPath) {
      console.log(`   Screenshot: ${path.basename(result.screenshotPath)}`);
    }
    if (result.errors && result.errors.length > 0) {
      result.errors.forEach(err => console.log(`   ❌ ${err}`));
    }
    console.log('');

    if (result.status === 'PASS') passCount++;
    else failCount++;
  });

  console.log('='.repeat(60));
  console.log(`Summary: ${passCount} PASS, ${failCount} FAIL`);
  console.log('='.repeat(60) + '\n');

  // Write JSON results
  const resultsPath = path.join(__dirname, 'playwright-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`Results saved to: ${resultsPath}`);

  // Exit with appropriate code
  process.exit(failCount > 0 ? 1 : 0);
}

runValidation().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
