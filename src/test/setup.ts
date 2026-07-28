/**
 * jsdom gaps that the console legitimately relies on in a real browser.
 * Nothing here changes behaviour — it only makes jsdom able to run the components.
 */

// recharts' ResponsiveContainer measures its parent. jsdom has no layout engine
// and no ResizeObserver, so it gets a stub that reports nothing. Charts then render
// at their fallback size, which is fine: the tests assert TEXT, not pixels.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

// useStreamedText asks whether the viewer prefers reduced motion.
globalThis.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof matchMedia;
