import { useScaffoldReadContract } from "./useScaffoldReadContract";
import { useAccount } from "wagmi";

/**
 * Simple hook that returns whether the connected account is an admin in `YourContract`.
 */
export const useIsAdmin = () => {
  const { address } = useAccount();

  const { data: isAdmin, isFetching } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "admins",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    watch: true,
  });

  return { isAdmin: Boolean(isAdmin), isLoading: isFetching };
};
