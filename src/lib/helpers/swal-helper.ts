import * as sweetalert2 from 'sweetalert2';
import Swal, { SweetAlertOptions } from 'sweetalert2';
import * as _ from 'lodash';

type Awaited<T> = T extends Promise<infer U> ? U : T;

export class SwalHelper {
  static ESCAPED_FIELDS = [
    'title',
    'text',
    'html',
    'footer',
    'confirmButtonColor',
    'confirmButtonText',
    'cancelButtonText',
    'denyButtonText',
    'target',
  ];

  // These are booleans, so they don't need to be escaped
  static UNESCAPED_FIELDS = [
    'focusConfirm',
    'showConfirmButton',
    'showCancelButton',
    'showDenyButton',
    'reverseButtons',
    'focusCancel',
    'allowOutsideClick',
    'allowEscapeKey',
  ];

  // Only the fields listed in ESCAPED_FIELDS and UNESCAPED_FIELDS are passed to sweetalert.
  // If you pass in an option that isn't in ESCAPED_FIELDS or UNESCAPED_FIELDS above, the option
  // will be ignored. Feel free to add support for more SweetAlertOptions if needed, but be sure
  // to escape them.
  //
  // We can add an htmlSafe option (i.e. do not sanitize) in the future if needed.
  static fire<T = any>(
    options: SweetAlertOptions,
    escapeFields = true
  ): Promise<sweetalert2.SweetAlertResult<Awaited<T>>> {
    // Feel free to add more classes here as needed
    const escapedCustomClass = {
      // @ts-ignore
      confirmButton: _.escape(options?.customClass?.confirmButton),
      // @ts-ignore
      denyButton: _.escape(options?.customClass?.denyButton),
      // @ts-ignore
      cancelButton: _.escape(options?.customClass?.cancelButton),
    };

    const escapedIcon = _.escape(
      options.icon as string
    ) as sweetalert2.SweetAlertIcon;

    const escapedOptions = {
      icon: escapedIcon,
      customClass: {
        ...escapedCustomClass,
        popup: 'screen-background text--text-lightest box--border',
      },
    };

    for (const field of SwalHelper.UNESCAPED_FIELDS) {
      // Only set escapedOptions[field] if it was explicitly set in options by the caller.
      // If we didn't have this if-check, then options that weren't explicitly set would end up
      // in escapedOptions as undefined, e.g. {showConfirmButton: undefined}. Swal would interpret
      // undefined as false, and would not show the confirm button, which isn't what the caller
      // intended (the caller left the field unspecified, i.e. Swal should use its default behavior,
      // which is to show a confirm button).
      // @ts-ignore
      if (options[field] !== undefined) {
        // @ts-ignore
        escapedOptions[field] = options[field];
      }
    }

    for (const field of SwalHelper.ESCAPED_FIELDS) {
      // @ts-ignore
      if (options[field] !== undefined) {
        if (escapeFields) {
          // @ts-ignore
          escapedOptions[field] = _.escape(options[field]);
        } else {
          // @ts-ignore
          escapedOptions[field] = options[field];
        }
      }
    }

    return Swal.fire(escapedOptions);
  }
}
