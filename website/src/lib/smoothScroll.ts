/** Snappy ease-out — quick travel, short soft landing */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export interface SmoothScrollOptions {
  /** Total animation time in ms */
  duration?: number;
  container?: HTMLElement | Window;
  axis?: "x" | "y";
}

export function smoothScrollTo(
  target: number | HTMLElement,
  options: SmoothScrollOptions = {},
): void {
  const duration = options.duration ?? 900;
  const container = options.container ?? window;

  const getScrollTop = () =>
    container instanceof Window
      ? window.scrollY || document.documentElement.scrollTop
      : container.scrollTop;

  const setScrollTop = (value: number) => {
    if (container instanceof Window) {
      window.scrollTo(0, value);
    } else {
      container.scrollTop = value;
    }
  };

  const start = getScrollTop();
  const end =
    typeof target === "number"
      ? target
      : (() => {
          const rect = target.getBoundingClientRect();
          const pageY = window.scrollY || document.documentElement.scrollTop;
          return rect.top + pageY - 110;
        })();

  const distance = end - start;
  if (Math.abs(distance) < 1) return;

  let startTime: number | null = null;

  function step(timestamp: number) {
    if (startTime === null) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    setScrollTop(start + distance * easeOutCubic(progress));
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

export function smoothScrollBy(
  delta: number,
  options: SmoothScrollOptions = {},
): void {
  const duration = options.duration ?? 900;
  const axis = options.axis ?? "y";
  const container = options.container ?? window;

  const getPos = () => {
    if (container instanceof Window) {
      return axis === "x" ? window.scrollX : window.scrollY;
    }
    return axis === "x" ? container.scrollLeft : container.scrollTop;
  };

  const setPos = (value: number) => {
    if (container instanceof Window) {
      if (axis === "x") window.scrollTo(value, window.scrollY);
      else window.scrollTo(window.scrollX, value);
    } else if (axis === "x") {
      container.scrollLeft = value;
    } else {
      container.scrollTop = value;
    }
  };

  const start = getPos();
  const distance = delta;
  if (Math.abs(distance) < 1) return;

  let startTime: number | null = null;

  function step(timestamp: number) {
    if (startTime === null) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    setPos(start + distance * easeOutCubic(progress));
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}
