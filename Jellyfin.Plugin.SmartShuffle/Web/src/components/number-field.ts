import { createElement } from '../dom';

export interface NumberField {
  root: HTMLElement;
  input: HTMLInputElement;
}

export interface NumberFieldOptions {
  id: string;
  label: string;
  description?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

export function numberField(opts: NumberFieldOptions): NumberField {
  const inputId = 'field-' + opts.id;

  const root = createElement('div', {
    className: opts.description
      ? 'inputContainer inputContainer-withDescription'
      : 'inputContainer'
  });

  const label = document.createElement('label');
  label.className = 'inputLabel inputLabelUnfocused';
  label.htmlFor = inputId;
  label.textContent = opts.label;

  const input = document.createElement('input');
  input.setAttribute('is', 'emby-input');
  input.type = 'number';
  input.id = inputId;
  input.name = opts.id;

  if (opts.placeholder !== undefined) {
    input.placeholder = opts.placeholder;
  }

  if (opts.min !== undefined) {
    input.min = String(opts.min);
  }

  if (opts.max !== undefined) {
    input.max = String(opts.max);
  }

  if (opts.step !== undefined) {
    input.step = String(opts.step);
  }

  root.append(label, input);

  if (opts.description) {
    const description = createElement('div', {
      className: 'number-description',
      textContent: opts.description
    });

    root.append(description);
  }

  return { root, input };
}