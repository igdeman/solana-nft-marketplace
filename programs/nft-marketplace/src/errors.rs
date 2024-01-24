use anchor_lang::prelude::*;

#[error_code]
pub enum EscrowErrors {
    #[msg("Invalid NFT supply")]
    InvalidNftSupply,
    #[msg("Mint not initialized")]
    MintNotInitialized,
}
