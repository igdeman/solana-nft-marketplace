use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
	program::invoke,
	system_instruction
};
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

pub fn buy_token(ctx: Context<BuyContext>) -> Result<()> {
	msg!("Buy Token Start");
	let owner_key = ctx.accounts.owner.key().to_bytes();
	let mint_key = ctx.accounts.mint.key().to_bytes();
	let escrow_bump = &[ctx.accounts.escrow.bump];
	let seeds = &[owner_key.as_ref(), mint_key.as_ref(), b"escrow", escrow_bump];
	let signer_seeds = &[&seeds[..]];

	let cpi_transfer_accounts = Transfer {
		from: ctx.accounts.escrow_token_account.to_account_info().clone(),
		to: ctx.accounts.buyer_token_account.to_account_info().clone(),
		authority: ctx.accounts.escrow.to_account_info(),
	};
	let cpi_token_program = ctx.accounts.token_program.to_account_info().clone();
	let cpi_transfer_ctx = CpiContext::new_with_signer(cpi_token_program.clone(), cpi_transfer_accounts, signer_seeds);
	transfer(cpi_transfer_ctx, 1)?;

	let transfer_instruction = system_instruction::transfer(ctx.accounts.buyer.key, ctx.accounts.owner.key, ctx.accounts.escrow.price);
	invoke(
		&transfer_instruction,
		&[ctx.accounts.buyer.to_account_info().clone(), ctx.accounts.owner.to_account_info().clone(), ctx.accounts.system_program.to_account_info().clone()],
	)?;

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
pub struct BuyContext<'info> {
	#[account(mut)]
	pub owner: SystemAccount<'info>,
	#[account(mut)]
	pub buyer: Signer<'info>,
	#[account(
		init,
		payer = buyer,
		associated_token::mint = mint,
    associated_token::authority = buyer,
	)]
	pub buyer_token_account: Account<'info, TokenAccount>,
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
		bump = escrow.bump,
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
