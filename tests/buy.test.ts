import * as anchor from "@coral-xyz/anchor";
import { assert, expect } from "chai";
import {
	ASSOCIATED_TOKEN_PROGRAM_ID,
	TOKEN_PROGRAM_ID,
	createMint,
	mintTo, createAssociatedTokenAccount, getAssociatedTokenAddress
} from "@solana/spl-token";
import { Program } from "@coral-xyz/anchor";
import { NftMarketplace } from "../target/types/nft_marketplace";
import { airdrop } from "./common";

describe("nft-marketplace :: buying nfts", () => {
	const provider = anchor.AnchorProvider.env();
	anchor.setProvider(provider);
	const program = anchor.workspace.NftMarketplace as Program<NftMarketplace>;

	it("Testing Buy NFT", async () => {
		const owner = anchor.web3.Keypair.generate();
		const buyer = anchor.web3.Keypair.generate();
		await airdrop(program.provider.connection, owner.publicKey);
		await airdrop(program.provider.connection, buyer.publicKey);

		const mint = await createMint(program.provider.connection, owner, owner.publicKey, owner.publicKey, 0);
		const ownerTokenAccount = await createAssociatedTokenAccount(program.provider.connection, owner, mint, owner.publicKey);
		await mintTo(program.provider.connection, owner, mint, ownerTokenAccount, owner, 1);

		const [escrow, escrowbump] = anchor.web3.PublicKey.findProgramAddressSync([
			owner.publicKey.toBuffer(),
			mint.toBuffer(),
			anchor.utils.bytes.utf8.encode("escrow"),
		], program.programId);
		const escrowTokenAccount = await getAssociatedTokenAddress(mint, escrow, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
		const buyerTokenAccount = await getAssociatedTokenAddress(mint, buyer.publicKey);

		await program.methods.list(new anchor.BN(0.5 * anchor.web3.LAMPORTS_PER_SOL))
			.accounts({
				owner: owner.publicKey,
				ownerTokenAccount,
				mint,
				escrow,
				escrowTokenAccount,
				systemProgram: anchor.web3.SystemProgram.programId,
				tokenProgram: TOKEN_PROGRAM_ID,
			})
			.signers([owner])
			.rpc({ skipPreflight: true });

		await program.methods.buy()
			.accounts({
				owner: owner.publicKey,
				buyer: buyer.publicKey,
				buyerTokenAccount,
				mint,
				escrow,
				escrowTokenAccount,
				systemProgram: anchor.web3.SystemProgram.programId,
				tokenProgram: TOKEN_PROGRAM_ID,
			})
			.signers([buyer])
			.rpc({ skipPreflight: true });

		let escrowResult = null;
		try { await program.account.escrow.fetch(escrow); }
		catch (e) { escrowResult = e; }
		expect(escrowResult).to.be.an("error");
		expect((await provider.connection.getParsedAccountInfo(escrowTokenAccount)).value).to.be.eq(null);
		const buyerTokenAccountInfo = await provider.connection.getParsedAccountInfo(buyerTokenAccount);
		assert.strictEqual((buyerTokenAccountInfo?.value.data as any)?.parsed?.info?.tokenAmount.amount, "1");
		expect((await provider.connection.getParsedAccountInfo(owner.publicKey)).value.lamports).to.be.above(new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL).toNumber())
		expect((await provider.connection.getParsedAccountInfo(buyer.publicKey)).value.lamports).to.be.below(new anchor.BN(0.5 * anchor.web3.LAMPORTS_PER_SOL).toNumber())
	});

	it("Testing Buy NFT with same address for buyer and owner", async () => {
		const owner = anchor.web3.Keypair.generate();
		await airdrop(program.provider.connection, owner.publicKey);
		const mint = await createMint(program.provider.connection, owner, owner.publicKey, owner.publicKey, 0);
		const ownerTokenAccount = await createAssociatedTokenAccount(program.provider.connection, owner, mint, owner.publicKey);
		await mintTo(program.provider.connection, owner, mint, ownerTokenAccount, owner, 1);

		const [escrow, escrowbump] = anchor.web3.PublicKey.findProgramAddressSync([
			owner.publicKey.toBuffer(),
			mint.toBuffer(),
			anchor.utils.bytes.utf8.encode("escrow"),
		], program.programId);
		const escrowTokenAccount = await getAssociatedTokenAddress(mint, escrow, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
		const buyerTokenAccount = await getAssociatedTokenAddress(mint, owner.publicKey);

		await program.methods.list(new anchor.BN(0.5 * anchor.web3.LAMPORTS_PER_SOL))
			.accounts({
				owner: owner.publicKey,
				ownerTokenAccount,
				mint,
				escrow,
				escrowTokenAccount,
				systemProgram: anchor.web3.SystemProgram.programId,
				tokenProgram: TOKEN_PROGRAM_ID,
			})
			.signers([owner])
			.rpc({ skipPreflight: true });

		await program.methods.buy()
			.accounts({
				owner: owner.publicKey,
				buyer: owner.publicKey,
				buyerTokenAccount,
				mint,
				escrow,
				escrowTokenAccount,
				systemProgram: anchor.web3.SystemProgram.programId,
				tokenProgram: TOKEN_PROGRAM_ID,
			})
			.signers([owner])
			.rpc({ skipPreflight: true });

		let escrowResult = null;
		try { await program.account.escrow.fetch(escrow); }
		catch (e) { escrowResult = e; }
		expect(escrowResult).to.be.an("error");
		expect((await provider.connection.getParsedAccountInfo(escrowTokenAccount)).value).to.be.eq(null);
		const buyerTokenAccountInfo = await provider.connection.getParsedAccountInfo(buyerTokenAccount);
		assert.strictEqual((buyerTokenAccountInfo?.value.data as any)?.parsed?.info?.tokenAmount.amount, "1");
	});

	it("Testing Buy with malicious token account NFT", async () => {
		const owner = anchor.web3.Keypair.generate();
		const buyer = anchor.web3.Keypair.generate();
		const malicious_user = anchor.web3.Keypair.generate();
		await airdrop(program.provider.connection, owner.publicKey);
		await airdrop(program.provider.connection, buyer.publicKey);
		await airdrop(program.provider.connection, malicious_user.publicKey);

		const mint = await createMint(program.provider.connection, owner, owner.publicKey, owner.publicKey, 0);
		const ownerTokenAccount = await createAssociatedTokenAccount(program.provider.connection, owner, mint, owner.publicKey);
		await mintTo(program.provider.connection, owner, mint, ownerTokenAccount, owner, 1);

		const [escrow, escrowbump] = anchor.web3.PublicKey.findProgramAddressSync([
			owner.publicKey.toBuffer(),
			mint.toBuffer(),
			anchor.utils.bytes.utf8.encode("escrow"),
		], program.programId);
		const escrowTokenAccount = await getAssociatedTokenAddress(mint, escrow, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
		const maliciousTokenAccount = await getAssociatedTokenAddress(mint, malicious_user.publicKey);

		await program.methods.list(new anchor.BN(0.5 * anchor.web3.LAMPORTS_PER_SOL))
			.accounts({
				owner: owner.publicKey,
				ownerTokenAccount,
				mint,
				escrow,
				escrowTokenAccount,
				systemProgram: anchor.web3.SystemProgram.programId,
				tokenProgram: TOKEN_PROGRAM_ID,
			})
			.signers([owner])
			.rpc({ skipPreflight: true });

		let error = null;
		try {
			await program.methods.buy()
				.accounts({
					owner: owner.publicKey,
					buyer: buyer.publicKey,
					buyerTokenAccount: maliciousTokenAccount,
					mint,
					escrow,
					escrowTokenAccount,
					systemProgram: anchor.web3.SystemProgram.programId,
					tokenProgram: TOKEN_PROGRAM_ID,
				})
				.signers([buyer])
				.rpc({ skipPreflight: true });
		}
		catch (e) {
			error = e;
		}
		assert.ok(error);

	});

});
