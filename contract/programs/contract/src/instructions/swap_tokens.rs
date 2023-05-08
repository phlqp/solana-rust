use anchor_lang::prelude::*;
use anchor_spl::{
    token::{TokenAccount, Token},
    associated_token::AssociatedToken
};

use crate::{error::ErrorCode, state::Vault};
use crate::utils::*;

pub fn handler_swap_tokens(ctx: Context<SwapTokens>, direction: bool, amount: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    if direction { // swap from B to TOKEN
        // Check that user has enough SOL
        /* if ctx.accounts.user.lamports() < amount {
            return Err(ErrorCode::InsufficientBalance.into())
        } */

        // Transfer from b to a vault
        transfer_token(
            ctx.accounts.user_b_token_account.to_account_info(),
            ctx.accounts.vault_b_token_account.to_account_info(),
            ctx.accounts.user.to_account_info(),
            amount,
            Option::None,
            ctx.accounts.system_program.to_account_info()
        )?;

        // token_amount = amount*price/lamports_per_sol
        let token_amount: u64 = u128::from(amount)
                            .checked_mul(vault.price.into())
                            .ok_or(ErrorCode::CalculationFailure)?
                            .checked_div(anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL.into())
                            .ok_or(ErrorCode::CalculationFailure)?
                            .try_into()
                            .map_err(|_| error!(ErrorCode::U128CannotConvert))?;

        // Check that vault token account has enough token
        if token_amount > ctx.accounts.vault_token_account.amount {
            return err!(ErrorCode::InsufficientBalance)
        }

        // Transfer token to user
        let seeds = &[
            vault.mint.as_ref(),
            &[vault.token_bump],
        ];
        let signer = &[&seeds[..]];

        transfer_token(
            ctx.accounts.vault_token_account.to_account_info(),
            ctx.accounts.user_token_account.to_account_info(),
            vault.to_account_info(),
            token_amount,
            Option::Some(signer),
            ctx.accounts.token_program.to_account_info()
        )?;
    }
    else {
        // Check that user has enough TOKEN
        if ctx.accounts.user_token_account.amount < amount {
            return Err(ErrorCode::InsufficientBalance.into());
        }

        // Transfer TOKEN to vault
        transfer_token(
            ctx.accounts.user_token_account.to_account_info(),
            ctx.accounts.vault_token_account.to_account_info(),
            ctx.accounts.user.to_account_info(),
            amount,
            Option::None,
            ctx.accounts.token_program.to_account_info()
        )?;

        // sol_amount = amount*lamports_per_token/price
        let sol_amount: u64 = u128::from(amount)
            .checked_mul(anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL.into())
            .ok_or(ErrorCode::CalculationFailure)?
            .checked_div(vault.price.into())
            .ok_or(ErrorCode::CalculationFailure)?
            .try_into()
            .map_err(|_| error!(ErrorCode::U128CannotConvert))?;

        // Check that vault native account has enough SOL
        if sol_amount > ctx.accounts.vault_b_token_account.amount {
            return err!(ErrorCode::InsufficientBalance)
        }

        // Transfer SOL to user
        let seeds = &[
            vault.to_account_info().key.as_ref(),
            &[vault.native_bump],
        ];
        let signer = &[&seeds[..]];
        transfer_token(
            ctx.accounts.vault_b_token_account.to_account_info(),
            ctx.accounts.user_b_token_account.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            sol_amount,
            Option::Some(signer),
            ctx.accounts.system_program.to_account_info()
        )?;
    }

    Ok(())
}

#[derive(Accounts)]
#[instruction(direction: bool, amount: u64)]
pub struct SwapTokens<'info> {
    #[account(mut)]
    pub vault: Account<'info, Vault>,
    #[account(
        mut,
        associated_token::mint = vault.mint,
        associated_token::authority = vault
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = vault.mint_b,
        associated_token::authority = user
    )]
    pub vault_b_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = !direction || user.lamports() >= amount @ ErrorCode::InsufficientBalance
    )]
    pub user: Signer<'info>,
    #[account(
        associated_token::mint = vault.mint,
        associated_token::authority = user,
        constraint = direction || user_token_account.amount >= amount @ ErrorCode::InsufficientBalance
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(
        associated_token::mint = vault.mint_b,
        associated_token::authority = user,
        // constraint = direction || user_token_account.amount >= amount @ ErrorCode::InsufficientBalance
    )]
    pub user_b_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> SwapTokens<'info> {
    pub fn are_params_valid(amount: u64) -> Result<()> {
        if amount == 0 {
            return err!(ErrorCode::AmountIsZero);
        }

        Ok(())
    }
}