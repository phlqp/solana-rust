use anchor_lang::prelude::*;

use crate::{error::ErrorCode, state::Vault};

pub fn handler_update_price(ctx: Context<UpdatePrice>, new_price: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    vault.price = new_price;
    vault.time = solana_program::clock::Clock::get()?.unix_timestamp;
    msg!("Some variable: {:?}", vault.time);


    Ok(())
}

#[derive(Accounts)]
pub struct UpdatePrice<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut, has_one = owner)]
    pub vault: Account<'info, Vault>
}

impl<'info> UpdatePrice<'info> {
    pub fn are_params_valid(new_price: u64) -> Result<()> {
        // Check that price is positive
        if new_price == 0 {
            return err!(ErrorCode::PriceIsZero);
        }

        Ok(())
    }
}