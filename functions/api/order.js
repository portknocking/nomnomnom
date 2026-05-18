export async function onRequestPost(context) {

  try {

    const body =
      await context.request.json();

    const {
      customer,
      items
    } = body;

    /* =========================
       BASIC VALIDATION
    ========================= */

    if (
      !customer ||
      !items ||
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

    if (instructions.length > 500) {

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

    /* =========================
       NAME VALIDATION
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

    /* =========================
       PHONE VALIDATION
    ========================= */

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

    /* =========================
       ADDRESS VALIDATION
    ========================= */

    if (address.length < 10) {

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

    /* =========================
       PINCODE VALIDATION
    ========================= */

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
       RECALCULATE TOTAL
    ========================= */

    let subtotal = 0;

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

      const price =
        Number(item.price);

      if (
        !item.name ||
        Number.isNaN(quantity) ||
        Number.isNaN(price) ||
        quantity <= 0 ||
        price <= 0
      ) {

        return Response.json(
          {
            success: false,
            message:
              "Invalid cart data"
          },
          {
            status: 400
          }
        );

      }

      subtotal +=
        price * quantity;

    }

    const deliveryFee = 120;

    const total =
      subtotal + deliveryFee;


/* =========================
   BUSINESS HOURS
========================= */

const now =
  new Date();

const currentHour =
  now.getHours();

const currentDay =
  now.getDay();

/*
  0 = Sunday
*/

const isWeekend =
  currentDay === 0;

const openingHour = 10;
const closingHour = 21;

let businessStatus =
  "OPEN";

/* =========================
   CLOSED DAY
========================= */

if (isWeekend) {

  return Response.json(
    {
      success: false,
      message:
        "Bakery is closed today"
    },
    {
      status: 403
    }
  );

}

/* =========================
   PRE-ORDER HOURS
========================= */

if (
  currentHour < openingHour ||
  currentHour >= closingHour
) {

  businessStatus =
    "PREORDER";

}

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

━━━━━━━━━━
ORDER ITEMS`;


    items.forEach(item => {

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
       ENV VARIABLES
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
      chatIdsRaw
        .split(",");

    /* =========================
       TELEGRAM API
    ========================= */

    const telegramURL =
`https://api.telegram.org/bot${telegramToken}/sendMessage`;

    for (const chatId of chatIds) {

      const response =
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

      if (!response.ok) {

        console.error(
          "Telegram send failed"
        );

      }

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

    console.error(error);

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