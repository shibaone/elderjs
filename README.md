# ElderJS

  

![GitHub version](https://img.shields.io/badge/version-1.2.11-blue.svg)

![License](https://img.shields.io/badge/license-ISC-green.svg)

![GitHub repo](https://img.shields.io/badge/repo-github.com/0xElder/elderjs-brightgreen.svg)

  

**ElderJS** is a JavaScript library designed to enable front-end integration for Rollapps connected to the Elder Ecosystem. It provides tools to interact with Ethereum and Cosmos-based wallets, facilitating transaction creation, signing, and broadcasting within the Elder framework.

  

---

  

## Features

  

-  **Ethereum Wallet Support**: Create, sign, and broadcast transactions using Ethereum-based keys.

-  **Cosmos Wallet Support**: Integrate with Keplr wallet for Cosmos-based transaction signing and broadcasting.

-  **Elder Ecosystem Integration**: Seamlessly connect Rollapps to the Elder ecosystem with custom transaction handling.

-  **TypeScript Support**: Fully typed codebase for better developer experience.

  

---

  

## Installation

  

### Prerequisites

  

- Node.js (v16 or higher recommended)

- npm or yarn

- A modern browser with Web3 support (for Ethereum) or Keplr wallet (for Cosmos)

  

### Install via npm

  

```bash
npm  install  elderjs

```

  

### Install from GitHub

  

Clone the repository and install dependencies:

  

```bash
git  clone  https://github.com/0xElder/elderjs.git

cd  elderjs

npm  install
```

  

---

## Usage

  

### Ethereum Wallet Example

  

```javascript
import { eth_getElderMsgAndFeeTxRaw, eth_broadcastTx, eth_getElderAccountInfoFromSignature } from  'elderjs';
import { ethers } from "ethers";

function getWeb3Provider() {
    if (window.ethereum) {
        return new ethers.BrowserProvider(window.ethereum);
    }
    return null;
}
const provider = getWeb3Provider();

let  message  =  "Sign to Login";
const  signer  =  await  provider.getSigner();
const  signature  =  await  signer.signMessage(message);
var { recoveredPublicKey, elderAddr } =  await  eth_getElderAccountInfoFromSignature(message, signature)

// Example transaction data

const  tx = await  DUMMY_CONTRACT.METHOD.populateTransaction();

const  elderAddress = elderAddr;
const  elderPublicKey = recoveredPublicKey;

const  gasLimit = 21000;

const  elderChainConfig = {
	chainName:  "elder-testnet",
	rpc:  "https://rpc.elder.example.com",
	rest:  "https://rest.elder.example.com",
	rollChainID:  1234,
	
	// Elder Roll ID
	rollID:  2,
};

// Create and sign transaction

const { tx_hash, rawTx } = await  eth_getElderMsgAndFeeTxRaw(
    tx,
    elderAddress,
    elderPublicKey,
    gasLimit,
    ethers.parseEther("1.0"),
    elderChainConfig
);

// Broadcast transaction
// broadcastResult.code == 0 ( for tx success )

const  broadcastResult = await  eth_broadcastTx(rawTx, elderChainConfig.rpc);

console.log("Transaction Hash:", tx_hash);
console.log("Broadcast Result:", broadcastResult);

```

  

### Cosmos Wallet Example (with Keplr)

  

```javascript

import { cosmos_getElderClient, cosmos_getElderMsgAndFeeTxRaw, getEthereumAddressFromCosmosCompressedPubKey } from  'elderjs';

// Elder chain configuration

const  elderChainConfig = {
	chainName:  "elder-testnet",
	rpc:  "https://rpc.elder.example.com",
	rest:  "https://rest.elder.example.com",
	rollChainID:  1234,
	
	// Elder Roll ID
	rollID:  2,
};

// Connect to Keplr and get client

const { elderAddress, elderClient, elderPublicKey } = await  cosmos_getElderClient(elderChainConfig);
const  ethAddress  =  getEthereumAddressFromCosmosCompressedPubKey(elderPublicKey);
  
// Example transaction data
const  tx = await  DUMMY_CONTRACT.METHOD.populateTransaction();

// Create and sign transaction
const { tx_hash, rawTx } = await  cosmos_getElderMsgAndFeeTxRaw(
    tx,
    elderAddress,
    elderPublicKey,
    21000, // gasLimit
    ethers.parseEther("1.0"),
    1234, // rollChainId
    2, // ElderRollID
    "elder-testnet"  // chainName
);

// Broadcast transaction using the client
// broadcastResult.code == 0 ( for tx success )

const  broadcastResult = await  elderClient.broadcastTx(rawTx);

console.log("Transaction Hash:", tx_hash);
console.log("Broadcast Result:", broadcastResult);

```

  

---

  

## Project Structure

  

```

elderjs/

├── eth_wallet/

│ └── index.js # Ethereum wallet utilities

├── cosmos_wallet/

│ └── index.js # Cosmos wallet utilities (Keplr integration)

├── common/ # Shared utilities and helpers

├── package.json # Project metadata and dependencies

└── README.md # This file

```

  

---

  

## Dependencies

  

-  **`ethers`**: Ethereum JavaScript library for transaction handling.

-  **`@cosmjs/stargate`**: Cosmos SDK client for transaction signing and broadcasting.

-  **`@cosmjs/proto-signing`**: Protobuf-based signing utilities for Cosmos.

-  **`bech32`**: Bech32 address encoding/decoding.

-  **`@noble/hashes`**: Cryptographic hash functions.

  

See `package.json` for the full list.

  

---

  

## Development

  

### Transpile TypeScript

  

To transpile TypeScript files (if applicable):

  

```bash

npm  run  transpile-ts

```
  

## Contributing

  

Contributions are welcome! Please follow these steps:

  

1. Fork the repository.

2. Create a feature branch (`git checkout -b feature/your-feature`).

3. Commit your changes (`git commit -m "Add your feature"`).

4. Push to the branch (`git push origin feature/your-feature`).

5. Open a pull request.

  

---

  

## License

  

This project is licensed under the ISC License. See the [LICENSE](LICENSE) file for details.

  

---

  

## Issues

  

Found a bug? Have a suggestion? Open an issue on the [GitHub Issues page](https://github.com/0xElder/elderjs/issues).

  

---

  

## Contact

  

For questions or support, reach out via the [GitHub repository](https://github.com/0xElder/elderjs).

  

---

  

Happy coding with ElderJS! 🚀
