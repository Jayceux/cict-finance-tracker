"use client";

import { useState } from "react";
import { Address, formatEther } from "viem";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { useWatchBalance } from "~~/hooks/scaffold-eth/useWatchBalance";
import { useGlobalState } from "~~/services/store/store";

type BalanceProps = {
  address?: Address;
  className?: string;
  usdMode?: boolean;
};

/**
 * Display (ETH & USD) balance of an ETH address.
 */
export const Balance = ({ address, className = "", usdMode }: BalanceProps) => {
  const { targetNetwork } = useTargetNetwork();
  const nativeCurrencyPrice = useGlobalState(state => state.nativeCurrency.price);
  const isNativeCurrencyPriceFetching = useGlobalState(state => state.nativeCurrency.isFetching);

  const {
    data: balance,
    isError,
    isLoading,
  } = useWatchBalance({
    address,
  });

  // displayMode: 0 = token, 1 = fiat (nativeCurrency.price), 2 = PHP (via global store)
  const [displayMode, setDisplayMode] = useState<number>(usdMode ? 1 : 0);
  const ethToPhp = useGlobalState(state => state.nativeCurrency.pricePhp);

  const toggleDisplay = () => setDisplayMode(m => (m + 1) % 3);

  if (!address || isLoading || balance === null || (isNativeCurrencyPriceFetching && nativeCurrencyPrice === 0)) {
    return (
      <div className="animate-pulse flex space-x-4">
        <div className="rounded-md bg-slate-300 h-6 w-6"></div>
        <div className="flex items-center space-y-6">
          <div className="h-2 w-28 bg-slate-300 rounded-sm"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="border-2 border-base-content/30 rounded-md px-2 flex flex-col items-center max-w-fit cursor-pointer">
        <div className="text-warning">Error</div>
      </div>
    );
  }

  const formattedBalance = balance ? Number(formatEther(balance.value)) : 0;

  const phpDisplay = () => {
    if (!ethToPhp || ethToPhp === 0) return "N/A";
    return (formattedBalance * ethToPhp).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <button
      className={`btn btn-sm btn-ghost flex flex-col font-normal items-center hover:bg-transparent ${className}`}
      onClick={toggleDisplay}
      type="button"
    >
      <div className="w-full flex items-center justify-center">
        {displayMode === 0 && (
          <>
            <span>
              {formattedBalance.toLocaleString("en-US", {
                maximumFractionDigits: 4,
              })}
            </span>
            <span className="text-[0.8em] font-bold ml-1">{targetNetwork.nativeCurrency.symbol}</span>
          </>
        )}
        {displayMode === 1 && (
          <>
            <span className="text-[0.8em] font-bold mr-1">$</span>
            <span>
              {(formattedBalance * nativeCurrencyPrice).toLocaleString("en-US", {
                maximumFractionDigits: 2,
              })}
            </span>
          </>
        )}
        {displayMode === 2 && (
          <>
            <span className="text-[0.8em] font-bold mr-1">₱</span>
            <span>{phpDisplay()}</span>
          </>
        )}
      </div>
    </button>
  );
};
