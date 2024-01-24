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

pub fn delist_token(ctx: Context<DelistContext>) -> Result<()> {
	msg!("Delist Token Start");
	let owner_key = ctx.accounts.owner.key().to_bytes();
	let mint_key = ctx.accounts.mint.key().to_bytes();
	let escrow_bump = &[ctx.accounts.escrow.bump];
	let seeds = &[owner_key.as_ref(), mint_key.as_ref(), b"escrow", escrow_bump];
	let signer_seeds = &[&seeds[..]];

	let cpi_transfer_accounts = Transfer {
		from: ctx.accounts.escrow_token_account.to_account_info().clone(),
		to: ctx.accounts.owner_token_account.to_account_info().clone(),
		authority: ctx.accounts.escrow.to_account_info(),
	};
	let cpi_token_program = ctx.accounts.token_program.to_account_info().clone();
	let cpi_transfer_ctx = CpiContext::new_with_signer(cpi_token_program.clone(), cpi_transfer_accounts, signer_seeds);
	transfer(cpi_transfer_ctx, 1)?;

	let cpi_close_token_accounts = CloseAccount {
		account: ctx.accounts.escrow_token_account.to_account_info().clone(),
		destination: ctx.accounts.owner.to_account_info().clone(),
		authority: ctx.accounts.escrow.to_account_info(),
	};
	let cpi_close_token_ctx = CpiContext::new_with_signer(cpi_token_program.clone(), cpi_close_token_accounts, signer_seeds);
	close_account(cpi_close_token_ctx)?;
	ctx.accounts.escrow.close(ctx.accounts.owner.to_account_info())?;
	Ok(())
}

#[derive(Accounts)]
pub struct DelistContext<'info> {
	#[account(mut)]
	pub owner: Signer<'info>,
	#[account(
		init,
    payer = owner,
		associated_token::mint = mint,
    associated_token::authority = owner,
	)]
	pub owner_token_account: Account<'info, TokenAccount>,
	#[account(mut)]
	pub mint: Account<'info, Mint>,
	#[account(
		mut,
		constraint = escrow.owner == *owner.key,
		constraint = escrow.mint == mint.key(),
		seeds = [
			owner.key().as_ref(),
			mint.key().as_ref(),
			b"escrow",
		],
		bump
	)]
	pub escrow: Account<'info, Escrow>,
	#[account(
		mut,
    associated_token::mint = mint,
    associated_token::authority = escrow,
	)]
	pub escrow_token_account: Account<'info, TokenAccount>,
	pub system_program: Program<'info, System>,
	pub token_program: Program<'info, Token>,
	pub associated_token_program: Program<'info, AssociatedToken>,
}
