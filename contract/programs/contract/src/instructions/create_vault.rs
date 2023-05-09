use anchor_lang::prelude::*;
use anchor_spl::{
    token::{Mint, TokenAccount, Token},
    associated_token::AssociatedToken
};

use crate::{error::ErrorCode, state::Vault};
use crate::utils::*;

pub fn handler_create_vault(ctx: Context<CreateVault>, price: u64, amount: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    vault.owner = *ctx.accounts.owner.key;
    vault.price = price;
    vault.mint = ctx.accounts.mint.key();
    vault.token_bump = *ctx.bumps.get("vault").ok_or(ErrorCode::CannotGetBump)?;
    vault.native_bump = *ctx.bumps.get("vault_native_account").ok_or(ErrorCode::CannotGetBump)?;

    // Transfer token to the pool token account
    transfer_token(
        ctx.accounts.owner_token_account.to_account_info(),
        ctx.accounts.vault_token_account.to_account_info(),
        ctx.accounts.owner.to_account_info(),
        amount,
        Option::None,
        ctx.accounts.token_program.to_account_info(),
    )?;

    Ok(())
}

#[derive(Accounts)]
#[instruction(price: u64, amount: u64)]
pub struct CreateVault<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        init,
        payer = owner,
        space = 8 + Vault::INIT_SPACE,
        seeds = [mint.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,
    pub mint: Account<'info, Mint>,
    /// CHECK
    pub mint_b: AccountInfo<'info>,
    #[account(
        mut,
        constraint = owner_token_account.owner == owner.key(),
        constraint = owner_token_account.mint == mint.key(),
        // Check that token account's balance greater or equal to the amount
        constraint = owner_token_account.amount >= amount @ ErrorCode::InsufficientBalance
    )]
    pub owner_token_account: Account<'info, TokenAccount>,
    #[account(
        init, payer = owner,
        associated_token::mint = mint,
        associated_token::authority = vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(
        init, payer = owner,
        associated_token::mint = mint_b,
        associated_token::authority = vault,
    )]
    pub vault_b_token_account: Account<'info, TokenAccount>,
    /// CHECK:
    #[account(
        seeds = [vault.key().as_ref()],
        bump,
    )]
    pub vault_native_account: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> CreateVault<'info> {
    pub fn are_params_valid(price: u64, amount: u64) -> Result<()> {
        // Check that price is positive
        if price == 0 {
            return err!(ErrorCode::PriceIsZero);
        }

        if amount == 0 {
            return err!(ErrorCode::AmountIsZero);
        }

        Ok(())
    }
}