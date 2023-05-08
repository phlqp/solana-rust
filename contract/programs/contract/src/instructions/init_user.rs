use anchor_lang::prelude::*;
use crate::{error::ErrorCode, state::User};

pub fn handler_init_user(ctx: Context<InitUser>, name: String) -> Result<()> {
    let user = &mut ctx.accounts.user;
    user.authority = *ctx.accounts.wallet.key;
    user.name = name;
    user.bump = *ctx.bumps.get("user").ok_or(ErrorCode::CannotGetBump)?;
    user.balances = Vec::new();
    user.balances.push(99);

    let mut sum: u64 = 0;
    for i in &user.balances {
        sum += i;
    }

    Ok(())
}

#[derive(Accounts)]
pub struct InitUser<'info> {
    #[account(mut)]
    pub wallet: Signer<'info>,
    #[account(
        init, payer = wallet,
        seeds = [wallet.key().as_ref()],
        bump,
        space = 8 + User::INIT_SPACE,
    )]
    pub user: Account<'info, User>,
    pub system_program: Program<'info, System>,
}

impl<'info> InitUser<'info> {
    pub fn are_params_valid(name: &String) -> Result<()> {
        // Check that price is positive
        if name.len() > 200 {
            return err!(ErrorCode::PriceIsZero);
        }

        Ok(())
    }
}