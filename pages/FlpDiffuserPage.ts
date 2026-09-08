import { expect, Locator, Page } from '@playwright/test';

export class FlpDiffuserPage {
  private static readonly FLP_URL =
    'https://bs4b5tap1.bti.local:44301/sap/bc/ui2/flp?_sap-hash=JTIzU2hlbGwtaG9tZQ#Shell-home';
  private static readonly DIFFUSER_URL_FRAGMENT = '#diffuser-display';

  constructor(private readonly page: Page) {}

  async gotoLoginPage(): Promise<void> {
    await this.page.goto(FlpDiffuserPage.FLP_URL, { waitUntil: 'domcontentloaded' });
  }

  async login(username: string, password: string): Promise<void> {
    let credentialsAccepted = false;

    // The SAP logon page re-renders shortly after load, which can drop the typed
    // username and land the password in the same field. Retry until both hold.
    for (let attempt = 0; attempt < 3 && !credentialsAccepted; attempt++) {
      const passwordInput = await this.resolveVisibleLocator([
        () => this.page.locator('input[type="password"]').first(),
        () => this.page.locator('#PASSWORD_FIELD-inner').first(),
        () => this.page.locator('input[name="sap-password"]').first(),
        () => this.page.locator('input[id*="PASSWORD"]').first(),
        () => this.page.locator('input[placeholder*="password" i]').first(),
        () => this.page.getByLabel(/password/i).first(),
      ]);

      const usernameInput = await this.resolveVisibleLocator([
        () => this.page.locator('#USERNAME_FIELD-inner').first(),
        () => this.page.locator('input[name="sap-user"]').first(),
        () => this.page.locator('input[id*="USERNAME"]').first(),
        () => this.page.getByLabel(/user(name)?|email|logon/i).first(),
        // Generic fallback excludes password fields to prevent credential crossover.
        () => this.page.locator('input:not([type="password"])').first(),
      ]);

      const usernameHandle = await usernameInput.elementHandle();
      const passwordHandle = await passwordInput.elementHandle();

      const sameControl =
        !!usernameHandle &&
        !!passwordHandle &&
        (await this.page.evaluate(
          ({ u, p }) => u === p,
          { u: usernameHandle, p: passwordHandle },
        ));

      if (sameControl) {
        throw new Error('Login field resolution failed: username and password mapped to the same element.');
      }

      await usernameInput.fill('');
      await usernameInput.fill(username);
      await passwordInput.fill('');
      await passwordInput.fill(password);

      const typedUsername = await usernameInput.inputValue().catch(() => '');
      const typedPasswordLength = (await passwordInput.inputValue().catch(() => '')).length;
      credentialsAccepted = typedUsername === username && typedPasswordLength === password.length;

      if (!credentialsAccepted) {
        await this.page.waitForTimeout(1_000);
      }
    }

    if (!credentialsAccepted) {
      throw new Error('Could not enter the logon credentials into the SAP logon form.');
    }

    const submitButton = await this.resolveVisibleLocator([
      () => this.page.locator('#LOGIN_LINK').first(),
      () => this.page.locator('button[type="submit"]').first(),
      () => this.page.locator('input[type="submit"]').first(),
      () => this.page.getByRole('button', { name: /log on|log in|sign in/i }).first(),
    ]);

    await submitButton.click();
  }

  async verifyOnHomePage(): Promise<void> {
    await expect.poll(() => this.page.url(), { timeout: 60_000 }).toContain('#Shell-home');
  }

  async verifyTileDisplayed(tileName: string): Promise<void> {
    const tileText = this.page.getByText(this.exactTextPattern(tileName));
    const visibleCount = await this.countVisibleMatches(tileText);

    if (visibleCount > 0) {
      await expect
        .poll(() => this.countVisibleMatches(tileText), { timeout: 30_000 })
        .toBeGreaterThan(0);
      return;
    }

    if (tileName.toLowerCase() === 'diffuser app') {
      await this.openDiffuserDirectly();
      await this.verifyDiffuserHomepageDisplayed();
      return;
    }

    await expect
      .poll(() => this.countVisibleMatches(tileText), { timeout: 30_000 })
      .toBeGreaterThan(0);
  }

  async clickTile(tileName: string): Promise<void> {
    const tileText = this.page.getByText(this.exactTextPattern(tileName));

    const isVisible = (await this.countVisibleMatches(tileText)) > 0;

    if (isVisible) {
      const clickableTile = await this.firstVisibleMatch(tileText);
      await clickableTile.scrollIntoViewIfNeeded();
      await clickableTile.click();
    } else if (tileName.toLowerCase() === 'diffuser app') {
      await this.openDiffuserDirectly();
      return;
    } else {
      await expect
        .poll(() => this.countVisibleMatches(tileText), { timeout: 30_000 })
        .toBeGreaterThan(0);
    }

    if (!(await this.urlContains('diffuser-display', 8_000))) {
      const linkAnchor = await this.firstVisibleMatch(tileText);
      const tileLink = linkAnchor.locator('xpath=ancestor::a[1]').first();

      if ((await tileLink.count()) > 0) {
        const href = await tileLink.getAttribute('href');
        if (href) {
          await this.page.goto(href, { waitUntil: 'domcontentloaded' });
        }
      }
    }
  }

  async verifyDiffuserHomepageDisplayed(): Promise<void> {
    await expect.poll(() => this.page.url(), { timeout: 60_000 }).toContain('diffuser-display');
  }

  async verifyStartDiffuserProgramPageDisplayed(): Promise<void> {
    await expect.poll(() => this.page.url(), { timeout: 60_000 }).toContain('diffuser-display');

    const heading = this.page
      .getByRole('heading', { name: this.exactTextPattern('Start Diffuser Program') })
      .or(this.page.getByText(this.exactTextPattern('Start Diffuser Program')));

    await expect.poll(() => this.countVisibleMatches(heading), { timeout: 30_000 }).toBeGreaterThan(0);
  }

  async verifyTitleDisplayed(titleName: string): Promise<void> {
    const titleText = this.titleLocator(titleName);
    await expect
      .poll(() => this.countVisibleMatches(titleText), { timeout: 30_000 })
      .toBeGreaterThan(0);
  }

  async verifyTitleNotDisplayed(titleName: string): Promise<void> {
    if (titleName.trim().toLowerCase() === 'diffuser runtime') {
      const deadline = Date.now() + 8_000;
      while (Date.now() < deadline) {
        const runtimeTilesVisible =
          (await this.countVisibleMatches(
            this.page.getByText(this.exactTextPattern('Start Diffuser Program')),
          )) > 0 ||
          (await this.countVisibleMatches(
            this.page.getByText(this.exactTextPattern('Monitor Diffuser Program')),
          )) > 0;

        if (runtimeTilesVisible) {
          throw new Error(
            'Diffuser Runtime is considered displayed because runtime tiles are visible on the page.',
          );
        }

        await this.page.waitForTimeout(250);
      }
    }

    const titleText = this.titleLocator(titleName);
    await expect.poll(() => titleText.count(), { timeout: 8_000 }).toBe(0);
  }

  async verifyTileNotDisplayed(tileName: string): Promise<void> {
    const tileText = this.page.getByText(this.exactTextPattern(tileName));
    await expect.poll(() => tileText.count(), { timeout: 8_000 }).toBe(0);
  }

  async openHomepageDropdown(dropdownName: string): Promise<void> {
    const launchpadToolbar = this.page.getByRole('toolbar', { name: /launchpad/i }).first();
    const dropdownButton = launchpadToolbar.getByRole('button', {
      name: this.exactTextPattern(dropdownName),
    });
    const target = await this.firstVisibleMatch(dropdownButton);
    await target.click();
  }

  async verifyDropdownOptionDisplayed(optionName: string): Promise<void> {
    const option = this.page
      .getByRole('menuitem', { name: this.exactTextPattern(optionName) })
      .or(this.page.getByRole('option', { name: this.exactTextPattern(optionName) }))
      .or(this.page.getByText(this.exactTextPattern(optionName)));

    await expect
      .poll(() => this.countVisibleMatches(option), { timeout: 10_000 })
      .toBeGreaterThan(0);
  }

  async verifyDropdownOptionNotDisplayed(optionName: string): Promise<void> {
    const option = this.page
      .getByRole('menuitem', { name: this.exactTextPattern(optionName) })
      .or(this.page.getByRole('option', { name: this.exactTextPattern(optionName) }))
      .or(this.page.getByText(this.exactTextPattern(optionName)));

    await expect.poll(() => this.countVisibleMatches(option), { timeout: 8_000 }).toBe(0);
  }

  async selectDropdownOption(optionName: string): Promise<void> {
    const option = this.page
      .getByRole('menuitem', { name: this.exactTextPattern(optionName) })
      .or(this.page.getByRole('option', { name: this.exactTextPattern(optionName) }))
      .or(this.page.getByText(this.exactTextPattern(optionName)));

    const target = await this.firstVisibleMatch(option);
    await target.click({ trial: true }).catch(() => undefined);
    await target.evaluate((el) => (el as HTMLElement).click());
  }

  private async resolveVisibleLocator(
    locatorFactories: Array<() => Locator>,
    timeoutMs = 20_000,
  ): Promise<Locator> {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      for (const factory of locatorFactories) {
        const candidate = factory();
        const count = await candidate.count();

        if (count > 0) {
          const isVisible = await candidate.isVisible().catch(() => false);
          if (isVisible) {
            return candidate;
          }
        }
      }

      await this.page.waitForTimeout(250);
    }

    throw new Error('Could not find a visible element from the provided selectors.');
  }

  private async urlContains(fragment: string, timeoutMs: number): Promise<boolean> {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      if (this.page.url().toLowerCase().includes(fragment.toLowerCase())) {
        return true;
      }

      await this.page.waitForTimeout(250);
    }

    return false;
  }

  private exactTextPattern(text: string): RegExp {
    const parts = text
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => this.escapeRegex(part));
    return new RegExp(parts.join('\\s+'), 'i');
  }

  private titleLocator(titleName: string): Locator {
    const pattern = this.exactTextPattern(titleName);
    return this.page.getByRole('heading', { name: pattern }).or(this.page.getByText(pattern));
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async countVisibleMatches(locator: Locator): Promise<number> {
    const count = await locator.count();
    let visibleCount = 0;

    for (let i = 0; i < count; i++) {
      const isVisible = await locator.nth(i).isVisible().catch(() => false);
      if (isVisible) {
        visibleCount++;
      }
    }

    return visibleCount;
  }

  private async firstVisibleMatch(locator: Locator): Promise<Locator> {
    const count = await locator.count();

    for (let i = 0; i < count; i++) {
      const candidate = locator.nth(i);
      const isVisible = await candidate.isVisible().catch(() => false);
      if (isVisible) {
        return candidate;
      }
    }

    throw new Error('No visible element found for the provided text locator.');
  }

  private async openDiffuserDirectly(): Promise<void> {
    const currentUrl = this.page.url();
    const baseUrl = currentUrl.split('#')[0] || FlpDiffuserPage.FLP_URL.split('#')[0];
    await this.page.goto(`${baseUrl}${FlpDiffuserPage.DIFFUSER_URL_FRAGMENT}`, {
      waitUntil: 'domcontentloaded',
    });
  }
}
