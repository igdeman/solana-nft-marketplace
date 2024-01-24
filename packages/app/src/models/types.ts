import { Metadata } from "@metaplex-foundation/mpl-token-metadata"
import { AccountInfo, ParsedAccountData, PublicKey } from "@solana/web3.js"
import { type } from "os"

export type EndpointTypes = 'mainnet' | 'devnet' | 'localnet'
export type NFT = {
	token: PublicKey,
	metadata: Metadata,
	account?: AccountInfo<ParsedAccountData>,
	json: any
}
export type ListedNFT = {
	token: PublicKey,
	metadata: Metadata,
	json: any,
	escrow: Escrow,
	account?: AccountInfo<ParsedAccountData>,
}
export type Escrow = {
	tokenAccount: PublicKey,
	mint: PublicKey,
	owner: PublicKey,
	price: BigInt,
	bump: number
}
