use anchor_lang::prelude::*;
use anchor_spl::{
    token::{Mint, TokenAccount, Token},
    associated_token::AssociatedToken
};

use crate::state::Vault;
use crate::utils::*;

pub fn handler_withdraw_token(ctx: Context<WithdrawToken>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    let seeds = &[
        ctx.accounts.mint.to_account_info().key.as_ref(),
        &[vault.token_bump],
    ];
    let signer = &[&seeds[..]];

    transfer_token(
        ctx.accounts.vault_token_account.to_account_info(),
        ctx.accounts.owner_token_account.to_account_info(),
        ctx.accounts.vault.to_account_info(),
        ctx.accounts.vault_token_account.amount,
        Option::Some(signer),
        ctx.accounts.token_program.to_account_info()
    )?;

    Ok(())
}

#[derive(Accounts)]
pub struct WithdrawToken<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut, has_one = owner)]
    pub vault: Account<'info, Vault>,
    #[account(constraint = mint.key() == vault.mint)]
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = vault
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = owner_token_account.owner == owner.key(),
        constraint = owner_token_account.mint == mint.key(),
    )]
    pub owner_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}