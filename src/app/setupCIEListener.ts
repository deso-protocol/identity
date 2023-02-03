export const setupCIEListener = () => {
  window.addEventListener('load', () => doPostMessage('window', 'open', null));
  window.addEventListener('beforeunload', () =>
    doPostMessage('window', 'close', null)
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
        doPostMessage(controlName, 'click', data);
      }
    },
    true
  );
};

const doPostMessage = (object: string, event: string, data: any) => {
  // NOTE: this only works on web apps.
  window.opener?.postMessage(
    {
      category: 'control-interaction-event',
      payload: { object, event, data },
    },
    '*'
  );
};
