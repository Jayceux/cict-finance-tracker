"use client";

import { useEffect, useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { usePublicClient } from "wagmi";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth/useDeployedContractInfo";
import { useIsAdmin } from "~~/hooks/scaffold-eth/useIsAdmin";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth/useScaffoldWriteContract";
import { useGlobalState } from "~~/services/store/store";
import { getEthToPhpRate } from "~~/utils/scaffold-eth/getEthToPhpRate";

export default function RecordPage() {
  useAccount();
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  const publicClient = usePublicClient();

  const { data: deployedContract } = useDeployedContractInfo({ contractName: "YourContract" });

  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "YourContract" });

  const [type, setType] = useState<"Income" | "Expense">("Income");
  const [to, setTo] = useState<string>("");
  const [amountPhp, setAmountPhp] = useState<string>("");
  const [amountInput, setAmountInput] = useState<string>("");
  const [amountUnit, setAmountUnit] = useState<"php" | "usd" | "eth">("php");
  const [category, setCategory] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [ethToPhp, setEthToPhp] = useState<number | null>(null);
  const [estFeePhp, setEstFeePhp] = useState<string | null>(null);
  const [estFeeEth, setEstFeeEth] = useState<string | null>(null);
  const [contractBalanceWei, setContractBalanceWei] = useState<bigint | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCurrency, setShowCurrency] = useState<"usd" | "php">("php");
  const nativeCurrencyPrice = useGlobalState(state => state.nativeCurrency.price);
  const nativeCurrencyPricePhpFromStore = useGlobalState(state => state.nativeCurrency.pricePhp);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const rate = await getEthToPhpRate();
      if (mounted) setEthToPhp(rate);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // fetch contract balance
  useEffect(() => {
    let mounted = true;
    const fetchBalance = async () => {
      try {
        if (!deployedContract || !publicClient) return;
        const bal: bigint = await (publicClient as any).getBalance({ address: deployedContract.address });
        if (mounted) setContractBalanceWei(bal);
      } catch {
        if (mounted) setContractBalanceWei(null);
      }
    };

    fetchBalance();
    // poll every 10s while page is open
    const id = setInterval(fetchBalance, 10000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [deployedContract, publicClient]);

  // Estimate gas fee whenever inputs change
  useEffect(() => {
    let mounted = true;
    const estimate = async () => {
      try {
        if (!deployedContract || !publicClient) return;

        // calculate value and args depending on type
        const contractAddress = deployedContract.address;
        let value: bigint | undefined = undefined;
        let functionName: string;
        let args: any[] = [];

        const buildEthString = (phpValue: string) => {
          if (!phpValue || !ethToPhp) return null;
          const php = parseFloat(phpValue);
          if (Number.isNaN(php)) return null;
          // compute ETH = PHP / rate
          const eth = php / ethToPhp;
          // preserve precision up to 18 decimals for parseEther, then trim trailing zeros
          const s = eth
            .toFixed(18)
            .replace(/(?:\.\d*?)0+$/, (m: string) => m.replace(/0+$/, ""))
            .replace(/\.$/, "");
          return s;
        };

        if (type === "Income") {
          functionName = "recordIncome";
          // amountPhp -> ETH
          const ethStr = buildEthString(amountPhp);
          if (!ethStr) {
            if (mounted) {
              setEstFeePhp(null);
              setEstFeeEth(null);
            }
            return;
          }
          value = parseEther(ethStr);
          args = [category || "", description || ""];
        } else {
          functionName = "recordExpense";
          const ethStr = buildEthString(amountPhp);
          if (!ethStr) {
            if (mounted) {
              setEstFeePhp(null);
              setEstFeeEth(null);
            }
            return;
          }
          const amountWei = parseEther(ethStr);
          args = [to || "0x0000000000000000000000000000000000000000", amountWei, category || "", description || ""];
        }

        // estimate gas
        // publicClient.estimateContractGas requires viem client
        const estimatedGas: bigint = await (publicClient as any).estimateContractGas({
          address: contractAddress,
          abi: deployedContract.abi,
          functionName,
          args,
          value,
        });

        const gasPrice: bigint = await (publicClient as any).getGasPrice();
        const feeWei = estimatedGas * gasPrice;
        const feeEthNum = parseFloat(formatEther(feeWei));
        const feeEthStr = feeEthNum.toFixed(6);
        if (mounted) setEstFeeEth(feeEthStr);
        if (ethToPhp) {
          const feePhp = (feeEthNum * ethToPhp).toFixed(2);
          if (mounted) setEstFeePhp(feePhp);
        } else {
          if (mounted) setEstFeePhp(null);
        }
      } catch {
        if (mounted) {
          setEstFeePhp(null);
          setEstFeeEth(null);
        }
      }
    };

    estimate();
    return () => {
      mounted = false;
    };
  }, [type, amountPhp, category, description, to, deployedContract, publicClient, ethToPhp]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isAdmin) {
      setError("Only authorized admins can record transactions.");
      return;
    }
    if (!deployedContract) {
      setError("Contract not available");
      return;
    }

    try {
      setIsSubmitting(true);
      if (type === "Income") {
        if (!amountPhp || !ethToPhp) throw new Error("Amount or rate missing");
        const ethAmount = (parseFloat(amountPhp) / ethToPhp)
          .toFixed(18)
          .replace(/(?:\.\d*?)0+$/, (m: string) => m.replace(/0+$/, ""))
          .replace(/\.$/, "");
        const value = parseEther(ethAmount);
        const res = await writeContractAsync({ functionName: "recordIncome", args: [category, description], value });
        if (res) setTxHash(res as string);
      } else {
        if (!amountPhp || !ethToPhp) throw new Error("Amount or rate missing");
        // convert PHP -> ETH before parsing to wei
        const ethAmount = (parseFloat(amountPhp) / ethToPhp)
          .toFixed(18)
          .replace(/(?:\.\d*?)0+$/, (m: string) => m.replace(/0+$/, ""))
          .replace(/\.$/, "");
        const amountWei = parseEther(ethAmount);
        const res = await writeContractAsync({
          functionName: "recordExpense",
          args: [to, amountWei, category, description],
        });
        if (res) setTxHash(res as string);
      }
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setIsSubmitting(false);
    }
    // refresh balance after submission attempt
    try {
      if (deployedContract && publicClient) {
        const bal: bigint = await (publicClient as any).getBalance({ address: deployedContract.address });
        setContractBalanceWei(bal);
      }
    } catch {
      // ignore
    }
  };

  const payableEthDisplay = (() => {
    if (!amountPhp || !ethToPhp) return null;
    const php = parseFloat(amountPhp);
    if (Number.isNaN(php)) return null;
    const eth = php / ethToPhp;
    // Trim to max 18 decimals and remove trailing zeros
    return eth
      .toFixed(18)
      .replace(/(?:\.\d*?)0+$/, (m: string) => m.replace(/0+$/, ""))
      .replace(/\.$/, "");
  })();
  // precompute balance strings
  const contractBalanceEth = contractBalanceWei ? formatEther(contractBalanceWei) : null;
  const contractBalancePhp =
    contractBalanceEth && (ethToPhp || nativeCurrencyPricePhpFromStore)
      ? (parseFloat(contractBalanceEth) * (ethToPhp || nativeCurrencyPricePhpFromStore)).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : null;
  const contractBalanceUsd =
    contractBalanceEth && nativeCurrencyPrice
      ? (parseFloat(contractBalanceEth) * nativeCurrencyPrice).toLocaleString("en-US", { maximumFractionDigits: 2 })
      : null;

  // expense warning state (recomputed whenever inputs change)
  const [expenseEthStr, setExpenseEthStr] = useState<string | null>(null);
  const [expenseInsufficient, setExpenseInsufficient] = useState<boolean>(false);

  useEffect(() => {
    if (type !== "Expense") {
      setExpenseEthStr(null);
      setExpenseInsufficient(false);
      return;
    }

    if (!amountPhp || !ethToPhp || !contractBalanceWei) {
      setExpenseEthStr(null);
      setExpenseInsufficient(false);
      return;
    }

    try {
      const s = (parseFloat(amountPhp) / ethToPhp)
        .toFixed(18)
        .replace(/(?:\.\d*?)0+$/, (m: string) => m.replace(/0+$/, ""))
        .replace(/\.$/, "");
      const amountWei = parseEther(s);
      setExpenseEthStr(s);
      setExpenseInsufficient(amountWei > contractBalanceWei);
    } catch {
      setExpenseEthStr(null);
      setExpenseInsufficient(false);
    }
  }, [amountPhp, ethToPhp, contractBalanceWei, type]);

  return (
    <div className="container mx-auto mt-10 px-4 md:px-0">
      <h1 className="text-2xl font-bold mb-4">Record Transaction</h1>

      <div className="mb-4">
        <div>
          <div>
            <div className="text-xs text-muted">Contract / Student Government balance</div>
            <div className="text-2xl font-bold">{contractBalanceEth ? `${contractBalanceEth} ETH` : "N/A"}</div>
            <div className="tooltip" data-tip="Click to toggle currency">
              <button
                type="button"
                title="Click to toggle conversion"
                className="text-sm text-muted font-medium btn btn-ghost btn-xs p-0"
                onClick={() => setShowCurrency(showCurrency === "php" ? "usd" : "php")}
              >
                {contractBalanceEth ? (
                  showCurrency === "php" ? (
                    contractBalancePhp ? (
                      <>
                        <span className="text-sm">₱</span>
                        <span className="ml-1">{contractBalancePhp}</span>
                      </>
                    ) : (
                      <span>N/A</span>
                    )
                  ) : contractBalanceUsd ? (
                    <>
                      <span className="text-sm">$</span>
                      <span className="ml-1">{contractBalanceUsd}</span>
                    </>
                  ) : (
                    <span>N/A</span>
                  )
                ) : null}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* compute intended withdraw amount in wei for expense and check against balance */}
      {type === "Expense" && expenseInsufficient && expenseEthStr ? (
        <div className="alert alert-warning flex gap-1">
          <div>Warning: payout amount</div>
          <div className="font-mono rounded bg-warning-content text-warning px-1">{expenseEthStr} ETH</div>
          <div>Student Government balance</div>
          <div className="font-mono rounded bg-warning-content text-warning px-1">{contractBalanceEth} ETH</div>
          <div>This transaction will likely fail.</div>
        </div>
      ) : null}

      {isAdminLoading ? (
        <div>Checking admin status...</div>
      ) : !isAdmin ? (
        <div className="alert alert-warning">
          Only authorized admins can record transactions. Connect with an admin account.
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 max-w-md">
        <label className="label">Type</label>
        <select value={type} onChange={e => setType(e.target.value as any)} className="select w-full">
          <option value="Income">Income (send ETH to SG balance)</option>
          <option value="Expense">Expense (send ETH from SG balance)</option>
        </select>

        {type === "Expense" && (
          <>
            <label className="label">To (recipient address)</label>
            <input className="input w-full" value={to} onChange={e => setTo(e.target.value)} placeholder="0x..." />
          </>
        )}

        <label className="label">Amount</label>
        <div className="join rounded w-full">
          <div>
            <label className="input join-item">
              {amountUnit === "php" ? (
                <span className="mr-2">₱</span>
              ) : amountUnit === "usd" ? (
                <span className="mr-2">$</span>
              ) : (
                <span className="mr-2">Ξ</span>
              )}
              <input
                type="text"
                value={amountInput}
                className="join-item w-full"
                onChange={e => {
                  const v = e.target.value;
                  setAmountInput(v);
                  const n = parseFloat(v || "");
                  if (!Number.isFinite(n)) {
                    setAmountPhp("");
                    return;
                  }
                  if (amountUnit === "php") {
                    setAmountPhp(String(n));
                  } else if (amountUnit === "usd") {
                    if (!nativeCurrencyPrice) setAmountPhp("");
                    else {
                      const eth = n / nativeCurrencyPrice;
                      const phpRate = ethToPhp || nativeCurrencyPricePhpFromStore;
                      setAmountPhp(phpRate ? String(eth * phpRate) : "");
                    }
                  } else {
                    // eth
                    const phpRate = ethToPhp || nativeCurrencyPricePhpFromStore;
                    setAmountPhp(phpRate ? String(n * phpRate) : "");
                  }
                }}
                placeholder={amountUnit === "php" ? "1000.00" : amountUnit === "usd" ? "100.00" : "0.1"}
              />
            </label>
          </div>
          <div className="btn-group *:border *:border-base-100/25">
            <button
              type="button"
              className={`btn btn-md join-item ${amountUnit === "php" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => {
                setAmountUnit("php");
                // recalc amountPhp from current input
                const v = parseFloat(amountInput || "");
                setAmountPhp(Number.isFinite(v) ? String(v) : "");
              }}
            >
              ₱
            </button>
            <button
              type="button"
              className={`btn btn-md join-item ${amountUnit === "usd" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => {
                setAmountUnit("usd");
                const v = parseFloat(amountInput || "");
                if (!Number.isFinite(v) || !nativeCurrencyPrice) setAmountPhp("");
                else {
                  // USD -> ETH -> PHP
                  const eth = v / nativeCurrencyPrice;
                  const phpRate = ethToPhp || nativeCurrencyPricePhpFromStore;
                  setAmountPhp(phpRate ? String(eth * phpRate) : "");
                }
              }}
            >
              $
            </button>
            <button
              type="button"
              className={`btn btn-md join-item ${amountUnit === "eth" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => {
                setAmountUnit("eth");
                const v = parseFloat(amountInput || "");
                if (!Number.isFinite(v)) setAmountPhp("");
                else {
                  const phpRate = ethToPhp || nativeCurrencyPricePhpFromStore;
                  setAmountPhp(phpRate ? String(v * phpRate) : "");
                }
              }}
            >
              Ξ
            </button>
          </div>
        </div>
        {payableEthDisplay ? (
          <div className="text-sm text-muted">
            Payable (ETH): {payableEthDisplay} {"ETH"}
          </div>
        ) : null}

        <label className="label">Category</label>
        <input
          className="input w-full"
          value={category}
          onChange={e => setCategory(e.target.value)}
          placeholder="e.g., Donation"
        />

        <label className="label">Description</label>
        <input
          className="input w-full"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="e.g., Funds for event"
        />

        <div>
          <div className="text-sm text-muted">
            Estimated network fee (approx.): {estFeeEth ? `${estFeeEth} ETH` : "N/A"}
            {estFeePhp ? ` (~₱${estFeePhp})` : null}
          </div>
          <button className="btn btn-primary mt-2" type="submit" disabled={!isAdmin || isSubmitting}>
            {isSubmitting ? "Recording..." : "Record"}
          </button>
        </div>

        {txHash && (
          <div className="alert alert-success">
            Transaction submitted: <code>{txHash}</code>
          </div>
        )}
        {error && <div className="alert alert-error">{error}</div>}
      </form>
    </div>
  );
}
