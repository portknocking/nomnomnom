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
      !Array.isArray(items)
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
       NAME
    ========================= */

    if (
      !customer.name ||
      customer.name.length < 2
    ) {

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
      !phoneRegex.test(
        customer.phone
      )
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
        customer.pincode
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
        !item.price ||
        !item.quantity
      ) {

        return Response.json(
          {
            success: false,
            message:
              "Malformed cart"
          },
          {
            status: 400
          }
        );

      }

      subtotal +=
        item.price *
        item.quantity;

    }

    const deliveryFee = 120;

    const total =
      subtotal + deliveryFee;

    /* =========================
       TELEGRAM MESSAGE
    ========================= */

    let message =
`🍰 NEW ORDER

👤 ${customer.name}

📞 ${customer.phone}

📍 ${customer.address}

━━━━━━━━━━`;

    items.forEach(item => {

      message += `

• ${item.name}
x${item.quantity}
₹${item.price * item.quantity}`;

    });

    message += `

━━━━━━━━━━

Subtotal: ₹${subtotal}

Delivery: ₹${deliveryFee}

Total: ₹${total}`;

    /* =========================
       TELEGRAM API
    ========================= */

    const telegramToken =
      context.env
        .TELEGRAM_BOT_TOKEN;

    const chatId =
      context.env
        .TELEGRAM_CHAT_ID;

    const telegramURL =
`https://api.telegram.org/bot${telegramToken}/sendMessage`;

    await fetch(
      telegramURL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          chat_id: chatId,
          text: message
        })

      }
    );

    /* =========================
       SUCCESS
    ========================= */

    return Response.json({
      success: true,
      message:
        "Order placed successfully"
    });

  } catch (error) {

    return Response.json(
      {
        success: false,
        message:
          "Server error"
      },
      {
        status: 500
      }
    );

  }

}