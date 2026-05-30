import { createElement } from '../dom';
import type { Tab } from '../types';

export const informationTab: Tab = {
  id: 'information',
  label: 'Information',
  render(container) {
    renderInformation(container);
  }
};

function renderInformation(container: HTMLElement): void {
  const section = createElement('section');

  section.innerHTML = `
    <h2 style="margin-top: 0;">Information</h2>

    <div class="ss-card">
      <h3 style="margin-top: 0;">How Smart Shuffle Works</h3>

      <p>
        Smart Shuffle creates a persistent queue for the selected series, season, playlist, or collection.
        Items are ordered randomly, but Jellyfin play count and last played date are used to favor items
        that have been played less often or less recently.
      </p>

      <p>
        As playback starts, Smart Shuffle marks matching queued items as played. When everything in a queue
        has been played, Smart Shuffle creates a fresh queue the next time it is used.
      </p>
    </div>

    <div class="ss-card" style="margin-top: 1em;">
      <h3 style="margin-top: 0;">Excluding Items</h3>

      <p>
        To exclude an episode or movie from Smart Shuffle, add this tag to the item's metadata:
      </p>

      <code class="ss-code">SmartShuffleExclude</code>

      <p class="fieldDescription" style="margin-top: 0.75em;">
        Items with this tag are skipped when Smart Shuffle builds or refills a queue.
      </p>
    </div>

    <div class="ss-card" style="margin-top: 1em;">
      <h3 style="margin-top: 0;">Client Support</h3>

      <p>
        Smart Shuffle works through Jellyfin Web UI integration. It is expected to work in browsers and
        Web UI-based clients. Native clients that do not use Jellyfin Web are not currently supported.
      </p>
    </div>
  `;

  container.append(section);
}