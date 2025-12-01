// Polyfill for localStorage to prevent errors in SSR environments
// This fixes "TypeError: localStorage.getItem is not a function"

if (typeof global !== 'undefined') {
    const g = global as any;
    // If localStorage is missing or broken (getItem is not a function), replace it
    if (!g.localStorage || typeof g.localStorage.getItem !== 'function') {
        g.localStorage = {
            getItem: () => null,
            setItem: () => { },
            removeItem: () => { },
            clear: () => { },
            length: 0,
            key: () => null,
        } as Storage;
    }
}

export { };
