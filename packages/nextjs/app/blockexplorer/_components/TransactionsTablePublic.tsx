import { useMemo, useState } from "react";
import { TransactionHash } from "./TransactionHash";
import { formatEther } from "viem";
import {
  ArrowDownIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUpIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { useGlobalState } from "~~/services/store/store";
import { TransactionWithFunction } from "~~/utils/scaffold-eth";
import { TransactionsTableProps } from "~~/utils/scaffold-eth/";

export const TransactionsTablePublic = ({ blocks, transactionReceipts }: TransactionsTableProps) => {
  const { targetNetwork } = useTargetNetwork();
  // per-row toggle set: when a tx hash is present, show PHP for that row; otherwise show native currency
  const [showPhpRows, setShowPhpRows] = useState<Set<string>>(new Set());
  const nativeCurrencyPrice = useGlobalState(state => state.nativeCurrency.price);
  const nativeCurrencyPricePhp = useGlobalState(state => state.nativeCurrency.pricePhp);
  // active filters applied to the table
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterText, setFilterText] = useState<string>("");

  // pending inputs (user changes these, then clicks Search to apply)
  const [pendingType, setPendingType] = useState<string>("all");
  const [pendingCategory, setPendingCategory] = useState<string>("");
  const [pendingText, setPendingText] = useState<string>("");

  // We rely on global store rates (price & pricePhp). The older local fetch is kept for backward compatibility
  // but not used; global store should be initialized elsewhere.

  const flattened = useMemo(() => {
    // flatten blocks into tx records with metadata
    return blocks
      .flatMap(block =>
        (block.transactions as TransactionWithFunction[]).map(tx => ({
          tx,
          block,
          receipt: transactionReceipts[tx.hash],
        })),
      )
      .map(({ tx, block, receipt }) => {
        const timeMined = new Date(Number(block.timestamp) * 1000).toLocaleString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

        let txType = "";
        if (tx.functionName) {
          const fn = tx.functionName.toString().toLowerCase();
          if (fn.includes("recordincome") || fn.includes("income")) txType = "Income";
          else if (fn.includes("recordexpense") || fn.includes("expense")) txType = "Expense";
          else txType = tx.functionName as string;
        } else {
          try {
            if (tx.value && (tx.value as bigint) > 0n) txType = "Incoming";
            else txType = "Transfer";
          } catch {
            txType = "Transfer";
          }
        }

        let category = "";
        let description = "";
        if (tx.functionArgNames && tx.functionArgs) {
          const idxCat = tx.functionArgNames.findIndex(n => n.toLowerCase().includes("category"));
          const idxDesc = tx.functionArgNames.findIndex(
            n => n.toLowerCase().includes("description") || n.toLowerCase().includes("desc"),
          );
          if (idxCat >= 0) category = tx.functionArgs[idxCat]?.toString() ?? "";
          if (idxDesc >= 0) description = tx.functionArgs[idxDesc]?.toString() ?? "";
        }

        const findAmountIndex = (names?: string[]) => {
          if (!names) return -1;
          return names.findIndex(n => {
            const lower = n.toLowerCase();
            return lower.includes("amount") || lower === "value" || lower === "wei" || lower === "_value";
          });
        };

        const idxAmount = findAmountIndex(tx.functionArgNames);
        let semanticAmount: bigint | null = null;
        if (idxAmount >= 0 && tx.functionArgs) {
          const raw = tx.functionArgs[idxAmount];
          try {
            if (typeof raw === "bigint") semanticAmount = raw as bigint;
            else if (typeof raw === "number") semanticAmount = BigInt(raw);
            else if (typeof raw === "string") semanticAmount = BigInt(raw);
            else if (raw && typeof raw.toString === "function") semanticAmount = BigInt(raw.toString());
          } catch {
            semanticAmount = null;
          }
        }

        const amountToDisplay = semanticAmount ?? (tx.value ? (tx.value as bigint) : null);

        return { tx, block, receipt, timeMined, txType, category, description, amountToDisplay };
      });
  }, [blocks, transactionReceipts]);

  const filtered = useMemo(() => {
    return flattened.filter(item => {
      if (filterType !== "all" && item.txType !== filterType) return false;
      if (filterCategory && !item.category.toLowerCase().includes(filterCategory.toLowerCase())) return false;
      if (
        filterText &&
        !(
          item.tx.hash.toLowerCase().includes(filterText.toLowerCase()) ||
          item.category.toLowerCase().includes(filterText.toLowerCase()) ||
          item.description.toLowerCase().includes(filterText.toLowerCase())
        )
      )
        return false;
      return true;
    });
  }, [flattened, filterType, filterCategory, filterText]);

  return (
    <div className="flex justify-center px-4 md:px-0">
      <div className="overflow-x-auto w-full shadow-2xl rounded-xl dark:border dark:border-base-100">
        <div className="p-4 flex flex-col md:flex-row gap-3 items-center">
          <select className="select" value={pendingType} onChange={e => setPendingType(e.target.value)}>
            <option value="all">All Types</option>
            <option value="Income">Income</option>
            <option value="Expense">Expense</option>
            <option value="Incoming">Incoming</option>
            <option value="Transfer">Transfer</option>
          </select>

          <input
            className="input"
            placeholder="Filter category"
            value={pendingCategory}
            onChange={e => setPendingCategory(e.target.value)}
          />

          <input
            className="input flex-1"
            placeholder="Search hash, category or description"
            value={pendingText}
            onChange={e => setPendingText(e.target.value)}
          />

          <div className="flex gap-2">
            <button
              className="btn btn-primary"
              onClick={() => {
                setFilterType(pendingType);
                setFilterCategory(pendingCategory);
                setFilterText(pendingText);
              }}
            >
              Search
            </button>
            <button
              className="btn btn-error"
              onClick={() => {
                // clear pending inputs
                setPendingType("all");
                setPendingCategory("");
                setPendingText("");
                // clear applied filters
                setFilterType("all");
                setFilterCategory("");
                setFilterText("");
              }}
            >
              Reset Filters
            </button>
          </div>
        </div>
        <table className="table text-xl bg-base-100 table-zebra w-full md:table-md table-sm">
          <thead>
            <tr className="rounded-xl text-sm text-base-content">
              <th className="bg-primary">Transaction Hash</th>
              <th className="bg-primary">Type</th>
              <th className="bg-primary">Transaction Recorded</th>
              <th className="bg-primary">Category</th>
              <th className="bg-primary">Description</th>
              <th className="bg-primary text-right">Amount ({targetNetwork.nativeCurrency.symbol})</th>
              <th className="bg-primary">From</th>
              <th className="bg-primary">To</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => {
              const { tx, receipt, timeMined, txType, category, description, amountToDisplay } = item;
              const ethVal = amountToDisplay ? parseFloat(formatEther(amountToDisplay)) : 0;
              const usdVal = ethVal * (nativeCurrencyPrice || 0);
              const phpVal = ethVal * (nativeCurrencyPricePhp || 0);
              const isPhp = showPhpRows.has(tx.hash);

              return (
                <tr key={tx.hash} className="hover text-sm">
                  <td className="w-1/12 md:py-4">
                    <TransactionHash hash={tx.hash} />
                  </td>
                  <td className="w-1/12 md:py-4">
                    {txType === "Income" && (
                      <div className="badge badge-success">
                        <ArrowDownIcon className="h-4 w-4" />
                        Income
                      </div>
                    )}
                    {txType === "Expense" && (
                      <div className="badge badge-error">
                        <ArrowUpIcon className="h-4 w-4" />
                        Expense
                      </div>
                    )}
                    {txType !== "Income" && txType !== "Expense" && (
                      <div className="badge badge-warning">
                        <QuestionMarkCircleIcon className="h-4 w-4" />
                        Unknown
                      </div>
                    )}
                  </td>
                  <td className="w-2/12 md:py-4">{timeMined}</td>
                  <td className="w-2/12 md:py-4">{category || "-"}</td>
                  <td className="w-2/12 md:py-4">{description || "-"}</td>
                  <td className="text-right md:py-4">
                    {amountToDisplay ? (
                      <>
                        <div className="tooltip" data-tip="Click to toggle conversion">
                          <button
                            type="button"
                            title="Click to toggle conversion"
                            className="text-sm text-muted btn btn-ghost btn-xs p-0"
                            onClick={() => {
                              const next = new Set(showPhpRows);
                              if (next.has(tx.hash)) next.delete(tx.hash);
                              else next.add(tx.hash);
                              setShowPhpRows(next);
                            }}
                          >
                            {isPhp ? (
                              <>
                                <span className="text-[0.8em] font-bold mr-1">₱</span>
                                <span>
                                  ~
                                  {phpVal.toLocaleString("en-PH", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="text-[0.8em] font-bold mr-1">$</span>
                                <span>
                                  ~
                                  {usdVal.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="text-xs">
                          ({formatEther(amountToDisplay)} {targetNetwork.nativeCurrency.symbol})
                        </div>
                      </>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="w-2/12 md:py-4">
                    <Address address={tx.from} size="sm" onlyEnsOrAddress />
                  </td>
                  <td className="w-2/12 md:py-4">
                    {!receipt?.contractAddress ? (
                      tx.to && <Address address={tx.to} size="sm" onlyEnsOrAddress />
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <Address address={receipt.contractAddress} size="sm" onlyEnsOrAddress />
                          <small className="text-xs text-muted">(New Digital Agreement)</small>
                        </div>
                        {targetNetwork?.blockExplorers?.default?.url ? (
                          <a
                            href={`${(targetNetwork.blockExplorers.default.url || "").replace(/\/$/, "")}/address/${receipt.contractAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost btn-sm"
                            aria-label="View contract on explorer"
                            title="View contract on explorer"
                          >
                            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                          </a>
                        ) : null}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
