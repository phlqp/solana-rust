use anchor_lang::prelude::*;
use crate::state::User;

pub fn handler_close_user(_ctx: Context<CloseUser>) -> Result<()> {
    Ok(())
}

#[derive(Accounts)]
pub struct CloseUser<'info> {
    #[account(mut)]
    pub wallet: Signer<'info>,
    #[account(
        mut,
        close = wallet,
        seeds = [wallet.key().as_ref()],
        bump,
    )]
    pub user: Account<'info, User>
}
