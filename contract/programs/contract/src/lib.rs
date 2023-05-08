pub mod error;
pub mod state;
pub mod utils;
pub mod instructions;

use anchor_lang::prelude::*;

use crate::instructions::*;

declare_id!("B6pbdUp5BMFHXVcytnWnNpwnGrMDDeFiaqPzMwcsPK9o");

#[program]
pub mod contract {
    use super::*;

    #[access_control(CreateVault::are_params_valid(price, amount))]
    pub fn create_vault(ctx: Context<CreateVault>, price: u64, amount: u64) -> Result<()> {
        handler_create_vault(ctx, price, amount)
    }

    #[access_control(Swap::are_params_valid(amount))]
    pub fn swap(ctx: Context<Swap>, direction: bool, amount: u64) -> Result<()> {
        handler_swap(ctx, direction, amount)
    }

    #[access_control(SwapTokens::are_params_valid(amount))]
    pub fn swap_tokens(ctx: Context<SwapTokens>, direction: bool, amount: u64) -> Result<()> {
        handler_swap_tokens(ctx, direction, amount)
    }

    pub fn withdraw_native(ctx: Context<WithdrawNative>) -> Result<()> {
        handler_withdraw_native(ctx)
    }

    pub fn withdraw_token(ctx: Context<WithdrawToken>) -> Result<()> {
        handler_withdraw_token(ctx)
    }

    #[access_control(UpdatePrice::are_params_valid(new_price))]
    pub fn update_price(ctx: Context<UpdatePrice>, new_price: u64) -> Result<()> {
        handler_update_price(ctx, new_price)
    }

    #[access_control(InitUser::are_params_valid(&name))]
    pub fn init_user(ctx: Context<InitUser>, name: String) -> Result<()> {
        handler_init_user(ctx, name)
    }

    pub fn close_user(ctx: Context<CloseUser>) -> Result<()> {
        handler_close_user(ctx)
    }
}

