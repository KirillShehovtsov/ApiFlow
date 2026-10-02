import { createRoot } from 'react-dom/client';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

/**
 * @param {string} message
 * @param {{ title?: string, confirmLabel?: string, cancelLabel?: string, destructive?: boolean }} [options]
 */
export function showConfirm(message, options = {}) {
  const {
    title = 'Confirm action',
    confirmLabel = 'OK',
    cancelLabel = 'Cancel',
    destructive = true,
  } = options;

  return new Promise((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const cleanup = (result) => {
      root.unmount();
      container.remove();
      resolve(result);
    };

    root.render(
      <ConfirmDialog
        title={title}
        message={message}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        destructive={destructive}
        onConfirm={() => cleanup(true)}
        onCancel={() => cleanup(false)}
      />
    );
  });
}
