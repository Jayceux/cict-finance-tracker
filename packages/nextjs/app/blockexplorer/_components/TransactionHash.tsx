import { ArrowTopRightOnSquareIcon, CheckCircleIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { useCopyToClipboard } from "~~/hooks/scaffold-eth/useCopyToClipboard";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";

export const TransactionHash = ({ hash }: { hash: string }) => {
  const { copyToClipboard: copyAddressToClipboard, isCopiedToClipboard: isAddressCopiedToClipboard } =
    useCopyToClipboard();
  const { targetNetwork } = useTargetNetwork();

  return (
    <div className="flex items-center">
      {hash?.substring(0, 6)}...{hash?.substring(hash.length - 4)}
      {/* external explorer link */}
      {targetNetwork?.blockExplorers?.default?.url ? (
        <a
          href={`${(targetNetwork.blockExplorers.default.url || "").replace(/\/$/, "")}/tx/${hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-2 text-muted"
          title="View transaction on block explorer"
        >
          <ArrowTopRightOnSquareIcon className="h-4 w-4 inline" />
        </a>
      ) : null}
      {isAddressCopiedToClipboard ? (
        <CheckCircleIcon
          className="ml-1.5 text-xl font-normal text-base-content h-5 w-5 cursor-pointer"
          aria-hidden="true"
        />
      ) : (
        <DocumentDuplicateIcon
          className="ml-1.5 text-xl font-normal h-5 w-5 cursor-pointer"
          aria-hidden="true"
          onClick={() => copyAddressToClipboard(hash)}
        />
      )}
    </div>
  );
};
