export type CellAlign = 'left' | 'right' | 'center';

export interface ColumnDefinition<T> {
  header: string;
  align?: CellAlign;
  render(item: T): string | number | HTMLElement | null | undefined;
}

export function createTable<T>(
  columns: readonly ColumnDefinition<T>[]
): {
  table: HTMLTableElement;
  tbody: HTMLTableSectionElement;
  renderRows(items: readonly T[]): void;
} {
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  const headerRow = document.createElement('tr');

  for (const column of columns) {
    const th = document.createElement('th');
    th.textContent = column.header;
    th.style.textAlign = column.align ?? 'left';
    headerRow.append(th);
  }

  thead.append(headerRow);
  table.append(thead, tbody);

  return {
    table,
    tbody,
    renderRows(items) {
      tbody.replaceChildren();

      for (const item of items) {
        const row = document.createElement('tr');

        for (const column of columns) {
          const cell = document.createElement('td');
          const rendered = column.render(item);

          cell.style.textAlign = column.align ?? 'left';

          if (rendered instanceof HTMLElement) {
            cell.append(rendered);
          } else {
            cell.textContent = rendered == null ? '' : String(rendered);
          }

          row.append(cell);
        }

        tbody.append(row);
      }
    }
  };
}

export function createActionGroup(
  buttons: readonly HTMLButtonElement[]
): HTMLDivElement {
  const group = document.createElement('div');
  group.className = 'ss-actions';

  for (const button of buttons) {
    group.append(button);
  }

  return group;
}