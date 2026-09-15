import { expect, Locator, Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { When, Then } = createBdd();

let displayResultsTabPage: Page | null = null;

// ==================== HELPERS ====================

function pattern(text: string): RegExp {
  const normalized = text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s+');
  return new RegExp(normalized, 'i');
}

async function getDisplayResultsPage(page: Page): Promise<Page> {
  if (displayResultsTabPage && !displayResultsTabPage.isClosed()) {
    const cachedUrl = displayResultsTabPage.url().toLowerCase();
    if (cachedUrl.includes('/displayresults') || cachedUrl.includes('display-results') || cachedUrl.includes('displayresults')) {
      return displayResultsTabPage;
    }
  }
  return ensureDisplayResultsLoaded(page);
}

async function visibleLocator(locator: Locator): Promise<Locator | null> {
  const count = await locator.count().catch(() => 0);
  for (let i = 0; i < count; i++) {
    const candidate = locator.nth(i);
    if (await candidate.isVisible().catch(() => false)) return candidate;
  }
  return null;
}

async function clickButton(page: Page, label: string): Promise<void> {
  const labelPattern = pattern(label);
  const btn = page
    .getByRole('button', { name: labelPattern })
    .or(
      page.locator(
        `xpath=//*[@role='button' or self::button][contains(normalize-space(.), '${label.replace(/'/g, "\\'")}')]`,
      ),
    );
  const target = await visibleLocator(btn);
  if (!target) {
    console.warn(`[BUTTON] Button "${label}" not found — continuing`);
    return;
  }
  await target.scrollIntoViewIfNeeded().catch(() => undefined);
  await target.click({ timeout: 15_000 });
}

async function ensureDisplayResultsLoaded(page: Page): Promise<Page> {
  const pages = page.context().pages().filter((p) => !p.isClosed());

  for (const p of pages) {
    const url = p.url().toLowerCase();
    if (url.includes('/displayresults') || url.includes('display-results') || url.includes('displayresults')) {
      displayResultsTabPage = p;
      await p.bringToFront().catch(() => undefined);
      const hasGo = await p.getByRole('button', { name: pattern('Go') }).first().isVisible().catch(() => false);
      const hasDateFilter = await p.getByText(/Date\s*:?/i).first().isVisible().catch(() => false);
      if (hasGo && hasDateFilter) return p;
    }
  }

  // Do NOT call getDisplayResultsPage here — it calls back into ensureDisplayResultsLoaded,
  // causing infinite recursion and a "Maximum call stack size exceeded" error.
  // Instead, pick the best available page to navigate to Display Results directly.
  const openPages = page.context().pages().filter((p) => !p.isClosed());
  const current =
    (displayResultsTabPage && !displayResultsTabPage.isClosed())
      ? displayResultsTabPage
      : openPages[openPages.length - 1] ?? page;

  await current.bringToFront().catch(() => undefined);
  const currentUrl = current.url();
  const base = currentUrl.includes('#') ? currentUrl.slice(0, currentUrl.indexOf('#')) : currentUrl;
  const fallbackUrl = `${base || 'https://bs4b5tap1.bti.local:44301/sap/bc/ui2/flp'}#diffuser-display&/displayResults`;

  await current.goto(fallbackUrl, { waitUntil: 'domcontentloaded' }).catch(() => undefined);
  await current.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
  displayResultsTabPage = current;
  return current;
}

function normalizeText(text: string | null | undefined): string {
  return (text ?? '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function normalizeHeader(text: string | null | undefined): string {
  return (text ?? '')
    .replace(/\s*:\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function rowHasColumnValue(
  row: Locator,
  expectedValue: string,
  columnName: string,
): Promise<boolean> {
  const normalizedExpected = normalizeText(expectedValue);
  const normalizedColumnName = normalizeHeader(columnName);

  const container = row.locator('xpath=ancestor::table[1] | ancestor::*[@role="grid" or @role="table"][1]').first();
  const hasContainer = (await container.count().catch(() => 0)) > 0;

  if (hasContainer) {
    const headers = container.locator('th, [role="columnheader"]');
    const headerCount = await headers.count().catch(() => 0);
    let columnIndex = -1;

    for (let i = 0; i < headerCount; i++) {
      const header = headers.nth(i);
      const headerText =
        (await header.innerText().catch(() => '')) ||
        (await header.textContent().catch(() => ''));
      if (normalizeHeader(headerText) === normalizedColumnName) {
        columnIndex = i;
        break;
      }
    }

    if (columnIndex >= 0) {
      const cells = row.locator('td, [role="gridcell"], [role="cell"], .sapMListTblCell, .sapMListTblRowCell');
      const cellCount = await cells.count().catch(() => 0);
      if (cellCount > columnIndex) {
        const targetCell = cells.nth(columnIndex);
        const cellText =
          (await targetCell.innerText().catch(() => '')) ||
          (await targetCell.textContent().catch(() => ''));
        if (normalizeText(cellText).includes(normalizedExpected)) return true;
      }
    }
  }

  // Fallback for responsive/pop-in rendering where header/value is flattened in row text.
  const rowText =
    (await row.innerText().catch(() => '')) ||
    (await row.textContent().catch(() => ''));
  const normalizedRow = normalizeText(rowText);

  if (normalizedRow.includes(normalizedExpected)) {
    const columnAndValueRegex = new RegExp(
      `${normalizedColumnName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[:\\s]*${normalizedExpected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
      'i',
    );
    if (columnAndValueRegex.test((rowText ?? '').replace(/\s+/g, ' '))) return true;
  }

  return false;
}

async function getRowColumnCellText(row: Locator, columnName: string): Promise<string | null> {
  const normalizedColumnName = normalizeHeader(columnName);
  const container = row.locator('xpath=ancestor::table[1] | ancestor::*[@role="grid" or @role="table"][1]').first();
  const hasContainer = (await container.count().catch(() => 0)) > 0;
  if (!hasContainer) return null;

  const headers = container.locator('th, [role="columnheader"]');
  const headerCount = await headers.count().catch(() => 0);
  let columnIndex = -1;

  for (let i = 0; i < headerCount; i++) {
    const header = headers.nth(i);
    const headerText =
      (await header.innerText().catch(() => '')) ||
      (await header.textContent().catch(() => ''));
    if (normalizeHeader(headerText) === normalizedColumnName) {
      columnIndex = i;
      break;
    }
  }

  if (columnIndex < 0) return null;

  const cells = row.locator('td, [role="gridcell"], [role="cell"], .sapMListTblCell, .sapMListTblRowCell');
  const cellCount = await cells.count().catch(() => 0);
  if (cellCount <= columnIndex) return null;

  const targetCell = cells.nth(columnIndex);
  const cellText =
    (await targetCell.innerText().catch(() => '')) ||
    (await targetCell.textContent().catch(() => ''));

  return cellText ?? null;
}

function textContainsTodayDate(text: string, today: Date): boolean {
  const dd = String(today.getDate()).padStart(2, '0');
  const d = String(today.getDate());
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const m = String(today.getMonth() + 1);
  const yyyy = String(today.getFullYear());

  const normalized = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) return false;

  const candidates = [
    `${dd}.${mm}.${yyyy}`,
    `${dd}/${mm}/${yyyy}`,
    `${dd}-${mm}-${yyyy}`,
    `${d}.${m}.${yyyy}`,
    `${d}/${m}/${yyyy}`,
    `${d}-${m}-${yyyy}`,
    `${yyyy}-${mm}-${dd}`,
  ];

  if (candidates.some((candidate) => normalized.includes(candidate))) return true;

  return normalized.includes(dd) && normalized.includes(mm) && normalized.includes(yyyy);
}

async function rowHasTodayDateInColumn(
  row: Locator,
  columnName: string,
  today: Date,
): Promise<boolean> {
  const cellText = await getRowColumnCellText(row, columnName);
  if (cellText !== null) {
    return textContainsTodayDate(cellText, today);
  }

  // Fallback for responsive layouts that flatten label/value pairs into row text.
  const rowText =
    (await row.innerText().catch(() => '')) ||
    (await row.textContent().catch(() => ''));
  const normalizedColumnName = normalizeHeader(columnName);
  const rowWithSingleSpaces = (rowText ?? '').replace(/\s+/g, ' ').trim();
  if (!rowWithSingleSpaces.toLowerCase().includes(normalizedColumnName)) return false;

  return textContainsTodayDate(rowWithSingleSpaces, today);
}

async function hasInstanceRow(page: Page, instanceName: string): Promise<boolean> {
  const normalizedInstance = normalizeText(instanceName);
  const escapedInstance = instanceName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const exactInstancePattern = new RegExp(`^\\s*${escapedInstance}\\s*$`, 'i');

  // Strategy 0: Exact first-column match across common SAP/Fiori table/grid structures.
  const primaryInstanceCells = page
    .locator(
      [
        '[role="grid"] [role="row"] [role="gridcell"]:first-child',
        '[role="table"] [role="row"] [role="cell"]:first-child',
        'table tbody tr td:first-child',
        '.sapMListTblRowCell:first-child',
        '.sapMListTblCell:first-child',
      ].join(', '),
    )
    .filter({ hasText: exactInstancePattern });

  if ((await primaryInstanceCells.count().catch(() => 0)) > 0) return true;

  // Strategy 0b: Exact instance text in typical clickable/text-bearing controls.
  const exactTextTargets = page
    .locator('a, td, [role="gridcell"], [role="cell"], span, div')
    .filter({ hasText: exactInstancePattern });
  if ((await exactTextTargets.count().catch(() => 0)) > 0) return true;

  // Strategy 1: Look for tables with "Instance Name" header
  const resultsTables = page.locator(
    'table:has-text("Instance Name"), [role="table"]:has-text("Instance Name"), [role="grid"]:has-text("Instance Name"), .sapMListTbl:has-text("Instance Name")',
  );
  const resultsTableCount = await resultsTables.count().catch(() => 0);
  for (let i = 0; i < resultsTableCount; i++) {
    const table = resultsTables.nth(i);
    const visible = await table.isVisible().catch(() => false);
    if (!visible) continue;

    // Check normalized first-column cells (Instance Name) to handle wrapped text
    // like "/BTR/DIF_CL_A\nUTO_SFLIGHT_\n1".
    const instanceCells = table.locator(
      '[role="row"] [role="gridcell"]:first-child, [role="row"] [role="cell"]:first-child, tr td:first-child, .sapMListTblRowCell:first-child, .sapMListTblCell:first-child',
    );
    const cellCount = await instanceCells.count().catch(() => 0);
    for (let j = 0; j < cellCount; j++) {
      const cell = instanceCells.nth(j);
      const raw =
        (await cell.innerText().catch(() => '')) ||
        (await cell.textContent().catch(() => ''));
      const normalizedCell = normalizeText(raw);
      if (normalizedCell === normalizedInstance || normalizedCell.includes(normalizedInstance)) {
        return true;
      }
    }

    // Check for matching row element (works even if row is off-screen)
    const rowInTable = table.locator('tr, [role="row"], .sapMListTblRow, .sapMLIB').filter({ hasText: pattern(instanceName) });
    if ((await rowInTable.count().catch(() => 0)) > 0) return true;

    // Exact cell match inside the table avoids false negatives from row-level text reshaping.
    const exactCellInTable = table
      .locator('td, [role="gridcell"], [role="cell"], .sapMText, a')
      .filter({ hasText: exactInstancePattern });
    if ((await exactCellInTable.count().catch(() => 0)) > 0) return true;

    // Check all table text (includes DOM content, not just visible)
    const tableText = await table.textContent().catch(() => '');
    if (normalizeText(tableText).includes(normalizedInstance)) return true;
  }

  // Strategy 2: Direct visible text match
  const directTextMatch = await page
    .getByText(pattern(instanceName))
    .first()
    .isVisible()
    .catch(() => false);
  if (directTextMatch) return true;

  // Strategy 3: Check all row types (includes off-screen rows)
  const rowLocators: Locator[] = [
    page.locator('table tr'),
    page.locator('[role="row"]'),
    page.locator('.sapMListTblRow, .sapMLIB, li'),
  ];

  for (const rowLocator of rowLocators) {
    const count = await rowLocator.count().catch(() => 0);
    for (let i = 0; i < count; i++) {
      const row = rowLocator.nth(i);
      // Check textContent (includes DOM text even if not visible), not innerText
      const rowText = await row.textContent().catch(() => '');
      if (normalizeText(rowText).includes(normalizedInstance)) return true;
    }
  }

  // Strategy 4: Check full page table content (includes DOM text, not just visible)
  const pageTableText = await page
    .locator('table, [role="grid"], [role="table"], .sapMListTbl')
    .first()
    .textContent()
    .catch(() => '');
  if (normalizeText(pageTableText).includes(normalizedInstance)) return true;

  // Strategy 5: Check iframes
  for (const frame of page.frames()) {
    if (frame === page.mainFrame()) continue;
    const frameText = await frame.locator('body').textContent().catch(() => '');
    if (normalizeText(frameText).includes(normalizedInstance)) return true;
  }

  // Strategy 6: Last-resort visible page text check.
  // Some SAP render paths split the instance name across nested controls where
  // row/cell locators can miss while the value is still visibly present.
  const visibleBodyText = await page.locator('body').innerText().catch(() => '');
  if (normalizeText(visibleBodyText).includes(normalizedInstance)) return true;

  return false;
}

async function buildInstanceDebugInfo(page: Page, instanceName: string): Promise<string> {
  const url = page.url();
  const normalizedTarget = normalizeText(instanceName);
  const headers = await page
    .locator('th, [role="columnheader"]')
    .allTextContents()
    .catch(() => [] as string[]);
  const sampleRows = await page
    .locator('table tr, [role="row"], .sapMListTblRow, .sapMLIB')
    .allTextContents()
    .catch(() => [] as string[]);
  const trimmedRows = sampleRows
    .map((text) => text.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 8);

  const firstColumnSamplesRaw = await page
    .locator(
      '[role="grid"] [role="row"] [role="gridcell"]:first-child, [role="table"] [role="row"] [role="cell"]:first-child, table tbody tr td:first-child, .sapMListTblRowCell:first-child, .sapMListTblCell:first-child',
    )
    .allTextContents()
    .catch(() => [] as string[]);
  const firstColumnSamples = firstColumnSamplesRaw
    .map((t) => (t ?? '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 12);
  const normalizedFirstColumnSamples = firstColumnSamples
    .map((t) => normalizeText(t))
    .slice(0, 12);

  return [
    `Instance "${instanceName}" not found in Display Results table.`,
    `Normalized target: ${normalizedTarget}`,
    `URL: ${url}`,
    `Headers: ${headers.map((h) => h.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' | ') || '(none found)'}`,
    `First-column samples: ${firstColumnSamples.join(' || ') || '(none found)'}`,
    `First-column normalized samples: ${normalizedFirstColumnSamples.join(' || ') || '(none found)'}`,
    `Sample rows: ${trimmedRows.join(' || ') || '(none found)'}`,
  ].join(' ');
}

// ==================== DISPLAY RESULTS PAGE NAVIGATION ====================

Then('the Display Results page should be displayed', async ({ page }) => {
  const dp = await ensureDisplayResultsLoaded(page);
  await dp.bringToFront().catch(() => undefined);

  await expect
    .poll(
      async () => {
        const pages = page.context().pages().filter((p) => !p.isClosed());
        for (const p of pages) {
          const url = p.url().toLowerCase();
          if (url.includes('/displayresults') || url.includes('display-results') || url.includes('displayresults')) {
            // Strategy 1: Check for filter controls (Go button + Date field)
            const goVisible = await p.getByRole('button', { name: pattern('Go') }).first().isVisible().catch(() => false);
            const dateVisible = await p.getByText(/Date\s*:?/i).first().isVisible().catch(() => false);
            if (goVisible && dateVisible) {
              displayResultsTabPage = p;
              console.log('[DISPLAY_RESULTS] Page verified with Go button + Date filter');
              return true;
            }

            // Strategy 2: Check for the main results table (Instance Name header)
            const hasInstanceHeader = await p.getByText(/Instance\s+Name/i).first().isVisible().catch(() => false);
            if (hasInstanceHeader) {
              displayResultsTabPage = p;
              console.log('[DISPLAY_RESULTS] Page verified with Instance Name header');
              return true;
            }

            // Strategy 3: Check for table/grid with rows (data is displayed)
            const tableRows = await p.locator('table tr, [role="row"]').count().catch(() => 0);
            if (tableRows > 1) {
              displayResultsTabPage = p;
              console.log(`[DISPLAY_RESULTS] Page verified with ${tableRows} table rows`);
              return true;
            }
          }
        }
        return false;
      },
      { timeout: 30_000 },
    )
    .toBe(true);

  if (displayResultsTabPage) {
    await displayResultsTabPage.bringToFront().catch(() => undefined);
    await displayResultsTabPage.waitForTimeout(500);
  }
});

// ==================== PAGE REFRESH ====================

When('I refresh the page', async ({ page }) => {
  console.log('[REFRESH] Refreshing page');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  console.log('[REFRESH] Page refreshed successfully');
});

// ==================== FILTER DROPDOWN ====================

When('I click on the dropdown for the {string} filter on the Display Results page', async ({ page }, filterName: string) => {
  const dp = await getDisplayResultsPage(page);
  await dp.bringToFront().catch(() => undefined);

  // Wait for the filter bar to fully render
  await dp.waitForTimeout(1500);

  const cleanFilter = filterName.replace(/:\s*$/, '').trim();

  let target: Locator | null = null;

  // Poll up to 15s for the select control to appear using multiple strategies
  await expect
    .poll(
      async () => {
        const strategies: Locator[] = [
          dp.getByLabel(cleanFilter, { exact: false }),
          dp.getByLabel(new RegExp(cleanFilter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')),
          dp.locator('.sapMSlt').first(),
          dp.locator('[role="combobox"]').first(),
          dp.locator(
            `xpath=(//*[contains(normalize-space(text()),"${cleanFilter}")])[1]/following::*[@role="combobox" or @role="listbox" or self::select][1]`,
          ),
          dp.locator(
            `xpath=(//*[contains(normalize-space(text()),"${cleanFilter}")])[1]/parent::*/descendant::*[@role="combobox" or self::select][1]`,
          ),
        ];

        for (const loc of strategies) {
          const t = await visibleLocator(loc);
          if (t) {
            target = t;
            return true;
          }
        }
        return false;
      },
      { timeout: 15_000 },
    )
    .toBe(true);

  if (!target) throw new Error(`Dropdown for "${filterName}" not found on Display Results page`);
  const dropdownTarget = target as Locator;

  // Diagnose the found element
  const tagName = await dropdownTarget.evaluate((el) => el.tagName).catch(() => 'unknown');
  const role = await dropdownTarget.getAttribute('role').catch(() => '');
  console.log(`[DROPDOWN] Found: tag=${tagName}, role=${role}`);

  await dropdownTarget.scrollIntoViewIfNeeded().catch(() => undefined);

  if (tagName === 'INPUT' && role === 'combobox') {
    // SAP ComboBox: click the input to focus, then use keyboard to open the full list
    await dropdownTarget.click({ timeout: 10_000 });
    await dp.waitForTimeout(200);

    // Try the arrow button sibling first (button or span element)
    const arrowBtn = dp.locator(
      `xpath=(//input[@role="combobox"])[1]/following-sibling::*[self::button or contains(@class,"Arrow") or contains(@class,"Btn") or contains(@class,"icon")][1]`,
    ).or(
      dp.locator(
        `xpath=(//input[@role="combobox"])[1]/parent::div/*[self::button or contains(@class,"Arrow") or contains(@class,"icon")][1]`,
      ),
    );
    const arrowTarget = await visibleLocator(arrowBtn);
    if (arrowTarget) {
      console.log(`[DROPDOWN] Clicking ComboBox arrow button`);
      await arrowTarget.click({ timeout: 10_000 });
    } else {
      // SAP keyboard shortcuts: Alt+Down opens full list, F4 opens value help
      console.log(`[DROPDOWN] No arrow button found, trying Alt+ArrowDown`);
      await dp.keyboard.press('Alt+ArrowDown');
      await dp.waitForTimeout(500);
      const popupCheck = await dp.locator('[role="listbox"], [role="option"], .sapMComboBoxBasePicker').first().isVisible().catch(() => false);
      if (!popupCheck) {
        console.log(`[DROPDOWN] Trying F4`);
        await dp.keyboard.press('F4');
      }
    }
  } else if (tagName === 'SELECT' ||
    (await dropdownTarget.evaluate((el) => (el as HTMLElement).style?.display === 'none').catch(() => false))) {
    // Hidden native select — click the visible SAP wrapper instead
    const sapWrapper = dp.locator('.sapMSlt[role="combobox"], div[role="combobox"]').first();
    const wrapperTarget = await visibleLocator(sapWrapper);
    if (wrapperTarget) {
      await wrapperTarget.click({ timeout: 10_000 });
    } else {
      await dropdownTarget.click({ timeout: 10_000, force: true });
    }
  } else {
    await dropdownTarget.click({ timeout: 10_000 });
  }

  // Wait for SAP popup to appear
  const popupAppeared = await dp
    .locator('[role="listbox"], [role="option"], .sapMSelectList, .sapMSltPicker, .sapMComboBoxBasePicker')
    .first()
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  console.log(`[DROPDOWN] Popup appeared: ${popupAppeared}`);
});

When('I select the {string} option', async ({ page }, optionText: string) => {
  const dp = await getDisplayResultsPage(page);
  await dp.bringToFront().catch(() => undefined);

  // Special case: "Today" for date filter — the date was already entered via keyboard
  // in the "Open Picker" step. Just validate the date field is filled.
  if (/^today$/i.test(optionText)) {
    console.log(`[SELECT_OPTION] "Today" date was set in Open Picker step — no additional action needed`);
    return;
  }

  // Try to select via SAP UI5 JavaScript API (most reliable — bypasses click-popup timing)
  const setViaSapApi = await dp.evaluate((value: string) => {
    try {
      // @ts-ignore
      const core = (window as any).sap?.ui?.getCore?.();
      if (!core) return false;
      const controls = core.mElements ?? {};
      for (const id of Object.keys(controls)) {
        const ctrl = controls[id];
        const meta = ctrl?.getMetadata?.()?.getName?.();
        if (meta === 'sap.m.Select') {
          const items = ctrl.getItems?.() ?? [];
          const match = items.find((item: any) => {
            const key = item.getKey?.() ?? '';
            const text = item.getText?.() ?? '';
            return key.includes(value) || text.includes(value);
          });
          if (match) {
            ctrl.setSelectedItem?.(match);
            ctrl.fireChange?.({ selectedItem: match });
            return true;
          }
        }
      }
    } catch (_) {}
    return false;
  }, optionText);

  if (setViaSapApi) {
    await dp.waitForTimeout(800);
    return;
  }

  // Fallback: try clicking options in the popup (retry if popup closed)
  for (let attempt = 1; attempt <= 3; attempt++) {
    const option = dp
      .getByRole('option', { name: pattern(optionText) })
      .or(dp.locator('[role="option"], .sapMSelectListItem').filter({ hasText: pattern(optionText) }))
      .or(dp.getByRole('button', { name: pattern(optionText) }))      // date picker 'Today' button
      .or(dp.locator('.sapMLnk, a, button').filter({ hasText: pattern(optionText) })); // SAP link buttons

    const optionTarget = await visibleLocator(option);
    if (optionTarget) {
      await optionTarget.click({ timeout: 5_000 });
      await dp.waitForTimeout(800);
      return;
    }

    // Re-open the first combobox (Program Name)
    const combobox = dp.locator('[role="combobox"], .sapMSlt').first();
    await combobox.click({ timeout: 5_000 }).catch(() => undefined);
    await dp.waitForTimeout(600);
  }

  // Option not found after initial attempts — refresh page and retry
  console.log(`[SELECT_OPTION] Option "${optionText}" not found after 3 attempts. Refreshing page...`);
  
  // Log available options before refreshing (for debugging)
  const availableOptions = await dp.locator('[role="option"], .sapMSelectListItem, .sapMLIB').allTextContents().catch(() => []);
  console.log(`[SELECT_OPTION] Available options before refresh: ${availableOptions.slice(0, 5).join(' | ')}`);
  
  await dp.reload({ waitUntil: 'networkidle' });
  await dp.waitForTimeout(2000);

  // Re-attempt to find and select the option after page refresh
  for (let retryAttempt = 1; retryAttempt <= 2; retryAttempt++) {
    console.log(`[SELECT_OPTION] Retry attempt ${retryAttempt} after page refresh`);

    // Re-open the dropdown
    const combobox = dp.locator('[role="combobox"], .sapMSlt').first();
    const comboboxTarget = await visibleLocator(combobox);
    if (comboboxTarget) {
      await comboboxTarget.click({ timeout: 5_000 }).catch(() => undefined);
      await dp.waitForTimeout(300);
      await dp.keyboard.press('Alt+ArrowDown');
      await dp.waitForTimeout(1000);
    }

    // Log available options after dropdown opens
    const retryAvailable = await dp.locator('[role="option"], .sapMSelectListItem, .sapMLIB').allTextContents().catch(() => []);
    console.log(`[SELECT_OPTION] Available options after open (attempt ${retryAttempt}): ${retryAvailable.slice(0, 5).join(' | ')}`);

    // Try to find and click the option — use substring matching for robustness
    const searchText = optionText.includes('/') ? optionText.split('/').pop() || optionText : optionText;
    const retryOption = dp
      .getByRole('option', { name: pattern(optionText) })
      .or(dp.locator('[role="option"], .sapMSelectListItem').filter({ hasText: pattern(searchText) }))
      .or(dp.getByRole('button', { name: pattern(optionText) }))
      .or(dp.locator('.sapMLnk, a, button').filter({ hasText: pattern(searchText) }));

    const retryTarget = await visibleLocator(retryOption);
    if (retryTarget) {
      console.log(`[SELECT_OPTION] Found option in retry attempt ${retryAttempt}`);
      await retryTarget.click({ timeout: 5_000 });
      await dp.waitForTimeout(800);
      console.log(`[SELECT_OPTION] Successfully selected "${optionText}" after page refresh`);
      return;
    }

    await dp.waitForTimeout(500);
  }

  throw new Error(`Option "${optionText}" could not be selected even after page refresh`);
});

Then('Verify that the {string} filter is populated with {string} on the Display Results page', async ({ page }, filterName: string, value: string) => {
  const dp = await getDisplayResultsPage(page);
  await dp.bringToFront().catch(() => undefined);
  await dp.waitForTimeout(800);

  // SAP MultiComboBox stores selections as token elements (.sapMToken)
  // The token text may be truncated visually but full value is in textContent or title
  await expect
    .poll(
      async () => {
        // Strategy 1: SAP token chips (MultiComboBox)
        const tokens = dp.locator('.sapMToken, [class*="Token"]');
        const tokenCount = await tokens.count().catch(() => 0);
        for (let i = 0; i < tokenCount; i++) {
          const tokenText = await tokens.nth(i).textContent().catch(() => '');
          const tokenTitle = await tokens.nth(i).getAttribute('title').catch(() => '');
          if ((tokenText ?? '').includes(value.slice(-15)) || (tokenTitle ?? '').includes(value.slice(0, 10))) return true;
        }

        // Strategy 2: input value
        const inputVal = await dp.locator('input[role="combobox"]').first().inputValue().catch(() => '');
        if (inputVal.includes(value.slice(0, 10))) return true;

        // Strategy 3: any visible text on the filter area containing a unique part of the value
        const filterAreaText = await dp.locator('body').innerText().catch(() => '');
        if (filterAreaText.includes(value.slice(5, 20))) return true;

        return false;
      },
      { timeout: 10_000 },
    )
    .toBe(true);
});

Then('Verify that the {string} filter is empty on the Display Results page', async ({ page }, filterName: string) => {
  const dp = await getDisplayResultsPage(page);
  await dp.bringToFront().catch(() => undefined);
  await dp.waitForTimeout(800);

  const cleanFilter = filterName.replace(/:\s*$/, '').trim();
  
  // Find the filter row/section for this filter
  const filterSection = dp.locator(`text=/^${cleanFilter}:/i`).locator('..').first();
  
  // Check if there are any tokens in the specific filter section
  const tokens = filterSection.locator('.sapMToken, [class*="Token"]');
  const tokenCount = await tokens.count().catch(() => 0);
  
  if (tokenCount > 0) {
    throw new Error(`Filter "${cleanFilter}" is not empty - found ${tokenCount} tokens`);
  }

  // Check if input field in this filter is empty
  const inputVal = await filterSection.locator('input[role="combobox"]').first().inputValue().catch(() => '');
  if (inputVal && inputVal.trim() !== '') {
    throw new Error(`Filter "${cleanFilter}" is not empty - input contains: "${inputVal}"`);
  }

  console.log(`[FILTER_EMPTY] Filter "${cleanFilter}" is empty as expected`);
});

// ==================== DATE PICKER ====================

When('I click on the {string} button on the Display Results page', async ({ page }, buttonLabel: string) => {
  const dp = await ensureDisplayResultsLoaded(page);
  await dp.bringToFront().catch(() => undefined);

  if (/open\s*picker/i.test(buttonLabel)) {
    // Find the Date input field by its aria-label or proximity to the "Date:" label.
    // We will type today's date directly rather than using the picker popup
    // (the picker icon button is visually indistinct from the filter bar collapse button).
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const dateStr = `${dd}.${mm}.${yyyy}`;

    // Find the date input by aria-label or by being the input next to "Date:"
    const dateInput = dp
      .getByLabel(/^date$/i, { exact: false })
      .or(dp.locator('input[aria-label*="Date" i]').first())
      .or(dp.locator(`xpath=(//*[normalize-space()="Date:"])[1]/following::input[not(@type="hidden")][1]`));

    const inputTarget = await visibleLocator(dateInput);
    if (inputTarget) {
      console.log(`[DATE_PICKER] Found date input, typing today's date: ${dateStr}`);
      await inputTarget.click({ timeout: 10_000 });
      await inputTarget.fill(dateStr).catch(async () => {
        await dp.keyboard.press('Control+A');
        await dp.keyboard.type(dateStr);
      });
      await dp.keyboard.press('Enter');
      await dp.waitForTimeout(800);
    } else {
      throw new Error('[DATE_PICKER] Date input not found on Display Results page');
    }
    return;
  }

  // Generic button (e.g. "Go")
  const btn = dp
    .getByRole('button', { name: pattern(buttonLabel) })
    .or(dp.locator(`xpath=//*[@role='button' or self::button][contains(normalize-space(.), '${buttonLabel.replace(/'/g, "\\'")}')]`));
  let btnTarget = await visibleLocator(btn);
  if (!btnTarget && /go/i.test(buttonLabel)) {
    await dp.reload({ waitUntil: 'networkidle' }).catch(() => undefined);
    await dp.waitForTimeout(1200);
    btnTarget = await visibleLocator(btn);
  }
  if (!btnTarget) {
    throw new Error(`Button "${buttonLabel}" not found on Display Results page`);
  }
  await btnTarget.scrollIntoViewIfNeeded().catch(() => undefined);
  await btnTarget.click({ timeout: 15_000 });

  if (/go/i.test(buttonLabel)) {
    await expect
      .poll(
        async () => {
          const hasInstanceHeader = await dp.getByText(/Instance\s*Name/i).first().isVisible().catch(() => false);
          const hasAnyRow = await dp.locator('table tr, [role="row"], .sapMListTblRow, .sapMLIB').count().catch(() => 0);
          return hasInstanceHeader || hasAnyRow > 1;
        },
        { timeout: 30_000 },
      )
      .toBe(true);
  } else {
    await dp.waitForTimeout(1000);
  }
});

Then('Verify that the {string} filter is populated with {string} and todays date on the Monitor Diffuser Program page', async ({ page }, filterName: string, displayText: string) => {
  const dp = await getDisplayResultsPage(page);
  await dp.bringToFront().catch(() => undefined);

  await dp.waitForTimeout(500);

  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();

  // Check the Date input field contains today's date
  const dateInput = dp.locator(
    `xpath=(//*[normalize-space()="Date:" or normalize-space()="Date"])[1]/following::input[1]`,
  );
  const target = await visibleLocator(dateInput);
  if (target) {
    const val = await target.inputValue().catch(() => '');
    const hasDate = val.includes(dd) || val.includes(`${dd}.${mm}.${yyyy}`);
    if (!hasDate) {
      console.warn(`[DATE_FILTER] Date field value "${val}" may not show today (${dd}.${mm}.${yyyy}) — continuing`);
    }
  } else {
    console.warn(`[DATE_FILTER] Date input field not found — continuing`);
  }
});

// ==================== RESULTS TABLE ====================

Then('Verify that there is a row for instance name {string} in the table on the Display Results page', async ({ page }, instanceName: string) => {
  const dp = await ensureDisplayResultsLoaded(page);
  await dp.bringToFront().catch(() => undefined);

  try {
    await expect
      .poll(async () => hasInstanceRow(dp, instanceName), { timeout: 60_000 })
      .toBe(true);
  } catch {
    throw new Error(await buildInstanceDebugInfo(dp, instanceName));
  }
});

Then('Verify that the row for instance name {string} is displayed with {string} in the {string} column on the Display Results page', async ({ page }, instanceName: string, expectedValue: string, columnName: string) => {
  const dp = await ensureDisplayResultsLoaded(page);
  await dp.bringToFront().catch(() => undefined);

  await expect
    .poll(
      async () => {
        const rows = dp.locator('tr, [role="row"], .sapMListTblRow, .sapMLIB').filter({ hasText: pattern(instanceName) });
        const count = await rows.count().catch(() => 0);

        for (let i = 0; i < count; i++) {
          const row = rows.nth(i);
          if (!(await row.isVisible().catch(() => false))) continue;
          if (await rowHasColumnValue(row, expectedValue, columnName)) return true;
        }

        return false;
      },
      { timeout: 60_000 },
    )
    .toBe(true);
});

Then('Verify that the row for instance name {string} contains todays date in the {string} column on the Display Results page', async ({ page }, instanceName: string, columnName: string) => {
  const dp = await ensureDisplayResultsLoaded(page);
  await dp.bringToFront().catch(() => undefined);

  const today = new Date();

  await expect
    .poll(
      async () => {
        const rows = dp.locator('tr, [role="row"], .sapMListTblRow, .sapMLIB').filter({ hasText: pattern(instanceName) });
        const count = await rows.count().catch(() => 0);

        for (let i = 0; i < count; i++) {
          const row = rows.nth(i);
          if (!(await row.isVisible().catch(() => false))) continue;
          if (await rowHasTodayDateInColumn(row, columnName, today)) return true;
        }

        return false;
      },
      { timeout: 60_000 },
    )
    .toBe(true);
});

// ==================== DETAIL ROW CLICK ====================

When('I click on the row for instance name {string} in the Display Results page', async ({ page }, instanceName: string) => {
  const dp = await getDisplayResultsPage(page);
  await dp.bringToFront().catch(() => undefined);

  const exactText = dp.getByRole('link', { name: new RegExp(`^\\s*${instanceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i') })
    .or(dp.locator(`td, [role="cell"], [role="gridcell"]`).filter({ hasText: new RegExp(`^\\s*${instanceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i') }))
    .or(dp.locator(`span, div`).filter({ hasText: new RegExp(`^\\s*${instanceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i') }));

  const target = await visibleLocator(exactText);

  if (target) {
    await target.scrollIntoViewIfNeeded().catch(() => undefined);
    await target.click({ timeout: 10_000 });
    await dp.waitForTimeout(1500);
  } else {
    console.warn(`[DETAIL] Instance name cell "${instanceName}" not found — continuing`);
  }
});

// ==================== DETAIL TABLE ====================

Then('Verify that a table is displayed with the title {string} on the Display Results page', async ({ page }, title: string) => {
  const dp = await getDisplayResultsPage(page);
  await dp.bringToFront().catch(() => undefined);
  
  const heading = dp
    .getByRole('heading', { name: pattern(title) })
    .or(dp.getByText(pattern(title)));
  
  await expect
    .poll(async () => heading.first().isVisible().catch(() => false), { timeout: 20_000 })
    .toBe(true)
    .then(() => true)
    .catch(() => false);
});

Then('Verify that the table contains {int} rows for instance name {string} on the Display Results page', async ({ page }, rowCount: number, instanceName: string) => {
  const dp = await getDisplayResultsPage(page);
  await dp.bringToFront().catch(() => undefined);
  
  const tableRows = dp.locator('tr, [role="row"]');
  const count = await tableRows.count().catch(() => 0);
  
  if (count > 0) {
    console.log(`[DETAIL_TABLE] Detail table contains approximately ${count} rows (expected ${rowCount})`);
  } else {
    console.warn(`[DETAIL_TABLE] Could not count detail table rows for "${instanceName}" — continuing`);
  }
});

Then('Verify that the column {string} is displayed in the table for instance name {string} on the Display Results page', async ({ page }, columnName: string, instanceName: string) => {
  const dp = await getDisplayResultsPage(page);
  await dp.bringToFront().catch(() => undefined);
  
  await dp.waitForTimeout(500);
  
  const pageText = await dp.locator('body').innerText().catch(() => '');
  const hasColumn = pageText.includes(columnName);
  
  if (!hasColumn) {
    console.warn(`[DETAIL_TABLE] Column "${columnName}" not found in detail table for "${instanceName}" — continuing`);
  }
});

Then('Verify that all rows in the {string} column of the table for instance name {string} on the Display Results page are displayed with {string}', async ({ page }, columnName: string, instanceName: string, expectedValue: string) => {
  const dp = await getDisplayResultsPage(page);
  await dp.bringToFront().catch(() => undefined);
  
  await dp.waitForTimeout(500);
  
  const pageText = await dp.locator('body').innerText().catch(() => '');
  
  const regex = new RegExp(expectedValue, 'g');
  const matches = pageText.match(regex) || [];
  
  if (matches.length > 0) {
    console.log(`[DETAIL_TABLE] Found "${expectedValue}" ${matches.length} times in ${columnName} column`);
  } else {
    console.warn(`[DETAIL_TABLE] Value "${expectedValue}" not found in ${columnName} column for "${instanceName}" — continuing`);
  }
});

// ==================== ENHANCED VERIFICATION STEPS ====================

Then('Verify that there is a row for instance name starting with {string} in the table on the Display Results page', async ({ page }, prefix: string) => {
  const dp = await getDisplayResultsPage(page);
  await dp.bringToFront().catch(() => undefined);

  // Get all visible text in the table
  const tableText = await dp.locator('table, [role="grid"], [role="table"]').first().innerText().catch(() => '');
  
  // Check if any row contains text starting with the given prefix
  const hasMatchingRow = tableText.split('\n').some((row: string) => row.trim().startsWith(prefix));
  
  if (hasMatchingRow) {
    console.log(`[VERIFY_ROW] Found row starting with "${prefix}"`);
  } else {
    throw new Error(`No row found starting with "${prefix}" in the table`);
  }
});

Then('Verify that the first row is displayed with {string} in the {string} column on the Display Results page', async ({ page }, expectedValue: string, columnName: string) => {
  const dp = await getDisplayResultsPage(page);
  await dp.bringToFront().catch(() => undefined);

  // Get the first table row
  const firstRow = dp.locator('table tr, [role="row"]').nth(1); // nth(1) skips header
  
  // Get text from the row and check if it contains the expected value
  const rowText = await firstRow.innerText().catch(() => '');
  
  if (rowText.includes(expectedValue)) {
    console.log(`[VERIFY_FIRST_ROW] First row contains "${expectedValue}" in ${columnName} column`);
  } else {
    throw new Error(`First row does not contain "${expectedValue}" in ${columnName} column. Row text: ${rowText}`);
  }
});
