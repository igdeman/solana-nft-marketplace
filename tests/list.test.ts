import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import {
	ASSOCIATED_TOKEN_PROGRAM_ID,
	TOKEN_PROGRAM_ID,
	createMint,
	mintTo, createAssociatedTokenAccount, getAssociatedTokenAddress
} from "@solana/spl-token";
import { Program } from "@coral-xyz/anchor";
import { NftMarketplace } from "../target/types/nft_marketplace";
import { airdrop } from "./common";

describe("nft-marketplace :: listing nfts", () => {
	const provider = anchor.AnchorProvider.env();
	anchor.setProvider(provider);

	const program = anchor.workspace.NftMarketplace as Program<NftMarketplace>;


	it("Testing List NFT", async () => {
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

		await program.methods.list(new anchor.BN(-1 * anchor.web3.LAMPORTS_PER_SOL))
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
		const escrowResult = await program.account.escrow.fetch(escrow)

		assert.strictEqual(escrowResult.mint.toString(), mint.toString());
		assert.strictEqual(escrowResult.owner.toString(), owner.publicKey.toString());
		assert.strictEqual(escrowResult.tokenAccount.toString(), escrowTokenAccount.toString());
		assert.strictEqual(escrowResult.price.toString(), (1 * anchor.web3.LAMPORTS_PER_SOL).toString());

		const escrowTokenAccountInfo = await provider.connection.getParsedAccountInfo(escrowResult.tokenAccount);
		const ownerTokenAccountInfo = await provider.connection.getParsedAccountInfo(ownerTokenAccount);
		assert.strictEqual((escrowTokenAccountInfo?.value.data as any)?.parsed?.info?.mint, mint.toString());
		assert.strictEqual((escrowTokenAccountInfo?.value.data as any)?.parsed?.info?.tokenAmount.amount, "1");
		assert.strictEqual(ownerTokenAccountInfo?.value, null);
	});

	it("Testing List with malicious wallet NFT", async () => {
		const malicious_user = anchor.web3.Keypair.generate();
		const owner = anchor.web3.Keypair.generate();
		await airdrop(program.provider.connection, owner.publicKey);
		await airdrop(program.provider.connection, malicious_user.publicKey);
		const mint = await createMint(program.provider.connection, owner, owner.publicKey, owner.publicKey, 0);
		const ownerTokenAccount = await createAssociatedTokenAccount(program.provider.connection, owner, mint, owner.publicKey);
		await mintTo(program.provider.connection, owner, mint, ownerTokenAccount, owner, 1);

		const [escrow, escrowbump] = anchor.web3.PublicKey.findProgramAddressSync([
			malicious_user.publicKey.toBuffer(),
			mint.toBuffer(),
			anchor.utils.bytes.utf8.encode("escrow"),
		], program.programId);
		// const escrowTokenAccount = await getAssociatedTokenAddress(mint, escrow, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
		const escrowTokenAccount = await getAssociatedTokenAddress(mint, malicious_user.publicKey, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

		let error = null;
		try {
			await program.methods.list(new anchor.BN(-1 * anchor.web3.LAMPORTS_PER_SOL))
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
		}
		catch (e) {
			error = e;
		}
		assert.ok(error);
	});

});
