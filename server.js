// 綠界 ECPay 測試環境付款 Demo
// 跑法:
// 1. 設定環境變數後啟動：
//    Mac/Linux: MERCHANT_ID=xxx HASH_KEY=xxx HASH_IV=xxx node server.js
//    Windows (cmd): set MERCHANT_ID=xxx && set HASH_KEY=xxx && set HASH_IV=xxx && node server.js
//    Windows (PowerShell): $env:MERCHANT_ID="xxx"; $env:HASH_KEY="xxx"; $env:HASH_IV="xxx"; node server.js
// 2. 瀏覽器開 http://localhost:3000 → 按「付款」
require("dotenv").config(); // 這一行一定要在最上面

const http = require("http");
const crypto = require("crypto");

// 從環境變數讀取敏感資訊
const MERCHANT_ID = process.env.MERCHANT_ID;
const HASH_KEY = process.env.HASH_KEY;
const HASH_IV = process.env.HASH_IV;
const ECPAY_URL = "https://ecpay.com.tw";

// 檢查必要金鑰是否存在
if (!MERCHANT_ID || !HASH_KEY || !HASH_IV) {
  console.error("❌ 錯誤：請先設定 MERCHANT_ID, HASH_KEY, 與 HASH_IV 環境變數！");
  process.exit(1);
}

// 綠界規定 URL encode 規則 (.NET 樣式)
function urlEncodeDotNet(str) {
  return encodeURIComponent(str)
    .toLowerCase()
    .replace(/%20/g, "+")
    .replace(/%2d/g, "-")
    .replace(/%5f/g, "_")
    .replace(/%2e/g, ".")
    .replace(/%21/g, "!")
    .replace(/%2a/g, "*")
    .replace(/%28/g, "(")
    .replace(/%29/g, ")")
    .replace(/%7e/g, "~")
    .replace(/'/g, "%27");
}

// 計算檢查碼 CheckMacValue
function checkMacValue(params) {
  const sorted = Object.keys(params).sort();
  const query = sorted.map((k) => `${k}=${params[k]}`).join("&");
  const raw = `HashKey=${HASH_KEY}&${query}&HashIV=${HASH_IV}`;
  const encoded = urlEncodeDotNet(raw);
  return crypto.createHash("sha256").update(encoded).digest("hex").toUpperCase();
}

function tradeDate() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function buildPayment() {
  const params = {
    MerchantID: MERCHANT_ID,
    MerchantTradeNo: "CAMP" + Date.now(),
    MerchantTradeDate: tradeDate(),
    PaymentType: "aio",
    TotalAmount: "100",
    TradeDesc: "vibe coding camp test",
    ItemName: "Vibe Coding 專案 x 1",
    ReturnURL: "https://example.com",
    ChoosePayment: "Credit",
    EncryptType: "1",
  };

  params.CheckMacValue = checkMacValue(params);
  return params;
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/pay") {
    const params = buildPayment();
    const inputs = Object.entries(params)
      .map(([k, v]) => `<input type="hidden" name="${k}" value="${v}">`)
      .join("\n");

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<!DOCTYPE html>
<html lang="zh-TW">
<body>
  <p>導向綠界付款頁中…</p>
  <form id="ecpay" method="POST" action="${ECPAY_URL}">
    ${inputs}
  </form>
  <script>document.getElementById("ecpay").submit();</script>
</body>
</html>`);
    return;
  }

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <title>我的作品集 - 付款</title>
  <style>
    body { font-family: "Microsoft JhengHei", sans-serif; max-width: 420px; margin: 80px auto; text-align: center; }
    h1 { color: #4f46e5; }
    .price { font-size: 28px; margin: 24px 0; }
    button { font-size: 20px; padding: 10px 32px; background: #4f46e5; color: #fff; border: none; border-radius: 6px; cursor: pointer; }
  </style>
</head>
<body>
  <h1>Vibe Coding 專案</h1>
  <div class="price">NT$ 100</div>
  <form method="POST" action="/pay">
    <button type="submit">付款</button>
  </form>
</body>
</html>`);
});

server.listen(3000, () => {
  console.log("開好了: http://localhost:3000");
});
