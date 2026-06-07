import { getPluginConfiguration, savePluginConfiguration } from '../api';
import { checkboxField } from '../components/checkbox-field';
import { numberField } from '../components/number-field';
import {
  createButton,
  createElement,
  getErrorText,
  writeResult
} from '../dom';
import type { PluginConfiguration, Tab } from '../types';

export const configurationTab: Tab = {
  id: 'configuration',
  label: 'Configuration',
  render(container) {
    renderConfiguration(container);
  }
};

function renderConfiguration(container: HTMLElement): void {
  const section = createElement('section');

  const excludeSpecials = checkboxField({
    id: 'excludeSpecials',
    label: 'Exclude Specials',
    description: 'Skip Season 0 or special episodes when building queues.'
  });

  const enableExcludeTag = checkboxField({
    id: 'enableExcludeTag',
    label: 'Enable Exclude Tag',
    description: 'Skip items tagged with SmartShuffleExclude.'
  });

  const prioritizeLessPlayed = checkboxField({
    id: 'prioritizeLessPlayed',
    label: 'Prioritize Less-Played',
    description: 'Favor items with lower play counts when creating the queue order.'
  });

  const penalizeRecentlyPlayed = checkboxField({
    id: 'penalizeRecentlyPlayed',
    label: 'Penalize Recently Played',
    description:
      'Reduce the chance of recently played items appearing early in new queues.'
  });

  const nearWindowDays = numberField({
    id: 'recentlyPlayedNearWindowDays',
    label: 'Near Window Days',
    description:
      'Items played within this many days receive the stronger recent-play penalty.',
    placeholder: '7',
    min: 0,
    step: 1
  });

  const nearWeightMultiplier = numberField({
    id: 'recentlyPlayedNearWeightMultiplier',
    label: 'Near Weight Multiplier',
    description:
      'Lower values make the penalty stronger.',
    placeholder: '0.25',
    min: 0,
    max: 1,
    step: 0.05
  });

  const farWindowDays = numberField({
    id: 'recentlyPlayedFarWindowDays',
    label: 'Far Window Days',
    description:
      'Items played within this many days, but outside the near window, receive the lighter recent-play penalty.',
    placeholder: '30',
    min: 0,
    step: 1
  });

  const farWeightMultiplier = numberField({
    id: 'recentlyPlayedFarWeightMultiplier',
    label: 'Far Weight Multiplier',
    description:
      'Lower values make the penalty stronger.',
    placeholder: '0.5',
    min: 0,
    max: 1,
    step: 0.05
  });

  const nearPenaltyRow = createElement('div', {
    className: 'ss-config-field-row'
  });
  
  nearPenaltyRow.append(
    nearWindowDays.root,
    nearWeightMultiplier.root
  );
  
  const farPenaltyRow = createElement('div', {
    className: 'ss-config-field-row'
  });
  
  farPenaltyRow.append(
    farWindowDays.root,
    farWeightMultiplier.root
  );

  const settingsGroup = createElement('div', {
    className: 'ss-settings-group'
  });

  settingsGroup.append(
    excludeSpecials.root,
    enableExcludeTag.root,
    prioritizeLessPlayed.root,
    penalizeRecentlyPlayed.root,
    nearPenaltyRow,
    farPenaltyRow
  );

  const actions = createElement('div', {
    className: 'ss-actions'
  });
  actions.style.marginTop = '1em';

  const saveButton = createButton('Save Configuration', 'raised button-submit');
  const reloadButton = createButton('Reload', 'raised');

  actions.append(saveButton, reloadButton);

  section.append(
    settingsGroup,
    actions
  );

  container.append(section);

  function updateRecentlyPlayedFields(): void {
    const display = penalizeRecentlyPlayed.input.checked ? '' : 'none';

    nearWindowDays.root.style.display = display;
    nearWeightMultiplier.root.style.display = display;
    farWindowDays.root.style.display = display;
    farWeightMultiplier.root.style.display = display;
  }

  async function load(): Promise<void> {
    writeResult('Loading configuration...');

    try {
      const config = await getPluginConfiguration();

      excludeSpecials.input.checked = config.excludeSpecials;
      enableExcludeTag.input.checked = config.enableExcludeTag;
      prioritizeLessPlayed.input.checked = config.prioritizeLessPlayed;
      penalizeRecentlyPlayed.input.checked = config.penalizeRecentlyPlayed;

      nearWindowDays.input.value = String(config.recentlyPlayedNearWindowDays);
      nearWeightMultiplier.input.value = String(config.recentlyPlayedNearWeightMultiplier);
      farWindowDays.input.value = String(config.recentlyPlayedFarWindowDays);
      farWeightMultiplier.input.value = String(config.recentlyPlayedFarWeightMultiplier);

      updateRecentlyPlayedFields();

      writeResult('Configuration loaded.');
    } catch (error) {
      const errorText = await getErrorText(error);

      writeResult('Configuration load failed:\n' + errorText);
    }
  }

  async function save(): Promise<void> {
    const config: PluginConfiguration = {
      excludeSpecials: excludeSpecials.input.checked,
      enableExcludeTag: enableExcludeTag.input.checked,
      prioritizeLessPlayed: prioritizeLessPlayed.input.checked,
      penalizeRecentlyPlayed: penalizeRecentlyPlayed.input.checked,
      recentlyPlayedNearWindowDays: readInt(nearWindowDays.input, 7),
      recentlyPlayedNearWeightMultiplier: readNumber(nearWeightMultiplier.input, 0.25),
      recentlyPlayedFarWindowDays: readInt(farWindowDays.input, 30),
      recentlyPlayedFarWeightMultiplier: readNumber(farWeightMultiplier.input, 0.5)
    };

    writeResult('Saving configuration...');

    try {
      await savePluginConfiguration(config);

      writeResult('Configuration saved.');
    } catch (error) {
      const errorText = await getErrorText(error);

      writeResult('Configuration save failed:\n' + errorText);
    }
  }

  penalizeRecentlyPlayed.input.addEventListener('change', updateRecentlyPlayedFields);

  saveButton.addEventListener('click', () => {
    void save();
  });

  reloadButton.addEventListener('click', () => {
    void load();
  });

  void load();
}

function readNumber(input: HTMLInputElement, fallback: number): number {
  const value = Number(input.value);

  if (Number.isFinite(value)) {
    return value;
  }

  return fallback;
}

function readInt(input: HTMLInputElement, fallback: number): number {
  const value = Number.parseInt(input.value, 10);

  if (Number.isFinite(value)) {
    return value;
  }

  return fallback;
}