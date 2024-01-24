// Next, React
import { FC, useEffect } from 'react';

// Wallet
import { useWallet, useConnection } from '@solana/wallet-adapter-react';

// Store
import useUserSOLBalanceStore from '../../stores/useUserSOLBalanceStore';
import useUserNFTS from '../../stores/useUserNFTS';
import useEscrowNFTS from '../../stores/useEscrowNFTS';
import { NFTCard } from '../../components/NFT';

export const HomeView: FC = ({ }) => {
  const wallet = useWallet();
  const { connection } = useConnection();

  const balance = useUserSOLBalanceStore((s) => s.balance)
  const { getUserSOLBalance } = useUserSOLBalanceStore()

	const nfts = useUserNFTS((s) => s.nfts)
	const { getUserTokens } = useUserNFTS()

	const escrowNfts = useEscrowNFTS((s) => s.nfts);
	const userListedNfts = useEscrowNFTS((s) => s.listedNfts);
	const { getEscrows, getUserListedNFTS, list, delist, buy } = useEscrowNFTS();

  useEffect(() => {
    if (wallet.publicKey) {
      console.log(wallet.publicKey.toBase58())
      getUserSOLBalance(wallet.publicKey, connection);
			getUserTokens(wallet.publicKey, connection);
			getUserListedNFTS(wallet.publicKey, connection);
    }
		getEscrows(connection);
  }, [wallet.publicKey, connection, getUserSOLBalance, getUserTokens, getEscrows, getUserListedNFTS, list, delist, buy])

  return (

    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
				<div className="flex gap-10 w-full">
					<div className="flex-1">
						<h3 className='text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-fuchsia-500'>For SALE</h3>
						<div className="grid grid-cols-3 gap-10 w-full mb-16">
							{
								escrowNfts.map((nft) => {
									return (
										<NFTCard
											key={nft.token.toBase58()}
											nft={nft}
											status="sale"
										/>
									)
								})
							}
						</div>
					</div>
					<div className="flex-1">
						{
							userListedNfts && userListedNfts.length > 0 &&
							<>
								<h3 className='text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-fuchsia-500'>Your Listed NFTs</h3>
								<div className="grid grid-cols-3 gap-10 w-full mb-16">
									{
										userListedNfts.map((nft) => {
											return (
												<NFTCard
													key={nft.token.toBase58()}
													nft={nft}
													status="listed"
												/>
											)
										})
									}
								</div>
							</>
						}
						<h3 className='text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-fuchsia-500'>Your NFTs</h3>
						<div className="grid grid-cols-3 gap-10 w-full mb-12">
							{
								nfts.map((nft) => {
									return (
										<NFTCard
											key={nft.token.toBase58()}
											nft={nft}
											status="owned"
										/>
									)
								})
							}
						</div>
					</div>
				</div>
      </div>
    </div>
  );
};
