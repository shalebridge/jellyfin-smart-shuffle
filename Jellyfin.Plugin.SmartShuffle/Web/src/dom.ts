export function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  options: {
    className?: string;
    textContent?: string;
    html?: string;
  } = {}
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);

  if (options.className) {
    element.className = options.className;
  }

  if (options.textContent !== undefined) {
    element.textContent = options.textContent;
  }

  if (options.html !== undefined) {
    element.innerHTML = options.html;
  }

  return element;
}

export function createButton(
  text: string,
  className = 'raised'
): HTMLButtonElement {
  const button = document.createElement('button');

  button.setAttribute('is', 'emby-button');
  button.type = 'button';
  button.className = className;
  button.textContent = text;

  return button;
}

export async function getErrorText(error: unknown): Promise<string> {
  if (!error) {
    return 'unknown';
  }

  if (error instanceof Response) {
    try {
      return await error.text();
    } catch {
      return `${error.status} ${error.statusText}`;
    }
  }

  if (typeof error === 'object' && 'responseText' in error) {
    const responseText = (error as { responseText?: unknown }).responseText;

    if (typeof responseText === 'string') {
      return responseText;
    }
  }

  if (typeof error === 'object' && 'text' in error) {
    const text = (error as { text?: unknown }).text;

    if (typeof text === 'function') {
      try {
        return await (text as () => Promise<string>)();
      } catch {
        return String(error);
      }
    }
  }

  return String(error);
}

export function writeResult(text: string): void {
  const result = document.querySelector<HTMLElement>('#result');

  if (result) {
    result.textContent = text;
  }
}