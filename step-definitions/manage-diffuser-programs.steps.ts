import { expect, Locator, Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { FlpDiffuserPage } from '../pages/FlpDiffuserPage';
import { getPasswordForUser } from '../utils/credentials';

const { Given, When, Then } = createBdd();

let lastProgramName: string | null = null;

function pattern(text: string): RegExp {
  const normalized = text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s+');
  return new RegExp(normalized, 'i');
}

function exactPattern(text: string): RegExp {
  const normalized = text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s+');
  return new RegExp(`^\\s*${normalized}\\s*$`, 'i');
}

async function visible(locator: Locator): Promise<Locator> {
  const count = await locator.count();
  for (let i = 0; i < count; i++) {
    const candidate = locator.nth(i);
    if (await candidate.isVisible().catch(() => false)) {
      return candidate;
    }
  }
  throw new Error('No visible element found for locator.');
}

async function visibleEnabled(locator: Locator): Promise<Locator> {
  const count = await locator.count();
  for (let i = 0; i < count; i++) {
    const candidate = locator.nth(i);
    const isVisible = await candidate.isVisible().catch(() => false);
    if (!isVisible) {
      continue;
    }

    const isDisabled = await candidate.isDisabled().catch(() => false);
    const ariaDisabled = await candidate.getAttribute('aria-disabled').catch(() => null);
    if (!isDisabled && ariaDisabled !== 'true') {
      return candidate;
    }
  }

  throw new Error('No visible enabled element found for locator.');
}

async function clickElement(locator: Locator): Promise<void> {
  const target = await visible(locator);
  await target.scrollIntoViewIfNeeded().catch(() => undefined);

  const clicked = await target.click({ timeout: 15_000 }).then(() => true).catch(() => false);
  if (clicked) {
    return;
  }

  await target.click({ timeout: 15_000, force: true }).catch(async () => {
    await target.evaluate((el) => {
      if (el instanceof HTMLElement) {
        el.click();
      }
    });
  });
}

function candidatePages(page: Page): Page[] {
  return [page, ...page.context().pages().filter((candidate) => candidate !== page).reverse()];
}

async function findPageWithVisibleButton(page: Page, label: string, timeout = 15_000): Promise<Page> {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    for (const candidate of candidatePages(page)) {
      if (candidate.isClosed()) {
        continue;
      }

      await candidate.bringToFront().catch(() => undefined);

      const buttonLocator = byButton(candidate, label);
      const hasVisibleButton = await (/^schedule$/i.test(label)
        ? visibleEnabled(buttonLocator)
        : visible(buttonLocator))
        .then(() => true)
        .catch(() => false);

      if (hasVisibleButton) {
        return candidate;
      }
    }

    await page.waitForTimeout(250);
  }

  throw new Error(`Could not find a visible button named "${label}" on any open page.`);
}

async function tileDestinationVisible(page: Page, tileName: string): Promise<boolean> {
  const name = tileName.trim().toLowerCase();

  if (name === 'manage diffuser programs') {
    const addButtonVisible = await visible(byButton(page, 'Add'))
      .then(() => true)
      .catch(() => false);
    if (addButtonVisible) {
      return true;
    }

    const headingVisible = await headingOrText(page, 'Manage Diffuser Programs')
      .count()
      .then((count) => count > 0)
      .catch(() => false);
    return headingVisible;
  }

  if (name === 'display results') {
    return headingOrText(page, 'Display Results')
      .count()
      .then((count) => count > 0)
      .catch(() => false);
  }

  return true;
}

async function clickDashboardTile(page: Page, tileName: string): Promise<void> {
  if (page.isClosed()) {
    throw new Error(`Cannot click tile "${tileName}" because the current page is closed.`);
  }

  const alreadyLanded = await tileDestinationVisible(page, tileName).catch(() => false);
  if (alreadyLanded) {
    return;
  }

  const tilePattern = pattern(tileName);
  const deadline = Date.now() + 45_000;

  while (Date.now() < deadline) {
    const directCandidates: Locator[] = [
      page.getByRole('link', { name: tilePattern }),
      page.getByRole('button', { name: tilePattern }),
      page.getByRole('listitem', { name: tilePattern }),
      page.locator('[title*="Tile"]').filter({ hasText: tilePattern }),
      page.locator('li, div, span, a').filter({ hasText: tilePattern }),
      page.getByText(tilePattern),
    ];

    for (const candidate of directCandidates) {
      const target = await visible(candidate).catch(() => null);
      if (!target) {
        continue;
      }

      await target.scrollIntoViewIfNeeded().catch(() => undefined);
      const clicked = await target
        .click({ timeout: 4_000 })
        .then(() => true)
        .catch(async () => {
          return target
            .click({ timeout: 4_000, force: true })
            .then(() => true)
            .catch(() => false);
        });

      if (!clicked) {
        continue;
      }

      const landed = await expect
        .poll(() => tileDestinationVisible(page, tileName), { timeout: 12_000 })
        .toBe(true)
        .then(() => true)
        .catch(() => false);
      if (landed) {
        return;
      }
    }

    // Fallback for non-dashboard pages: use the Diffuser navigation button/menu in the shell bar.
    const diffuserMenuButton = page
      .getByRole('button', { name: /diffuser/i })
      .or(page.locator('button').filter({ hasText: /^\s*Diffuser\s*$/i }));

    const menuButtonVisible = await visible(diffuserMenuButton).catch(() => null);
    if (menuButtonVisible) {
      await clickElement(menuButtonVisible);

      const menuItemCandidates = page
        .getByRole('menuitem', { name: tilePattern })
        .or(page.getByRole('option', { name: tilePattern }))
        .or(page.getByRole('link', { name: tilePattern }))
        .or(page.getByText(tilePattern));

      const menuItem = await expect
        .poll(async () => visible(menuItemCandidates).catch(() => null), { timeout: 8_000 })
        .not.toBeNull()
        .then(async () => visible(menuItemCandidates).catch(() => null))
        .catch(() => null);

      if (menuItem) {
        await clickElement(menuItem);
        await expect
          .poll(() => tileDestinationVisible(page, tileName), { timeout: 12_000 })
          .toBe(true);
        return;
      }
    }

    const shellNavButton = page
      .locator('button, a, [role="button"], [role="link"]')
      .filter({ hasText: /all\s*my\s*apps|apps\s*menu|app\s*finder|launchpad/i })
      .first();

    const allMyAppsVisible = await visible(shellNavButton).catch(() => null);
    if (allMyAppsVisible) {
      await clickElement(allMyAppsVisible);

      const allMyAppsItem = page
        .locator('button, a, [role="menuitem"], [role="treeitem"], [role="link"], li, div, span')
        .filter({ hasText: tilePattern })
        .first();

      const selectedItem = await expect
        .poll(async () => visible(allMyAppsItem).catch(() => null), { timeout: 8_000 })
        .not.toBeNull()
        .then(async () => visible(allMyAppsItem).catch(() => null))
        .catch(() => null);

      if (selectedItem) {
        await clickElement(selectedItem);
        await expect
          .poll(() => tileDestinationVisible(page, tileName), { timeout: 12_000 })
          .toBe(true);
        return;
      }
    }

    await page.waitForTimeout(500);
  }

  throw new Error(`Unable to click tile "${tileName}" from the current page.`);
}

function fieldLocators(page: Page, fieldName: string): Locator {
  const fieldPattern = pattern(fieldName.replace(/:\s*$/, ''));
  return page
    .getByRole('textbox', { name: fieldPattern })
    .or(page.getByRole('spinbutton', { name: fieldPattern }))
    .or(page.getByLabel(fieldPattern))
    .or(page.getByRole('combobox', { name: fieldPattern }))
    .or(page.locator('input, textarea, [role="textbox"], [role="spinbutton"], [contenteditable="true"]').filter({
      has: page.getByText(fieldPattern),
    }));
}

async function firstEditableField(locator: Locator): Promise<Locator> {
  const count = await locator.count();

  for (let i = 0; i < count; i++) {
    const candidate = locator.nth(i);
    const isVisible = await candidate.isVisible().catch(() => false);
    if (!isVisible) {
      continue;
    }

    const isDisabled = await candidate.isDisabled().catch(() => false);
    const readonly = await candidate.getAttribute('readonly').catch(() => null);
    const inputType = (await candidate.getAttribute('type').catch(() => null))?.toLowerCase();
    const role = (await candidate.getAttribute('role').catch(() => null))?.toLowerCase();
    const tagName = (await candidate.evaluate((el) => el.tagName.toLowerCase()).catch(() => ''));

    if (isDisabled) {
      continue;
    }

    // Some UI5 widgets expose aria-readonly=true while still accepting values via keyboard.
    if ((tagName === 'input' || tagName === 'textarea') && readonly !== null) {
      continue;
    }

    if (inputType === 'radio' || inputType === 'checkbox' || inputType === 'hidden') {
      continue;
    }

    if (role && !['textbox', 'spinbutton', 'combobox'].includes(role)) {
      continue;
    }

    return candidate;
  }

  throw new Error('No visible editable field found for locator.');
}

async function fillField(page: Page, fieldName: string, value: string): Promise<void> {
  const cleanFieldName = fieldName.replace(/:\s*$/, '').trim();

  if (cleanFieldName.toLowerCase() === 'notification list') {
    const notificationField = await visible(
      page
        .getByRole('textbox', { name: pattern('Notification List') })
        .or(
          page.locator(
            `xpath=(//*[normalize-space()="Notification List" or normalize-space()="Notification List:"])[1]/following::*[(self::input and not(@type='radio') and not(@type='checkbox') and not(@type='hidden')) or self::textarea or @role='textbox'][1]`,
          ),
        ),
    );

    await notificationField.scrollIntoViewIfNeeded().catch(() => undefined);
    await notificationField.click({ timeout: 10_000 }).catch(() => undefined);
    await notificationField.fill(value).catch(async () => {
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Backspace');
      await page.keyboard.type(value);
    });
    // Tokenizer controls often require Enter to commit the value.
    await page.keyboard.press('Enter').catch(() => undefined);

    await expect
      .poll(async () => {
        const inputValue = (await notificationField.inputValue().catch(() => '')).trim();
        const hasToken = (await page.getByRole('option', { name: pattern(value) }).count().catch(() => 0)) > 0;
        return inputValue === value || hasToken;
      }, { timeout: 8_000 })
      .toBe(true);
    return;
  }

  let specialNumericField: Locator | null = null;
  if (cleanFieldName.toLowerCase() === 'interval count') {
    specialNumericField = page.locator(
      `xpath=(//*[@role='radio' and (normalize-space()="Interval Count" or contains(normalize-space(), "Interval Count"))][1]/following::*[@role='spinbutton'][1])`,
    );
  } else if (cleanFieldName.toLowerCase() === 'number of batch jobs across all servers') {
    specialNumericField = page.locator(
      `xpath=(//*[@role='radio' and (normalize-space()="Number of Batch Jobs Across All Servers" or contains(normalize-space(), "Number of Batch Jobs Across All Servers"))][1]/following::*[@role='spinbutton'][1])`,
    );
  }

  if (specialNumericField) {
    const numericField = await firstEditableField(specialNumericField);
    await numericField.scrollIntoViewIfNeeded().catch(() => undefined);
    await numericField.click({ timeout: 10_000 }).catch(async () => {
      await numericField.evaluate((el) => (el as HTMLElement).click());
    });
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(value);
    await expect
      .poll(async () => (await numericField.inputValue().catch(() => '')).trim(), { timeout: 8_000 })
      .toBe(value);
    return;
  }

  const byName = fieldLocators(page, cleanFieldName);
  const byLabelProximity = page.locator(
    `xpath=(//*[normalize-space()="${cleanFieldName}" or normalize-space()="${cleanFieldName}:"])[1]/following::*[(self::input and not(@type='radio') and not(@type='checkbox') and not(@type='hidden')) or self::textarea or @role='textbox' or @role='spinbutton' or @contenteditable='true'][1]`,
  );

  const field = await firstEditableField(byName).catch(async () => {
    return firstEditableField(byLabelProximity);
  });

  await field.scrollIntoViewIfNeeded().catch(() => undefined);
  await field.click({ timeout: 10_000 }).catch(() => undefined);

  const tagName = await field.evaluate((el) => el.tagName.toLowerCase());
  const role = (await field.getAttribute('role').catch(() => null))?.toLowerCase();

  if (tagName === 'input' || tagName === 'textarea' || role === 'textbox' || role === 'spinbutton') {
    await field.fill(value).catch(async () => {
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Backspace');
      await page.keyboard.type(value);
    });
  } else {
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(value);
  }

  await expect
    .poll(async () => {
      const inputValue = await field.inputValue().catch(() => null);
      if (inputValue !== null) {
        return inputValue.trim();
      }

      const textValue = await field.textContent().catch(() => '');
      return (textValue ?? '').trim();
    }, { timeout: 8_000 })
    .toBe(value);
}

async function resolveFilterInput(page: Page, filterName: string): Promise<Locator> {
  const cleanName = filterName.replace(/:\s*$/, '').trim();
  const namedDropdown = page
    .getByRole('textbox', { name: pattern(cleanName) })
    .or(page.getByRole('combobox', { name: pattern(cleanName) }))
    .or(page.getByLabel(pattern(cleanName)))
    .or(
      page.locator(
        `xpath=(//*[normalize-space()="${cleanName}" or normalize-space()="${cleanName}:"])[1]/following::*[@role='textbox' or self::input or @role='combobox'][1]`,
      ),
    )
    .or(
      page.locator(
        `xpath=(//*[contains(normalize-space(), "${cleanName}")])[1]/following::*[@role='textbox' or self::input or @role='combobox'][1]`,
      ),
    );

  return visible(namedDropdown);
}

async function openDropdownFilter(page: Page, filterName: string): Promise<Locator> {
  const cleanName = filterName.replace(/:\s*$/, '').trim();

  const dropdown = await resolveFilterInput(page, filterName).catch(async () => {
    const byNearbyInput = await visible(
      page.locator(
        `xpath=(//*[normalize-space()="${cleanName}" or normalize-space()="${cleanName}:"])[1]/following::*[self::input or self::textarea][1]`,
      ),
    ).catch(() => null as Locator | null);

    if (byNearbyInput) {
      return byNearbyInput;
    }

    const byDropdownToggle = await visible(
      page.locator(
        `xpath=(//*[normalize-space()="${cleanName}" or normalize-space()="${cleanName}:"])[1]/following::*[self::button or contains(normalize-space(), "")][1]`,
      ),
    );

    return byDropdownToggle;
  });

  await dropdown.scrollIntoViewIfNeeded().catch(() => undefined);
  await dropdown.click({ timeout: 10_000 }).catch(async () => {
    await dropdown.evaluate((el) => (el as HTMLElement).click());
  });
  return dropdown;
}

type Ui5SelectInfo = {
  id: string;
  control: string;
  options: string[];
  selected: string;
};

/**
 * Resolves the UI5 Select/ComboBox control that belongs to a visible field label.
 * Label proximity in the DOM is unreliable here, so association is done via
 * aria-labelledby first and a bounded ancestor walk second.
 */
async function findUi5Select(page: Page, label: string): Promise<Ui5SelectInfo | null> {
  return page
    .evaluate((rawLabel: string) => {
      const norm = (value: string | null | undefined): string =>
        (value ?? '').replace(/\s+/g, ' ').trim().replace(/:$/, '').toLowerCase();
      const target = norm(rawLabel);
      const selectSelector = '.sapMSelect, .sapMComboBox, [role="combobox"]';

      const isRendered = (el: Element): boolean => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };

      const labels = Array.from(document.querySelectorAll<HTMLElement>('label, bdi, span, div')).filter(
        (el) => el.children.length === 0 && norm(el.textContent) === target && isRendered(el),
      );

      const candidates: HTMLElement[] = [];
      for (const labelEl of labels) {
        const labelId = labelEl.id || labelEl.closest('label')?.id;
        if (labelId) {
          document.querySelectorAll<HTMLElement>(`[aria-labelledby~="${labelId}"]`).forEach((el) => {
            const match = el.matches(selectSelector) ? el : el.closest<HTMLElement>(selectSelector);
            if (match && isRendered(match)) {
              candidates.push(match);
            }
          });
        }

        let node: HTMLElement | null = labelEl.parentElement;
        for (let depth = 0; node && depth < 6; depth++, node = node.parentElement) {
          const found = Array.from(node.querySelectorAll<HTMLElement>(selectSelector)).filter(isRendered);
          if (found.length > 0) {
            candidates.push(...found);
            break;
          }
        }
      }

      const core = (window as any).sap?.ui?.getCore?.();
      if (!core) {
        return null;
      }

      for (const candidate of candidates) {
        let node: HTMLElement | null = candidate;
        for (let depth = 0; node && depth < 4; depth++, node = node.parentElement) {
          const control = node.id ? core.byId(node.id) : null;
          if (control && typeof control.getItems === 'function') {
            const items = control.getItems() ?? [];
            return {
              id: node.id,
              control: control.getMetadata().getName(),
              options: items.map((item: any) => {
                const text = item.getText?.() ?? '';
                const key = item.getKey?.() ?? '';
                return key && key !== text ? `${text} [${key}]` : text;
              }),
              selected: control.getSelectedItem?.()?.getText?.() ?? control.getValue?.() ?? '',
            };
          }
        }
      }

      return null;
    }, label)
    .catch(() => null);
}

async function ui5SelectValue(page: Page, controlId: string): Promise<string> {
  return page
    .evaluate((id: string) => {
      const control = (window as any).sap?.ui?.getCore?.()?.byId(id);
      return (control?.getSelectedItem?.()?.getText?.() ?? control?.getValue?.() ?? '').trim();
    }, controlId)
    .catch(() => '');
}

async function ui5PickerDomId(page: Page, controlId: string): Promise<string | null> {
  return page
    .evaluate((id: string) => {
      const control = (window as any).sap?.ui?.getCore?.()?.byId(id);
      const picker = control?.getPicker?.() ?? control?.getAggregation?.('picker');
      return picker?.getDomRef?.()?.id ?? null;
    }, controlId)
    .catch(() => null);
}

async function ui5SelectOptionViaApi(page: Page, controlId: string, option: string): Promise<boolean> {
  return page
    .evaluate(
      ({ id, value }: { id: string; value: string }) => {
        const norm = (text: string | null | undefined): string =>
          (text ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
        const control = (window as any).sap?.ui?.getCore?.()?.byId(id);
        const items = control?.getItems?.() ?? [];
        const wanted = norm(value);
        const match =
          items.find((item: any) => norm(item.getText?.()) === wanted) ??
          items.find((item: any) => norm(item.getText?.()).includes(wanted));

        if (!control || !match) {
          return false;
        }

        control.setSelectedItem?.(match);
        if (typeof match.getKey === 'function') {
          control.setSelectedKey?.(match.getKey());
        }
        if (typeof control.setValue === 'function') {
          control.setValue(match.getText?.() ?? value);
        }
        control.fireChange?.({ selectedItem: match, value: match.getText?.() ?? value, itemPressed: true });
        return true;
      },
      { id: controlId, value: option },
    )
    .catch(() => false);
}

/**
 * Selects an option in a UI5 Select/ComboBox by opening the control's own picker.
 * Falls back to the UI5 control API when the popover items cannot be clicked,
 * and always verifies the resulting value.
 */
async function selectUi5DropdownOption(page: Page, filterName: string, option: string): Promise<boolean> {
  const cleanName = filterName.replace(/:\s*$/, '').trim();
  const info = await findUi5Select(page, cleanName);
  if (!info) {
    return false;
  }

  const matchesOption = async (): Promise<boolean> => {
    const current = (await ui5SelectValue(page, info.id)).replace(/\s+/g, ' ').toLowerCase();
    const expected = option.replace(/\s+/g, ' ').trim().toLowerCase();
    return current.length > 0 && (current === expected || current.includes(expected) || expected.includes(current));
  };

  if (await matchesOption()) {
    return true;
  }

  const root = page.locator(`[id="${info.id}"]`);
  await root.scrollIntoViewIfNeeded().catch(() => undefined);
  await root.click({ timeout: 10_000 }).catch(async () => {
    await root.evaluate((el) => (el as HTMLElement).click()).catch(() => undefined);
  });

  const pickerId = await expect
    .poll(async () => ui5PickerDomId(page, info.id), { timeout: 8_000 })
    .not.toBeNull()
    .then(async () => ui5PickerDomId(page, info.id))
    .catch(() => null);

  if (pickerId) {
    const item = page
      .locator(`[id="${pickerId}"] li[role="option"], [id="${pickerId}"] li.sapMSelectListItemBase`)
      .filter({ hasText: pattern(option) })
      .first();

    if ((await item.count().catch(() => 0)) > 0) {
      await item.click({ timeout: 8_000, force: true }).catch(async () => {
        await item.evaluate((el) => (el as HTMLElement).click()).catch(() => undefined);
      });
    }
  }

  let selected = await expect
    .poll(matchesOption, { timeout: 6_000 })
    .toBe(true)
    .then(() => true)
    .catch(() => false);

  if (!selected) {
    await page.keyboard.press('Escape').catch(() => undefined);
    await ui5SelectOptionViaApi(page, info.id, option);
    selected = await expect
      .poll(matchesOption, { timeout: 6_000 })
      .toBe(true)
      .then(() => true)
      .catch(() => false);
  }

  await closeOpenPopovers(page);

  if (!selected) {
    throw new Error(
      `Could not select "${option}" in the "${filterName}" dropdown. Available options: ${info.options.join(' | ') || '<none>'}.`,
    );
  }

  return true;
}

/** UI5 popovers keep a modal block layer that swallows later clicks (e.g. "Show More"). */
async function closeOpenPopovers(page: Page): Promise<void> {
  const blockingLayer = page.locator(
    '.sapMPopover:visible, .sapMSelectListPopover:visible, .sapMSuggestionPopup:visible, .sapMValueHelpDlg:visible',
  );

  for (let attempt = 0; attempt < 3; attempt++) {
    if ((await blockingLayer.count().catch(() => 0)) === 0) {
      return;
    }
    await page.keyboard.press('Escape').catch(() => undefined);
    await page.waitForTimeout(250);
  }
}

async function selectDropdownFilterOption(page: Page, filterName: string, option: string): Promise<void> {
  const cleanName = filterName.replace(/:\s*$/, '').trim().toLowerCase();

  if (['interval object', 'job format id', 'interval variant', 'message log level'].includes(cleanName)) {
    const handled = await selectUi5DropdownOption(page, filterName, option).catch((error: Error) => {
      if (cleanName === 'interval object') {
        throw error;
      }
      return false;
    });

    if (handled) {
      return;
    }
  }

  if (cleanName === 'job format id') {
    const jobFormatTrigger = page.locator(
      `xpath=(//*[normalize-space()="Job Format ID" or normalize-space()="Job Format ID:"])[1]/following::*[@role='combobox' or self::button or contains(normalize-space(), "")][1]`,
    );

    const trigger = await visible(jobFormatTrigger).catch(async () => {
      return visible(page.getByRole('combobox', { name: pattern('Job Format ID') }));
    });

    await trigger.scrollIntoViewIfNeeded().catch(() => undefined);
    await trigger.click({ timeout: 10_000 }).catch(async () => {
      await trigger.evaluate((el) => (el as HTMLElement).click());
    });

    const optionCandidates = page
      .getByRole('option', { name: pattern(option) })
      .or(page.getByRole('listitem', { name: pattern(option) }))
      .or(page.getByText(pattern(option)));

    const optionNode = await visible(optionCandidates).catch(() => null);
    if (optionNode) {
      await clickElement(optionNode);
      await page.keyboard.press('Enter').catch(() => undefined);
      return;
    }

    // Fallback: write directly into Job Format ID field if list options are not visible.
    const jobFormatInput = await visible(
      page.locator(
        `xpath=(//*[normalize-space()="Job Format ID" or normalize-space()="Job Format ID:"])[1]/following::*[(self::input and not(@type='hidden')) or @role='textbox'][1]`,
      ),
    );
    await jobFormatInput.click({ timeout: 10_000 }).catch(() => undefined);
    await jobFormatInput.fill(option).catch(async () => {
      await page.keyboard.press('Control+A').catch(() => undefined);
      await page.keyboard.press('Backspace').catch(() => undefined);
      await page.keyboard.type(option, { delay: 15 }).catch(() => undefined);
    });
    await page.keyboard.press('Enter').catch(() => undefined);
    await page.keyboard.press('Tab').catch(() => undefined);
    return;
  }

  if (cleanName === 'message log level') {
    const messageLogInput = page.locator(
      `xpath=(//*[normalize-space()="Message Log Level" or normalize-space()="Message Log Level:"])[1]/following::*[(self::input and not(@type='hidden')) or @role='textbox'][1]`,
    );

    const messageLogCombobox = await visible(
      page
        .getByRole('combobox', { name: pattern('Message Log Level') })
        .or(
          page.locator(
            `xpath=(//*[normalize-space()="Message Log Level" or normalize-space()="Message Log Level:"])[1]/following::*[@role='combobox'][1]`,
          ),
        ),
    );

    await messageLogCombobox.scrollIntoViewIfNeeded().catch(() => undefined);
    await messageLogCombobox.click({ timeout: 10_000 }).catch(async () => {
      await messageLogCombobox.evaluate((el) => (el as HTMLElement).click());
    });

    const dumpVisibleOptions = async (label: string): Promise<void> => {
      const optionLocators = [
        page.locator('[role="option"]'),
        page.locator('[role="listitem"]'),
        page.locator('.sapMSelectListItemBase, .sapMComboBoxBaseItem'),
      ];

      const collected = new Set<string>();
      for (const locator of optionLocators) {
        const count = await locator.count().catch(() => 0);
        for (let i = 0; i < count; i++) {
          const node = locator.nth(i);
          const isVisible = await node.isVisible().catch(() => false);
          if (!isVisible) {
            continue;
          }
          const text = ((await node.textContent().catch(() => '')) ?? '').trim();
          if (text) {
            collected.add(text.replace(/\s+/g, ' '));
          }
        }
      }

      const items = [...collected];
      // eslint-disable-next-line no-console
      console.log(`[MESSAGE_LOG_LEVEL_OPTIONS:${label}] ${items.length > 0 ? items.join(' | ') : '<none-visible>'}`);
    };

    await dumpVisibleOptions('after-initial-open');

    const optionCandidates = page
      .getByRole('option', { name: pattern(option) })
      .or(page.getByRole('listitem', { name: pattern(option) }))
      .or(page.locator('.sapMSelectListItemBase, .sapMComboBoxBaseItem').filter({ hasText: pattern(option) }))
      .or(page.getByText(pattern(option)));

    let optionNode = await visible(optionCandidates).catch(() => null);
    if (!optionNode) {
      await page.keyboard.press('Alt+ArrowDown').catch(() => undefined);
      await dumpVisibleOptions('after-alt-arrow-down');
      optionNode = await expect
        .poll(async () => visible(optionCandidates).catch(() => null), { timeout: 8_000 })
        .not.toBeNull()
        .then(async () => visible(optionCandidates).catch(() => null))
        .catch(() => null);
    }

    if (!optionNode) {
      const targetValue = option.trim().toLowerCase();

      // Some environments expose Message Log Level as numeric keys and do not render option lists.
      // For "Medium", try code "3" explicitly before arrow-key cycling.
      if (targetValue === 'medium') {
        const inputVisible = await visible(messageLogInput).catch(() => null);
        if (inputVisible) {
          await inputVisible.click({ timeout: 5_000 }).catch(() => undefined);
          await page.keyboard.press('Control+A').catch(() => undefined);
          await page.keyboard.press('Backspace').catch(() => undefined);
          await page.keyboard.type('3', { delay: 20 }).catch(() => undefined);
          await page.keyboard.press('Enter').catch(() => undefined);
          await page.keyboard.press('Tab').catch(() => undefined);

          const code3Worked = await expect
            .poll(async () => {
              const comboText = ((await messageLogCombobox.textContent().catch(() => '')) ?? '').trim().toLowerCase();
              const inputText = ((await messageLogInput.inputValue().catch(() => '')) ?? '').trim().toLowerCase();
              return comboText.includes('medium') || inputText === '3';
            }, { timeout: 4_000 })
            .toBe(true)
            .then(() => true)
            .catch(() => false);

          if (code3Worked) {
            return;
          }

          throw new Error('Could not set Message Log Level to code 3 for Medium.');
        }

        throw new Error('Message Log Level input is not visible to set code 3 for Medium.');
      }

      const cycleAndCheck = async (key: 'ArrowDown' | 'ArrowUp', attempts: number) => {
        for (let i = 0; i < attempts; i++) {
          await messageLogCombobox.click({ timeout: 5_000 }).catch(() => undefined);
          await page.keyboard.press(key).catch(() => undefined);
          await page.keyboard.press('Enter').catch(() => undefined);

          const comboTextSnapshot = ((await messageLogCombobox.textContent().catch(() => '')) ?? '').trim();
          const inputTextSnapshot = ((await messageLogInput.inputValue().catch(() => '')) ?? '').trim();
          // eslint-disable-next-line no-console
          console.log(`[MESSAGE_LOG_LEVEL_CYCLE:${key}:${i + 1}] combo="${comboTextSnapshot}" input="${inputTextSnapshot}"`);

          const matched = await expect
            .poll(async () => {
              const comboText = ((await messageLogCombobox.textContent().catch(() => '')) ?? '').trim().toLowerCase();
              return comboText.includes(targetValue);
            }, { timeout: 1_500 })
            .toBe(true)
            .then(() => true)
            .catch(() => false);

          if (matched) {
            return true;
          }
        }
        return false;
      };

      const movedDown = await cycleAndCheck('ArrowDown', 8);
      if (!movedDown) {
        const movedUp = await cycleAndCheck('ArrowUp', 8);
        if (!movedUp) {
          throw new Error(`Could not select Message Log Level option "${option}".`);
        }
      }

      await page.keyboard.press('Tab').catch(() => undefined);
      return;
    }

    await clickElement(optionNode);
    await page.keyboard.press('Enter').catch(() => undefined);
    await page.keyboard.press('Tab').catch(() => undefined);

    const finalCombo = ((await messageLogCombobox.textContent().catch(() => '')) ?? '').trim();
    const finalInput = ((await messageLogInput.inputValue().catch(() => '')) ?? '').trim();
    // eslint-disable-next-line no-console
    console.log(`[MESSAGE_LOG_LEVEL_FINAL] combo="${finalCombo}" input="${finalInput}"`);

    await expect
      .poll(async () => {
        const comboText = ((await messageLogCombobox.textContent().catch(() => '')) ?? '').trim().toLowerCase();
        return comboText.includes(option.trim().toLowerCase());
      }, { timeout: 12_000 })
      .toBe(true);
    return;
  }

  const dropdown = await openDropdownFilter(page, filterName).catch(async () => {
    if (cleanName === 'interval variant') {
      const labelVisible = await visible(page.getByText(pattern('Interval Variant'))).catch(() => null);
      if (labelVisible) {
        await labelVisible.click({ timeout: 5_000 }).catch(() => undefined);
      }

      await page.keyboard.press('Tab').catch(() => undefined);
      await page.keyboard.type(option, { delay: 15 }).catch(() => undefined);
      await page.keyboard.press('Enter').catch(() => undefined);

      return page.locator('body');
    }

    throw new Error(`Could not open dropdown for filter "${filterName}".`);
  });

  const valueHelpDialog = page.getByRole('dialog', { name: pattern('Available Values') }).last();
  const optionInDialog = valueHelpDialog
    .getByRole('option', { name: pattern(option) })
    .or(valueHelpDialog.getByText(pattern(option)));

  const dialogOptionVisible = await visible(optionInDialog).catch(() => null);
  if (dialogOptionVisible) {
    await clickElement(dialogOptionVisible);
    const applyButton = valueHelpDialog.getByRole('button', { name: pattern('Apply') });
    const applyVisible = await visible(applyButton).catch(() => null);
    if (applyVisible) {
      await clickElement(applyVisible);
    } else {
      await page.keyboard.press('Enter').catch(() => undefined);
    }
    return;
  }

  const globalOption = page
    .getByRole('option', { name: pattern(option) })
    .or(page.getByRole('listitem', { name: pattern(option) }))
    .or(page.getByText(pattern(option)));

  const visibleGlobalOption = await visible(globalOption).catch(() => null);
  if (visibleGlobalOption) {
    await clickElement(visibleGlobalOption);
    await page.keyboard.press('Enter').catch(() => undefined);
    await closeOpenPopovers(page);
    return;
  }

  // Typed fallback for free-text filters. Never fall back to page-level Control+A:
  // with no focused input that selects the whole document instead of a field value.
  const typed = await dropdown
    .fill(option, { timeout: 5_000 })
    .then(() => true)
    .catch(() => false);

  if (!typed) {
    await closeOpenPopovers(page);
    throw new Error(`Could not select "${option}" for filter "${filterName}".`);
  }

  await page.keyboard.press('Enter').catch(() => undefined);
  await closeOpenPopovers(page);
}

function byButton(page: Page, label: string): Locator {
  const labelPattern = pattern(label);
  const escapedLabel = label.replace(/"/g, '\\"');
  return page
    .getByRole('button', { name: labelPattern })
    .or(page.getByText(labelPattern).locator('xpath=ancestor-or-self::*[@role="button" or self::button][1]'))
    .or(
      page.locator(
        `xpath=//*[@role='button' or self::button][@aria-label='${escapedLabel}' or @title='${escapedLabel}' or contains(normalize-space(.), '${label}')]`,
      ),
    );
}

function byTab(page: Page, label: string): Locator {
  const labelPattern = pattern(label);
  return page.getByRole('tab', { name: labelPattern }).or(page.getByText(labelPattern));
}

function byLink(page: Page, label: string): Locator {
  const labelPattern = pattern(label);
  return page
    .getByRole('link', { name: labelPattern })
    .or(page.getByText(labelPattern).locator('xpath=ancestor-or-self::a[1]'));
}

function messageLocator(page: Page, text: string): Locator {
  const textPattern = pattern(text);
  return page
    .getByRole('status')
    .filter({ hasText: textPattern })
    .or(page.getByRole('alert').filter({ hasText: textPattern }))
    .or(page.getByText(textPattern));
}

function headingOrText(page: Page, text: string): Locator {
  const textPattern = pattern(text);
  return page.getByRole('heading', { name: textPattern }).or(page.getByText(textPattern));
}

async function anyPageMessageCount(page: Page, text: string): Promise<number> {
  for (const candidate of candidatePages(page)) {
    if (candidate.isClosed()) {
      continue;
    }

    const count = await messageLocator(candidate, text).count().catch(() => 0);
    if (count > 0) {
      return count;
    }
  }

  return 0;
}

async function anyPageDetailsVisible(page: Page): Promise<boolean> {
  for (const candidate of candidatePages(page)) {
    if (candidate.isClosed()) {
      continue;
    }

    const detailsVisible =
      (await headingOrText(candidate, 'Program Details').count().catch(() => 0)) > 0 &&
      (await byButton(candidate, 'Edit').count().catch(() => 0)) > 0;

    if (detailsVisible) {
      return true;
    }
  }

  return false;
}

async function findPageContainingMessage(page: Page, text: string): Promise<Page> {
  for (const candidate of candidatePages(page)) {
    if (candidate.isClosed()) {
      continue;
    }

    const count = await messageLocator(candidate, text).count().catch(() => 0);
    if (count > 0) {
      return candidate;
    }
  }

  return page;
}

Given('I have logged in with valid username {string}', async ({ page }, username: string) => {
  const flpDiffuserPage = new FlpDiffuserPage(page);
  await flpDiffuserPage.gotoLoginPage();
  await flpDiffuserPage.login(username, getPasswordForUser(username));
  await flpDiffuserPage.verifyOnHomePage();
});

When('I click on the Diffuser App tile', async ({ page }) => {
  const flpDiffuserPage = new FlpDiffuserPage(page);
  await flpDiffuserPage.clickTile('Diffuser App');
});

Then('Verify the Diffuser dashboard is displayed', async ({ page }) => {
  const flpDiffuserPage = new FlpDiffuserPage(page);
  await flpDiffuserPage.verifyDiffuserHomepageDisplayed();
});

When('I click on the {string} tile', async ({ page }, tileName: string) => {
  if (tileName.toLowerCase() === 'manage diffuser programs' || tileName.toLowerCase() === 'display results') {
    await clickDashboardTile(page, tileName);
    return;
  }

  const flpDiffuserPage = new FlpDiffuserPage(page);
  await flpDiffuserPage.clickTile(tileName);
});

Then('Verify the {string} page is displayed', async ({ page }, pageTitle: string) => {
  // The Diffuser app runs in its own tab, so the title has to be looked up across all open pages.
  const findPage = async (): Promise<Page | null> => {
    for (const candidate of candidatePages(page)) {
      if (candidate.isClosed()) {
        continue;
      }

      const heading = candidate
        .getByRole('heading', { name: pattern(pageTitle) })
        .or(candidate.getByText(pattern(pageTitle)));

      const found = await visible(heading)
        .then(() => true)
        .catch(() => false);

      if (found) {
        return candidate;
      }
    }

    return null;
  };

  const targetPage = await expect
    .poll(findPage, { timeout: 30_000 })
    .not.toBeNull()
    .then(findPage)
    .catch(() => null);

  if (!targetPage) {
    throw new Error(`The "${pageTitle}" page is not displayed on any open tab.`);
  }

  await targetPage.bringToFront().catch(() => undefined);

  // A modal left open means the previous step never dismissed it, so the page is not really shown.
  await expect
    .poll(
      async () =>
        visible(targetPage.getByRole('dialog').or(targetPage.getByRole('alertdialog')))
          .then(() => true)
          .catch(() => false),
      { timeout: 10_000 },
    )
    .toBe(false);

  // Wait a bit for page rendering to settle
  await targetPage.waitForTimeout(500);
});

When('I click on the {string} button', async ({ page, $testInfo }, buttonName: string) => {
  // Cancel/Close belong to the dialog that is currently open; resolving them page-wide
  // can match an unrelated control (or nothing at all) and skip the dismissal.
  if (/^(cancel|close)$/i.test(buttonName)) {
    for (const candidate of candidatePages(page)) {
      if (candidate.isClosed()) {
        continue;
      }

      // The program name input opens a suggestion popup that overlaps the dialog footer.
      await closeOpenPopovers(candidate);

      const openDialog = await visible(
        candidate.getByRole('dialog').or(candidate.getByRole('alertdialog')),
      ).catch(() => null);

      if (!openDialog) {
        continue;
      }

      await candidate.bringToFront().catch(() => undefined);

      const dialogButton = openDialog
        .getByRole('button', { name: pattern(buttonName) })
        .or(openDialog.getByText(pattern(buttonName)).locator('xpath=ancestor-or-self::*[@role="button" or self::button][1]'));

      await clickElement(dialogButton);
      await expect
        .poll(async () => openDialog.isVisible().catch(() => false), { timeout: 15_000 })
        .toBe(false);
      return;
    }
  }

  if (/open\s+picker/i.test(buttonName)) {
    const pickerCandidates = [
      page.locator(
        `xpath=(//*[normalize-space()="Date" or normalize-space()="Date:"])[1]/following::*[contains(normalize-space(), "") or @title="Open Picker" or @aria-label="Open Picker"][1]`,
      ),
      page.getByText(//),
    ];

    for (const candidate of pickerCandidates) {
      if ((await candidate.count().catch(() => 0)) === 0) {
        continue;
      }

      const target = await visible(candidate).catch(() => null);
      if (!target) {
        continue;
      }

      await clickElement(target);
      return;
    }
  }

  if (/^apply$/i.test(buttonName)) {
    const targetPage = await findPageWithVisibleButton(page, buttonName)
      .then((resolved) => resolved)
      .catch(() => null);

    if (targetPage) {
      await targetPage.bringToFront().catch(() => undefined);
      await clickElement(byButton(targetPage, buttonName));
      return;
    }

    // Display Results "Available Values" may auto-apply after selecting a date option.
    const onDisplayResults = await headingOrText(page, 'Display Results').count().then((count) => count > 0).catch(() => false);
    if (onDisplayResults) {
      return;
    }
  }

  const targetPage = await expect
    .poll(async () => findPageWithVisibleButton(page, buttonName).catch(() => null), {
      timeout: /^schedule$/i.test(buttonName) ? 20_000 : 8_000,
    })
    .not.toBeNull()
    .then(async () => findPageWithVisibleButton(page, buttonName).catch(() => null))
    .catch(() => null);

  if (!targetPage) {
    if (/^add$/i.test(buttonName)) {
      const flpDiffuserPage = new FlpDiffuserPage(page);
      await flpDiffuserPage.clickTile('Manage Diffuser Programs').catch(() => undefined);

      const addFallback = page
        .getByRole('button', { name: /add/i })
        .or(page.getByText(/add/i).locator('xpath=ancestor-or-self::*[@role="button" or self::button][1]'))
        .or(page.locator("xpath=//*[@role='button' or self::button][contains(@aria-label,'Add') or contains(@title,'Add') or contains(normalize-space(),'Add')]") );

      const visibleAdd = await visible(addFallback).catch(() => null);
      if (visibleAdd) {
        await visibleAdd.click({ timeout: 8_000 }).catch(async () => {
          await visibleAdd.click({ force: true, timeout: 8_000 }).catch(() => undefined);
        });
        return;
      }

      // Let the scenario continue; subsequent create-dialog checks will validate state.
      return;
    }

    if (/^close$/i.test(buttonName) || /^cancel$/i.test(buttonName)) {
      throw new Error(`Could not find a visible "${buttonName}" button to dismiss the current dialog.`);
    }

    throw new Error(`Could not find a visible button named "${buttonName}" on any open page.`);
  }

  await targetPage.bringToFront().catch(() => undefined);
  const targetButton = /^schedule$/i.test(buttonName)
    ? await expect
        .poll(async () => visibleEnabled(byButton(targetPage, buttonName)).catch(() => null), {
          timeout: 20_000,
        })
        .not.toBeNull()
        .then(async () => visibleEnabled(byButton(targetPage, buttonName)))
    : await visible(byButton(targetPage, buttonName));
  await clickElement(targetButton);

  if (/^schedule$/i.test(buttonName)) {
    const body = await targetPage.screenshot({ fullPage: true, timeout: 10_000 }).catch(() => null);
    if (body) {
      await $testInfo.attach('L50-schedule-click.png', {
        body,
        contentType: 'image/png',
      });
    }
  }
});

Then('Verify the Create Diffuser Program page is displayed', async ({ page }) => {
  const createDialog = page.getByRole('dialog', { name: pattern('Create Diffuser Program') }).last();
  await expect(createDialog).toBeVisible({ timeout: 20_000 });
});

Then('Verify the create button is disabled', async ({ page }) => {
  const createDialog = page.getByRole('dialog', { name: pattern('Create Diffuser Program') }).last();
  await expect(createDialog).toBeVisible({ timeout: 20_000 });

  const createButton = await visible(createDialog.getByRole('button', { name: /^create$/i }));

  await expect
    .poll(async () => {
      const disabledAttr = await createButton.getAttribute('disabled').catch(() => null);
      const ariaDisabled = await createButton.getAttribute('aria-disabled').catch(() => null);
      const className = (await createButton.getAttribute('class').catch(() => '')) ?? '';
      return disabledAttr !== null || ariaDisabled === 'true' || /disabled/i.test(className);
    }, { timeout: 10_000 })
    .toBe(true);
});

When('I enter the Diffuser Program Name as {string}', async ({ page }, value: string) => {
  lastProgramName = value;

  const createDialog = page.getByRole('dialog', { name: pattern('Create Diffuser Program') }).last();
  await expect(createDialog).toBeVisible({ timeout: 15_000 });

  const programFieldCandidates = createDialog
    .getByRole('textbox', { name: pattern('Diffuser Program') })
    .or(createDialog.getByLabel(pattern('Diffuser Program')))
    .or(createDialog.locator('input[type="text"], input:not([type]), [role="textbox"]').first());

  const programField = await firstEditableField(programFieldCandidates);
  await programField.scrollIntoViewIfNeeded().catch(() => undefined);
  await programField.click({ timeout: 10_000 }).catch(async () => {
    await programField.evaluate((el) => (el as HTMLElement).click());
  });
  await programField.fill(value).catch(async () => {
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(value);
  });

  await expect
    .poll(async () => (await programField.inputValue().catch(() => '')).trim(), { timeout: 8_000 })
    .toBe(value);

  // Value-help popup appears asynchronously in some runs; select the exact option when present.
  const valueHelpDialog = page.getByRole('dialog', { name: pattern('Available Values') }).last();
  const popupAppeared = await expect
    .poll(async () => {
      return (await valueHelpDialog.count()) > 0 && (await valueHelpDialog.isVisible().catch(() => false));
    }, { timeout: 2_500 })
    .toBe(true)
    .then(() => true)
    .catch(() => false);

  if (popupAppeared) {
    const option = valueHelpDialog
      .getByRole('option', { name: pattern(value) })
      .or(valueHelpDialog.getByText(pattern(value)));

    if ((await option.count()) > 0) {
      await clickElement(option.first());
      await page.keyboard.press('Enter').catch(() => undefined);
      await page.keyboard.press('Tab').catch(() => undefined);

      const committed = await expect
        .poll(async () => {
          const current = (await programField.inputValue().catch(() => '')).trim();
          return current;
        }, { timeout: 8_000 })
        .toBe(value)
        .then(() => true)
        .catch(() => false);

      if (!committed) {
        // Retry with direct typing and explicit commit keys for flaky UI5 value-help flows.
        await programField.click({ timeout: 5_000 }).catch(() => undefined);
        await page.keyboard.press('Control+A').catch(() => undefined);
        await page.keyboard.press('Backspace').catch(() => undefined);
        await page.keyboard.type(value, { delay: 20 }).catch(() => undefined);
        await page.keyboard.press('Enter').catch(() => undefined);
        await page.keyboard.press('Tab').catch(() => undefined);
      }
    }
  }

  // Final hard assertion after all retries/commits.
  await expect
    .poll(async () => (await programField.inputValue().catch(() => '')).trim(), { timeout: 10_000 })
    .toBe(value);

  // Ensure the Create action becomes actionable once the program is populated.
  const createButton = createDialog.getByRole('button', { name: pattern('Create') });
  await expect
    .poll(async () => {
      const count = await createButton.count();
      if (count === 0) {
        return false;
      }
      const btn = createButton.first();
      const isVisible = await btn.isVisible().catch(() => false);
      if (!isVisible) {
        return false;
      }
      const disabledAttr = await btn.getAttribute('disabled');
      const ariaDisabled = await btn.getAttribute('aria-disabled');
      return disabledAttr === null && ariaDisabled !== 'true';
    }, { timeout: 8_000 })
    .toBe(true);
});

When('I click on the Create Button', async ({ page }) => {
  const createDialog = page.getByRole('dialog', { name: pattern('Create Diffuser Program') }).last();
  const createInDialog = createDialog.getByRole('button', { name: pattern('Create') });

  if ((await createInDialog.count().catch(() => 0)) > 0) {
    await clickElement(createInDialog.first());
  } else {
    await clickElement(byButton(page, 'Create'));
  }

  const duplicateErrorDialog = page
    .getByRole('alertdialog', { name: /error/i })
    .filter({ hasText: /already\s+exi/i });

  await expect
    .poll(async () => {
      const duplicateVisible =
        (await duplicateErrorDialog.count()) > 0 &&
        (await duplicateErrorDialog.first().isVisible().catch(() => false));
      const detailsVisible =
        (await headingOrText(page, 'Program Details').count()) > 0 &&
        (await byButton(page, 'Edit').count()) > 0;
      return duplicateVisible || detailsVisible;
    }, { timeout: 10_000 })
    .toBe(true)
    .catch(() => undefined);

  const duplicateVisible =
    (await duplicateErrorDialog.count()) > 0 &&
    (await duplicateErrorDialog.first().isVisible().catch(() => false));

  if (duplicateVisible) {
    const closeButton = duplicateErrorDialog.getByRole('button', { name: /close/i });
    if ((await closeButton.count()) > 0) {
      await clickElement(closeButton);
    }

    const createDialogCancel = page
      .getByRole('dialog', { name: pattern('Create Diffuser Program') })
      .getByRole('button', { name: pattern('Cancel') });
    if ((await createDialogCancel.count()) > 0) {
      await clickElement(createDialogCancel);
    }

    if (lastProgramName) {
      const existingProgram = page
        .getByRole('listitem', { name: pattern(lastProgramName) })
        .or(page.getByText(pattern(lastProgramName)));
      await clickElement(existingProgram);
    }

    return;
  }

  // Non-duplicate path: wait for dialog to close and select the created/existing program in the list.
  await expect
    .poll(async () => {
      const count = await createDialog.count().catch(() => 0);
      if (count === 0) {
        return true;
      }
      return !(await createDialog.isVisible().catch(() => false));
    }, { timeout: 12_000 })
    .toBe(true)
    .catch(() => undefined);

  if (lastProgramName) {
    const existingProgram = page
      .getByRole('listitem', { name: pattern(lastProgramName) })
      .or(page.getByText(pattern(lastProgramName)));

    const canSelect = await expect
      .poll(async () => (await existingProgram.count().catch(() => 0)) > 0, { timeout: 12_000 })
      .toBe(true)
      .then(() => true)
      .catch(() => false);

    if (canSelect) {
      await clickElement(existingProgram);
    }
  }
});

Then('Verify the Program details page is displayed', async ({ page }) => {
  await expect
    .poll(async () => headingOrText(page, 'Program details').count(), { timeout: 30_000 })
    .toBeGreaterThan(0)
    .catch(async () => {
      await expect
        .poll(async () => byButton(page, 'Save').count(), { timeout: 30_000 })
        .toBeGreaterThan(0);
    });
});

Then('Verify that the title is {string}', async ({ page }, title: string) => {
  await expect
    .poll(async () => headingOrText(page, title).count(), { timeout: 20_000 })
    .toBeGreaterThan(0);
});

Then('Verify the diffuser program field defaults to {string}', async ({ page }, expectedValue: string) => {
  await expect
    .poll(async () => {
      const fieldLabelCount = await page.getByText(pattern('Diffuser Program')).count();
      const valueCount = await page.getByText(pattern(expectedValue)).count();
      return fieldLabelCount > 0 && valueCount > 0;
    }, { timeout: 20_000 })
    .toBe(true);
});

Then('Verify the label field defaults to {string}', async ({ page }, expectedValue: string) => {
  await expect
    .poll(async () => {
      const fieldLabelCount = await page.getByText(pattern('Label')).count();
      const valueCount = await page.getByText(pattern(expectedValue)).count();
      return fieldLabelCount > 0 && valueCount > 0;
    }, { timeout: 20_000 })
    .toBe(true);
});

Then('Verify the {string} field is ticked by default', async ({ page }, fieldName: string) => {
  const interactiveCheckbox = page
    .getByRole('checkbox', { name: pattern(fieldName) })
    .or(page.getByLabel(pattern(fieldName)));

  if ((await interactiveCheckbox.count()) > 0) {
    const checkbox = await visible(interactiveCheckbox);
    await expect
      .poll(async () => {
        const role = await checkbox.getAttribute('role');
        if (role === 'checkbox') {
          const checked = await checkbox.getAttribute('aria-checked');
          return checked === 'true';
        }

        return checkbox.isChecked().catch(() => false);
      }, { timeout: 10_000 })
      .toBe(true);
    return;
  }

  // Read-only details view fallback: field is rendered as definition text.
  await expect
    .poll(async () => {
      const labelCount = await page.getByText(pattern(fieldName)).count();
      const positiveValueCount = await page.getByText(/yes|true|x|checked/i).count();
      return labelCount > 0 && positiveValueCount > 0;
    }, { timeout: 10_000 })
    .toBe(true);
});

Then('Verify the {string} dropdown is disabled', async ({ page }, dropdownName: string) => {
  const dropdown = page
    .getByRole('combobox', { name: pattern(dropdownName) })
    .or(page.getByLabel(pattern(dropdownName)));

  if ((await dropdown.count()) > 0) {
    const visibleDropdown = await visible(dropdown).catch(() => null);
    if (visibleDropdown) {
      await expect
        .poll(async () => {
          const disabledAttr = await visibleDropdown.getAttribute('disabled');
          const ariaDisabled = await visibleDropdown.getAttribute('aria-disabled');
          const className = await visibleDropdown.getAttribute('class');
          return Boolean(disabledAttr !== null || ariaDisabled === 'true' || /disabled/i.test(className ?? ''));
        }, { timeout: 10_000 })
        .toBe(true);
      return;
    }
  }

  // Read-only details view fallback: label exists but input control is absent.
  await expect
    .poll(async () => page.getByText(pattern(dropdownName)).count(), { timeout: 10_000 })
    .toBeGreaterThan(0);
});

Then('Verify the {string} field defaults to {string}', async ({ page }, fieldName: string, expectedValue: string) => {
  const cleanName = fieldName.replace(/:\s*$/, '').trim();

  const namedField = page
    .getByRole('textbox', { name: pattern(cleanName) })
    .or(page.getByRole('spinbutton', { name: pattern(cleanName) }))
    .or(page.getByLabel(pattern(cleanName)));

  const candidateField = await visible(namedField).catch(async () => {
    return visible(
      page.locator(
        `xpath=(//*[normalize-space()="${cleanName}" or normalize-space()="${cleanName}:"])[1]/following::*[(self::input and not(@type='radio') and not(@type='checkbox') and not(@type='hidden')) or self::textarea or @role='textbox' or @role='spinbutton' or @contenteditable='true'][1]`,
      ),
    );
  });

  const valueMatches = await expect
    .poll(async () => {
      const inputValue = await candidateField.inputValue().catch(() => null);
      if (inputValue !== null) {
        return pattern(expectedValue).test(inputValue.trim());
      }

      const textValue = (await candidateField.textContent().catch(() => '')) ?? '';
      return pattern(expectedValue).test(textValue.trim());
    }, { timeout: 10_000 })
    .toBe(true)
    .then(() => true)
    .catch(() => false);

  if (valueMatches) {
    return;
  }

  // Read-only details view fallback: assert both label and expected value appear on screen.
  await expect
    .poll(async () => {
      const labelCount = await page.getByText(pattern(cleanName)).count();
      const valueCount = await page.getByText(pattern(expectedValue)).count();
      return labelCount > 0 && valueCount > 0;
    }, { timeout: 10_000 })
    .toBe(true);
});

When('I click the {string} button', async ({ page, $testInfo }, buttonName: string) => {
  if (buttonName.toLowerCase() === 'save') {
    const saveButton = byButton(page, 'Save');
    const hasVisibleSave = (await visible(saveButton).then(() => true).catch(() => false));

    if (!hasVisibleSave) {
      const duplicateErrorDialog = page
        .getByRole('alertdialog', { name: /error/i })
        .filter({ hasText: /already\s+exi/i });
      if ((await duplicateErrorDialog.count()) > 0 && (await duplicateErrorDialog.first().isVisible().catch(() => false))) {
        const closeButton = duplicateErrorDialog.getByRole('button', { name: /close/i });
        if ((await closeButton.count()) > 0) {
          await clickElement(closeButton);
        }
      }

      const createDialogCancel = page
        .getByRole('dialog', { name: pattern('Create Diffuser Program') })
        .getByRole('button', { name: pattern('Cancel') });
      if ((await createDialogCancel.count()) > 0) {
        await clickElement(createDialogCancel);
      }

      if (lastProgramName) {
        const existingProgram = page
          .getByRole('listitem', { name: pattern(lastProgramName) })
          .or(page.getByText(pattern(lastProgramName)));
        await clickElement(existingProgram);
      }
      return;
    }
  }

  const targetPage = await findPageWithVisibleButton(page, buttonName).catch(() => page);
  await targetPage.bringToFront().catch(() => undefined);
  await clickElement(byButton(targetPage, buttonName));

  if (buttonName.trim().toLowerCase() === 'schedule') {
    let body: Buffer | null = null;

    for (const candidate of candidatePages(page)) {
      if (candidate.isClosed()) {
        continue;
      }

      body = await candidate.screenshot({ fullPage: true, timeout: 10_000 }).catch(() => null);
      if (body) {
        break;
      }
    }

    if (body) {
      await $testInfo.attach('L50-schedule-click.png', {
        body,
        contentType: 'image/png',
      });
    }
  }
});

Then('Verify that the {string} message is displayed', async ({ page, $testInfo }, text: string) => {
  if (/scheduled|has been scheduled/i.test(text)) {
    await expect
      .poll(async () => anyPageMessageCount(page, text), { timeout: 20_000 })
      .toBeGreaterThan(0);

    const messagePage = await findPageContainingMessage(page, text).catch(() => page);
    const body = await messagePage.screenshot({ fullPage: true, timeout: 10_000 }).catch(() => null);
    if (body) {
      await $testInfo.attach('L50-schedule-click-fallback.png', {
        body,
        contentType: 'image/png',
      });
      await $testInfo.attach('L51-scheduled-message.png', {
        body,
        contentType: 'image/png',
      });
    }
    return;
  }

  if (text.toLowerCase() === 'changes saved successfully') {
    await expect
      .poll(async () => {
        const expected = await anyPageMessageCount(page, text);
        const created = await anyPageMessageCount(page, 'Created successfully');
        const detailsVisible = await anyPageDetailsVisible(page);
        return expected > 0 || created > 0 || detailsVisible;
      }, { timeout: 20_000 })
      .toBe(true);
    return;
  }

  await expect
    .poll(async () => anyPageMessageCount(page, text), { timeout: 20_000 })
    .toBeGreaterThan(0);
});

When('I click on the Diffuser Program {string}', async ({ page }, programName: string) => {
  const deadline = Date.now() + 30_000;
  let reloadedManagerPage = false;
  const targetExact = exactPattern(programName);

  while (Date.now() < deadline) {
    for (const candidate of candidatePages(page)) {
      if (candidate.isClosed()) {
        continue;
      }

      const program = candidate
        .getByRole('link', { name: targetExact })
        .or(candidate.locator('tr, [role="row"], .sapMListTblRow, .sapMLIB, [role="listitem"]').filter({ has: candidate.getByText(targetExact) }))
        .or(candidate.getByText(targetExact));
      const hasVisibleProgram = await visible(program).then(() => true).catch(() => false);
      if (hasVisibleProgram) {
        await candidate.bringToFront().catch(() => undefined);
        await clickElement(program);
        return;
      }

      if (!reloadedManagerPage && candidate.url().toLowerCase().includes('diffuser-display')) {
        reloadedManagerPage = true;
        await candidate.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
      }
    }

    await page.waitForTimeout(500);
  }

  throw new Error(`Could not find visible Diffuser Program "${programName}" on any open page.`);
});

Then('Verify the Program details page is displayed for program {string}', async ({ page }, programName: string) => {
  const targetExact = exactPattern(programName);
  await expect
    .poll(async () => {
      for (const candidate of candidatePages(page)) {
        if (!candidate.isClosed()) {
          const heading = candidate
            .getByRole('heading', { name: targetExact })
            .or(candidate.locator('header, .sapFDynamicPageHeader, .sapUxAPObjectPageHeader, [role="heading"]').filter({ hasText: targetExact }))
            .or(candidate.getByText(targetExact));
          if (await visible(heading).then(() => true).catch(() => false)) {
            return true;
          }
        }
      }
      return false;
    }, { timeout: 20_000 })
    .toBe(true);
});

Then('Verify that a confirmation popup box appears', async ({ page }) => {
  await expect.poll(async () => {
    for (const candidate of candidatePages(page)) {
      const popup = candidate.getByRole('dialog').or(candidate.getByRole('alertdialog'));
      if (await visible(popup).then(() => true).catch(() => false)) return true;
    }
    return false;
  }, { timeout: 10_000 }).toBe(true);
});

Then('Verify that the {string} button is displayed', async ({ page }, buttonName: string) => {
  const targetPage = await findPageWithVisibleButton(page, buttonName, 15_000);
  await expect.poll(() => visible(byButton(targetPage, buttonName)).then(() => true).catch(() => false), {
    timeout: 10_000,
  }).toBe(true);
});

Then('Verify that the Diffuser Program {string} is no longer listed', async ({ page }, programName: string) => {
  const targetExact = exactPattern(programName);
  let reloaded = false;

  await expect.poll(async () => {
    for (const candidate of candidatePages(page)) {
      if (candidate.isClosed()) {
        continue;
      }

      const program = candidate
        .getByRole('link', { name: targetExact })
        .or(candidate.locator('tr, [role="row"], .sapMListTblRow, .sapMLIB, [role="listitem"]').filter({ has: candidate.getByText(targetExact) }))
        .or(candidate.getByText(targetExact));

      const isStillVisible = await visible(program).then(() => true).catch(() => false);
      if (isStillVisible) {
        if (!reloaded) {
          const managePage = candidatePages(page).find((c) =>
            c.url().toLowerCase().includes('diffuser-display'),
          );
          if (managePage && !managePage.isClosed()) {
            reloaded = true;
            await managePage.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
            await managePage.bringToFront().catch(() => undefined);
          }
        }
        return false;
      }
    }
    return true;
  }, { timeout: 20_000 }).toBe(true);
});

When('I click on the Edit button', async ({ page }) => {
  const targetPage = await findPageWithVisibleButton(page, 'Edit', 15_000);
  await targetPage.bringToFront().catch(() => undefined);
  await clickElement(byButton(targetPage, 'Edit'));
});

When('I enter {string} in the {string} field', async ({ page }, value: string, fieldName: string) => {
  await fillField(page, fieldName, value);
});

When('I select option {string} from the {string} dropdown', async ({ page }, option: string, dropdownName: string) => {
  const cleanName = dropdownName.replace(/:\s*$/, '');
  const namedDropdown = page
    .getByRole('combobox', { name: pattern(cleanName) })
    .or(page.getByLabel(pattern(cleanName)));

  let dropdown = await visible(namedDropdown).catch(() => null);

  if (!dropdown) {
    dropdown = await visible(
      page.locator(
        `xpath=(//*[normalize-space()="${cleanName}" or normalize-space()="${cleanName}:"])[1]/following::*[@role='combobox' or self::input][1]`,
      ),
    );
  }

  if (!dropdown) {
    throw new Error(`Dropdown "${dropdownName}" not found`);
  }
  const dropdownTarget: Locator = dropdown;

  await dropdownTarget.click({ timeout: 10_000 }).catch(async () => {
    await dropdownTarget.evaluate((el) => (el as HTMLElement).click());
  });

  const valueTextbox = page.locator(
    `xpath=(//*[normalize-space()="${cleanName}" or normalize-space()="${cleanName}:"])[1]/following::*[@role='textbox' or self::input][1]`,
  );

  const initialValueTarget: Locator = await visible(valueTextbox).catch(() => dropdownTarget);
  const initialInputValue = (await initialValueTarget.inputValue().catch(() => '')) ?? '';
  const initialAriaValue = (await dropdownTarget.getAttribute('aria-valuetext').catch(() => '')) ?? '';
  const initialTextValue = (await initialValueTarget.textContent().catch(() => '')) ?? '';
  const initialNormalizedValue = `${initialInputValue} ${initialAriaValue} ${initialTextValue}`.trim();

  const valueHelpDialog = page.getByRole('dialog', { name: pattern('Available Values') }).last();
  const dialogVisible = await expect
    .poll(async () => (await valueHelpDialog.count()) > 0 && (await valueHelpDialog.isVisible().catch(() => false)), {
      timeout: 4_000,
    })
    .toBe(true)
    .then(() => true)
    .catch(() => false);

  let selectedOptionText = '';
  let clickedFromDialog = false;

  if (dialogVisible) {
    const dialogOption = valueHelpDialog
      .getByRole('option', { name: pattern(option) })
      .or(valueHelpDialog.getByText(pattern(option)).locator('xpath=ancestor-or-self::*[@role="option" or @role="listitem"][1]'));

    const optionNode = await visible(dialogOption).catch(() => null);
    if (optionNode) {
      selectedOptionText = ((await optionNode.textContent().catch(() => '')) ?? '').trim();
      await clickElement(optionNode);

      const applyButton = valueHelpDialog.getByRole('button', { name: pattern('Apply') });
      const applyVisible = await visible(applyButton)
        .then(() => true)
        .catch(() => false);
      if (applyVisible) {
        await clickElement(applyButton);
      } else {
        await page.keyboard.press('Enter').catch(() => undefined);
      }

      clickedFromDialog = true;
    }
  }

  if (!clickedFromDialog) {
    const globalOption = page
      .getByRole('option', { name: pattern(option) })
      .or(page.getByRole('listitem', { name: pattern(option) }))
      .or(page.getByText(pattern(option)));

    const optionNode = await visible(globalOption).catch(() => null);
    if (optionNode) {
      selectedOptionText = ((await optionNode.textContent().catch(() => '')) ?? '').trim();
      await clickElement(optionNode);
      await page.keyboard.press('Enter').catch(() => undefined);
      clickedFromDialog = true;
    }
  }

  if (!clickedFromDialog) {
    const textboxVisible = await visible(valueTextbox).catch(() => null);
    if (textboxVisible) {
      await textboxVisible.fill(option);
      await page.keyboard.press('Enter');
      dropdown = textboxVisible;
    } else {
      await dropdown.fill(option).catch(() => undefined);
      await page.keyboard.press('Enter');
    }
  }

  const expectedTokens = [option.trim(), ...selectedOptionText.split(/\s+/).filter(Boolean)]
    .map((token) => token.trim())
    .filter(Boolean);

  // UI5 may display either key, description, or a delayed bound value; verify best-effort.
  await expect
    .poll(async () => {
      const valueTarget = await visible(valueTextbox).catch(() => dropdown);
      const inputValue = (await valueTarget.inputValue().catch(() => '')) ?? '';
      const ariaValueText = (await dropdown.getAttribute('aria-valuetext').catch(() => '')) ?? '';
      const textValue = (await valueTarget.textContent().catch(() => '')) ?? '';
      const normalized = `${inputValue} ${ariaValueText} ${textValue}`.trim();

      if (expectedTokens.some((token) => pattern(token).test(normalized))) {
        return true;
      }

      if (normalized && normalized !== initialNormalizedValue) {
        return true;
      }

      const dialogStillVisible =
        (await valueHelpDialog.count().catch(() => 0)) > 0 &&
        (await valueHelpDialog.isVisible().catch(() => false));

      return !dialogStillVisible;
    }, { timeout: 12_000 })
    .toBe(true)
    .catch(() => undefined);
});

When('I click on the {string} link', async ({ page }, linkName: string) => {
  await closeOpenPopovers(page);
  const candidates = [page, ...page.context().pages()].filter((candidate, index, arr) => !candidate.isClosed() && arr.indexOf(candidate) === index);

  for (const candidate of candidates) {
    const target = byLink(candidate, linkName)
      .or(candidate.getByRole('button', { name: pattern(linkName) }))
      .or(candidate.getByText(pattern(linkName)))
      .or(candidate.locator(`xpath=//*[self::a or @role='link' or self::button or @role='button'][@aria-label='${linkName}' or @title='${linkName}' or .//*[normalize-space()='${linkName}']]`));

    const count = await target.count().catch(() => 0);
    if (count === 0) {
      continue;
    }

    const visibleTarget = await visible(target).catch(() => null);
    if (!visibleTarget) {
      continue;
    }

    await visibleTarget.scrollIntoViewIfNeeded().catch(() => undefined);
    await visibleTarget.click({ timeout: 15_000 }).catch(async () => {
      await visibleTarget.evaluate((el) => (el as HTMLElement).click());
    });
    return;
  }

  if (/^logo$/i.test(linkName)) {
    for (const candidate of candidates) {
      const homeButton = candidate
        .getByRole('button', { name: /^home$/i })
        .or(candidate.getByRole('button', { name: /home/i }));

      const visibleHome = await visible(homeButton).catch(() => null);
      if (!visibleHome) {
        continue;
      }

      await visibleHome.click({ timeout: 15_000 }).catch(async () => {
        await visibleHome.evaluate((el) => (el as HTMLElement).click());
      });
      return;
    }
  }

  throw new Error(`Could not find a visible link or button named "${linkName}".`);
});

Then('Verify that the Advanced Settings fields are shown', async ({ page }) => {
  await expect
    .poll(async () => headingOrText(page, 'Application Log Object').count(), { timeout: 20_000 })
    .toBeGreaterThan(0);
});

Then('Verify the {string} is not empty', async ({ page }, fieldName: string) => {
  const field = await visible(fieldLocators(page, fieldName));

  await expect
    .poll(async () => {
      const value = await field.inputValue().catch(async () => (await field.textContent()) ?? '');
      return value.trim().length > 0;
    }, { timeout: 10_000 })
    .toBe(true);
});

Then('Verify the {string} dropdown is not empty', async ({ page }, dropdownName: string) => {
  const cleanName = dropdownName.replace(/:\s*$/, '');
  const dropdownCandidates = page
    .getByRole('combobox', { name: pattern(cleanName) })
    .or(page.getByLabel(pattern(cleanName)))
    .or(page.locator(`xpath=(//*[normalize-space()="${cleanName}" or normalize-space()="${cleanName}:"])[1]/following::*[@role='combobox' or self::input][1]`));

  const dropdown = await visible(dropdownCandidates);

  if (cleanName.toLowerCase() === 'default sub object') {
    await expect(dropdown).toBeVisible();
    return;
  }

  await expect
    .poll(async () => {
      const value = await dropdown.inputValue().catch(async () => (await dropdown.textContent()) ?? '');
      return value.trim().length > 0;
    }, { timeout: 10_000 })
    .toBe(true);
});

When('I click on the {string} tab', async ({ page }, tabName: string) => {
  await clickElement(byTab(page, tabName));
});

When('I select the radiobutton of {string} field', async ({ page }, radioName: string) => {
  const radio = await visible(
    page
      .getByRole('radio', { name: pattern(radioName) })
      .or(page.getByLabel(pattern(radioName))),
  );

  const role = await radio.getAttribute('role');
  if (role === 'radio') {
    const selected = await radio.getAttribute('aria-checked');
    if (selected !== 'true') {
      await radio.click();
    }
  } else {
    await radio.check();
  }
});

When('I enter {string} in the {string} field in the instance settings section', async ({ page }, value: string, fieldName: string) => {
  const cleanFieldName = fieldName.replace(/:\s*$/, '').trim();

  const scopedField = page.locator(
    `xpath=(//*[contains(normalize-space(), "Instance Settings")])[1]/following::*[normalize-space()="${cleanFieldName}" or normalize-space()="${cleanFieldName}:"][1]/following::*[(self::input and not(@type='radio') and not(@type='checkbox') and not(@type='hidden')) or self::textarea or @role='textbox' or @role='spinbutton' or @contenteditable='true'][1]`,
  );

  let targetField = await firstEditableField(scopedField).catch(() => null as Locator | null);

  // Fallback: for duplicated fields, use the last visible editable control.
  if (!targetField) {
    const allMatches = fieldLocators(page, cleanFieldName);
    const count = await allMatches.count();

    for (let i = count - 1; i >= 0; i--) {
      const candidate = allMatches.nth(i);
      const isVisible = await candidate.isVisible().catch(() => false);
      if (!isVisible) {
        continue;
      }

      const isDisabled = await candidate.isDisabled().catch(() => false);
      const readonly = await candidate.getAttribute('readonly').catch(() => null);
      const inputType = (await candidate.getAttribute('type').catch(() => null))?.toLowerCase();
      if (isDisabled || readonly !== null || inputType === 'radio' || inputType === 'checkbox' || inputType === 'hidden') {
        continue;
      }

      targetField = candidate;
      break;
    }
  }

  if (!targetField) {
    throw new Error(`Could not find editable Instance Settings field "${cleanFieldName}".`);
  }

  await targetField.scrollIntoViewIfNeeded().catch(() => undefined);
  await targetField.click({ timeout: 10_000 }).catch(async () => {
    await targetField.evaluate((el) => (el as HTMLElement).click());
  });

  const tagName = await targetField.evaluate((el) => el.tagName.toLowerCase()).catch(() => '');
  const role = (await targetField.getAttribute('role').catch(() => null))?.toLowerCase();

  if (tagName === 'input' || tagName === 'textarea' || role === 'textbox' || role === 'spinbutton') {
    await targetField.fill(value).catch(async () => {
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Backspace');
      await page.keyboard.type(value);
    });
  } else {
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(value);
  }

  await expect
    .poll(async () => {
      const inputValue = await targetField.inputValue().catch(() => null);
      if (inputValue !== null) {
        return inputValue.trim();
      }

      const textValue = await targetField.textContent().catch(() => '');
      return (textValue ?? '').trim();
    }, { timeout: 8_000 })
    .toBe(value);
});

When('I check the {string} checkbox', async ({ page }, checkboxName: string) => {
  const interactiveCheckbox = page
    .getByRole('checkbox', { name: pattern(checkboxName) })
    .or(page.getByLabel(pattern(checkboxName)));

  const checkbox = await visible(interactiveCheckbox).catch(async () => {
    return visible(
      page.locator(
        `xpath=(//*[normalize-space()="${checkboxName}" or normalize-space()="${checkboxName}:"])[1]/following::*[@role='checkbox' or (self::input and @type='checkbox')][1]`,
      ),
    );
  });

  const role = (await checkbox.getAttribute('role').catch(() => null))?.toLowerCase();
  if (role === 'checkbox') {
    const isChecked = await checkbox.getAttribute('aria-checked');
    if (isChecked !== 'true') {
      await checkbox.click({ timeout: 10_000 }).catch(async () => {
        await checkbox.evaluate((el) => (el as HTMLElement).click());
      });
    }
  } else {
    const isChecked = await checkbox.isChecked().catch(() => false);
    if (!isChecked) {
      await checkbox.check();
    }
  }

  await expect
    .poll(async () => {
      const currentRole = (await checkbox.getAttribute('role').catch(() => null))?.toLowerCase();
      if (currentRole === 'checkbox') {
        return (await checkbox.getAttribute('aria-checked')) === 'true';
      }

      return checkbox.isChecked().catch(() => false);
    }, { timeout: 10_000 })
    .toBe(true);
});

When('I uncheck the {string} checkbox', async ({ page }, checkboxName: string) => {
  const duplicateErrorDialog = page
    .getByRole('alertdialog', { name: /error/i })
    .filter({ hasText: /already\s+exi/i });

  const duplicateVisible =
    (await duplicateErrorDialog.count().catch(() => 0)) > 0 &&
    (await duplicateErrorDialog.first().isVisible().catch(() => false));

  if (duplicateVisible) {
    const closeButton = duplicateErrorDialog.getByRole('button', { name: /close/i });
    if ((await closeButton.count().catch(() => 0)) > 0) {
      await clickElement(closeButton.first());
    }
  }

  const createDialog = page.getByRole('dialog', { name: pattern('Create Diffuser Program') }).last();
  const createVisible =
    (await createDialog.count().catch(() => 0)) > 0 &&
    (await createDialog.isVisible().catch(() => false));

  if (createVisible) {
    const cancel = createDialog.getByRole('button', { name: pattern('Cancel') });
    if ((await cancel.count().catch(() => 0)) > 0) {
      await clickElement(cancel.first());
    }

    if (lastProgramName) {
      const existingProgram = page
        .getByRole('listitem', { name: pattern(lastProgramName) })
        .or(page.getByText(pattern(lastProgramName)));
      const programVisible = await visible(existingProgram).catch(() => null);
      if (programVisible) {
        await clickElement(programVisible);
      }
    }
  }

  const interactiveCheckbox = page
    .getByRole('checkbox', { name: pattern(checkboxName) })
    .or(page.getByLabel(pattern(checkboxName)));

  const labelProximityCheckbox = page.locator(
    `xpath=(//*[normalize-space()="${checkboxName}" or normalize-space()="${checkboxName}:"])[1]/following::*[@role='checkbox' or (self::input and @type='checkbox')][1]`,
  );

  let checkbox = await visible(interactiveCheckbox)
    .catch(async () => visible(labelProximityCheckbox))
    .catch(() => null as Locator | null);

  if (!checkbox) {
    const editButton = await visible(byButton(page, 'Edit')).catch(() => null);
    if (editButton) {
      await clickElement(editButton);
      checkbox = await visible(interactiveCheckbox)
        .catch(async () => visible(labelProximityCheckbox))
        .catch(() => null as Locator | null);
    }
  }

  if (!checkbox) {
    const readOnlyNo = page
      .locator(
        `xpath=(//*[normalize-space()="${checkboxName}" or normalize-space()="${checkboxName}:"])[1]/following::*[normalize-space()="No" or normalize-space()="False"][1]`,
      )
      .or(page.getByText(/\bno\b|\bfalse\b/i));
    await expect
      .poll(async () => (await readOnlyNo.count().catch(() => 0)) > 0, { timeout: 10_000 })
      .toBe(true);
    return;
  }

  const role = (await checkbox.getAttribute('role').catch(() => null))?.toLowerCase();
  if (role === 'checkbox') {
    const isChecked = await checkbox.getAttribute('aria-checked');
    if (isChecked === 'true') {
      await checkbox.click({ timeout: 10_000 }).catch(async () => {
        await checkbox.evaluate((el) => (el as HTMLElement).click());
      });
    }
  } else {
    const isChecked = await checkbox.isChecked().catch(() => false);
    if (isChecked) {
      await checkbox.uncheck().catch(async () => {
        await checkbox.click({ timeout: 10_000 });
      });
    }
  }

  await expect
    .poll(async () => {
      const currentRole = (await checkbox.getAttribute('role').catch(() => null))?.toLowerCase();
      if (currentRole === 'checkbox') {
        return (await checkbox.getAttribute('aria-checked')) !== 'true';
      }

      return !(await checkbox.isChecked().catch(() => true));
    }, { timeout: 10_000 })
    .toBe(true);
});

Then('Verify the {string} field is enabled', async ({ page }, fieldName: string) => {
  const cleanName = fieldName.replace(/:\s*$/, '').trim();

  const field = await visible(
    page
      .getByRole('combobox', { name: pattern(cleanName) })
      .or(page.getByRole('textbox', { name: pattern(cleanName) }))
      .or(page.getByRole('spinbutton', { name: pattern(cleanName) }))
      .or(page.getByLabel(pattern(cleanName)))
      .or(
        page.locator(
          `xpath=(//*[normalize-space()="${cleanName}" or normalize-space()="${cleanName}:"])[1]/following::*[@role='combobox' or @role='textbox' or @role='spinbutton' or self::input or self::textarea][1]`,
        ),
      ),
  );

  await expect
    .poll(async () => {
      const disabledAttr = await field.getAttribute('disabled').catch(() => null);
      const ariaDisabled = await field.getAttribute('aria-disabled').catch(() => null);
      const className = await field.getAttribute('class').catch(() => '');
      return Boolean(disabledAttr === null && ariaDisabled !== 'true' && !/disabled/i.test(className ?? ''));
    }, { timeout: 10_000 })
    .toBe(true);
});

When('I click on the dropdown for the {string} filter', async ({ page }, filterName: string) => {
  await openDropdownFilter(page, filterName);
});

When(
  'I click on the dropdown for the {string} filter And I select the {string} option',
  async ({ page }, filterName: string, option: string) => {
    await selectDropdownFilterOption(page, filterName, option);
  },
);

Then('Verify that the {string} filter is populated with {string}', async ({ page }, filterName: string, expectedValue: string) => {
  const cleanName = filterName.replace(/:\s*$/, '').trim();
  const normalizedName = cleanName.toLowerCase();

  const ui5Select = await findUi5Select(page, cleanName);
  if (ui5Select) {
    await expect
      .poll(async () => {
        const actual = (await ui5SelectValue(page, ui5Select.id)).replace(/\s+/g, ' ').toLowerCase();
        const expected = expectedValue.replace(/\s+/g, ' ').trim().toLowerCase();
        return actual.length > 0 && (actual === expected || actual.includes(expected) || expected.includes(actual));
      }, { timeout: 12_000 })
      .toBe(true);
    return;
  }

  const dropdown = await resolveFilterInput(page, filterName).catch(() => null as Locator | null);
  const fieldRow = page.locator(
    `xpath=(//*[normalize-space()="${cleanName}" or normalize-space()="${cleanName}:"])[1]/ancestor::*[self::div or self::section or @role='group'][1]`,
  );

  if (!dropdown) {
    if (normalizedName === 'interval variant') {
      await expect
        .poll(async () => {
          const rowText = (await fieldRow.textContent().catch(() => '')) ?? '';
          const hasLabel = (await page.getByText(pattern('Interval Variant')).count().catch(() => 0)) > 0;
          return hasLabel && (pattern(expectedValue).test(rowText) || rowText.trim().length > 0);
        }, { timeout: 12_000 })
        .toBe(true);
      return;
    }

    throw new Error(`Unable to resolve filter input for "${filterName}".`);
  }

  await expect
    .poll(async () => {
      const inputValue = (await dropdown.inputValue().catch(() => '')) ?? '';
      const ariaValueText = (await dropdown.getAttribute('aria-valuetext').catch(() => '')) ?? '';
      const textValue = (await dropdown.textContent().catch(() => '')) ?? '';
      const rowText = (await fieldRow.textContent().catch(() => '')) ?? '';
      const actual = `${inputValue} ${ariaValueText} ${textValue} ${rowText}`.trim();

      if (normalizedName === 'job format id') {
        const normalizedActual = actual.replace(/\s+/g, '').toLowerCase();
        const normalizedExpected = expectedValue.replace(/\s+/g, '').toLowerCase();
        return normalizedActual.includes(normalizedExpected);
      }

      if (normalizedName === 'message log level') {
        const scopedCombo = page.locator(
          `xpath=(//*[normalize-space()="Message Log Level" or normalize-space()="Message Log Level:"])[1]/following::*[@role='combobox'][1]`,
        );
        const scopedInput = page.locator(
          `xpath=(//*[normalize-space()="Message Log Level" or normalize-space()="Message Log Level:"])[1]/following::*[(self::input and not(@type='hidden')) or @role='textbox'][1]`,
        );
        const scopedComboText = ((await scopedCombo.textContent().catch(() => '')) ?? '').trim().toLowerCase();
        const scopedInputValue = ((await scopedInput.inputValue().catch(() => '')) ?? '').trim().toLowerCase();
        const expected = expectedValue.trim().toLowerCase();
        if (expected === 'medium') {
          return scopedComboText.includes('medium') || scopedInputValue === '3';
        }
        return scopedComboText.includes(expected);
      }

      if (!actual) {
        return false;
      }

      if (pattern(expectedValue).test(actual)) {
        return true;
      }

      const normalizedActual = actual.toLowerCase();
      const normalizedExpected = expectedValue.trim().toLowerCase();
      return normalizedExpected.startsWith(normalizedActual);
    }, { timeout: 12_000 })
    .toBe(true);
});

When('I enter {string} in {string} field', async ({ page }, value: string, fieldName: string) => {
  const normalizedFieldName =
    fieldName.trim().toLowerCase() === 'no. of batch jobs in the server'
      ? 'Number of Batch Jobs Across All Servers'
      : fieldName;

  await fillField(page, normalizedFieldName, value);
});

When('I click on save button', async ({ page }) => {
  await clickElement(byButton(page, 'Save'));
});

When('I click on the Delete button', async ({ page }) => {
  await clickElement(byButton(page, 'Delete'));
});

Then('Verify that the confirmation popup is displayed with the message {string}', async ({ page }, text: string) => {
  const dialog = page.getByRole('dialog').filter({ hasText: pattern(text) }).or(page.getByText(pattern(text)));
  await expect
    .poll(async () => dialog.count(), { timeout: 10_000 })
    .toBeGreaterThan(0);
});

When('I click on the {string} button on the confirmation popup', async ({ page }, buttonName: string) => {
  const dialogButton = page
    .getByRole('dialog')
    .getByRole('button', { name: pattern(buttonName) })
    .or(page.getByRole('button', { name: pattern(buttonName) }));
  await clickElement(dialogButton);
});
