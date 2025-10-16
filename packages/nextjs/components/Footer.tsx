import React, { useState } from "react";
import Link from "next/link";
import { hardhat } from "viem/chains";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { HeartIcon } from "@heroicons/react/24/outline";
import { SwitchTheme } from "~~/components/SwitchTheme";
import { Faucet } from "~~/components/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { useGlobalState } from "~~/services/store/store";

/**
 * Site footer
 */
export const Footer = () => {
  const nativeCurrencyPrice = useGlobalState(state => state.nativeCurrency.price);
  const nativeCurrencyPricePhp = useGlobalState(state => state.nativeCurrency.pricePhp);
  const [showPhp, setShowPhp] = useState(false);
  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;

  return (
    <div className="min-h-0 py-5 px-1 mb-11 lg:mb-0">
      <div>
        <div className="fixed flex justify-between items-center w-full z-10 p-4 bottom-0 left-0 pointer-events-none">
          <div className="flex flex-col md:flex-row gap-2 pointer-events-auto">
            {(nativeCurrencyPrice > 0 || nativeCurrencyPricePhp > 0) && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowPhp(s => !s)}
                  className="btn btn-primary btn-sm font-normal gap-1"
                  title={showPhp ? "Show in native currency" : "Show in PHP"}
                >
                  <span className="text-sm font-bold">{showPhp ? "₱" : "$"}</span>
                  {showPhp ? (
                    <span>
                      {nativeCurrencyPricePhp > 0
                        ? nativeCurrencyPricePhp.toLocaleString("en-PH", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : "N/A"}
                    </span>
                  ) : (
                    <span>
                      {nativeCurrencyPrice > 0
                        ? nativeCurrencyPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })
                        : "N/A"}
                    </span>
                  )}
                </button>
              </div>
            )}
            {isLocalNetwork && (
              <>
                <Faucet />
                <Link href="/blockexplorer" passHref className="btn btn-primary btn-sm font-normal gap-1">
                  <MagnifyingGlassIcon className="h-4 w-4" />
                  <span>Block Explorer</span>
                </Link>
              </>
            )}
          </div>
          <SwitchTheme className={`pointer-events-auto ${isLocalNetwork ? "self-end md:self-auto" : ""}`} />
        </div>
      </div>
      <div className="w-full">
        <ul className="menu menu-horizontal w-full">
          <div className="flex justify-center items-center gap-2 text-sm w-full">
            <div className="flex justify-center items-center gap-2">
              <p className="m-0 text-center">
                Built with <HeartIcon className="inline-block h-4 w-4" /> at
              </p>
              <a
                className="flex justify-center items-center gap-1"
                href="https://neust.edu.ph/"
                target="_blank"
                rel="noreferrer"
              >
                <span className="link">NEUST</span>
              </a>
              by CICT Students
            </div>
            <span>·</span>
            <p className="m-0 text-center">In memory of Juvelle</p>
            <span>·</span>
          </div>
        </ul>
      </div>
    </div>
  );
};
