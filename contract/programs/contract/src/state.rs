use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Vault {
    // Administrator's key
    pub owner: Pubkey,
    pub price: u64,
    pub mint: Pubkey,
    pub mint_b: Pubkey,
    /// Signer nonce.
    pub token_bump: u8,
    pub native_bump: u8,
    pub time: i64,
}

#[account]
#[derive(InitSpace)]
pub struct User {
    #[max_len(200)]
    pub name: String,
    #[max_len(10)]
    pub balances: Vec<u64>,
    pub authority: Pubkey,
    pub bump: u8,
}