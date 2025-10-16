export const getEthToPhpRate = async (): Promise<number | null> => {
  try {
    // Call our server-side cached endpoint
    const res = await fetch("/api/price", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.ethToPhp ?? null;
  } catch (err) {
    console.warn("getEthToPhpRate failed", err);
    return null;
  }
};
