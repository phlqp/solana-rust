<script setup lang="ts">
import {ref, onMounted, computed} from 'vue'
import { EthereumClient, w3mConnectors, w3mProvider } from '@web3modal/ethereum'
import { Web3Modal } from '@web3modal/html'
import { configureChains, createConfig } from '@wagmi/core'
import { goerli } from '@wagmi/core/chains'
import { getAccount, readContract } from '@wagmi/core'

const chains = [goerli]
const projectId = '10ee9683173a9bdd4179a59949c384c7'

const { publicClient } = configureChains(chains, [w3mProvider({ projectId })])
const wagmiConfig = createConfig({
  autoConnect: true,
  connectors: w3mConnectors({ projectId, version: 1, chains }),
  publicClient
})
const ethereumClient = new EthereumClient(wagmiConfig, chains)
const web3modal = new Web3Modal({ projectId }, ethereumClient)

const claim = async () => {
}
</script>

<template>
    <div>
        <w3m-core-button></w3m-core-button>
        <button
            @click="claim"
            class="mt-3 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
        >
            Claim
        </button>
    </div>
</template>