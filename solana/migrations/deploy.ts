// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

import { Native, Program, AnchorProvider, web3, BN, utils, workspace, setProvider} from "@coral-xyz/anchor";
import { Contract } from "../target/types/contract";
import { splTokenProgram, SPL_TOKEN_PROGRAM_ID } from "@coral-xyz/spl-token";
import { testnetConfig, localnetConfig } from "./config";

module.exports = async function (provider) {
  // Configure client to use the provider.
  setProvider(provider);

  console.log("Creating a vault...");

  const mintPublicKey = new web3.PublicKey(testnetConfig.mint);
  const ownerTokenAccount = new web3.PublicKey(testnetConfig.ownerTokenAccount)

  const tokenProgram = splTokenProgram({provider, programId: SPL_TOKEN_PROGRAM_ID});
  const program = workspace.Contract as Program<Contract>;

  // Create a new vault
  const [vaultPubkey] = web3.PublicKey.findProgramAddressSync(
    [mintPublicKey.toBytes()],
    program.programId
  );

  const vaultTokenAccount = utils.token.associatedAddress({
    mint: mintPublicKey,
    owner: vaultPubkey
  })

  const [vaultNativeAccount] = web3.PublicKey.findProgramAddressSync(
    [vaultPubkey.toBytes()],
    program.programId
  );

  console.log("Creating a new vault on program", program.programId.toBase58());
  console.log("Vault", vaultPubkey.toBase58());
  console.log("vaultTokenAccount", vaultTokenAccount.toBase58());
  console.log("vaultNativeAccount", vaultNativeAccount.toBase58());

  const mint = await tokenProgram.account.mint.fetch(mintPublicKey);
  const ownerToken = await tokenProgram.account.account.fetch(ownerTokenAccount);
  const LAMPORTS_PER_TOKEN = new BN(10).pow(new BN(mint.decimals));
  const price = new BN(10).mul(LAMPORTS_PER_TOKEN);

  const tx = await program.methods.createVault(price, ownerToken.amount)
        .accounts({
          owner: provider.wallet.publicKey,
          vault: vaultPubkey,
          mint: mintPublicKey,
          ownerTokenAccount: ownerTokenAccount,
          vaultTokenAccount,
          vaultNativeAccount,
          tokenProgram: utils.token.TOKEN_PROGRAM_ID,
          associatedTokenProgram: utils.token.ASSOCIATED_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

  console.log(tx)
};
