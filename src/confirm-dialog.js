const dialog = document.getElementById("confirmDialog");
const backdrop = dialog?.querySelector("[data-confirm-dismiss]");
const titleEl = document.getElementById("confirmDialogTitle");
const messageEl = document.getElementById("confirmDialogMessage");
const cancelBtn = document.getElementById("confirmDialogCancel");
const confirmBtn = document.getElementById("confirmDialogConfirm");

let resolvePromise = null;
let previousFocus = null;

function closeDialog(result) {
  if (!dialog || !resolvePromise) return;

  dialog.hidden = true;
  dialog.setAttribute("aria-hidden", "true");
  document.body.classList.remove("confirm-dialog-open");

  const resolve = resolvePromise;
  resolvePromise = null;
  resolve(result);

  if (previousFocus?.focus) {
    previousFocus.focus({ preventScroll: true });
  }
  previousFocus = null;
}

function onKeyDown(event) {
  if (event.key === "Escape") {
    event.preventDefault();
    closeDialog(false);
  }
}

backdrop?.addEventListener("click", () => closeDialog(false));
cancelBtn?.addEventListener("click", () => closeDialog(false));
confirmBtn?.addEventListener("click", () => closeDialog(true));

/**
 * @param {{ title: string, message: string, confirmLabel?: string, cancelLabel?: string, danger?: boolean }} options
 * @returns {Promise<boolean>}
 */
export function showConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
}) {
  if (!dialog || !titleEl || !messageEl || !cancelBtn || !confirmBtn) {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }

  if (resolvePromise) {
    closeDialog(false);
  }

  previousFocus = document.activeElement;
  titleEl.textContent = title;
  messageEl.textContent = message;
  cancelBtn.textContent = cancelLabel;
  confirmBtn.textContent = confirmLabel;
  confirmBtn.classList.toggle("confirm-dialog__confirm--danger", danger);

  dialog.hidden = false;
  dialog.setAttribute("aria-hidden", "false");
  document.body.classList.add("confirm-dialog-open");
  document.addEventListener("keydown", onKeyDown);

  const focusTarget = danger ? cancelBtn : confirmBtn;
  requestAnimationFrame(() => {
    focusTarget.focus({ preventScroll: true });
  });

  return new Promise((resolve) => {
    resolvePromise = (result) => {
      document.removeEventListener("keydown", onKeyDown);
      resolve(result);
    };
  });
}
