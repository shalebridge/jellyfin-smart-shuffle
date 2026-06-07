import './styles/variables.css';
import './styles/layout.css';
import './styles/forms.css';

import { createAppShell } from './components/app-shell';
import { Router } from './components/router';

import type { Tab } from './types';
import { queuesTab } from './tabs/queues';
import { excludedTab } from './tabs/excluded';
import { configurationTab } from './tabs/configuration';
import { informationTab } from './tabs/information';
import { diagnosticsTab } from './tabs/diagnostics';

const tabs: readonly Tab[] = [
  queuesTab,
  excludedTab,
  configurationTab,
  informationTab,
  ...(import.meta.env.MODE === 'development' ? [diagnosticsTab] : [])
];

const ROOT_SELECTOR = '#smartShuffleDashboardRoot';
const DEFAULT_TAB_ID = 'queues';
const OBSERVER_TIMEOUT_MS = 30_000;

let cleanupPage: (() => void) | null = null;
let mountVersion = 0;

function destroyMountedPage(): void {
  mountVersion += 1;
  cleanupPage?.();
  cleanupPage = null;
}

function getPageElement(root: HTMLElement): HTMLElement {
  const page = root.closest<HTMLElement>('.page');

  if (!page) {
    console.warn(
      '[smart-shuffle] No .page ancestor found; pageshow/pagehide lifecycle events may not fire.'
    );
  }

  return page ?? root;
}

function mountPage(rootEl: HTMLElement): void {
  destroyMountedPage();

  rootEl.replaceChildren();

  const currentMountVersion = mountVersion;
  const { navEl, contentEl, destroy: destroyShell } = createAppShell(rootEl);
  const router = new Router(navEl, contentEl);

  cleanupPage = () => {
    router.destroy();
    destroyShell();
  };

  for (const tab of tabs) {
    router.register(tab);
  }

  if (currentMountVersion !== mountVersion) {
    return;
  }

  void router.switchTo(DEFAULT_TAB_ID);
}

function bindPage(rootEl: HTMLElement): void {
  if (rootEl.dataset.smartShuffleBound === 'true') {
    return;
  }

  rootEl.dataset.smartShuffleBound = 'true';

  const page = getPageElement(rootEl);

  const handlePageShow = () => {
    mountPage(rootEl);
  };

  const handlePageHide = () => {
    destroyMountedPage();
  };

  page.addEventListener('pageshow', handlePageShow);
  page.addEventListener('pagehide', handlePageHide);

  mountPage(rootEl);
}

function findAndBind(): boolean {
  const rootEl = document.querySelector<HTMLElement>(ROOT_SELECTOR);

  if (!rootEl) {
    return false;
  }

  bindPage(rootEl);
  return true;
}

if (!findAndBind()) {
  const observer = new MutationObserver(() => {
    if (findAndBind()) {
      observer.disconnect();
      window.clearTimeout(observerTimeoutId);
    }
  });

  const observerRoot = document.body ?? document.documentElement;

  observer.observe(observerRoot, {
    childList: true,
    subtree: true
  });

  const observerTimeoutId = window.setTimeout(
    () => observer.disconnect(),
    OBSERVER_TIMEOUT_MS
  );
}