import { getExcludedItems } from '../api';
import { createActionGroup, createTable } from '../components/table';
import { createButton, createElement, getErrorText, writeResult } from '../dom';
import type { SmartShuffleItemInfo, Tab } from '../types';

let currentExcludedItems: SmartShuffleItemInfo[] = [];

export const excludedTab: Tab = {
  id: 'excluded',
  label: 'Excluded Items',
  render(container) {
    renderExcluded(container);
  }
};

function renderExcluded(container: HTMLElement): void {
  const section = createElement('section');

  const title = createElement('h2', { textContent: 'Excluded Items' });
  title.style.marginTop = '0';

  const description = createElement('p', {
    className: 'fieldDescription',
    html:
      'Items listed here have the <code>SmartShuffleExclude</code> metadata tag and will not be included in Smart Shuffle queues.'
  });

  const actions = createElement('div', { className: 'ss-actions' });
  actions.style.marginTop = '1em';

  const refreshButton = createButton('Refresh Excluded Items', 'raised button-submit');
  actions.append(refreshButton);

  const emptyMessage = createElement('div', {
    textContent: 'No excluded items found.'
  });
  emptyMessage.style.display = 'none';
  emptyMessage.style.marginTop = '1em';

  const tableContainer = createElement('div', { className: 'ss-table-container' });
  const excludedTable = createExcludedTable();

  tableContainer.append(excludedTable.table);

  section.append(
    title,
    description,
    actions,
    emptyMessage,
    tableContainer
  );

  container.append(section);

  async function load(): Promise<void> {
    writeResult('Loading excluded items...');

    try {
      const response = await getExcludedItems();
      currentExcludedItems = response.items;

      excludedTable.renderRows(currentExcludedItems);

      const isEmpty = currentExcludedItems.length === 0;
      emptyMessage.style.display = isEmpty ? 'block' : 'none';
      tableContainer.style.display = isEmpty ? 'none' : 'block';

      writeResult(
        'Loaded ' +
          currentExcludedItems.length +
          ' excluded item' +
          (currentExcludedItems.length === 1 ? '.' : 's.')
      );
    } catch (error) {
      currentExcludedItems = [];
      excludedTable.renderRows(currentExcludedItems);
      emptyMessage.style.display = 'block';
      tableContainer.style.display = 'none';

      const errorText = await getErrorText(error);

      writeResult('Excluded item load failed:\n' + errorText);
    }
  }

  refreshButton.addEventListener('click', () => {
    void load();
  });

  void load();
}

function createExcludedTable() {
  return createTable<SmartShuffleItemInfo>([
    {
      header: 'Title',
      render: (item) => item.displayTitle || item.itemName || item.itemId
    },
    {
      header: 'Type',
      render: (item) => item.itemType
    },
    {
      header: 'Item ID',
      render: (item) => item.itemId
    },
    {
      header: 'Actions',
      render: (item) => {
        const openButton = createButton('Open', 'raised');

        openButton.addEventListener('click', () => {
          openItem(item.itemId);
        });

        return createActionGroup([openButton]);
      }
    }
  ]);
}

function openItem(itemId: string): void {
  if (!itemId) {
    writeResult('Cannot open item: missing item ID.');
    return;
  }

  window.location.hash = '#!/details?id=' + itemId;
}