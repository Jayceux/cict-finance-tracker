import { useCallback, useEffect } from "react";
import { useTargetNetwork } from "./useTargetNetwork";
import { useInterval } from "usehooks-ts";
import scaffoldConfig from "~~/scaffold.config";
import { useGlobalState } from "~~/services/store/store";
import { fetchPriceFromUniswap } from "~~/utils/scaffold-eth";

const enablePolling = false;

/**
 * Get the price of Native Currency based on Native Token/DAI trading pair from Uniswap SDK
 */
export const useInitializeNativeCurrencyPrice = () => {
  const setNativeCurrencyPrice = useGlobalState(state => state.setNativeCurrencyPrice);
  const setIsNativeCurrencyFetching = useGlobalState(state => state.setIsNativeCurrencyFetching);
  const { targetNetwork } = useTargetNetwork();

  const fetchPrice = useCallback(async () => {
    setIsNativeCurrencyFetching(true);
    const price = await fetchPriceFromUniswap(targetNetwork);
    setNativeCurrencyPrice(price);
    setIsNativeCurrencyFetching(false);
  }, [setIsNativeCurrencyFetching, setNativeCurrencyPrice, targetNetwork]);

  const setNativeCurrencyPricePhp = useGlobalState(state => state.setNativeCurrencyPricePhp);
  const fetchPhpRate = useCallback(async () => {
    try {
      const res = await fetch("/api/price");
      if (!res.ok) return;
      const data = await res.json();
      if (data?.ethToPhp) setNativeCurrencyPricePhp(data.ethToPhp);
    } catch {
      // ignore
    }
  }, [setNativeCurrencyPricePhp]);

  // Get the price of ETH from Uniswap on mount
  useEffect(() => {
    fetchPrice();
    fetchPhpRate();
  }, [fetchPrice, fetchPhpRate]);

  // Get the price of ETH from Uniswap at a given interval
  useInterval(fetchPrice, enablePolling ? scaffoldConfig.pollingInterval : null);
};
