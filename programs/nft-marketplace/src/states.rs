use anchor_lang::prelude::*;

#[account]
pub struct Escrow {
    pub token_account: Pubkey,
    pub mint: Pubkey,
    pub owner: Pubkey,
		pub price: u64,
		pub bump: u8,
}

impl Escrow {
    // Pubkey + Pubkey + Pubkey + u8 + + u64 + u8
    pub const LEN: usize = 32 + 32 + 32 + 1 + 8 + 1;
}
