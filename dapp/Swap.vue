<script setup lang="ts">
import {ref, onMounted, computed} from 'vue'
import * as buffer from "buffer";

import { Program, AnchorProvider, BN, utils, web3 } from '@coral-xyz/anchor';
import idl from "../solana/target/idl/contract.json";

// @ts-ignore
window.Buffer = buffer.Buffer;

const PROGRAM_ID = new web3.PublicKey('22RFy7d2bVK3zyFHb3k8qHn8EET7KUcZpyHaGBWVYCGF')
const VAULT_ID = new web3.PublicKey('A7cQnuZRG1bR5hMJQRHRerGMaeH4BUjaUTmTVaqCDdi8')
const MINT_ID = new web3.PublicKey('GDEnhWE85VsHfRsfgppoCC99stB1yvRgDwAVWcRCh1Tt')
const LAMPORTS_PER_TOKEN = 10**3
const VAULT_TOKEN_ID = new web3.PublicKey('9Ag7Dn58A8mbSdghgQdHRJFN2A7B6NPUDDGg2KNDFBEp')
const VAULT_NATIVE_ID = new web3.PublicKey('9hHN4R9wmLuDP1kCKEGJdLqM1nB3ZpNaDyX3dLPCaFg5')

interface Balances {
    vault: {
        sol: number,
        move: number,
    },
    user: {
        sol: number,
        move: number,
    }
}

const isPhantomInstalled = ref<boolean>()
const connectedWallet = ref<web3.PublicKey | null>(null)
const userTokenAccount = computed<web3.PublicKey | null>(
    () => connectedWallet.value?
        utils.token.associatedAddress({mint: MINT_ID, owner: connectedWallet.value}):
        null
)

// Fetch mint, vault information from Solana
const balances = ref<Balances>({vault: {sol: 0, move: 0}, user: {sol: 0, move: 0}})
const price = ref(0)
const amount = ref(1)
const status = ref<{isProcessing: boolean, direction: boolean, latestTx: string | null}>({isProcessing: false, direction: true, latestTx: null})

const getExplorerLink = (any: web3.PublicKey | string): string => {
    return typeof any === 'string'?
    `https://explorer.solana.com/tx/${any}?cluster=testnet` :
    `https://explorer.solana.com/address/${any.toBase58()}?cluster=testnet`
}



const getPhantomProvider = () => {
    // @ts-ignore
    if ('phantom' in window) {
        // @ts-ignore
        const provider = window.phantom?.solana;

        if (provider?.isPhantom) {
        return provider;
        }
    }
  // @ts-ignore
  window.open('https://phantom.app/', '_blank');
};

const createProviders = async (): Promise<{anchorProvider: AnchorProvider, phantomProvider: any}> => {
    const phantomProvider = getPhantomProvider()
    // await phantomProvider.connect()
    const connection = new web3.Connection("https://api.testnet.solana.com")
    const anchorProvider = new AnchorProvider(
        connection,
        phantomProvider,
        {}
    )

    return {anchorProvider, phantomProvider}
}

const connectToPhantom = async () => {
    const provider = getPhantomProvider(); // see "Detecting the Provider"
    if(provider.isConnected) {
        await provider.disconnect();
        connectedWallet.value = null
    }
    else {
        try {
            const resp = await provider.connect();
            connectedWallet.value = resp.publicKey;
            const connection = new web3.Connection("https://api.testnet.solana.com")
            await fetchBalances(connection)
        } catch (err) {
            // @ts-ignore
            alert('User rejected the request.')
        }
    }
}

// Fetch a mint from Solana by public key
onMounted(async ()=>{
    // @ts-ignore
    isPhantomInstalled.value = window.phantom?.solana?.isPhantom
    if (isPhantomInstalled.value) {
        const {anchorProvider, phantomProvider} = await createProviders()

        connectedWallet.value = phantomProvider.isConnected?phantomProvider.publicKey: null

        // @ts-ignore
        const program = new Program(idl, PROGRAM_ID, anchorProvider);
        const vault = await program.account.vault.fetch(VAULT_ID);
        price.value = vault.price.toNumber()

        await fetchBalances(anchorProvider.connection)
    }
})

const fetchBalances = async (connection: web3.Connection) => {
    balances.value.vault.sol = (await connection.getBalance(VAULT_NATIVE_ID))/web3.LAMPORTS_PER_SOL
    balances.value.vault.move = (await connection.getTokenAccountBalance(VAULT_TOKEN_ID)).value.uiAmount??0

    if(isPhantomInstalled && connectedWallet.value && userTokenAccount.value) {
        balances.value.user.sol = (await connection.getBalance(connectedWallet.value))/web3.LAMPORTS_PER_SOL

        try {
            balances.value.user.move = (await connection.getTokenAccountBalance(userTokenAccount.value)).value.uiAmount??0
        }
        catch (err) {
            balances.value.user.move = 0
        }
    }
}

const updatePrice = async (newPrice: number) => {
    if(connectedWallet.value) {
        const {anchorProvider} = await createProviders()
        // @ts-ignore
        const program = new Program(idl, PROGRAM_ID, anchorProvider);

        try {
            status.value.latestTx = await program.methods.updatePrice(new BN(newPrice))
                .accounts({
                    user: connectedWallet.value,
                    vault: VAULT_ID,
                })
                .rpc();
        }
        catch {
            // @ts-ignore
            alert("User rejected the request.")
        }
    }
}

const swap = async (direction: boolean) => {
    if(connectedWallet.value && userTokenAccount.value) {
        status.value.isProcessing = true
        status.value.direction = direction
        status.value.latestTx = null


        const {anchorProvider} = await createProviders()

        // @ts-ignore
        const program = new Program(idl, PROGRAM_ID, anchorProvider);

        const amountToSwap = direction?
            new BN(amount.value*web3.LAMPORTS_PER_SOL):
            new BN(amount.value*LAMPORTS_PER_TOKEN);

        try {
            status.value.latestTx = await program.methods.swap(direction, amountToSwap)
                .accounts({
                    vault: VAULT_ID,
                    mint: MINT_ID,
                    vaultTokenAccount: VAULT_TOKEN_ID,
                    vaultNativeAccount: VAULT_NATIVE_ID,
                    user: connectedWallet.value,
                    userTokenAccount: userTokenAccount.value,
                    tokenProgram: utils.token.TOKEN_PROGRAM_ID,
                    associatedTokenProgram: utils.token.ASSOCIATED_PROGRAM_ID,
                    systemProgram: web3.SystemProgram.programId,
                })
                .rpc();
        }
        catch {
            // @ts-ignore
            alert("User rejected the request.")
        }

        if(status.value.latestTx) {
            const signatureStatus = await anchorProvider.connection.getSignatureStatus(status.value.latestTx)
            if(signatureStatus.value?.err === null) {
                await fetchBalances(anchorProvider.connection)
            }
            else {
                // @ts-ignore
                alert("An error occured while signing the transaction.")
            }
        }

        status.value.isProcessing = false
    }
    else {
        // @ts-ignore
        alert("Please connect to Solana")
    }
}

</script>

<template>
    <div>
        <ul>
            <li>Is Phantom Installed: {{ isPhantomInstalled }}</li>
            <li>Token: <a :href="getExplorerLink(MINT_ID)" target="_blank">{{ MINT_ID.toBase58() }}</a></li>
        </ul>
        <button
            @click="connectToPhantom()"
            type="button"
            class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
            <template v-if="connectedWallet">
                Your Wallet: {{ connectedWallet }}
            </template>
            <template v-else>
                Connect
            </template>
        </button>
        <!--SWAP-->
        <div v-if="connectedWallet" class="bg-white shadow sm:rounded-lg">
            <div class="px-4 py-5 sm:p-6">
            <h3 class="text-lg leading-6 font-medium text-gray-900">
                Swap between SOL and MOVE
            </h3>
            <div class="mt-2 max-w-xl text-sm text-gray-500">
                <p>
                    1 SOL &lt=> {{ price/LAMPORTS_PER_TOKEN }} MOVE.
                    Enter amount to swap.
                </p>
            </div>
            <div class="mt-5 sm:flex sm:items-center">
                <div class="w-full sm:max-w-xs">
                <label for="amount" class="sr-only">Amount</label>
                <input
                    v-model="amount"
                    type="number"
                    name="amount" id="amount"
                    class="shadow-sm ring-indigo-400 border-indigo-400 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm rounded-md" placeholder="123.45"
                />
                </div>
                <button
                    @click="swap(true)"
                    :disabled="status.isProcessing"
                    class="mt-3 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                    SOL ==> MOVE
                    <template v-if="status.isProcessing && status.direction">
                        processing...
                    </template>
                </button>
                <button
                    @click="swap(false)"
                    :disabled="status.isProcessing"
                    class="mt-3 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                    MOVE ==> SOL
                    <template v-if="status.isProcessing && !status.direction">
                        processing...
                    </template>
                </button>
            </div>
            </div>
        </div>

        <!--VAULT-->
        <div v-if="connectedWallet">
            <h3 class="text-lg leading-6 font-medium text-gray-900">
                Vault Balances
            </h3>
            <dl class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div class="px-4 py-5 bg-white shadow rounded-lg overflow-hidden sm:p-6">
                    <dt class="text-sm font-medium text-gray-500 truncate">
                        SOL <a :href="getExplorerLink(VAULT_NATIVE_ID)" target="_blank">{{ VAULT_NATIVE_ID.toBase58() }}</a>
                    </dt>
                    <dd class="mt-1 text-xl font-semibold text-gray-900">
                        {{balances.vault.sol}}
                    </dd>
                </div>
                <div class="px-4 py-5 bg-white shadow rounded-lg overflow-hidden sm:p-6">
                    <dt class="text-sm font-medium text-gray-500 truncate">
                        MOVE <a v-if="connectedWallet" :href="getExplorerLink(VAULT_TOKEN_ID)" target="_blank">{{ VAULT_TOKEN_ID.toBase58() }}</a>
                    </dt>
                    <dd class="mt-1 text-xl font-semibold text-gray-900">
                        {{balances.vault.move}}
                    </dd>
                </div>
            </dl>
        </div>
        <!--USER-->
        <div v-if="connectedWallet">
            <h3 class="text-lg leading-6 font-medium text-gray-900">
                Your Balances <template v-if="status.latestTx">
                        Latest transaction:
                        <a :href="getExplorerLink(status.latestTx)" target="_blank">{{ status.latestTx.substring(0, 10) }}</a>
                    </template>
            </h3>
            <dl class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div class="px-4 py-5 bg-white shadow rounded-lg overflow-hidden sm:p-6">
                    <dt class="text-sm font-medium text-gray-500 truncate">
                        SOL <a v-if="connectedWallet" :href="getExplorerLink(connectedWallet)" target="_blank">{{ connectedWallet.toBase58() }}</a>
                    </dt>
                    <dd class="mt-1 text-xl font-semibold text-gray-900">
                        {{balances.user.sol}}
                    </dd>
                </div>
                <div class="px-4 py-5 bg-white shadow rounded-lg overflow-hidden sm:p-6">
                    <dt class="text-sm font-medium text-gray-500 truncate">
                        MOVE <a v-if="userTokenAccount" :href="getExplorerLink(userTokenAccount)" target="_blank">{{ userTokenAccount.toBase58() }}</a>
                    </dt>
                    <dd class="mt-1 text-xl font-semibold text-gray-900">
                        {{balances.user.move}}
                    </dd>
                </div>
            </dl>
        </div>

        <button
            @click="updatePrice(100)"
            class="mt-3 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
            Update Price
        </button>
    </div>
</template>