import { createElement } from '../dom';

export interface CheckboxField {
  root: HTMLElement;
  input: HTMLInputElement;
}

export interface CheckboxFieldOptions {
  id: string;
  label: string;
  description?: string;
}

export function checkboxField(opts: CheckboxFieldOptions): CheckboxField {
  const inputId = 'field-' + opts.id;

  const root = createElement('div', {
    className: opts.description
      ? 'checkbox-container checkbox-container-withDescription'
      : 'checkbox-container'
  });

  const label = document.createElement('label');
  label.className = 'checkbox-label';
  label.htmlFor = inputId;

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = inputId;
  input.name = opts.id;

  const text = document.createElement('span');
  text.textContent = opts.label;

  label.append(input, text);
  root.append(label);

  if (opts.description) {
    const description = createElement('div', {
      className: 'checkbox-description',
      textContent: opts.description
    });

    root.append(description);
  }

  return {
    root,
    input
  };
}