use anchor_lang::prelude::*;
use anchor_spl::{
    token::{Mint, TokenAccount, Token},
    associated_token::AssociatedToken
};

use crate::{error::ErrorCode, state::Vault};
use crate::utils::*;

pub fn handler_swap(ctx: Context<Swap>, direction: bool, amount: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    if direction { // swap from SOL to TOKEN
        // Check that user has enough SOL
        if ctx.accounts.user.lamports() < amount {
            return Err(ErrorCode::InsufficientBalance.into())
        }

        // Transfer SOL to vault
        transfer_sol(
            ctx.accounts.user.to_account_info(),
            ctx.accounts.vault_native_account.to_account_info(),
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
            ctx.accounts.mint.to_account_info().key.as_ref(),
            &[vault.token_bump],
        ];
        let signer = &[&seeds[..]];

        transfer_token(
            ctx.accounts.vault_token_account.to_account_info(),
            ctx.accounts.user_token_account.to_account_info(),
            ctx.accounts.vault.to_account_info(),
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
        if sol_amount > ctx.accounts.vault_native_account.lamports() {
            return err!(ErrorCode::InsufficientBalance)
        }

        // Transfer SOL to user
        let seeds = &[
            vault.to_account_info().key.as_ref(),
            &[vault.native_bump],
        ];
        let signer = &[&seeds[..]];
        transfer_sol(
            ctx.accounts.vault_native_account.to_account_info(),
            ctx.accounts.user.to_account_info(),
            sol_amount,
            Option::Some(signer),
            ctx.accounts.system_program.to_account_info()
        )?;
    }

    Ok(())
}

#[derive(Accounts)]
#[instruction(direction: bool, amount: u64)]
pub struct Swap<'info> {
    #[account(mut)]
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
        mut, seeds = [vault.key().as_ref()], bump
    )]
    /// CHECK:
    pub vault_native_account: AccountInfo<'info>,
    #[account(
        mut,
        constraint = !direction || user.lamports() >= amount @ ErrorCode::InsufficientBalance
    )]
    pub user: Signer<'info>,
    #[account(
        init_if_needed, payer = user,
        associated_token::mint = mint,
        associated_token::authority = user,
        constraint = direction || user_token_account.amount >= amount @ ErrorCode::InsufficientBalance
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> Swap<'info> {
    pub fn are_params_valid(amount: u64) -> Result<()> {
        if amount == 0 {
            return err!(ErrorCode::AmountIsZero);
        }

        Ok(())
    }
}