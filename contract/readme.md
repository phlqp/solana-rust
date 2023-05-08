solana config set --url https://api.testnet.solana.com
solana config set --url http://127.0.0.1:8899

# Installation
## Install Rust and Anchor
https://www.anchor-lang.com/docs/installation

## Install packages
```bash
yarn install
```

## Configuration
Edit configuration in Anchor.toml file
- localnet/testnet
- Update Program's PublicKey

## Build
```bash
yarn build
```

## Deploy
```bash
yarn deploy
```

## Migrate
Update token address before deployment
```bash
yarn migrate
```

## Testing
```bash
yarn test
```

# Token
## Create a new token <MINT>
spl-token create-token --decimals 3

## Create a new account
spl-token create-account <MINT>

## Mint tokens
spl-token mint <MINT> 1000000000