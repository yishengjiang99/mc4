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
        modifiedBlocks: g.getRegressionSnapshot().modifiedBlocks,
      };
    });

    // Toggle to creative and verify mode UI text.
    await page.keyboard.press('KeyG');
    await expect(page.locator('#modeLabel')).toContainText('Creative');

    // Inventory + crafting flow.
    await page.keyboard.press('KeyI');
    await expect(page.locator('#inventory.visible')).toBeVisible();
    await expect(page.locator('#craftTitle')).toContainText('2x2');

    const craftSlots = page.locator('#craftGrid .craft-slot');
    const logCell = page.locator('#invGrid .inv-cell', { hasText: 'Log' }).first();
    await expect(logCell).toBeVisible();
    await logCell.dragTo(craftSlots.first());

    const craftTarget = await page.evaluate(() => {
      const g = window.__BROWSERCRAFT__;
      const preview = g.inventory.craftPreview();
      return {
        itemId: preview ? preview.itemId : null,
        countBefore: preview ? g.inventory.getCount(preview.itemId) : 0,
      };
    });
    await page.locator('#craftBtn').click();

    await expect(page.locator('#message')).toContainText('Crafted');

    expect(craftTarget.itemId).toBeTruthy();
    const craftedItemId = craftTarget.itemId;
    await expect
      .poll(async () => {
        return await page.evaluate((targetId) => window.__BROWSERCRAFT__.inventory.getCount(targetId), craftedItemId);
      })
      .toBeGreaterThan(craftTarget.countBefore);

    await page.keyboard.press('KeyI');
    await expect(page.locator('#inventory.visible')).toHaveCount(0);

    // Place and use a crafting table, then verify 3x3 context opens.
    const craftingTableOpen = await page.evaluate(() => {
      const g = window.__BROWSERCRAFT__;
      const placeX = Math.floor(g.player.position.x) + 4;
      const placeZ = Math.floor(g.player.position.z);
      let placeY = Math.floor(g.player.position.y);

      // Find a nearby placement cell: air with a solid-ish block below.
      for (let y = Math.floor(g.player.position.y) + 4; y >= 2; y -= 1) {
        const at = g.world.getBlock(placeX, y, placeZ, true);
        const below = g.world.getBlock(placeX, y - 1, placeZ, true);
        if (at === 0 && below !== 0 && below !== 6) {
          placeY = y;
          break;
        }
      }

      g.inventory.add('minecraft:crafting_table', 1);
      g.inventory.selectedHotbar = 6; // Hotbar slot 7 is Crafting Table.
      g.targetInfo = {
        hit: { x: placeX, y: placeY - 1, z: placeZ, blockId: g.world.getBlock(placeX, placeY - 1, placeZ, true) },
        place: { x: placeX, y: placeY, z: placeZ },
        normal: { x: 0, y: 1, z: 0 },
      };
      g.tryPlaceBlock();

      const placedBlockId = g.world.getBlock(placeX, placeY, placeZ, true);
      g.targetInfo = {
        hit: { x: placeX, y: placeY, z: placeZ, blockId: placedBlockId },
        place: { x: placeX, y: placeY + 1, z: placeZ },
        normal: { x: 0, y: 1, z: 0 },
      };
      const used = g.tryUseBlock();
      return {
        used,
        inventoryOpen: g.inventoryOpen,
        craftingContext: g.craftingContext,
      };
    });
    expect(craftingTableOpen.used).toBeTruthy();
    expect(craftingTableOpen.inventoryOpen).toBeTruthy();
    expect(craftingTableOpen.craftingContext).toBe('table');
    await expect(page.locator('#craftTitle')).toContainText('3x3');

    await page.keyboard.press('KeyI');
    await expect(page.locator('#inventory.visible')).toHaveCount(0);

    // Command chat flow.
    await page.keyboard.press('Slash');
    await expect(page.locator('#chatOverlay.visible')).toBeVisible();
    await expect(page.locator('#chatInput')).toHaveValue('/');
    await page.keyboard.press('Escape');
    await expect(page.locator('#chatOverlay.visible')).toHaveCount(0);

    const spawnPoint = await page.evaluate(() => {
      const g = window.__BROWSERCRAFT__;
      g.player.position.set(11.5, 80.0, -3.5);
      g.player.velocity.set(0, 0, 0);
      g.player.updateCamera();
      return {
        x: g.player.position.x,
        y: g.player.position.y,
        z: g.player.position.z,
      };
    });

    await page.keyboard.press('Slash');
    await page.keyboard.type('setspawn');
    await page.keyboard.press('Enter');
    await expect(page.locator('#message')).toContainText('Respawn point set');

    await page.evaluate(() => {
      const g = window.__BROWSERCRAFT__;
      g.player.position.set(g.player.position.x + 17, g.player.position.y + 5, g.player.position.z + 13);
      g.player.velocity.set(0, 0, 0);
      g.player.updateCamera();
    });

    await page.keyboard.press('Slash');
    await page.keyboard.type('respawn');
    await page.keyboard.press('Enter');
    await expect
      .poll(async () => {
        return await page.evaluate((target) => {
          const p = window.__BROWSERCRAFT__.player.position;
          return Math.hypot(p.x - target.x, p.y - target.y, p.z - target.z);
        }, spawnPoint);
      })
      .toBeLessThan(0.2);

    const logsBeforeGive = await page.evaluate(() => window.__BROWSERCRAFT__.inventory.getCount('minecraft:oak_log'));
    await page.keyboard.press('Slash');
    await page.keyboard.type('give oak_log 3');
    await page.keyboard.press('Enter');
    await expect
      .poll(async () => {
        return await page.evaluate(() => window.__BROWSERCRAFT__.inventory.getCount('minecraft:oak_log'));
      })
      .toBeGreaterThan(logsBeforeGive);

    await page.keyboard.press('Slash');
    await page.keyboard.type('time night');
    await page.keyboard.press('Enter');
    const timeAfterNight = await page.evaluate(() => window.__BROWSERCRAFT__.timeOfDay);
    expect(timeAfterNight).toBeGreaterThan(0.65);
    expect(timeAfterNight).toBeLessThan(0.9);

    await page.keyboard.press('Slash');
    await page.keyboard.type('gamemode survival');
    await page.keyboard.press('Enter');
    await expect(page.locator('#modeLabel')).toContainText('Survival');

    await page.keyboard.press('Slash');
    await page.keyboard.type('gamemode creative');
    await page.keyboard.press('Enter');
    await expect(page.locator('#modeLabel')).toContainText('Creative');

    await page.keyboard.press('Slash');
    await page.keyboard.type('help');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Slash');
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('#chatInput')).toHaveValue('/help');
    await page.keyboard.press('Escape');

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
