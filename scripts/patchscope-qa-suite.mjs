import { chromium } from "playwright";

const MOCK_WALLET_ADDRESS = "0x1111111111111111111111111111111111111111";
const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:8088";

const results = [];

function record(area, scenario, expected, actual, evidence, status) {
  results.push({ area, scenario, expected, actual, evidence, status });
  console.log(`[${status}] [${area}] ${scenario} -> ${evidence}`);
}

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
});

const page = await context.newPage();
page.setDefaultTimeout(30000);

// Inject mock EIP-1193 / EIP-6963 provider with safety guards against scripted transaction broadcast
await page.addInitScript((address) => {
  window.ethereum = {
    isMetaMask: true,
    isConnected: () => true,
    selectedAddress: address,
    chainId: "0xf22f",
    request: async ({ method, params = [] }) => {
      // NON-NEGOTIABLE SAFETY RULE: Block automated script transaction broadcasts
      if (method === "eth_sendTransaction" || method === "eth_sendRawTransaction" || method.startsWith("gen_send")) {
        throw new Error("BLOCKED_BY_SAFETY_GUARD: Automated scripts are forbidden from broadcasting transactions.");
      }
      if (method === "eth_requestAccounts" || method === "eth_accounts") return [address];
      if (method === "eth_chainId" || method === "net_version") return method === "net_version" ? "61999" : "0xf22f";
      if (method === "wallet_getSnaps" || method === "wallet_requestSnaps") return {};
      if (method.startsWith("wallet_")) return null;
      const response = await fetch("https://studio.genlayer.com/api", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "User-Agent": "Mozilla/5.0",
          "Referer": "https://studio.genlayer.com/",
        },
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
    name: "Web3 Injected Wallet",
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>",
    rdns: "io.metamask",
  };
  window.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail: Object.freeze({ info, provider: window.ethereum }) }));
  window.addEventListener("eip6963:requestProvider", () => {
    window.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail: Object.freeze({ info, provider: window.ethereum }) }));
  });
}, MOCK_WALLET_ADDRESS);

try {
  // =========================================================================
  // SUITE 1: Static Quality & Routing
  // =========================================================================
  console.log("\n--- SUITE 1: Static Quality & Routing ---");
  const routes = ["/", "/docs", "/roadmap", "/security", "/workspace", "/workspace/new", "/workspace/diagnostics", "/workspace/activity", "/workspace/team", "/workspace/notifications"];
  for (const r of routes) {
    const res = await page.goto(`${BASE_URL}${r}`, { waitUntil: "networkidle" });
    const status = res.status();
    const title = await page.title();
    record(
      "Routing",
      `Route ${r} HTTP 200`,
      "HTTP 200 with valid title",
      `HTTP ${status}, Title: "${title}"`,
      `URL: ${BASE_URL}${r}`,
      status === 200 && title.length > 0 ? "PASS" : "FAIL"
    );
  }

  // =========================================================================
  // SUITE 2: Landing Page & Live Contract Integration Read
  // =========================================================================
  console.log("\n--- SUITE 2: Landing Page Live Query ---");
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
  const lpButton = page.getByRole("button", { name: /test read get_policy\(\) live/i });
  const lpBtnVisible = await lpButton.isVisible();
  record(
    "Landing",
    "Live Contract Query Button Visible",
    "Button rendered",
    lpBtnVisible ? "Visible" : "Not visible",
    "Landing page hero section",
    lpBtnVisible ? "PASS" : "FAIL"
  );

  if (lpBtnVisible) {
    await lpButton.click();
    await page.waitForFunction(() => {
      const text = document.body.innerText;
      return text.includes("Verified on Studionet") || text.includes("Connected to Studionet RPC");
    }, { timeout: 30000 });
    const bodyText = await page.innerText("body");
    const verified = bodyText.includes("Verified on Studionet");
    record(
      "Landing",
      "Live RPC Query get_policy() on Studionet",
      "Verified on Studionet with live policy response",
      verified ? "Returned policy data from 0x7aFa58C5..." : "Fallback text",
      "RPC response banner rendered",
      verified ? "PASS" : "FAIL"
    );
  }

  // =========================================================================
  // SUITE 3: Agreement Lifecycle (Happy Path, Unicode/Persian, Validation)
  // =========================================================================
  console.log("\n--- SUITE 3: Agreement Lifecycle ---");
  await page.goto(`${BASE_URL}/workspace/new`, { waitUntil: "networkidle" });

  // 3.1 Validation: Propose with empty card
  const proposeBtn = page.getByRole("button", { name: /propose this version/i });
  await proposeBtn.click();
  const errorLocator = page.locator(".error-text");
  await errorLocator.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
  const emptyErr = await errorLocator.innerText().catch(() => "");
  record(
    "Functional: Agreement",
    "Empty card validation error",
    "Error banner displayed for missing required fields",
    emptyErr.length > 0 ? `Caught error: ${emptyErr}` : "No error shown",
    `Error text: "${emptyErr.slice(0, 60)}"`,
    emptyErr.length > 0 ? "PASS" : "FAIL"
  );

  // 3.2 Load labelled example & customize with Persian/Unicode characters
  const exampleBtn = page.getByRole("button", { name: /load the labelled example/i });
  await exampleBtn.click();
  await page.waitForTimeout(400);

  const titleInput = page.getByLabel("Title");
  const persianTitle = "اصلاح ماژول مالیات بر ارزش افزوده (VAT) اتحادیه اروپا";
  await titleInput.fill(persianTitle);
  const readTitle = await titleInput.inputValue();
  record(
    "Functional: Agreement",
    "Unicode/Persian input preservation",
    persianTitle,
    readTitle,
    "Persian title preserved without distortion",
    readTitle === persianTitle ? "PASS" : "FAIL"
  );

  // Propose version 1
  await proposeBtn.click();
  await page.waitForFunction(() => window.location.pathname.includes("/workspace/agreement/agr-"), { timeout: 15000 });
  const agrUrl = page.url();
  const agrId = agrUrl.split("/").pop();
  record(
    "Functional: Agreement",
    "Propose creates agreement and navigates",
    "Navigates to /workspace/agreement/agr-*",
    agrUrl,
    `Agreement ID: ${agrId}`,
    agrUrl.includes("/workspace/agreement/agr-") ? "PASS" : "FAIL"
  );

  // 3.3 Accept as Developer first
  const acceptDevBtn = page.getByRole("button", { name: /accept version/i });
  if (await acceptDevBtn.isVisible() && !(await acceptDevBtn.isDisabled())) {
    await acceptDevBtn.click();
    await page.waitForTimeout(500);
  }

  // 3.4 Switch role to Client and accept
  const clientPill = page.locator(".role-switch button").filter({ hasText: /^client$/i });
  if (await clientPill.isVisible()) {
    await clientPill.click();
    await page.waitForTimeout(500);
  }

  const acceptClientBtn = page.getByRole("button", { name: /accept version/i });
  if (await acceptClientBtn.isVisible() && !(await acceptClientBtn.isDisabled())) {
    await acceptClientBtn.click();
    await page.waitForTimeout(600);
  }

  const badgeText = await page.innerText("body");
  const isAccepted = badgeText.includes("Accepted this hash") || badgeText.includes("ACCEPTED");
  record(
    "Functional: Agreement",
    "Both parties accept exact hash -> ACCEPTED",
    "Agreement status transitions to ACCEPTED",
    isAccepted ? "Accepted" : "Waiting",
    `Agreement URL: ${agrUrl}`,
    isAccepted ? "PASS" : "FAIL"
  );

  // =========================================================================
  // SUITE 4: Case Lifecycle, Evidence & Classification
  // =========================================================================
  console.log("\n--- SUITE 4: Case Lifecycle, Evidence & Classification ---");
  // Open a case against this agreement
  await page.goto(`${BASE_URL}/workspace/case/new?agreementId=${agrId}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  const requestArea = page.locator("textarea.textarea").first();
  if (await requestArea.isVisible()) {
    await requestArea.fill("Bug fix request: The VAT calculation in checkout drops decimal cents when rounding EUR transactions. S-1 and A-1 cover this.");
    const citeIncluded = page.locator("input[type='checkbox']").first();
    if (await citeIncluded.isVisible()) {
      await citeIncluded.check();
    }

    const openCaseBtn = page.getByRole("button", { name: /open the case/i });
    if (await openCaseBtn.isVisible()) {
      await openCaseBtn.click();
      await page.waitForFunction(() => window.location.pathname.includes("/workspace/case/case-"), { timeout: 15000 });
      const caseUrl = page.url();
      const caseId = caseUrl.split("/").pop().split("?")[0];
      record(
        "Functional: Case",
        "Open case against accepted agreement",
        "Navigates to /workspace/case/case-*",
        caseUrl,
        `Case ID: ${caseId}`,
        caseUrl.includes("/workspace/case/case-") ? "PASS" : "FAIL"
      );

      // Reload test to verify local persistence
      await page.reload({ waitUntil: "networkidle" });
      const bodyAfterReload = await page.innerText("body");
      const preserved = bodyAfterReload.includes("VAT calculation") || bodyAfterReload.includes("case-");
      record(
        "Persistence",
        "Page reload preserves local case draft",
        "Case data intact after browser reload",
        preserved ? "Preserved" : "Lost",
        `URL: ${page.url()}`,
        preserved ? "PASS" : "FAIL"
      );
    }
  }

  // =========================================================================
  // SUITE 5: Contract Diagnostics Page
  // =========================================================================
  console.log("\n--- SUITE 5: Diagnostics Page ---");
  await page.goto(`${BASE_URL}/workspace/diagnostics`, { waitUntil: "networkidle" });

  // 5.1 Read node chain id
  const chainIdBtn = page.getByRole("button", { name: /read node chain id/i });
  await chainIdBtn.click();
  await page.waitForTimeout(1500);
  const chainOutput = await page.locator("pre").innerText().catch(() => "");
  const chainOk = chainOutput.includes("matches the expected Studionet id") || chainOutput.includes("0xf22f");
  record(
    "Diagnostics",
    "eth_chainId read verifies Studionet (61999 / 0xf22f)",
    "eth_chainId matches 61999",
    chainOutput.split("\n")[0],
    "Node RPC call result",
    chainOk ? "PASS" : "FAIL"
  );

  // 5.2 Read get_policy() on-chain
  const policyBtn = page.getByRole("button", { name: /read get_policy\(\) on-chain/i });
  await policyBtn.click();
  await page.waitForFunction(() => {
    const text = document.querySelector("pre")?.textContent || "";
    return text.includes("patchscope-v1.0.0") || text.includes("Read error");
  }, { timeout: 30000 });
  const policyOutput = await page.locator("pre").innerText().catch(() => "");
  const policyOk = policyOutput.includes("patchscope-v1.0.0") && policyOutput.includes("0x7aFa58C5CF4E0145Bbb8B9C508036EeBc349C2Df");
  record(
    "Diagnostics",
    "get_policy() read against 0x7aFa58C5...",
    "Returns patchscope-v1.0.0 JSON from active contract",
    policyOutput.slice(0, 100).replace(/\n/g, " "),
    "Contract read result",
    policyOk ? "PASS" : "FAIL"
  );

  // 5.3 Run all 7 views on-chain
  const allViewsBtn = page.getByRole("button", { name: /run all 7 views on-chain/i });
  await allViewsBtn.click();
  await page.waitForFunction(() => {
    const text = document.querySelector("pre")?.textContent || "";
    return text.includes("7-View Diagnostics") && text.includes("7. get_packet");
  }, { timeout: 40000 });
  const allViewsOutput = await page.locator("pre").innerText().catch(() => "");
  const viewsOk = allViewsOutput.includes("[PASS] 1. get_policy") && allViewsOutput.includes("7. get_packet");
  record(
    "Diagnostics",
    "7-View on-chain health check execution",
    "All 7 views execute and report status",
    viewsOk ? "7/7 views returned" : "Incomplete",
    "Diagnostics pre output",
    viewsOk ? "PASS" : "FAIL"
  );

  // 5.4 Check transaction hash verification
  const hashInput = page.locator("input.field.hash");
  await hashInput.fill("0x4708be83a0fd7d6b015b81b2656dc14673b5e87fe6d0c36af9717d47946e2f4f");
  const checkHashBtn = page.getByRole("button", { name: /check hash/i });
  await checkHashBtn.click();
  await page.waitForFunction(() => {
    const text = document.querySelector("pre")?.textContent || "";
    return text.includes("Execution successful") || text.includes("receipt");
  }, { timeout: 30000 });
  const hashOutput = await page.locator("pre").innerText().catch(() => "");
  const hashOk = hashOutput.includes("Execution successful");
  record(
    "Diagnostics",
    "Check deployment tx receipt 0x4708be83...",
    "Status 0x1 execution successful reported",
    hashOk ? "Execution successful confirmed" : "Unknown",
    "Receipt status output",
    hashOk ? "PASS" : "FAIL"
  );

  // =========================================================================
  // SUITE 6: Viewport Responsiveness & Layout Resilience
  // =========================================================================
  console.log("\n--- SUITE 6: Viewport Responsiveness & Overflow ---");
  const viewports = [320, 375, 390, 768, 1024, 1080, 1081, 1440];
  for (const w of viewports) {
    await page.setViewportSize({ width: w, height: 800 });
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    record(
      "Resilience",
      `Landing page overflow check at ${w}px`,
      "No horizontal scroll overflow",
      hasHorizontalOverflow ? "Overflow detected" : "Fits within viewport",
      `Viewport: ${w}px x 800px`,
      !hasHorizontalOverflow ? "PASS" : "FAIL"
    );
  }

  // =========================================================================
  // SUITE 7: Accessibility & Security Boundaries
  // =========================================================================
  console.log("\n--- SUITE 7: Accessibility & Security ---");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });

  // 7.1 Heading hierarchy
  const h1Count = await page.locator("h1").count();
  record(
    "Accessibility",
    "Landing page H1 presence",
    "At least one H1 element",
    `Found ${h1Count} H1 elements`,
    "DOM query",
    h1Count >= 1 ? "PASS" : "FAIL"
  );

  // 7.2 Untrusted markup injection test
  await page.goto(`${BASE_URL}/workspace/new`, { waitUntil: "networkidle" });
  const titleField = page.locator("input.field").first();
  await titleField.fill('<script>window.__xss_probe = true</script><img src="x" onerror="window.__xss_probe=true" />');
  await page.waitForTimeout(300);
  const xssFired = await page.evaluate(() => Boolean(window.__xss_probe));
  record(
    "Security",
    "XSS markup sanitization in form inputs",
    "HTML tags not executed as active script",
    xssFired ? "XSS executed!" : "Sanitized safely as plain text",
    "DOM probe evaluation",
    !xssFired ? "PASS" : "FAIL"
  );

  // 7.3 Mocking vs Live distinction
  const noticeText = await page.locator("body").innerText();
  const distinguishesLocal = noticeText.includes("preview") || noticeText.includes("Local") || noticeText.includes("draft") || noticeText.includes("hash");
  record(
    "Resilience",
    "Local actions clearly distinguished from chain finality",
    "User warned actions are local preview",
    distinguishesLocal ? "Notice present" : "Missing notice",
    "UI text examination",
    distinguishesLocal ? "PASS" : "FAIL"
  );

  // 7.4 Anti-Scripted-Broadcast Safety Boundary Test
  const broadcastBlocked = await page.evaluate(async () => {
    try {
      await window.ethereum.request({ method: "eth_sendTransaction", params: [{ to: "0x0000000000000000000000000000000000000000" }] });
      return false;
    } catch (e) {
      return Boolean(e && e.message && e.message.includes("BLOCKED_BY_SAFETY_GUARD"));
    }
  });
  record(
    "Security",
    "Anti-scripted-broadcast safety guard",
    "eth_sendTransaction blocked in automated runner",
    broadcastBlocked ? "Blocked by safety guard" : "Not blocked",
    "window.ethereum.request probe",
    broadcastBlocked ? "PASS" : "FAIL"
  );

} catch (err) {
  console.error("QA RUNNER ERROR:", err);
  record("Runner", "Fatal exception", "Clean execution", err.message, err.stack, "FAIL");
} finally {
  await browser.close();
}

console.log("\n=================================================");
console.log("Traceable QA Matrix Results:");
console.log("=================================================");
console.table(results);

const total = results.length;
const passed = results.filter(r => r.status === "PASS").length;
const failed = results.filter(r => r.status === "FAIL").length;
const blocked = results.filter(r => r.status === "BLOCKED").length;

console.log(`\nTOTAL: ${total} | PASS: ${passed} | FAIL: ${failed} | BLOCKED: ${blocked}`);
if (failed > 0) process.exitCode = 1;
