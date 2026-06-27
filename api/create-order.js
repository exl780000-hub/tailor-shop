import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const ORDER_DB = "98f182579c2841a5a67631bebb23e769";
const CUSTOMER_DB = "0bb6a9cb5c8244abb4af6e461695f002";
const MEASUREMENT_DB = "1bfae58f449d47fba8083f316e266ebf";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { customer, cards, measurements, traits, measNote, deposit, totalActual, totalSuggested } = req.body;

    // 1. 建立或尋找客戶
    let customerId = null;
    const searchRes = await notion.databases.query({
      database_id: CUSTOMER_DB,
      filter: { property: "電話", phone_number: { equals: customer.phone } }
    });

    if (searchRes.results.length > 0) {
      customerId = searchRes.results[0].id;
    } else {
      const newCustomer = await notion.pages.create({
        parent: { database_id: CUSTOMER_DB },
        properties: {
          "客戶姓名": { title: [{ text: { content: customer.name } }] },
          "電話": { phone_number: customer.phone },
          "性別": customer.gender ? { select: { name: customer.gender } } : undefined,
          "來源": customer.source ? { select: { name: customer.source } } : undefined,
        }
      });
      customerId = newCustomer.id;
    }

    // 2. 整理品項
    const itemTypeMap = {
      "二件式": "二件式", "三件式": "三件式",
      "外套": "外套單件", "褲子": "褲子單件",
      "背心": "背心", "襯衫": "襯衫"
    };
    const itemTypes = [...new Set(cards.map(c => itemTypeMap[c.type] || c.type))];

    // 3. 工資計算
    const totalJacket = cards.reduce((s, c) => {
      if (!["二件式", "三件式", "外套"].includes(c.type)) return s;
      const ps = (c.partStyles && c.partStyles["外套"]) || {};
      let w = 7000;
      if ((ps["排扣"] || []).includes("雙排釦")) w += 600;
      if ((ps["領型"] || []).includes("劍領")) w += 300;
      if ((ps["眼型"] || []).includes("米蘭眼")) w += 100;
      return s + w;
    }, 0);

    const totalTrouser = cards.reduce((s, c) =>
      ["二件式", "三件式", "褲子"].includes(c.type) ? s + 1900 : s, 0);

    const totalManager = cards.reduce((s, c) => {
      const m = { "二件式": 2000, "三件式": 2400, "外套": 1600, "褲子": 400, "背心": 0, "襯衫": 200 };
      return s + (m[c.type] || 0);
    }, 0);

    const today = new Date().toISOString().slice(0, 10);
    const orderName = customer.name + " - " + itemTypes.join("、") + " - " + today;

    // 4. 建立訂單
    const orderPage = await notion.pages.create({
      parent: { database_id: ORDER_DB },
      properties: {
        "訂單名稱": { title: [{ text: { content: orderName } }] },
        "客戶": { relation: [{ id: customerId }] },
        "品項": { multi_select: itemTypes.map(t => ({ name: t })) },
        "訂單狀態": { select: { name: "✅ 訂單成立" } },
        "流程": { select: { name: "📋 訂單建立" } },
        "訂單日期": { date: { start: today } },
        "實際售價": { number: totalActual },
        "建議售價": { number: totalSuggested },
        "訂金": { number: Number(deposit) || 0 },
        "尾款": { number: totalActual - (Number(deposit) || 0) },
        "外套工資": { number: totalJacket },
        "褲子工資": { number: totalTrouser },
        "經理費": { number: totalManager },
        "師傅工資合計": { number: totalJacket + totalTrouser + totalManager },
        "卡片數量": { number: cards.length },
        "樣式明細": { rich_text: [{ text: { content: JSON.stringify(cards).slice(0, 2000) } }] },
      }
    });

    // 5. 建立量身記錄（如果有填）
    const hasMeasurements = measurements && Object.values(measurements).some(v => v !== "");
    if (hasMeasurements) {
      const measProps = { "量身名稱": { title: [{ text: { content: customer.name + " - " + today } }] } };

      if (customerId) measProps["客戶"] = { relation: [{ id: customerId }] };
      measProps["訂單"] = { relation: [{ id: orderPage.id }] };
      measProps["量身日期"] = { date: { start: today } };

      const numFields = ["領圍","胸圍","腰圍","臀圍","肩寬","半肩寬","袖長","前胸寬","後背寬","前身長","後身長","後領寬","褲腰","褲長","前檔長","下檔長","大腿圍","小腿圍","腳踝圍","背心長","上臂圍","下臂圍"];
      numFields.forEach(f => {
        if (measurements[f]) measProps[f] = { number: parseFloat(measurements[f]) };
      });

      if (measNote) measProps["體型備註"] = { rich_text: [{ text: { content: measNote } }] };

      await notion.pages.create({
        parent: { database_id: MEASUREMENT_DB },
        properties: measProps
      });
    }

    return res.status(200).json({
      success: true,
      orderId: orderPage.id,
      orderUrl: orderPage.url,
      customerId,
      message: "訂單建立成功"
    });

  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "未知錯誤"
    });
  }
}
