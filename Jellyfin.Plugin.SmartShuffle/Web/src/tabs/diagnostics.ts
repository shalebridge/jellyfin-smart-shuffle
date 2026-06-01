import { getPluginInfo, ping } from '../api';
import { createButton, createElement, getErrorText, writeResult } from '../dom';
import type { Tab } from '../types';

export const diagnosticsTab: Tab = {
  id: 'diagnostics',
  label: 'Diagnostics',
  render(container) {
    renderDiagnostics(container);
  }
};

function renderDiagnostics(container: HTMLElement): void {
  const section = createElement('section');

  const title = createElement('h2', { textContent: 'Diagnostics' });
  title.style.marginTop = '0';

  const actions = createElement('div', { className: 'ss-actions' });

  const refreshButton = createButton('Refresh Diagnostics', 'raised button-submit');
  const pingButton = createButton('Ping API', 'raised');

  const diagnostics = createElement('pre', { className: 'ss-pre' });

  refreshButton.addEventListener('click', () => {
    void refreshDiagnostics(diagnostics);
  });

  pingButton.addEventListener('click', () => {
    void pingApi();
  });

  actions.append(refreshButton, pingButton);
  section.append(title, actions, diagnostics);
  container.append(section);

  void refreshDiagnostics(diagnostics);
}

async function refreshDiagnostics(target: HTMLElement): Promise<void> {
  target.textContent = 'Loading diagnostics...';

  try {
    target.textContent = await getDiagnosticsText();
  } catch (error) {
    const errorText = await getErrorText(error);
    target.textContent = 'Diagnostics failed:\n' + errorText;
  }
}

async function getDiagnosticsText() : Promise<string> {
  const lines: string[] = [];

  lines.push('ApiClient available: ' + Boolean(window.ApiClient));
  lines.push('PlaybackManager exposed: ' + Boolean(window.PlaybackManager));
  lines.push('Current hash: ' + (window.location.hash || ''));

  try {
    const info = await getPluginInfo();

    lines.push('Plugin name: ' + info.name);
    lines.push('Plugin version: ' + info.version);
    lines.push('Plugin ID: ' + info.id);
  } catch {
    lines.push('Plugin info: unavailable');
  }

  try {
    if (window.ApiClient && typeof window.ApiClient.getCurrentUserId === 'function') {
      lines.push('Current user ID: ' + (window.ApiClient.getCurrentUserId() || ''));
    } else {
      lines.push('Current user ID: unavailable');
    }
  } catch {
    lines.push('Current user ID: error reading user ID');
  }

  try {
    if (window.ApiClient && typeof window.ApiClient.getUrl === 'function') {
      lines.push('Smart Shuffle API base test: ' + window.ApiClient.getUrl('SmartShuffle/Ping'));
    }
  } catch {
    lines.push('Smart Shuffle API base test: unavailable');
  }

  return lines.join('\n');
}

async function pingApi(): Promise<void> {
  try {
    const response = await ping();

    writeResult('Ping succeeded:\n' + JSON.stringify(response, null, 2));
  } catch (error) {
    const errorText = await getErrorText(error);

    writeResult('Ping failed:\n' + errorText);
  }
}