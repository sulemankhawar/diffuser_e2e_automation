import { Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { BeforeStep, AfterStep } = createBdd();

let pinnedTabPage: Page | null = null;

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function extractExpectedTabTitle(stepTitle: string): string | null {
  const match = stepTitle.match(/new\s+tab\s+is\s+opened\s+with\s+the\s+title\s+"([^"]+)"/i);
  return match?.[1]?.trim() ?? null;
}

function extractExpectedTabHeader(stepTitle: string): string | null {
  const match = stepTitle.match(/new\s+tab\s+is\s+opened\s+with\s+header\s+"([^"]+)"/i);
  return match?.[1]?.trim() ?? null;
}

function isApplicationJobStep(stepTitle: string): boolean {
  return /application\s+job|job\s+template|job\s+name|template\s+selection|scheduling\s+options|parameters|start\s+immediately|job\s+start\s*\(local\s*time\)|recurrence\s+pattern|interval\s+size|interval\s+count|number\s+of\s+parallel\s+processes|run\s+label|delay\s*\(per\s*interval\)|\bcheck\b|ajt\s+message|schedule|click\s+on\s+"?step\s*[23]"?\s+button|\bstep\s*[23]\b/i.test(stepTitle);
}

/** Steps that explicitly name a Diffuser app screen must never be screenshotted on the job tab. */
function isDiffuserAppStep(stepTitle: string): boolean {
  return /diffuser\s+program|interval\s+table|display\s+results\s+page|diffuser\s+homepage|pop\s*up\s+screen/i.test(stepTitle);
}

async function findDiffuserTab(page: Page): Promise<Page | null> {
  const pages = page.context().pages().filter((candidate) => !candidate.isClosed()).reverse();

  for (const candidate of pages) {
    if (candidate.url().toLowerCase().includes('diffuser')) {
      return candidate;
    }
  }

  return null;
}

function isLogDetailsStep(stepTitle: string): boolean {
  return /application\s+log|log\s+details|click\s+on\s+the\s+"application\s+log"\s+button/i.test(stepTitle);
}

function isSwitchBackToDiffuserStep(stepTitle: string): boolean {
  return /switch\s+back\s+to\s+the\s+diffuser\s+tab/i.test(stepTitle);
}

function isLogDetailsColumnStep(stepTitle: string): boolean {
  return /verify\s+the\s+column\s+"(type|message|created\s+on)"\s+is\s+displayed/i.test(stepTitle);
}

async function isApplicationJobTab(candidate: Page): Promise<boolean> {
  if (candidate.isClosed()) {
    return false;
  }

  const title = normalizeText(await candidate.title().catch(() => ''));
  if (title.includes('new job')) {
    return true;
  }

  const hasMarkers = await candidate
    .getByText(/template\s+selection|scheduling\s+options|parameters|job\s+template|job\s+name|recurrence\s+pattern|run\s+label|delay\s*\(per\s*interval\)/i)
    .count()
    .then((count) => count > 0)
    .catch(() => false);

  return hasMarkers;
}

async function findApplicationJobTab(page: Page): Promise<Page | null> {
  const pages = page.context().pages().filter((candidate) => !candidate.isClosed()).reverse();

  for (const candidate of pages) {
    if (await isApplicationJobTab(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function findExpectedTabPage(page: Page, expectedTitle: string): Promise<Page | null> {
  const pages = page.context().pages().filter((candidate) => !candidate.isClosed()).reverse();
  const normalizedExpected = normalizeText(expectedTitle);

  for (const candidate of pages) {
    const candidateTitle = normalizeText(await candidate.title().catch(() => ''));
    if (candidateTitle.includes(normalizedExpected) || candidateTitle.includes('new job')) {
      return candidate;
    }
  }

  for (const candidate of pages) {
    const hasApplicationJobMarker = await candidate
      .getByText(/template\s+selection|scheduling\s+options|parameters|application\s+job/i)
      .count()
      .then((count) => count > 0)
      .catch(() => false);

    if (hasApplicationJobMarker) {
      return candidate;
    }
  }

  return null;
}

function getLatestOpenPage(page: Page): Page {
  const pages = page.context().pages().filter((candidate) => !candidate.isClosed());
  return pages[pages.length - 1] ?? page;
}

async function findExpectedHeaderPage(page: Page, expectedHeader: string): Promise<Page | null> {
  const pages = page.context().pages().filter((candidate) => !candidate.isClosed()).reverse();
  const normalizedExpected = normalizeText(expectedHeader);

  for (const candidate of pages) {
    const candidateTitle = normalizeText(await candidate.title().catch(() => ''));
    if (candidateTitle.includes(normalizedExpected)) {
      return candidate;
    }
  }

  for (const candidate of pages) {
    const bodyText = normalizeText(await candidate.locator('body').innerText().catch(() => ''));
    if (bodyText.includes(normalizedExpected)) {
      return candidate;
    }
  }

  return getLatestOpenPage(page);
}

async function findLogDetailsTab(page: Page): Promise<Page | null> {
  const pages = page.context().pages().filter((candidate) => !candidate.isClosed()).reverse();

  for (const candidate of pages) {
    const title = normalizeText(await candidate.title().catch(() => ''));
    if (title.includes('applicationlog') || title.includes('log details') || title.includes('showdetails')) {
      return candidate;
    }
  }

  for (const candidate of pages) {
    const hasMarkers = await candidate
      .getByText(/log\s+details|type|message|created\s+on|application\s+log/i)
      .count()
      .then((count) => count > 0)
      .catch(() => false);

    if (hasMarkers) {
      return candidate;
    }
  }

  return getLatestOpenPage(page);
}

async function resolveActivePage(page: Page): Promise<Page> {
  const pages = page.context().pages().filter((candidate) => !candidate.isClosed());

  for (const candidate of pages) {
    const isFocused = await candidate
      .evaluate(() => document.visibilityState === 'visible' && document.hasFocus())
      .catch(() => false);

    if (isFocused) {
      return candidate;
    }
  }

  return pages[pages.length - 1] ?? page;
}

function safeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function getFeatureLine($step: unknown): number | null {
  const step = $step as {
    location?: { line?: number };
    line?: number;
    pickleStep?: { locations?: Array<{ line?: number }> };
  };

  const line =
    step.location?.line ??
    step.line ??
    step.pickleStep?.locations?.[0]?.line;

  return typeof line === 'number' && Number.isFinite(line) ? line : null;
}

function shouldCapturePreStepEvidence(stepTitle: string): boolean {
  return /enter\s+in\s+"[^"]+"\s+in\s+the\s+"cts\s+project:?"\s+field/i.test(stepTitle)
    || /click\s+on\s+the\s+"transport"\s+button\s+on\s+the\s+"select\s+transport\s+request"\s+dialog/i.test(stepTitle)
    || /click\s+on\s+the\s+"transport\s+interval\s+variant"\s+button\s+for\s+the\s+"[^"]+"\s+interval\s+object\s+on\s+the\s+setup\s+interval\s+variants\s+page/i.test(stepTitle)
    || /click\s+on\s+the\s+"transport\s+interval\s+object"\s+button\s+on\s+the\s+setup\s+interval\s+variants\s+page/i.test(stepTitle);
}

BeforeStep(async ({ page, $testInfo, $step, $bddContext }) => {
  const stepTitle = $step.title?.trim() || '';
  if (!shouldCapturePreStepEvidence(stepTitle)) {
    return;
  }

  const activePage = await resolveActivePage(page);
  if (activePage.isClosed()) {
    return;
  }

  await activePage.bringToFront().catch(() => undefined);
  await activePage.waitForLoadState('domcontentloaded').catch(() => undefined);

  const stepIndex = $bddContext.stepIndex + 1;
  const gherkinLine = getFeatureLine($step);
  const linePrefix = gherkinLine ? `L${gherkinLine}-` : '';
  const attachmentName = `PRE-${linePrefix}${String(stepIndex).padStart(2, '0')}-${safeName(stepTitle || `step-${stepIndex}`)}.png`;

  const body = await activePage.screenshot({
    fullPage: true,
    timeout: 10_000,
  }).catch(() => null);

  if (!body) {
    return;
  }

  await $testInfo.attach(attachmentName, {
    body,
    contentType: 'image/png',
  });
});

AfterStep(async ({ page, $testInfo, $step, $bddContext }) => {
  const stepTitle = $step.title?.trim() || '';
  const expectedTabTitle = extractExpectedTabTitle(stepTitle);
  const expectedTabHeader = extractExpectedTabHeader(stepTitle);
  const tabSpecificPage = expectedTabTitle ? await findExpectedTabPage(page, expectedTabTitle) : null;
  const headerSpecificPage = !tabSpecificPage && expectedTabHeader ? await findExpectedHeaderPage(page, expectedTabHeader) : null;
  const diffuserAppPage =
    !tabSpecificPage && !headerSpecificPage && isDiffuserAppStep(stepTitle) ? await findDiffuserTab(page) : null;
  const logDetailsPage = !tabSpecificPage && !headerSpecificPage && !diffuserAppPage && isLogDetailsStep(stepTitle)
    ? await findLogDetailsTab(page)
    : null;
  const ajtPage = !tabSpecificPage && !headerSpecificPage && !diffuserAppPage && !logDetailsPage && isApplicationJobStep(stepTitle)
    ? await findApplicationJobTab(page)
    : null;
  const shouldUsePinnedTab =
    !!pinnedTabPage &&
    !pinnedTabPage.isClosed() &&
    !diffuserAppPage &&
    (isLogDetailsStep(stepTitle) || isLogDetailsColumnStep(stepTitle));

  const activePage =
    tabSpecificPage ??
    headerSpecificPage ??
    diffuserAppPage ??
    logDetailsPage ??
    ajtPage ??
    (shouldUsePinnedTab ? pinnedTabPage! : await resolveActivePage(page));

  try {
    await activePage.bringToFront().catch(() => undefined);
  } catch (e) {
    // Page may be closed
  }
  
  try {
    await activePage.waitForLoadState('domcontentloaded').catch(() => undefined);
  } catch (e) {
    // Page may be closed
  }

  if (activePage.isClosed()) {
    return;
  }

  if (tabSpecificPage || headerSpecificPage || logDetailsPage) {
    pinnedTabPage = activePage;
  }

  if (isSwitchBackToDiffuserStep(stepTitle)) {
    pinnedTabPage = null;
  }

  const stepIndex = $bddContext.stepIndex + 1;
  const stepLabel = stepTitle || `step-${stepIndex}`;
  const gherkinLine = getFeatureLine($step);
  const linePrefix = gherkinLine ? `L${gherkinLine}-` : '';
  const attachmentName = `${linePrefix}${String(stepIndex).padStart(2, '0')}-${safeName(stepLabel)}.png`;

  try {
    const body = await activePage.screenshot({
      fullPage: true,
      timeout: 10_000,
    }).catch(() => null);
    
    if (body) {
      await $testInfo.attach(attachmentName, {
        body,
        contentType: 'image/png',
      });
    }
  } catch (e) {
    // Page closed or screenshot failed, continue without screenshot
    console.warn('Failed to capture screenshot, continuing...', e instanceof Error ? e.message : e);
  }
});
