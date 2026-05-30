import type { Tab } from '../types';

export class Router {
  private readonly tabs = new Map<string, Tab>();
  private readonly buttons = new Map<string, HTMLButtonElement>();

  public constructor(
    private readonly navEl: HTMLElement,
    private readonly contentEl: HTMLElement
  ) {}

  public register(tab: Tab): void {
    this.tabs.set(tab.id, tab);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ss-tab-button';
    button.textContent = tab.label;
    button.addEventListener('click', () => {
      void this.switchTo(tab.id);
    });

    this.buttons.set(tab.id, button);
    this.navEl.append(button);
  }

  public async switchTo(tabId: string): Promise<void> {
    const tab = this.tabs.get(tabId);

    if (!tab) {
      return;
    }

    for (const [id, button] of this.buttons) {
      button.classList.toggle('ss-tab-active', id === tabId);
    }

    this.contentEl.replaceChildren();

    try {
      await tab.render(this.contentEl);
    } catch (error) {
      const pre = document.createElement('pre');
      pre.className = 'ss-error';
      pre.textContent = String(error);
      this.contentEl.append(pre);
    }
  }

  public destroy(): void {
    this.tabs.clear();
    this.buttons.clear();
    this.navEl.replaceChildren();
    this.contentEl.replaceChildren();
  }
}