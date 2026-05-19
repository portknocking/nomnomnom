export async function onRequestPost(context) {

  const ip =
    context.request.headers.get(
      "CF-Connecting-IP"
    ) || "unknown";

  const rateLimitKey =
    `orders:${ip}`;

  const kv =
    context.env.ORDER_RATE_LIMIT;

  if (!kv) {

    console.error(
      "KV binding missing"
    );

    return Response.json(
      {
        success: false,
        message:
          "Server configuration error"
      },
      {
        status: 500
      }
    );

  }

  try {

    /* =========================
       CONTENT TYPE
    ========================= */

    const contentType =
      context.request.headers.get(
        "content-type"
      ) || "";

    if (
      !contentType.includes(
        "application/json"
      )
    ) {

      return Response.json(
        {
          success: false,
          message:
            "Invalid content type"
        },
        {
          status: 400
        }
      );

    }

    /* =========================
       REQUEST BODY
    ========================= */

    const body =
      await context.request.json();

    const {
      customer,
      items = []
    } = body;

    if (
      !customer ||
      !Array.isArray(items) ||
      items.length === 0
    ) {

      return Response.json(
        {
          success: false,
          message:
            "Invalid request structure"
        },
        {
          status: 400
        }
      );

    }

    if (items.length > 25) {

      return Response.json(
        {
          success: false,
          message:
            "Too many items"
        },
        {
          status: 400
        }
      );

    }

    /* =========================
       CLEAN INPUTS
    ========================= */

    const name =
      String(customer.name || "")
        .trim();

    const phone =
      String(customer.phone || "")
        .replace(/\s+/g, "")
        .trim();

    const address =
      String(customer.address || "")
        .trim();

    const pincode =
      String(customer.pincode || "")
        .trim();

    const instructions =
      String(
        customer.instructions || ""
      ).trim();

    /* =========================
       INPUT VALIDATION
    ========================= */

    if (name.length < 2) {

      return Response.json(
        {
          success: false,
          message:
            "Invalid customer name"
        },
        {
          status: 400
        }
      );

    }

    const phoneRegex =
      /^(?:\+91|91)?[6-9]\d{9}$/;

    if (
      !phoneRegex.test(phone)
    ) {

      return Response.json(
        {
          success: false,
          message:
            "Invalid phone number"
        },
        {
          status: 400
        }
      );

    }

    if (
      address.length < 10 ||
      address.length > 300
    ) {

      return Response.json(
        {
          success: false,
          message:
            "Invalid address"
        },
        {
          status: 400
        }
      );

    }

    if (
      instructions.length > 500
    ) {

      return Response.json(
        {
          success: false,
          message:
            "Instructions too long"
        },
        {
          status: 400
        }
      );

    }

    const allowedPincodes = [
      "440001",
      "440010",
      "440015",
      "440022"
    ];

    if (
      !allowedPincodes.includes(
        pincode
      )
    ) {

      return Response.json(
        {
          success: false,
          message:
            "Delivery unavailable"
        },
        {
          status: 400
        }
      );

    }

    /* =========================
       LOAD TRUSTED MENU
    ========================= */

    const menuURL =
      new URL(
        "/data/menu.json",
        context.request.url
      );

    const menuResponse =
      await fetch(menuURL);

    if (!menuResponse.ok) {

      return Response.json(
        {
          success: false,
          message:
            "Failed to load menu"
        },
        {
          status: 500
        }
      );

    }

    const MENU =
      await menuResponse.json();

    /* =========================
       VALIDATE ITEMS
    ========================= */

    let subtotal = 0;

    const validatedItems = [];

    for (const item of items) {

      if (
        !item ||
        typeof item !== "object"
      ) {

        return Response.json(
          {
            success: false,
            message:
              "Malformed cart item"
          },
          {
            status: 400
          }
        );

      }

      const quantity =
        Number(item.quantity);

      if (
        Number.isNaN(quantity) ||
        quantity <= 0 ||
        quantity > 20
      ) {

        return Response.json(
          {
            success: false,
            message:
              "Invalid quantity"
          },
          {
            status: 400
          }
        );

      }

      const realProduct =
        MENU.find(
          product =>
            product.id === item.id
        );

      if (!realProduct) {

        return Response.json(
          {
            success: false,
            message:
              "Invalid product"
          },
          {
            status: 400
          }
        );

      }

      if (!realProduct.available) {

        return Response.json(
          {
            success: false,
            message:
              `${realProduct.name} unavailable`
          },
          {
            status: 400
          }
        );

      }

      const itemTotal =
        realProduct.price *
        quantity;

      subtotal += itemTotal;

      validatedItems.push({
        id:
          realProduct.id,

        name:
          realProduct.name,

        price:
          realProduct.price,

        quantity
      });

    }

    const deliveryFee = 120;

    const total =
      subtotal + deliveryFee;

    /* =========================
       INDIA TIME
    ========================= */

    // Formatter for the human-readable Telegram alert string (12-hour layout)
    const indiaFormatter =
      new Intl.DateTimeFormat(
        "en-IN",
        {
          timeZone:
            "Asia/Kolkata",

          hour12: true,

          year: "numeric",
          month: "2-digit",
          day: "2-digit",

          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",

          weekday: "long"
        }
      );

    // Dedicated formatter utilizing a 24-hour cycle for reliable logic tracking
    const logicFormatter =
      new Intl.DateTimeFormat(
        "en-IN",
        {
          timeZone:
            "Asia/Kolkata",

          hourCycle: "h23",

          weekday: "long",
          hour: "2-digit"
        }
      );

    const indiaParts =
      logicFormatter.formatToParts(
        new Date()
      );

    const getPart = type =>
      indiaParts.find(
        part => part.type === type
      )?.value || "";

    // This correctly parses a 24-hour integer value (0-23)
    const currentHour =
      Number(getPart("hour"));

    const currentDayName =
      getPart("weekday");

    const indiaTimeString =
      indiaFormatter.format(
        new Date()
      );

    /* =========================
       BUSINESS STATUS
    ========================= */

    const isWeekend =
      currentDayName === "Sunday";

    const openingHour = 10;
    const closingHour = 21;

    let businessStatus =
      "OPEN";

    if (isWeekend) {

      return Response.json(
        {
          success: false,
          message:
            "Bakery closed today"
        },
        {
          status: 403
        }
      );

    }

    if (
      currentHour < openingHour ||
      currentHour >= closingHour
    ) {

      businessStatus =
        "PREORDER";

    }

    /* =========================
       RATE LIMITING
    ========================= */

    const now =
      Date.now();

    const existingData =
      await kv.get(rateLimitKey);

    let orderTimestamps = [];

    if (existingData) {

      try {

        orderTimestamps =
          JSON.parse(existingData);

      } catch {

        orderTimestamps = [];

      }

    }

    orderTimestamps =
      orderTimestamps.filter(
        timestamp =>
          now - timestamp <
          60 * 60 * 1000
      );

    const recentOrder =
      orderTimestamps.find(
        timestamp =>
          now - timestamp <
          2 * 60 * 1000
      );

    if (recentOrder) {

      return Response.json(
        {
          success: false,
          message:
            "Please wait 2 minutes before ordering again"
        },
        {
          status: 429
        }
      );

    }

    if (
      orderTimestamps.length >= 5
    ) {

      return Response.json(
        {
          success: false,
          message:
            "Hourly order limit reached"
        },
        {
          status: 429
        }
      );

    }

    orderTimestamps.push(now);

    await kv.put(
      rateLimitKey,
      JSON.stringify(orderTimestamps),
      {
        expirationTtl:
          60 * 60
      }
    );

    /* =========================
       TELEGRAM MESSAGE
    ========================= */

    const orderLabel =
      businessStatus === "PREORDER"
        ? "📦 PRE-ORDER"
        : "🍰 NEW ORDER";

    let telegramMessage =
`${orderLabel}

👤 Customer:
${name}

📞 Phone:
${phone}

📍 Address:
${address}

📮 Pincode:
${pincode}

🕒 Time:
${indiaTimeString}

━━━━━━━━━━
ORDER ITEMS`;

    validatedItems.forEach(item => {

      telegramMessage += `

• ${item.name}
Qty: ${item.quantity}
Amount: ₹${item.price * item.quantity}`;

    });

    telegramMessage += `

━━━━━━━━━━

Subtotal: ₹${subtotal}

Delivery: ₹${deliveryFee}

Total: ₹${total}`;

    if (instructions) {

      telegramMessage += `

━━━━━━━━━━

📝 Instructions:
${instructions}`;

    }

    /* =========================
       TELEGRAM CONFIG
    ========================= */

    const telegramToken =
      context.env
        .TELEGRAM_BOT_TOKEN;

    const chatIdsRaw =
      context.env
        .TELEGRAM_CHAT_IDS;

    if (
      !telegramToken ||
      !chatIdsRaw
    ) {

      return Response.json(
        {
          success: false,
          message:
            "Missing server configuration"
        },
        {
          status: 500
        }
      );

    }

    const chatIds =
      chatIdsRaw.split(",");

    const telegramURL =
`https://api.telegram.org/bot${telegramToken}/sendMessage`;

    for (const chatId of chatIds) {

      await fetch(
        telegramURL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            chat_id:
              chatId.trim(),

            text:
              telegramMessage
          })

        }
      );

    }

    /* =========================
       SUCCESS
    ========================= */

    return Response.json({
      success: true,
      message:
        "Order placed successfully"
    });

  } catch (error) {

    console.error(
      "ORDER API ERROR:",
      error
    );

    return Response.json(
      {
        success: false,
        message:
          "Internal server error"
      },
      {
        status: 500
      }
    );

  }

}