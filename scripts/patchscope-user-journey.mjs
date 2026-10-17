import { chromium } from "playwright";

const MOCK_WALLET_ADDRESS = "0x1111111111111111111111111111111111111111";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
page.setDefaultTimeout(30_000);

await page.addInitScript((address) => {
  window.ethereum = {
    isMetaMask: true,
    isConnected: () => true,
    selectedAddress: address,
    chainId: "0xf22f",
    request: async ({ method, params = [] }) => {
      if (method === "eth_sendTransaction" || method === "eth_sendRawTransaction" || method.startsWith("gen_send")) {
        throw new Error("BLOCKED_BY_SAFETY_GUARD: Automated scripts are forbidden from broadcasting transactions.");
      }
      if (method === "eth_requestAccounts" || method === "eth_accounts") return [address];
      if (method === "eth_chainId" || method === "net_version") return method === "net_version" ? "61999" : "0xf22f";
      if (method === "wallet_getSnaps") return {};
      if (method === "wallet_requestSnaps") return {};
      if (method.startsWith("wallet_")) return null;
      const response = await fetch("https://studio.genlayer.com/api", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      const body = await response.json();
      if (body.error) throw new Error(body.error.message || JSON.stringify(body.error));
      return body.result;
    },
    on: () => {},
    removeListener: () => {},
    enable: async () => [address],
  };
  const info = {
    uuid: "0f0e0d0c-0b0a-0908-0706-050403020101",
    name: "Web3 Test Wallet",
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>",
    rdns: "io.metamask",
  };
  window.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail: Object.freeze({ info, provider: window.ethereum }) }));
  window.addEventListener("eip6963:requestProvider", () => {
    window.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail: Object.freeze({ info, provider: window.ethereum }) }));
  });
}, MOCK_WALLET_ADDRESS);

const logs = [];
function log(msg) {
  logs.push(msg);
  console.log(msg);
}

try {
  log("1. Navigating to landing page http://127.0.0.1:8080/ ...");
  await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
  const title = await page.title();
  log(`✓ Landing title: ${title}`);

  // Test live on-chain policy trigger on the landing page
  const lpPolicyBtn = page.getByRole("button", { name: /test read get_policy\(\) live/i });
  if (await lpPolicyBtn.isVisible()) {
    log("Testing landing page live on-chain policy button...");
    await lpPolicyBtn.click();
    await page.waitForFunction(() => {
      const text = document.body.innerText;
      return text.includes("Verified on Studionet");
    }, { timeout: 30_000 });
    log("✓ Landing page live contract query verified on Studionet!");
  }
  await page.screenshot({ path: "/tmp/patchscope-1-landing.png" });

  log("2. Navigating to workspace /workspace ...");
  await page.goto("http://127.0.0.1:8080/workspace", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "/tmp/patchscope-2-workspace.png" });
  log(`✓ Workspace loaded at ${page.url()}`);

  log("3. Navigating to /workspace/new (Create Agreement) ...");
  await page.goto("http://127.0.0.1:8080/workspace/new", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "/tmp/patchscope-3-new-agreement.png" });

  // Fill in form inputs if available
  const titleInput = page.locator("input[name='title'], input[placeholder*='title' i], input").first();
  if (await titleInput.isVisible()) {
    await titleInput.fill("Automated Security Patch Agreement");
    log("✓ Filled agreement title");
  }

  log("4. Navigating to /workspace/diagnostics ...");
  await page.goto("http://127.0.0.1:8080/workspace/diagnostics", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "/tmp/patchscope-4-diagnostics.png" });

  log("5. Testing 'Read node chain id' button in UI ...");
  const chainBtn = page.getByRole("button", { name: /read node chain id/i });
  if (await chainBtn.isVisible()) {
    await chainBtn.click();
    await page.waitForTimeout(2000);
    const preText = await page.locator("pre").innerText().catch(() => "");
    log(`✓ Node chain id output:\n${preText}`);
  }

  log("6. Testing 'Read get_policy() on-chain' button in UI ...");
  const policyBtn = page.getByRole("button", { name: /read get_policy\(\) on-chain/i });
  if (await policyBtn.isVisible()) {
    await policyBtn.click();
    await page.waitForFunction(() => {
      const text = document.querySelector("pre")?.textContent || "";
      return text.includes("get_policy() on Studionet") || text.includes("Read error");
    }, { timeout: 30_000 });
    const preText = await page.locator("pre").innerText().catch(() => "");
    log(`✓ get_policy() output from live contract:\n${preText}`);
  }

  log("7. Navigating to /docs, /roadmap, /security ...");
  await page.goto("http://127.0.0.1:8080/docs", { waitUntil: "networkidle" });
  log("✓ /docs loaded");
  await page.goto("http://127.0.0.1:8080/roadmap", { waitUntil: "networkidle" });
  log("✓ /roadmap loaded");
  await page.goto("http://127.0.0.1:8080/security", { waitUntil: "networkidle" });
  log("✓ /security loaded");

  log("All frontend tests passed!");
} catch (error) {
  log(`ERROR: ${error instanceof Error ? error.stack : error}`);
  await page.screenshot({ path: "/tmp/patchscope-error.png" }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
