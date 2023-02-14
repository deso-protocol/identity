const SEED_REGEX = /^[0-9a-fA-Z]{64}$/;
const MNEMONIC_REGEX = /^(?:[a-z]+\s){11}(?:[a-z]+)$/;
const JWT_REGEX = /^(?:[a-zA-Z0-9_=]+)\.(?:[a-zA-Z0-9_=]+)\.(?:[a-zA-Z0-9_\-\+\/=]*)/;

export const setupInteractionEventListener = () => {
  window.addEventListener('load', () => logInteractionEvent('window', 'open', {}));
  window.addEventListener('beforeunload', () =>
    logInteractionEvent('window', 'close', {})
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
export const logInteractionEvent = (object: string, event: string, data: Record<string,string | number | boolean> = {}) => {
  data.publicKeyBase58Check = getPublicKeyFromQueryString(window.location.search);

  window.opener?.postMessage(
    {
      category: 'interaction-event',
      payload: { object, event, data: sanitizeData(data) },
    },
    '*'
  );
};

const isSafeValue = (value: string) => {
  return !(SEED_REGEX.test(value) || MNEMONIC_REGEX.test(value) || JWT_REGEX.test(value));
}

const sanitizeData = (data: Record<string, string | number | boolean>) => {
  return Object.entries(data).reduce((result, [k, v]) => {
    if (isSafeValue(v.toString())) {
      result[k] = v;
    }
    return result;
  }, {} as Record<string, string | number | boolean>);
}

export const getPublicKeyFromQueryString = (
  search: string
): string => {
  const params = new URLSearchParams(search);

  return params.get('public_key') ?? params.get('publicKey') ?? ''
};
