export function createAppShell(rootEl: HTMLElement): {
    navEl: HTMLElement;
    contentEl: HTMLElement;
    destroy: () => void;
} {
  const shellEl = document.createElement('div');
  shellEl.className = 'ss-app-shell';

  const headerEl = document.createElement('header');
  headerEl.className = 'ss-app-header';

  const title = document.createElement('h1');
  title.className = 'ss-app-title';
  title.textContent = 'Smart Shuffle';

  const subtitle = document.createElement('div');
  subtitle.className = 'fieldDescription';
  subtitle.textContent = 'Manage Smart Shuffle queues, excluded items, and diagnostics.';

  headerEl.append(title, subtitle);

  const navEl = document.createElement('nav');
  navEl.className = 'ss-app-sidebar';

  const contentEl = document.createElement('main');
  contentEl.className = 'ss-app-content';

  shellEl.append(headerEl, navEl, contentEl);
  rootEl.append(shellEl);

  return {
    navEl,
    contentEl,
    destroy() {
      rootEl.replaceChildren();
    }
  };
}