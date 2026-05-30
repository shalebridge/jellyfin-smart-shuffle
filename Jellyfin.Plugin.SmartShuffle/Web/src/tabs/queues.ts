import { getQueues, resetQueue } from '../api';
import { createActionGroup, createTable } from '../components/table';
import { createButton, createElement, getErrorText, writeResult } from '../dom';
import { formatDate, formatProgress } from '../format';
import type { SmartShuffleBucketInfo, Tab } from '../types';

let currentQueues: SmartShuffleBucketInfo[] = [];

export const queuesTab: Tab = {
  id: 'queues',
  label: 'Queues',
  render(container) {
    renderQueues(container);
  }
};

function renderQueues(container: HTMLElement): void {
  const section = createElement('section');

  const title = createElement('h2', { textContent: 'Queues' });
  title.style.marginTop = '0';

  const description = createElement('p', {
    className: 'fieldDescription',
    textContent:
      'Smart Shuffle creates a queue for each user and scope, such as a series, season, playlist, or collection.'
  });

  const summary = createSummary();

  const actions = createElement('div', { className: 'ss-actions' });
  actions.style.marginTop = '1em';

  const refreshButton = createButton('Refresh Queues', 'raised button-submit');
  const resetAllButton = createButton('Reset All Queues', 'raised');

  actions.append(refreshButton, resetAllButton);

  const filterContainer = createElement('div', { className: 'inputContainer' });
  filterContainer.style.marginTop = '1em';

  const filterLabel = document.createElement('label');
  filterLabel.className = 'inputLabel inputLabelUnfocused';
  filterLabel.htmlFor = 'queueFilter';
  filterLabel.textContent = 'Filter Queues';

  const filterInput = document.createElement('input');
  filterInput.setAttribute('is', 'emby-input');
  filterInput.id = 'queueFilter';
  filterInput.type = 'text';
  filterInput.placeholder = 'Filter by name, type, or scope key';

  filterContainer.append(filterLabel, filterInput);

  const emptyMessage = createElement('div', {
    textContent: 'No Smart Shuffle queues found for this user.'
  });
  emptyMessage.style.display = 'none';
  emptyMessage.style.marginTop = '1em';

  const tableContainer = createElement('div', { className: 'ss-table-container' });
  const queueTable = createQueueTable();

  tableContainer.append(queueTable.table);

  section.append(
    title,
    description,
    summary.root,
    actions,
    filterContainer,
    emptyMessage,
    tableContainer
  );

  container.append(section);

  function renderFilteredQueues(): void {
    const filterText = filterInput.value.trim().toLowerCase();

    const filteredQueues = filterText
      ? currentQueues.filter((queue) => {
          const haystack = [
            queue.scopeKey,
            queue.displayName,
            queue.scopeType,
            queue.scopeId
          ].join(' ').toLowerCase();

          return haystack.includes(filterText);
        })
      : currentQueues;

    queueTable.renderRows(filteredQueues);
    updateSummary(summary, filteredQueues);

    const isEmpty = filteredQueues.length === 0;
    emptyMessage.style.display = isEmpty ? 'block' : 'none';
    tableContainer.style.display = isEmpty ? 'none' : 'block';

    if (currentQueues.length && filteredQueues.length !== currentQueues.length) {
      writeResult(
        'Showing ' +
          filteredQueues.length +
          ' of ' +
          currentQueues.length +
          ' Smart Shuffle queues.'
      );
    }
  }

  async function load(): Promise<void> {
    writeResult('Loading Smart Shuffle queues...');

    try {
      const response = await getQueues();
      currentQueues = response.buckets;

      renderFilteredQueues();

      writeResult(
        'Loaded ' +
          currentQueues.length +
          ' Smart Shuffle queue' +
          (currentQueues.length === 1 ? '.' : 's.')
      );
    } catch (error) {
      currentQueues = [];
      renderFilteredQueues();

      const errorText = await getErrorText(error);

      writeResult('Queue load failed:\n' + errorText);
    }
  }

  refreshButton.addEventListener('click', () => {
    void load();
  });

  resetAllButton.addEventListener('click', () => {
    void resetAllQueues(load);
  });

  filterInput.addEventListener('input', renderFilteredQueues);

  void load();
}

function createSummary() {
  const root = createElement('div', { className: 'ss-summary-grid' });

  const queues = createSummaryCard('Queues');
  const total = createSummaryCard('Items Tracked');
  const played = createSummaryCard('Played');
  const remaining = createSummaryCard('Remaining');

  root.append(queues.root, total.root, played.root, remaining.root);

  return {
    root,
    queues: queues.value,
    total: total.value,
    played: played.value,
    remaining: remaining.value
  };
}

function createSummaryCard(label: string) {
  const root = createElement('div', { className: 'ss-card' });

  const labelElement = createElement('div', { textContent: label });
  labelElement.style.opacity = '0.75';

  const value = createElement('div', {
    className: 'ss-summary-value',
    textContent: '0'
  });

  root.append(labelElement, value);

  return { root, value };
}

function updateSummary(
  summary: ReturnType<typeof createSummary>,
  queues: SmartShuffleBucketInfo[]
): void {
  let totalItems = 0;
  let totalPlayed = 0;
  let totalRemaining = 0;

  for (const queue of queues) {
    totalItems += Number(queue.total || 0);
    totalPlayed += Number(queue.played || 0);
    totalRemaining += Number(queue.remaining || 0);
  }

  summary.queues.textContent = String(queues.length);
  summary.total.textContent = String(totalItems);
  summary.played.textContent = String(totalPlayed);
  summary.remaining.textContent = String(totalRemaining);
}

function createQueueTable() {
  return createTable<SmartShuffleBucketInfo>([
    {
      header: 'Name',
      render: (queue) => queue.displayName || queue.scopeKey
    },
    {
      header: 'Type',
      render: (queue) => queue.scopeType
    },
    {
      header: 'Progress',
      align: 'right',
      render: (queue) => formatProgress(queue.played, queue.total)
    },
    {
      header: 'Played',
      align: 'right',
      render: (queue) => queue.played
    },
    {
      header: 'Remaining',
      align: 'right',
      render: (queue) => queue.remaining
    },
    {
      header: 'Total',
      align: 'right',
      render: (queue) => queue.total
    },
    {
      header: 'Last Updated',
      render: (queue) => formatDate(queue.updatedAt)
    },
    {
      header: 'Scope Key',
      render: (queue) => queue.scopeKey
    },
    {
      header: 'Actions',
      render: (queue) => {
        const openButton = createButton('Open', 'raised');
        openButton.addEventListener('click', () => {
          openQueue(queue.scopeId);
        });

        const resetButton = createButton('Reset', 'raised');
        resetButton.addEventListener('click', () => {
          void resetSingleQueue(queue.scopeKey);
        });

        return createActionGroup([openButton, resetButton]);
      }
    }
  ]);
}

function openQueue(scopeId: string): void {
  if (!scopeId) {
    writeResult('Cannot open queue: missing scope ID.');
    return;
  }

  window.location.hash = '#!/details?id=' + scopeId;
}

async function resetSingleQueue(scopeKey: string): Promise<void> {
  if (!scopeKey) {
    writeResult('Cannot reset queue: missing scope key.');
    return;
  }

  const confirmed = confirm(
    'Reset this Smart Shuffle queue?\n\n' +
      scopeKey
  );

  if (!confirmed) {
    return;
  }

  try {
    await resetQueue(scopeKey);
    writeResult('Reset queue: ' + scopeKey);
  } catch (error) {
    const errorText = await getErrorText(error);
    writeResult('Reset failed:\n' + errorText);
  }
}

async function resetAllQueues(reload: () => Promise<void>): Promise<void> {
  if (!currentQueues.length) {
    writeResult('No queues to reset.');
    return;
  }

  const confirmed = confirm(
    'Reset all Smart Shuffle queues for this user?\n\n' +
      'This will clear ' +
      currentQueues.length +
      ' queue' +
      (currentQueues.length === 1 ? '.' : 's.')
  );

  if (!confirmed) {
    return;
  }

  let resetCount = 0;

  for (const queue of currentQueues) {
    if (!queue.scopeKey) {
      continue;
    }

    await resetQueue(queue.scopeKey);
    resetCount++;
  }

  writeResult(
    'Reset ' +
      resetCount +
      ' Smart Shuffle queue' +
      (resetCount === 1 ? '.' : 's.')
  );

  await reload();
}