import { Native, Program, AnchorProvider, web3, BN, utils, workspace, setProvider} from "@coral-xyz/anchor";
import { Contract } from "../target/types/contract";
import { splTokenProgram, SPL_TOKEN_PROGRAM_ID } from "@coral-xyz/spl-token";
import { assert, expect } from "chai";

describe("contract", () => {
  // Token's decimals
  const decimals = 0;
  const LAMPORTS_PER_TOKEN = 10 ** decimals;
  // Token's symbol

  // Configure the client to use the local cluster.
  const provider = AnchorProvider.env()
  setProvider(provider);
  const systemProgram = Native.system();
  const tokenProgram = splTokenProgram({provider});
  const program = workspace.Contract as Program<Contract>;

  const mintKeypair = web3.Keypair.generate();
  const ownerTokenAccount = web3.Keypair.generate();

  const mintBKeypair = web3.Keypair.generate();
  const ownerBTokenAccount = web3.Keypair.generate();

  const supply = new BN(1_000_000_000*LAMPORTS_PER_TOKEN);

  it("Create a mint", async () => {
    const signature = await provider.connection.requestAirdrop(provider.wallet.publicKey, 1*web3.LAMPORTS_PER_SOL)
    await provider.connection.confirmTransaction(signature)

    await tokenProgram.methods
      .initializeMint(0, provider.wallet.publicKey, null)
      .accounts({
        mint: mintKeypair.publicKey,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([mintKeypair])
      .preInstructions([
        await tokenProgram.account.mint.createInstruction(mintKeypair),
      ])
      .rpc();

    const mintAccount = await tokenProgram.account.mint.fetch(mintKeypair.publicKey);
    assert.isTrue(
      (mintAccount.mintAuthority as web3.PublicKey).equals(provider.wallet.publicKey)
    );
    assert.isNull(mintAccount.freezeAuthority);
    assert.strictEqual(mintAccount.decimals, 0);
    assert.isTrue(mintAccount.isInitialized);
    assert.strictEqual(mintAccount.supply.toNumber(), 0);
  })

  it("Create a mint(B)", async () => {
    const signature = await provider.connection.requestAirdrop(provider.wallet.publicKey, 1*web3.LAMPORTS_PER_SOL)
    await provider.connection.confirmTransaction(signature)

    await tokenProgram.methods
      .initializeMint(0, provider.wallet.publicKey, null)
      .accounts({
        mint: mintBKeypair.publicKey,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([mintBKeypair])
      .preInstructions([
        await tokenProgram.account.mint.createInstruction(mintBKeypair),
      ])
      .rpc();

    const mintAccount = await tokenProgram.account.mint.fetch(mintBKeypair.publicKey);
    assert.isTrue(
      (mintAccount.mintAuthority as web3.PublicKey).equals(provider.wallet.publicKey)
    );
    assert.isNull(mintAccount.freezeAuthority);
    assert.strictEqual(mintAccount.decimals, 0);
    assert.isTrue(mintAccount.isInitialized);
    assert.strictEqual(mintAccount.supply.toNumber(), 0);
  })

  it("Create a token account for owner", async () => {
    await tokenProgram.methods
      .initializeAccount()
      .accounts({
        account: ownerTokenAccount.publicKey,
        mint: mintKeypair.publicKey,
        owner: provider.wallet.publicKey,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([ownerTokenAccount])
      .preInstructions([
        await tokenProgram.account.account.createInstruction(ownerTokenAccount),
      ])
      .rpc();
    const token = await tokenProgram.account.account.fetch(
      ownerTokenAccount.publicKey
    );
    assert.isTrue(token.owner.equals(provider.wallet.publicKey));
    assert.isTrue(token.mint.equals(mintKeypair.publicKey));
    assert.strictEqual(token.amount.toNumber(), 0);
    assert.isNull(token.delegate);
    assert.strictEqual(Object.keys(token.state)[0], "initialized");
    assert.isNull(token.isNative);
    assert.strictEqual(token.delegatedAmount.toNumber(), 0);
    assert.isNull(token.closeAuthority);
  })

  it("Create a token account(B) for owner", async () => {
    await tokenProgram.methods
      .initializeAccount()
      .accounts({
        account: ownerBTokenAccount.publicKey,
        mint: mintBKeypair.publicKey,
        owner: provider.wallet.publicKey,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([ownerBTokenAccount])
      .preInstructions([
        await tokenProgram.account.account.createInstruction(ownerBTokenAccount),
      ])
      .rpc();
    const token = await tokenProgram.account.account.fetch(
      ownerBTokenAccount.publicKey
    );
    assert.isTrue(token.owner.equals(provider.wallet.publicKey));
    assert.isTrue(token.mint.equals(mintBKeypair.publicKey));
    assert.strictEqual(token.amount.toNumber(), 0);
    assert.isNull(token.delegate);
    assert.strictEqual(Object.keys(token.state)[0], "initialized");
    assert.isNull(token.isNative);
    assert.strictEqual(token.delegatedAmount.toNumber(), 0);
    assert.isNull(token.closeAuthority);
  })

  it("Mints some tokens", async () => {
    // mint some tokens
    await tokenProgram.methods
      .mintTo(supply)
      .accounts({
        mint: mintKeypair.publicKey,
        account: ownerTokenAccount.publicKey,
        owner: provider.wallet.publicKey,
      })
      .rpc();

    const token = await tokenProgram.account.account.fetch(
      ownerTokenAccount.publicKey
    );
    const mint = await tokenProgram.account.mint.fetch(mintKeypair.publicKey);
    assert.strictEqual(token.amount.toNumber(), supply.toNumber())
    assert.strictEqual(mint.supply.toNumber(), supply.toNumber());
    assert.isTrue(token.mint.equals(mintKeypair.publicKey));
  })

  describe("Swap", () => {
    const [vaultPubkey] = web3.PublicKey.findProgramAddressSync(
      [mintKeypair.publicKey.toBytes()],
      program.programId
    );

    const vaultTokenAccount = utils.token.associatedAddress({
      mint: mintKeypair.publicKey,
      owner: vaultPubkey
    })

    const vaultBTokenAccount = utils.token.associatedAddress({
      mint: mintBKeypair.publicKey,
      owner: vaultPubkey
    })

    const [vaultNativeAccount] = web3.PublicKey.findProgramAddressSync(
      [vaultPubkey.toBytes()],
      program.programId
    );

    const price = new BN(10*LAMPORTS_PER_TOKEN)

    it("Should successfully to create an user", async () => {
      const [userPublicKey] = web3.PublicKey.findProgramAddressSync(
        [provider.wallet.publicKey.toBuffer()],
        program.programId
      )

      await program.methods.initUser("Phuc")
        .accounts({
          wallet: provider.wallet.publicKey,
          user: userPublicKey,
        })
        .rpc()

      const user = await program.account.user.fetch(userPublicKey)
      assert.strictEqual(user.name, "Phuc")
      assert.isTrue(user.balances[0].eq(new BN(99)))
    })

    it("Should fail to create a vault: price is zero", async () => {
      try {
        await program.methods.createVault(new BN(0), supply)
        .accounts({
          owner: provider.wallet.publicKey,
          vault: vaultPubkey,
          mint: mintKeypair.publicKey,
          mintB: mintBKeypair.publicKey,
          ownerTokenAccount: ownerTokenAccount.publicKey,
          vaultTokenAccount,
          vaultBTokenAccount,
          vaultNativeAccount,
          tokenProgram: utils.token.TOKEN_PROGRAM_ID,
          associatedTokenProgram: utils.token.ASSOCIATED_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();
      }
      catch(error) {
        assert.equal(error.error.errorCode.code, "PriceIsZero");
      }
    });

    it("Should fail to create a vault: amount is zero", async () => {
      try {
        await program.methods.createVault(price, new BN(0))
        .accounts({
          owner: provider.wallet.publicKey,
          vault: vaultPubkey,
          mint: mintKeypair.publicKey,
          mintB: mintBKeypair.publicKey,
          ownerTokenAccount: ownerTokenAccount.publicKey,
          vaultTokenAccount,
          vaultBTokenAccount,
          vaultNativeAccount,
          tokenProgram: utils.token.TOKEN_PROGRAM_ID,
          associatedTokenProgram: utils.token.ASSOCIATED_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();
      }
      catch(error) {
        assert.equal(error.error.errorCode.code, "AmountIsZero");
      }
    });

    it("Should fail to create a vault: insufficient balance", async () => {
      try {
        await program.methods.createVault(price, supply.add(new BN(1)))
        .accounts({
          owner: provider.wallet.publicKey,
          vault: vaultPubkey,
          mint: mintKeypair.publicKey,
          mintB: mintBKeypair.publicKey,
          ownerTokenAccount: ownerTokenAccount.publicKey,
          vaultTokenAccount,
          vaultBTokenAccount,
          vaultNativeAccount,
          tokenProgram: utils.token.TOKEN_PROGRAM_ID,
          associatedTokenProgram: utils.token.ASSOCIATED_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();
      }
      catch(error) {
        assert.equal(error.error.errorCode.code, "InsufficientBalance");
      }
    });

    it("Create a vault", async () => {
      await program.methods.createVault(price, supply)
        .accounts({
          owner: provider.wallet.publicKey,
          vault: vaultPubkey,
          mint: mintKeypair.publicKey,
          mintB: mintBKeypair.publicKey,
          ownerTokenAccount: ownerTokenAccount.publicKey,
          vaultTokenAccount,
          vaultBTokenAccount,
          vaultNativeAccount,
          tokenProgram: utils.token.TOKEN_PROGRAM_ID,
          associatedTokenProgram: utils.token.ASSOCIATED_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      // Check that the swap was created successfully
      const vault = await program.account.vault.fetch(vaultPubkey);
      assert.isTrue(vault.owner.equals(provider.wallet.publicKey))
      assert.strictEqual(vault.price.toNumber(), 10);
      assert.isTrue(vault.mint.equals(mintKeypair.publicKey))

      // Check the pool token account
      const token = await tokenProgram.account.account.fetch(
        vaultTokenAccount
      );
      assert.strictEqual(token.amount.toNumber(), supply.toNumber())
    });

    it("Update price", async () => {
      const beforeVault = await program.account.vault.fetch(vaultPubkey);
      const newPrice = new BN(100);
      await program.methods.updatePrice(newPrice)
        .accounts({
          owner: provider.wallet.publicKey,
          vault: vaultPubkey
        })
        .rpc();

      const afterVault = await program.account.vault.fetch(vaultPubkey);
      assert.strictEqual(afterVault.price.toNumber(), newPrice.toNumber())
      assert.ok(afterVault.price.eq(newPrice));

      await program.methods.updatePrice(price)
        .accounts({
          owner: provider.wallet.publicKey,
          vault: vaultPubkey
        })
        .rpc();
    })

    describe("Allow any user to swap", () => {
      const user = web3.Keypair.generate(); // Create a new user
      const userTokenAccount = utils.token.associatedAddress({
        mint: mintKeypair.publicKey,
        owner: user.publicKey
      })

      const userBTokenAccount = utils.token.associatedAddress({
        mint: mintBKeypair.publicKey,
        owner: user.publicKey
      })

      before(async () => {
        // Airdrop sol from validator
        const signature = await provider.connection.requestAirdrop(user.publicKey, 10*web3.LAMPORTS_PER_SOL)
        await provider.connection.confirmTransaction(signature)
      })
      it("Swap from SOL to TOKEN", async () => {
        const beforeVaultSOL = await provider.connection.getBalance(vaultNativeAccount)
        const beforeUserSOL = await provider.connection.getBalance(user.publicKey);

        const solAmount = new BN(beforeUserSOL/3);
        await program.methods.swap(true, solAmount)
          .accounts({
            vault: vaultPubkey,
            mint: mintKeypair.publicKey,
            vaultTokenAccount,
            vaultNativeAccount,
            user: user.publicKey,
            userTokenAccount,
            tokenProgram: utils.token.TOKEN_PROGRAM_ID,
            associatedTokenProgram: utils.token.ASSOCIATED_PROGRAM_ID,
            systemProgram: web3.SystemProgram.programId,
          })
          .signers([user])
          .rpc();

        const expectedToken = price.mul(solAmount).div(new BN(web3.LAMPORTS_PER_SOL))

        // Check native token
        const afterVaultSOL = await provider.connection.getBalance(vaultNativeAccount)
        const afterUserSOL = await provider.connection.getBalance(user.publicKey);
        assert.strictEqual(afterVaultSOL, beforeVaultSOL + solAmount.toNumber())
        assert.isBelow(afterUserSOL, beforeUserSOL - solAmount.toNumber())

        // Check the pool token account
        const vaultToken = await provider.connection.getTokenAccountBalance(vaultTokenAccount);
        assert.strictEqual(vaultToken.value.uiAmount, supply.toNumber() - expectedToken.toNumber())

        // Check the user token account
        const usertoken = await provider.connection.getTokenAccountBalance(userTokenAccount);
        assert.strictEqual(usertoken.value.uiAmount, expectedToken.toNumber())
      });

      /* it("Swap from Token B to TOKEN", async () => {
        const beforeVaultB = await provider.connection.getTokenAccountBalance(vaultBTokenAccount)
        const beforeUserB = await provider.connection.getTokenAccountBalance(userBTokenAccount)

        const solAmount = new BN(Number(beforeUserB.value.amount)/3);
        await program.methods.swapTokens(true, solAmount)
          .accounts({
            vault: vaultPubkey,
            mint: mintKeypair.publicKey,
            vaultTokenAccount,
            vaultBTokenAccount,
            user: user.publicKey,
            userTokenAccount,
            userBTokenAccount,
            tokenProgram: utils.token.TOKEN_PROGRAM_ID,
            associatedTokenProgram: utils.token.ASSOCIATED_PROGRAM_ID,
            systemProgram: web3.SystemProgram.programId,
          })
          .signers([user])
          .rpc();
      }); */

      it("Swap from TOKEN to SOL", async () => {
        const beforeVaultSOL = await provider.connection.getBalance(vaultNativeAccount)
        const beforeUserSOL = await provider.connection.getBalance(user.publicKey);
        const beforeVaultToken = await provider.connection.getTokenAccountBalance(vaultTokenAccount);
        const beforeUsertoken = await provider.connection.getTokenAccountBalance(userTokenAccount);

        const tokenAmount = new BN(beforeUsertoken.value.uiAmount*LAMPORTS_PER_TOKEN/2);

        await program.methods.swap(false, tokenAmount)
          .accounts({
            vault: vaultPubkey,
            mint: mintKeypair.publicKey,
            vaultTokenAccount,
            vaultNativeAccount,
            user: user.publicKey,
            userTokenAccount,
            tokenProgram: utils.token.TOKEN_PROGRAM_ID,
            associatedTokenProgram: utils.token.ASSOCIATED_PROGRAM_ID,
            systemProgram: web3.SystemProgram.programId,
          })
          .signers([user])
          .rpc();

        const expectedSOL = tokenAmount.mul(new BN(web3.LAMPORTS_PER_SOL)).div(price)

        // Check native token
        const afterVaultSOL = await provider.connection.getBalance(vaultNativeAccount)
        const afterUserSOL = await provider.connection.getBalance(user.publicKey);
        assert.strictEqual(afterVaultSOL, beforeVaultSOL - expectedSOL.toNumber())
        assert.isBelow(beforeUserSOL, afterUserSOL + expectedSOL.toNumber())

        // Check the token accounts
        const afterVaultToken = await provider.connection.getTokenAccountBalance(vaultTokenAccount);
        const afterUsertoken = await provider.connection.getTokenAccountBalance(userTokenAccount);
        assert.strictEqual(afterVaultToken.value.uiAmount, beforeVaultToken.value.uiAmount + tokenAmount.toNumber())
        assert.strictEqual(afterUsertoken.value.uiAmount, beforeUsertoken.value.uiAmount - tokenAmount.toNumber())
      });

      it("Should fail to swap: insufficient balance", async () => {
        const beforeUserSOL = await provider.connection.getBalance(user.publicKey);
        const solAmount = new BN(beforeUserSOL + 1);

        try {
          await program.methods.swap(true, solAmount)
            .accounts({
              vault: vaultPubkey,
              mint: mintKeypair.publicKey,
              vaultTokenAccount,
              vaultNativeAccount,
              user: user.publicKey,
              userTokenAccount,
              tokenProgram: utils.token.TOKEN_PROGRAM_ID,
              associatedTokenProgram: utils.token.ASSOCIATED_PROGRAM_ID,
              systemProgram: web3.SystemProgram.programId,
            })
            .signers([user])
            .rpc();
        }
        catch(error) {
          assert.equal(error.error.errorCode.code, "InsufficientBalance");
        }
      });

      it("Allow the owner withdraws all native token", async () => {
        const beforeVaultSOL = await provider.connection.getBalance(vaultNativeAccount)
        const beforeOwnerSOL = await provider.connection.getBalance(provider.wallet.publicKey);

        await program.methods.withdrawNative()
          .accounts({
            owner: provider.wallet.publicKey,
            vault: vaultPubkey,
            vaultNativeAccount,
            systemProgram: web3.SystemProgram.programId,
          })
          .rpc();

        // Check native token
        const afterVaultSOL = await provider.connection.getBalance(vaultNativeAccount)
        const afterOwnerSOL = await provider.connection.getBalance(provider.wallet.publicKey);
        assert.strictEqual(afterVaultSOL, 0)
        assert.isAbove(beforeOwnerSOL + beforeVaultSOL, afterOwnerSOL) // gas
      });

      it("Allow the owner withdraws all token", async () => {
        const beforeVaultToken = await provider.connection.getTokenAccountBalance(vaultTokenAccount);
        const beforeOwnerToken = await provider.connection.getTokenAccountBalance(ownerTokenAccount.publicKey);

        await program.methods.withdrawToken()
          .accounts({
            owner: provider.wallet.publicKey,
            vault: vaultPubkey,
            mint: mintKeypair.publicKey,
            vaultTokenAccount,
            ownerTokenAccount: ownerTokenAccount.publicKey,
            tokenProgram: utils.token.TOKEN_PROGRAM_ID,
            associatedTokenProgram: utils.token.ASSOCIATED_PROGRAM_ID,
            systemProgram: web3.SystemProgram.programId,
          })
          .rpc();

        // Check token
        const afterVaultToken = await provider.connection.getTokenAccountBalance(vaultTokenAccount);
        const afterOwnerToken = await provider.connection.getTokenAccountBalance(ownerTokenAccount.publicKey);
        assert.strictEqual(afterVaultToken.value.uiAmount, 0)
        assert.strictEqual(afterOwnerToken.value.uiAmount, beforeOwnerToken.value.uiAmount + beforeVaultToken.value.uiAmount)
      });
    })
  })
});
