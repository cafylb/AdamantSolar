export async function preloadAssets() {
  if (typeof window === "undefined") return;

  const fontFamilies = ["Inter"];
  const fontWeights = ["400", "500", "600", "700"];

  const fontPromises = fontFamilies.flatMap((family) =>
    fontWeights.map((weight) => document.fonts.load(`${weight} 1rem ${family}`))
  );

  const safeLoad = Promise.race([
    Promise.allSettled(fontPromises),
    new Promise<void>((resolve) => window.setTimeout(resolve, 1500)),
  ]);

  try {
    await safeLoad;
    await document.fonts.ready;
  } catch {
    // Silently continue if font loading fails.
  }
}
