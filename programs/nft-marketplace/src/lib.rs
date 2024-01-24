use anchor_lang::prelude::*;
use crate::instructions::*;

pub mod instructions;
pub mod states;
pub mod errors;

declare_id!("3vtF9uetZjwXNHeptSGS5nBEBYwrwmDXAchzzjnpkS9h");

#[program]
pub mod nft_marketplace {

    use super::*;

    pub fn list(ctx: Context<ListContext>, price:u64) -> Result<()> {
			list_token(ctx, price)
		}

		pub fn delist(ctx: Context<DelistContext>) -> Result<()> {
			delist_token(ctx)
		}

		pub fn buy(ctx: Context<BuyContext>) -> Result<()> {
			buy_token(ctx)
		}
}
