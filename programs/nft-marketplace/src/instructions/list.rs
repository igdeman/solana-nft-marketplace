use anchor_lang::prelude::*;
use anchor_spl::{
	token::{
		Token,
		Mint,
		TokenAccount,
		Transfer,
		transfer,
		CloseAccount,
		close_account
	},
	associated_token::AssociatedToken,
};
use crate::states::*;
use crate::errors::EscrowErrors;

pub fn list_token(ctx: Context<ListContext>, price: u64) -> Result<()> {
	msg!("List Token Start");

	if ctx.accounts.mint.supply != 1 {
		return Err(EscrowErrors::InvalidNftSupply.into());
	}
	if !ctx.accounts.mint.is_initialized {
		return Err(EscrowErrors::MintNotInitialized.into());
	}

	let escrow = &mut ctx.accounts.escrow;
	escrow.token_account = ctx.accounts.escrow_token_account.key();
	escrow.bump = *ctx.bumps.get("escrow").unwrap();
	escrow.owner = *ctx.accounts.owner.key;
	escrow.mint = ctx.accounts.mint.key();
	escrow.price = price;

	let cpi_accounts = Transfer {
		from: ctx.accounts.owner_token_account.to_account_info().clone(),
		to: ctx.accounts.escrow_token_account.to_account_info().clone(),
		authority: ctx.accounts.owner.to_account_info(),
	};
	let cpi_program = ctx.accounts.token_program.to_account_info().clone();
	let cpi_ctx = CpiContext::new(cpi_program.clone(), cpi_accounts);
	transfer(cpi_ctx, 1)?;

	let cpi_close_token_accounts = CloseAccount {
		account: ctx.accounts.owner_token_account.to_account_info().clone(),
		destination: ctx.accounts.owner.to_account_info().clone(),
		authority: ctx.accounts.owner.to_account_info(),
	};
	let cpi_close_token_ctx = CpiContext::new(cpi_program.clone(), cpi_close_token_accounts);
	close_account(cpi_close_token_ctx)?;
	Ok(())
}

#[derive(Accounts)]
pub struct ListContext<'info> {
	#[account(mut)]
	pub owner: Signer<'info>,
	#[account(
		mut,
		constraint = owner_token_account.owner == *owner.key,
		token::mint = mint,
		token::authority = owner,
	)]
	pub owner_token_account: Account<'info, TokenAccount>,
	#[account(
		mut,
		mint::decimals = 0
	)]
	pub mint: Account<'info, Mint>,
	#[account(
		init,
		payer = owner,
		space = 8 + Escrow::LEN,
		seeds = [
				owner.key().as_ref(),
				mint.key().as_ref(),
				b"escrow",
				],
		bump
	)]
	pub escrow: Account<'info, Escrow>,
	#[account(
		init,
    payer = owner,
    associated_token::mint = mint,
    associated_token::authority = escrow,
	)]
	pub escrow_token_account: Account<'info, TokenAccount>,
	pub system_program: Program<'info, System>,
	pub token_program: Program<'info, Token>,
	pub associated_token_program: Program<'info, AssociatedToken>,
}
