"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PaginationButton, TransactionsTablePublic } from "./blockexplorer/_components";
import type { NextPage } from "next";
import { hardhat } from "viem/chains";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import deployedContracts from "~~/contracts/deployedContracts";
import { useFetchBlocks, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { useIsAdmin } from "~~/hooks/scaffold-eth/useIsAdmin";
import { notification } from "~~/utils/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin();

  // reuse the same blocks fetching hook used by the block explorer
  const { blocks, transactionReceipts, currentPage, totalBlocks, setCurrentPage, error } = useFetchBlocks();
  const { targetNetwork } = useTargetNetwork();
  const [isLocalNetwork, setIsLocalNetwork] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (targetNetwork.id !== hardhat.id) {
      setIsLocalNetwork(false);
    }
  }, [targetNetwork.id]);

  useEffect(() => {
    if (targetNetwork.id === hardhat.id && error) {
      setHasError(true);
    }
  }, [targetNetwork.id, error]);

  useEffect(() => {
    if (!isLocalNetwork) {
      notification.error(
        <>
          <p className="font-bold mt-0 mb-1">
            <code className="italic bg-base-300 text-base font-bold"> targetNetwork </code> is not localhost
          </p>
          <p className="m-0">
            - You are on <code className="italic bg-base-300 text-base font-bold">{targetNetwork.name}</code> .This
            block explorer is only for <code className="italic bg-base-300 text-base font-bold">localhost</code>.
          </p>
          <p className="mt-1 break-normal">
            - You can use{" "}
            <a className="text-accent" href={targetNetwork.blockExplorers?.default.url}>
              {targetNetwork.blockExplorers?.default.name}
            </a>{" "}
            instead
          </p>
        </>,
      );
    }
  }, [
    isLocalNetwork,
    targetNetwork.blockExplorers?.default.name,
    targetNetwork.blockExplorers?.default.url,
    targetNetwork.name,
  ]);

  useEffect(() => {
    if (hasError) {
      notification.error(
        <>
          <p className="font-bold mt-0 mb-1">Cannot connect to local provider</p>
          <p className="m-0">
            - Did you forget to run <code className="italic bg-base-300 text-base font-bold">yarn chain</code> ?
          </p>
          <p className="mt-1 break-normal">
            - Or you can change <code className="italic bg-base-300 text-base font-bold">targetNetwork</code> in{" "}
            <code className="italic bg-base-300 text-base font-bold">scaffold.config.ts</code>
          </p>
        </>,
      );
    }
  }, [hasError]);

  return (
    <>
      <div className="flex items-center flex-col grow pt-10">
        <div className="container mx-auto my-10 w-full">
          {(() => {
            try {
              const deployed = deployedContracts as any;
              const chainContracts = deployed?.[targetNetwork.id];
              const contractAddress = chainContracts?.YourContract?.address;
              const explorerUrl = (targetNetwork.blockExplorers?.default?.url || "").replace(/\/$/, "");
              if (explorerUrl && contractAddress) {
                return (
                  <div className="mb-4 flex gap-2 items-center">
                    <a
                      href={`${explorerUrl}/address/${contractAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-sm"
                    >
                      View Deployed Contract on Explorer
                    </a>
                    <div className="text-sm text-muted">Address:</div>
                    <div className="break-words">
                      <Address address={contractAddress} />
                    </div>
                  </div>
                );
              }
            } catch {
              // fallthrough
            }
            return null;
          })()}

          <TransactionsTablePublic blocks={blocks} transactionReceipts={transactionReceipts} />
          <div className="mt-4">
            {connectedAddress ? (
              isAdminLoading ? (
                <div className="text-sm text-muted">Checking admin status...</div>
              ) : isAdmin ? (
                <Link href="/record" className="btn btn-primary btn-sm">
                  Record Transaction
                </Link>
              ) : (
                <div className="text-sm text-warning">
                  Only authorized admins can record transactions. Connect with an admin account to add records.
                </div>
              )
            ) : (
              <div className="text-sm text-muted">Connect your wallet to record transactions (admins only).</div>
            )}
          </div>
          <PaginationButton
            currentPage={currentPage}
            totalItems={Number(totalBlocks)}
            setCurrentPage={setCurrentPage}
          />
        </div>
      </div>
    </>
  );
};

export default Home;
