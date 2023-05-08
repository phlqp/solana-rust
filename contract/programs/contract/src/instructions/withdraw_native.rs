use anchor_lang::prelude::*;

use crate::state::Vault;
use crate::utils::*;

pub fn handler_withdraw_native(ctx: Context<WithdrawNative>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    // Transfer SOL to owner
    let seeds = &[
        vault.to_account_info().key.as_ref(),
        &[vault.native_bump],
    ];
    let signer = &[&seeds[..]];
    transfer_sol(
        ctx.accounts.vault_native_account.to_account_info(),
        ctx.accounts.owner.to_account_info(),
        ctx.accounts.vault_native_account.lamports(),
        Option::Some(signer),
        ctx.accounts.system_program.to_account_info()
    )?;

    Ok(())
}

#[derive(Accounts)]
pub struct WithdrawNative<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut, has_one = owner)]
    pub vault: Account<'info, Vault>,
    #[account(
        mut, seeds = [vault.key().as_ref()], bump
    )]
    /// CHECK:
    pub vault_native_account: AccountInfo<'info>,
    pub system_program: Program<'info, System>
}