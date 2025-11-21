// Focus management
export const focusElement = (element: HTMLElement | null) => {
  element?.focus();
};

// ARIA announcements
export const announceToScreenReader = (message: string) => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  document.body.appendChild(announcement);

  setTimeout(() => {
    announcement.remove();
  }, 1000);
};

// Skip to main content
export const skipToMain = () => {
  const mainElement = document.querySelector('main');
  if (mainElement) {
    mainElement.setAttribute('tabindex', '-1');
    mainElement.focus();
  }
};

// Keyboard navigation helpers
export const isKey = (event: KeyboardEvent, key: string): boolean => {
  return event.key.toLowerCase() === key.toLowerCase();
};

export const isKeyCombo = (
  event: KeyboardEvent,
  key: string,
  modifier: 'ctrl' | 'alt' | 'shift' | 'meta' = 'ctrl'
): boolean => {
  const modifierMap = {
    ctrl: event.ctrlKey,
    alt: event.altKey,
    shift: event.shiftKey,
    meta: event.metaKey,
  };

  return modifierMap[modifier] && isKey(event, key);
};

// Trap focus within a container
export const trapFocus = (container: HTMLElement, event: KeyboardEvent) => {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

  if (isKey(event, 'Tab')) {
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement?.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement?.focus();
    }
  }
};
