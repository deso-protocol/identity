export const setupCIEListener = () => {
  window.addEventListener('load', () => logInteractionEvent('window', 'open', null));
  window.addEventListener('beforeunload', () =>
    logInteractionEvent('window', 'close', null)
  );
  window.addEventListener(
    'click',
    (ev) => {
      const el = ev.target as HTMLElement;
      if (!el) return;
      let node: HTMLElement | null = el;
      let controlName = el.dataset.controlName ?? '';

      while (node && node !== document.body && controlName === '') {
        node = node.parentElement;
        if (node === null) break;
        controlName = node?.dataset.controlName ?? '';
      }

      if (controlName) {
        const data = Object.entries(node?.dataset ?? {}).reduce(
          (result, [k, v]) => {
            if (k.startsWith('control') && k !== 'controlName') {
              const keyWithPrefixRemoved = k.replace('control', '');
              const key =
                keyWithPrefixRemoved.charAt(0).toLowerCase() +
                keyWithPrefixRemoved.slice(1);
              result[key] = v;
            }
            return result;
          },
          {} as any
        );
        logInteractionEvent(controlName, 'click', data);
      }
    },
    true
  );
};

/**
 * @param object the object that was interacted with, could be a button, a page, a link, a modal, etc.
 * @param event the event that was triggered, could be a click, a hover, a focus, PageView, etc.
 * @param data arbitrary data map that can be used to pass additional information about the interaction.
 */
export const logInteractionEvent = (object: string, event: string, data: any = {}) => {
  // NOTE: this only works on web apps.
  window.opener?.postMessage(
    {
      category: 'control-interaction-event',
      payload: { object, event, data },
    },
    '*'
  );
};