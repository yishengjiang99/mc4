const { test, expect } = require('@playwright/test');

test.describe('BrowserCraft basic regression', () => {
  test('playthrough smoke test without JS errors', async ({ page }) => {
    const pageErrors = [];
    const consoleErrors = [];

    page.on('pageerror', (err) => {
      pageErrors.push(err.message || String(err));
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/index.html?seed=424242&test=1');

    await expect(page.locator('#stats')).toBeVisible();
    await expect
      .poll(async () => {
        return await page.evaluate(() => {
          const game = window.__BROWSERCRAFT__;
          if (!game) {
            return 'MISSING';
          }
          return `chunks=${game.world.chunks.size}|fps=${game.fpsState.fps}`;
        });
      })
      .not.toContain('MISSING');

    // Wait until chunks stream in.
    await expect
      .poll(async () => {
        return await page.evaluate(() => window.__BROWSERCRAFT__.world.chunks.size);
      })
      .toBeGreaterThan(0);

    const start = await page.evaluate(() => {
      const g = window.__BROWSERCRAFT__;
      return {
        x: g.player.position.x,
        y: g.player.position.y,
        z: g.player.position.z,
        planks: g.inventory.getCount(8),
        modifiedBlocks: g.getRegressionSnapshot().modifiedBlocks,
      };
    });

    // Toggle to creative and verify mode UI text.
    await page.keyboard.press('KeyG');
    await expect(page.locator('#modeLabel')).toContainText('Creative');

    // Inventory + crafting flow.
    await page.keyboard.press('KeyE');
    await expect(page.locator('#inventory.visible')).toBeVisible();

    const craftSlots = page.locator('#craftGrid .craft-slot');
    await craftSlots.nth(0).click();
    await craftSlots.nth(1).click();
    await page.locator('#craftBtn').click();

    await expect(page.locator('#message')).toContainText('Crafted planks');

    await expect
      .poll(async () => {
        return await page.evaluate(() => window.__BROWSERCRAFT__.inventory.getCount(8));
      })
      .toBeGreaterThan(start.planks);

    await page.keyboard.press('KeyE');
    await expect(page.locator('#inventory.visible')).toHaveCount(0);

    // Select slot and move a bit.
    await page.keyboard.press('Digit2');
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(650);
    await page.keyboard.up('KeyW');

    const moved = await page.evaluate((startPos) => {
      const g = window.__BROWSERCRAFT__;
      const p = g.player.position;
      const dx = p.x - startPos.x;
      const dz = p.z - startPos.z;
      return Math.hypot(dx, dz);
    }, { x: start.x, z: start.z });

    expect(moved).toBeGreaterThan(0.5);

    // Break and place interaction on center crosshair.
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    if (!box) {
      throw new Error('Canvas bounding box is missing');
    }

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    await page.mouse.move(centerX, centerY);
    await page.mouse.down({ button: 'left' });
    await page.waitForTimeout(700);
    await page.mouse.up({ button: 'left' });

    await page.mouse.click(centerX, centerY, { button: 'right' });
    await page.waitForTimeout(250);

    const snapshot = await page.evaluate(() => window.__BROWSERCRAFT__.getRegressionSnapshot());
    expect(snapshot.modifiedBlocks).toBeGreaterThan(start.modifiedBlocks);
    expect(snapshot.chunksLoaded).toBeGreaterThan(0);

    const filteredConsoleErrors = consoleErrors.filter(
      (text) => !/favicon|ERR_ABORTED|Failed to load resource/i.test(text)
    );

    expect(pageErrors, `Page errors: ${JSON.stringify(pageErrors, null, 2)}`).toEqual([]);
    expect(
      filteredConsoleErrors,
      `Console errors: ${JSON.stringify(filteredConsoleErrors, null, 2)}`
    ).toEqual([]);
  });
});
