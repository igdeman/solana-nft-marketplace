import create, { State } from 'zustand'
import { Connection, PublicKey } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import {
	fetchAllMetadataByOwner,
	Metadata,
	mplTokenMetadata
} from '@metaplex-foundation/mpl-token-metadata';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { PublicKey as MPLPublicKey } from '@metaplex-foundation/umi-public-keys'
import { RpcBaseOptions, RpcDataSlice } from '@metaplex-foundation/umi';
import { NFT } from '../models/types';

interface UserNFTS extends State {
  nfts: NFT[];
  getUserTokens: ( publicKey: PublicKey, connection: Connection, options?:RpcBaseOptions & { dataSlice?: RpcDataSlice; } ) => void
}


const useUserNFTS = create<UserNFTS>((set, _get) => ({
  nfts: [],
  getUserTokens: async (publicKey, connection, options = {}) => {
    const nfts:NFT[] = [];
		const umi = createUmi(connection.rpcEndpoint).use(mplTokenMetadata());
		let metadata:{[key:string]: Metadata} = {};
		try {
			(await fetchAllMetadataByOwner(umi, publicKey.toBase58() as MPLPublicKey, options)).forEach((meta) => {
				metadata[meta.mint.toString()] = meta;
			});
			const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
				programId:TOKEN_PROGRAM_ID,
			});
			for(let tokenAccount of tokenAccounts.value) {
				if(metadata[tokenAccount.account.data.parsed.info.mint] && BigInt(tokenAccount.account.data.parsed.info.tokenAmount.amount) === BigInt(1)){
					const nft:NFT = {
						token: tokenAccount.pubkey,
						account: tokenAccount.account,
						metadata: metadata[tokenAccount.account.data.parsed.info.mint],
						json: null,
					}
					if(metadata[tokenAccount.account.data.parsed.info.mint].uri){
						nft.json = await (await fetch(metadata[tokenAccount.account.data.parsed.info.mint].uri)).json()
					}
					nfts.push(nft);
				}
			}
    }
		catch (e) {
      console.log(`Unable to load user tokens: `, e);
    }
    set((s) => {
      s.nfts = nfts;
    })
  }
}));

export default useUserNFTS;
