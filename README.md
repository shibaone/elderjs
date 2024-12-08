# ElderJS

![Version](https://img.shields.io/badge/version-1.0.6-blue)
![License](https://img.shields.io/badge/license-ISC-lightgrey)
[![GitHub issues](https://img.shields.io/github/issues/0xElder/elderjs)](https://github.com/0xElder/elderjs/issues)

**ElderJS** is a JavaScript library designed to facilitate the integration of Rollapps with the Elder Ecosystem. It enables seamless interaction with the Elder blockchain, wallet connection via Keplr, and the ability to create, sign, and broadcast custom transactions.

---

## 📚 **Table of Contents**

- [📖 Introduction](#-introduction)
- [✨ Features](#-features)
- [📦 Installation](#-installation)
- [🚀 Usage](#-usage)
  - [1️⃣ Initialize Elder Client](#1️⃣-initialize-elder-client)
  - [2️⃣ Create and Send Custom Transaction](#2️⃣-create-and-send-custom-transaction)
- [📂 File Structure](#-file-structure)
- [⚙️ Configuration](#️-configuration)
- [📚 API Reference](#-api-reference)
  - [getElderClient](#getelderclient)
  - [sendElderCustomTransaction](#sendeldercustomtransaction)
  - [getElderMsgAndFee](#geteldermsgandfee)
- [📋 Dependencies](#-dependencies)
- [🐞 Issues](#-issues)
- [📜 License](#-license)

---

## 📖 **Introduction**

**ElderJS** provides developers with a simple and effective way to connect to Rollapps on the Elder blockchain. It enables wallet connection, custom transaction generation, and broadcasting functionalities using Keplr and CosmJS. This library aims to reduce the complexity of interacting with Elder's Rollapp ecosystem and streamline dApp development.

---

## ✨ **Features**

- 🔗 **Keplr Wallet Integration**: Easily connect and manage wallet interactions.
- 🚀 **Custom Transaction Support**: Create and send custom transactions specific to Elder's Rollapp ecosystem.
- ⚙️ **Custom Fees & Gas Management**: Set custom fees and gas limits for Rollapp transactions.
- 📡 **RPC and REST Integration**: Interact with Elder nodes via RPC and REST endpoints.

---

## 📦 **Installation**

Install **ElderJS** via npm:

```bash
npm install elderjs
```

---

## 🚀 **Usage**

### 1️⃣ **Initialize Elder Client**

To initialize the Elder client and connect to a Rollapp using Keplr, use the `getElderClient` function.

```javascript
import { getElderClient } from 'elderjs';

const elderChainConfig = {
  chainName: 'your-chain-name',
  rpc: 'https://your-rpc-url',
  rest: 'https://your-rest-url',
  rollID: 11,
};

(async () => {
  const { elderAddress, elderClient } = await getElderClient(elderChainConfig);
  console.log('Connected address:', elderAddress);
})();
```

> **Note:** Keplr must be installed and enabled.

---

### 2️⃣ **Create and Send Custom Transaction**

To create and broadcast a custom transaction on a Rollapp, use the `getElderMsgAndFee` and `sendElderCustomTransaction` functions.

```javascript
import { getElderClient, getElderMsgAndFee, sendElderCustomTransaction } from 'elderjs';

(async () => {
  const { elderAddress, elderClient } = await getElderClient(elderChainConfig);

  const tx = {
    to: '0xRecipientAddress',
    value: ethers.utils.parseEther('0.01'),
  };

  const { elderMsg, elderFee } = getElderMsgAndFee(
    tx,
    elderAddress,
    200000, // gas limit
    ethers.utils.parseEther('0.01'),
    1, // rollapp-chainId
    11 // elder-rollapp-id
  );

  await sendElderCustomTransaction(elderAddress, elderClient, elderMsg, elderFee);
})();
```

> **Note:** Replace the `to`, `value`, and other transaction details with your own custom values.

---

## 📂 **File Structure**

```
elderjs/
├── chains.js                 # Chain configuration file
├── elder_proto/              # Protobuf files for custom messages
│   └── dist/
│       └── router/tx.js      # Compiled protobuf definitions for Rollapp messages
├── index.js                  # Main entry point for ElderJS
└── package.json              # Package metadata and dependencies
```

---

## ⚙️ **Configuration**

To connect to a Rollapp, you'll need to provide the following chain configuration:

```javascript
const elderChainConfig = {
  chainName: 'your-chain-name', // The chain name to connect to
  rpc: 'https://your-rpc-url',  // The RPC endpoint
  rest: 'https://your-rest-url' // The REST endpoint
  rollID: 11                    // The elder-rollapp-id
};
```

This configuration is required when calling `getElderClient`.

---

## 📚 **Function Reference**

### 🔹 **getElderClient(elderChainConfig)**
**Description**: Initializes a connection to a Rollapp via Keplr and returns an `elderAddress` and `elderClient`.

**Parameters:**
- `elderChainConfig` (object) — Contains `chainName`, `rpc`, and `rest` configuration.

**Returns:**
- `{ elderAddress, elderClient }` — The connected wallet address and client instance.

**Example:**
```javascript
const { elderAddress, elderClient } = await getElderClient(elderChainConfig);
```

---

### 🔹 **sendElderCustomTransaction(elderAddress, elderClient, elderMsg, elderFee)**
**Description**: Sends a custom transaction to the Rollapp.

**Parameters:**
- `elderAddress` (string) — The connected wallet address.
- `elderClient` (object) — The Elder client instance.
- `elderMsg` (object) — Custom message to be sent.
- `elderFee` (object) — Custom fee information.

**Example:**
```javascript
await sendElderCustomTransaction(elderAddress, elderClient, elderMsg, elderFee);
```

---

### 🔹 **getElderMsgAndFee(tx, elderAddress, gasLimit, value, chainId, rollID)**
**Description**: Prepares the custom transaction message and fee required for Elder Rollapp transactions.

**Parameters:**
- `tx` (object) — Transaction details.
- `elderAddress` (string) — The sender's address.
- `gasLimit` (number) — The gas limit for the transaction.
- `value` (string) — The transaction value.
- `chainId` (number) — The chain ID.
- `rollID` (string) — Roll ID for the transaction.

**Returns:**
- `{ elderMsg, elderFee }` — The message and fee for the transaction.

**Example:**
```javascript
const { elderMsg, elderFee } = getElderMsgAndFee(tx, elderAddress, 200000, ethers.utils.parseEther('0.01'), 1, 'roll-id-example');
```

---

## 📋 **Dependencies**

- **[@cosmjs/proto-signing](https://www.npmjs.com/package/@cosmjs/proto-signing)** — Used for protobuf message signing.
- **[@cosmjs/stargate](https://www.npmjs.com/package/@cosmjs/stargate)** — Provides Stargate client to connect to Elder's blockchain.
- **[ethers](https://www.npmjs.com/package/ethers)** — Used to create and serialize Ethereum-like transactions.
- **[typescript](https://www.npmjs.com/package/typescript)** — Required for TypeScript support.
- **[@bufbuild/protobuf](https://www.npmjs.com/package/@bufbuild/protobuf)** — Protobuf support for transaction messages.

---

## 🐞 **Issues**

If you encounter any issues, please report them via GitHub Issues:

🔗 [Report an Issue](https://github.com/0xElder/elderjs/issues)

---

## 📜 **License**

This project is licensed under the **ISC License**.

---

If you found **ElderJS** useful, feel free to ⭐️ the repository to support development.

🔗 [GitHub Repository](https://github.com/0xElder/elderjs)

---

If you'd like additional sections, such as examples, contributing guidelines, or advanced usage, let me know.
