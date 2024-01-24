import { AnchorProvider, Program, BorshCoder, utils, BN } from '@coral-xyz/anchor';
import { IDL } from '../idl/nft_marketplace';
import { Connection, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction } from '@solana/web3.js'
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import {
	fetchAllMetadata, findMetadataPda,
	Metadata,
	mplTokenMetadata
} from '@metaplex-foundation/mpl-token-metadata';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { PublicKey as MPLPublicKey } from '@metaplex-foundation/umi-public-keys'
import create, { State } from 'zustand'
import { Escrow, ListedNFT, NFT } from '../models/types';
import { WalletContextState } from '@solana/wallet-adapter-react';

interface ListedNFTS extends State {
  nfts: ListedNFT[];
  listedNfts: ListedNFT[];
  getEscrows: ( connection: Connection ) => void
  getUserListedNFTS: ( publicKey: PublicKey, connection: Connection ) => void
	list: (price:number, nft:NFT, wallet:WalletContextState, connection: Connection) => Promise<string>
	delist: (nft:NFT, wallet:WalletContextState, connection: Connection) => Promise<string>
	buy: (nft:ListedNFT, wallet:WalletContextState, connection: Connection) => Promise<string>
}

const programId = new PublicKey("3vtF9uetZjwXNHeptSGS5nBEBYwrwmDXAchzzjnpkS9h");

const useEscrowNFTS = create<ListedNFTS>((set, _get) => ({
  nfts: [],
	listedNfts: [],
  getEscrows: async (connection) => {
		const umi = createUmi(connection.rpcEndpoint).use(mplTokenMetadata());
		const coder = new BorshCoder(IDL);
		const escrows:Escrow[] = [];
		let metadata:{[key:string]: Metadata} = {};
		const nfts:ListedNFT[] = [];

		const listing = await connection.getProgramAccounts(programId);
		for(const listed of listing){
			const escrow = coder.accounts.decode<Escrow>("escrow", listed.account.data);
			escrows.push(escrow);
		}
		(await fetchAllMetadata(umi, escrows.map(e => findMetadataPda(umi, {mint: e.mint.toBase58() as MPLPublicKey})))).forEach((meta) => {
			metadata[meta.mint.toString()] = meta;
		});
		for(const escrow of escrows){
			const nft:ListedNFT = {
				token: escrow.tokenAccount,
				account: null,
				metadata: metadata[escrow.mint.toString()],
				json: null,
				escrow
			}
			if(metadata[escrow.mint.toString()].uri){
				nft.json = await (await fetch(metadata[escrow.mint.toString()].uri)).json()
			}
			nfts.push(nft);
		}
    set((s) => { s.nfts = nfts; })
  },
	getUserListedNFTS: async (publicKey, connection) => {
		const umi = createUmi(connection.rpcEndpoint).use(mplTokenMetadata())
		const coder = new BorshCoder(IDL);
		const escrows:Escrow[] = [];
		let metadata:{[key:string]: Metadata} = {};
		const nfts:ListedNFT[] = [];

		const listing = await connection.getProgramAccounts(programId, {
			filters: [
				{
					memcmp: {
						offset: 8 + 64,
						bytes: publicKey.toBase58(),
					}
				}
			]
		});
		for(const listed of listing){
			const escrow = coder.accounts.decode<Escrow>("escrow", listed.account.data);
			escrows.push(escrow);
		}
		(await fetchAllMetadata(umi, escrows.map(e => findMetadataPda(umi, {mint: e.mint.toBase58() as MPLPublicKey})))).forEach((meta) => {
			metadata[meta.mint.toString()] = meta;
		});
		for(const escrow of escrows){
			const nft:ListedNFT = {
				token: escrow.tokenAccount,
				account: null,
				metadata: metadata[escrow.mint.toString()],
				escrow,
				json: null,
			}
			if(metadata[escrow.mint.toString()].uri){
				nft.json = await (await fetch(metadata[escrow.mint.toString()].uri)).json()
			}
			nfts.push(nft);
		}
		set((s) => {
      s.listedNfts = nfts;
    })
	},
	list: async (price:number, nft, wallet, connection) => {
		console.log("Initiate List transaction");
		const provider = new AnchorProvider(connection, null, {
			skipPreflight: true,
		});
		const program = new Program(IDL, programId, provider);
		const mint = new PublicKey(nft.metadata.mint);
		const [escrow, escrowbump] = PublicKey.findProgramAddressSync([
			wallet.publicKey.toBuffer(),
			mint.toBuffer(),
			utils.bytes.utf8.encode("escrow"),
		], programId);
		const escrowTokenAccount = await getAssociatedTokenAddress(mint, escrow, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

		const tx = await program.methods.list(new BN(price * LAMPORTS_PER_SOL))
		.accounts({
			owner: wallet.publicKey,
			ownerTokenAccount: nft.token,
			mint: mint,
			escrow,
			escrowTokenAccount,
			systemProgram: SystemProgram.programId,
			tokenProgram: TOKEN_PROGRAM_ID,
			associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
		})
		.transaction();
		tx.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
		tx.feePayer = wallet.publicKey;
		const txs = await wallet.sendTransaction(tx, connection, {
			skipPreflight: true,
		});
		await connection.confirmTransaction(txs);
		console.log(`List Transaction Signature: \n\n${txs}`);
		return txs;
	},
	delist: async (nft, wallet, connection) => {
		console.log("Initiate Delist transaction");
		const mint = new PublicKey(nft.metadata.mint);
		const [escrow, escrowbump] = PublicKey.findProgramAddressSync([
			wallet.publicKey.toBuffer(),
			mint.toBuffer(),
			utils.bytes.utf8.encode("escrow"),
		], programId);
		const ownerTokenAccount = await getAssociatedTokenAddress(mint, wallet.publicKey, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

		const provider = new AnchorProvider(connection, null, {
			skipPreflight: true,
		});
		const program = new Program(IDL, programId, provider);
		const tx = new Transaction().add(
			await program.methods.delist()
			.accounts({
				owner: wallet.publicKey,
				ownerTokenAccount,
				mint: mint,
				escrow,
				escrowTokenAccount: nft.token,
				systemProgram: SystemProgram.programId,
				tokenProgram: TOKEN_PROGRAM_ID,
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
			})
			.instruction()
		);
		tx.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
		tx.feePayer = wallet.publicKey;

		const txs = await wallet.sendTransaction(tx, connection, {
			skipPreflight: true,
		});
		await connection.confirmTransaction(txs);
		console.log(`Delist Transaction Signature: \n\n${txs}`);
		return txs;
	},
	buy: async (nft, wallet, connection) => {
		console.log("Initiate Buy transaction");
		const mint = new PublicKey(nft.metadata.mint);
		const [escrow, escrowbump] = PublicKey.findProgramAddressSync([
			nft.escrow.owner.toBuffer(),
			mint.toBuffer(),
			utils.bytes.utf8.encode("escrow"),
		], programId);
		const buyerTokenAccount = await getAssociatedTokenAddress(mint, wallet.publicKey, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

		const provider = new AnchorProvider(connection, null, {
			skipPreflight: true,
		});
		const program = new Program(IDL, programId, provider);

		const tx = new Transaction().add(
			await program.methods.buy()
			.accounts({
				owner: nft.escrow.owner,
				buyer: wallet.publicKey,
				buyerTokenAccount,
				mint: mint,
				escrow,
				escrowTokenAccount: nft.token,
				systemProgram: SystemProgram.programId,
				tokenProgram: TOKEN_PROGRAM_ID,
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
			})
			.instruction()
		);
		tx.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
		tx.feePayer = wallet.publicKey;
		const txs = await wallet.sendTransaction(tx, connection, {
			skipPreflight: true,
		});
		await connection.confirmTransaction(txs);
		console.log(`Buy Transaction Signature: \n\n${txs}`);
		return txs;
	},
}));

export default useEscrowNFTS;
