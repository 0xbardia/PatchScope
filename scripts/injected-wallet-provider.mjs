import { hexToBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const accounts = [
  privateKeyToAccount(`0x${"11".repeat(32)}`),
  privateKeyToAccount(`0x${"22".repeat(32)}`),
];
let index = 0;
const listeners = new Map();

function emit(event, payload) {
  for (const fn of listeners.get(event) ?? []) fn(payload);
}

function decodeMessage(value) {
  if (typeof value === "string" && /^0x[0-9a-fA-F]*$/.test(value) && value.length > 2) {
    return new TextDecoder().decode(hexToBytes(value));
  }
  return String(value ?? "");
}

const ethereum = {
  isPatchScopeTestWallet: true,
  async request({ method, params = [] }) {
    const current = accounts[index];
    if (method === "eth_chainId") return "0xf22f";
    if (method === "net_version") return "61999";
    if (method === "eth_accounts" || method === "eth_requestAccounts") return [current.address];
    if (method === "wallet_switchEthereumChain" || method === "wallet_addEthereumChain") return null;
    if (method === "personal_sign" || method === "eth_sign") {
      const messageParam = params.find((item) => typeof item === "string" && !/^0x[0-9a-fA-F]{40}$/.test(item));
      return current.signMessage({ message: decodeMessage(messageParam) });
    }
    if (method === "eth_sendTransaction") {
      throw { code: 4001, message: "Refused: this session does not send a contract transaction." };
    }
    throw { code: -32601, message: `Unsupported method ${method}` };
  },
  on(event, fn) {
    const list = listeners.get(event) ?? [];
    list.push(fn);
    listeners.set(event, list);
  },
  removeListener(event, fn) {
    listeners.set(event, (listeners.get(event) ?? []).filter((item) => item !== fn));
  },
  select(next) {
    index = next === 1 ? 1 : 0;
    emit("accountsChanged", [accounts[index].address]);
  },
};

window.ethereum = ethereum;
window.__patchscopeWallet = {
  select: (next) => ethereum.select(next),
  address: () => accounts[index].address,
};
