export async function airdrop(connection: any, address: any, amount = 1000000000) {
	await connection.confirmTransaction(await connection.requestAirdrop(address, amount), "confirmed");
}
