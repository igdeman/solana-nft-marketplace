import { FC, useState } from 'react';
import { ListedNFT, NFT } from '../models/types';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import useEscrowNFTS from '../stores/useEscrowNFTS';
import useUserNFTS from '../stores/useUserNFTS';

type Props = {
	nft: NFT | ListedNFT;
	status: "listed" | "owned" | "sale" | "none";
};

export const NFTCard: FC<Props> = ({ nft, status}) => {
	const [busy, setBusy] = useState<boolean>(false);
	const [price, setPrice] = useState<number>();
	const wallet = useWallet();
  const { connection } = useConnection();
	const { getEscrows, getUserListedNFTS, list, delist, buy } = useEscrowNFTS();
	const { getUserTokens } = useUserNFTS()

	const label = () => {
		switch (status) {
			case "listed":
				return "Delist";
			case "owned":
				return "List";
			case "sale":
				return "Buy";
			default:
				return "";
		}
	}

	const action = async () => {
		setBusy(true);
		try{
			switch (status) {
				case "listed":
					await delist(nft, wallet, connection);
					break
				case "owned":
					await list(price, nft, wallet, connection);
					break;
				case "sale":
					await buy(nft as ListedNFT, wallet, connection);
					break;
			}
			getEscrows(connection);
			getUserListedNFTS(wallet.publicKey, connection);
			getUserTokens(wallet.publicKey, connection);
			setBusy(false);
		}
		catch(e){
			console.log(e);
			setBusy(false);
		}
	}

	return (
		<div className="flex flex-col gap-2 relative group">
			<h5 className="text-overflow-ellipsis whitespace-nowrap">{nft.metadata.name}</h5>
			<img src={nft.json.image} className="w-full h-full" />
			{status === "owned" && <input type="number" value={price} onChange={(e)=>{setPrice(parseFloat(e.target.value))}} className="text-black p-2" placeholder='Price SOL' />}
			{status !== "owned" && <span>{`Price: ${Number((nft as ListedNFT).escrow.price) / LAMPORTS_PER_SOL} SOL`}</span>}
			<button onClick={action} className={`pl-6 pr-6 pt-2 pb-2 bg-blue-500 ${busy && "opacity-50 cursor-not-allowed"}`}>
				{label()}
			</button>
		</div>
	);
};
