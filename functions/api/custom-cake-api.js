export async function onRequestPost(context) {

  const ip =
    context.request.headers.get(
      "CF-Connecting-IP"
    ) || "unknown";

  const rateLimitKey =
    `custom-cake:${ip}`;

  const kv =
    context.env.ORDER_RATE_LIMIT;

  try {

    /* =========================
       RATE LIMIT CHECK
    ========================= */

    const now =
      Date.now();

    const existingData =
      await kv.get(rateLimitKey);

    let requestTimestamps = [];

    if (existingData) {

      try {

        requestTimestamps =
          JSON.parse(existingData);

      } catch {

        requestTimestamps = [];

      }

    }

    /* =========================
       CLEAN OLD ENTRIES
    ========================= */

    requestTimestamps =
      requestTimestamps.filter(
        timestamp =>
          now - timestamp <
          60 * 60 * 1000
      );

    /* =========================
       1 REQUEST / 3 MINUTES
    ========================= */

    const recentRequest =
      requestTimestamps.find(
        timestamp =>
          now - timestamp <
          3 * 60 * 1000
      );

    if (recentRequest) {

      return Response.json(
        {
          success: false,
          message:
            "Please wait 3 minutes before submitting another custom cake request."
        },
        {
          status: 429
        }
      );

    }

    /* =========================
       MAX 5 REQUESTS / HOUR
    ========================= */

    if (
      requestTimestamps.length >= 5
    ) {

      return Response.json(
        {
          success: false,
          message:
            "Hourly request limit reached."
        },
        {
          status: 429
        }
      );

    }

    /* =========================
       SAVE NEW TIMESTAMP
    ========================= */

    requestTimestamps.push(now);

    await kv.put(
      rateLimitKey,
      JSON.stringify(requestTimestamps),
      {
        expirationTtl:
          60 * 60
      }
    );

    /* =========================
       PARSE FORM DATA
    ========================= */

    const formData =
      await context.request.formData();

    const name =
      String(
        formData.get("name") || ""
      ).trim();

    const phone =
      String(
        formData.get("phone") || ""
      )
      .replace(/\s+/g, "")
      .trim();

    const details =
      String(
        formData.get("details") || ""
      ).trim();

    const image =
      formData.get("image");

    /* =========================
       VALIDATION
    ========================= */

    if (name.length < 2) {

      return Response.json(
        {
          success: false,
          message:
            "Invalid name input"
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
            "Invalid phone number format"
        },
        {
          status: 400
        }
      );

    }

    if (details.length < 10) {

      return Response.json(
        {
          success: false,
          message:
            "Please provide more cake details"
        },
        {
          status: 400
        }
      );

    }

    /* =========================
       IMAGE VALIDATION
    ========================= */

    if (
      !image ||
      typeof image === "string" ||
      image.size === 0
    ) {

      return Response.json(
        {
          success: false,
          message:
            "Cake reference image is required"
        },
        {
          status: 400
        }
      );

    }

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp"
    ];

    if (
      !allowedTypes.includes(
        image.type
      )
    ) {

      return Response.json(
        {
          success: false,
          message:
            "Only JPG, PNG, and WEBP images are allowed"
        },
        {
          status: 400
        }
      );

    }

    /* =========================
       MAX FILE SIZE
    ========================= */

    const maxSize =
      5 * 1024 * 1024;

    if (
      image.size > maxSize
    ) {

      return Response.json(
        {
          success: false,
          message:
            "Image too large. Max size is 5MB."
        },
        {
          status: 400
        }
      );

    }

    /* =========================
       TELEGRAM CONFIG
    ========================= */

    const telegramToken =
      context.env.TELEGRAM_BOT_TOKEN;

    const chatIdsRaw =
      context.env.TELEGRAM_CHAT_IDS;

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
      `https://api.telegram.org/bot${telegramToken}/sendPhoto`;

    /* =========================
       TELEGRAM MESSAGE
    ========================= */

    const captionText =
`🎂 CUSTOM CAKE REQUEST

👤 Customer:
${name}

📞 Contact:
${phone}

📝 Cake Details:
${details}

📦 Image Type:
${image.type}

📏 File Size:
${(
  image.size / 1024
).toFixed(1)} KB`;

    /* =========================
       SEND TO TELEGRAM
    ========================= */

    for (const chatId of chatIds) {

      try {

        const telegramForm =
          new FormData();

        telegramForm.append(
          "chat_id",
          chatId.trim()
        );

        telegramForm.append(
          "photo",
          image
        );

        telegramForm.append(
          "caption",
          captionText
        );

        const telegramResponse =
          await fetch(
            telegramURL,
            {
              method: "POST",
              body: telegramForm
            }
          );

        if (
          !telegramResponse.ok
        ) {

          console.error(
            "Telegram upload failed"
          );

        }

      } catch (telegramError) {

        console.error(
          `Failed sending cake request to ${chatId}`,
          telegramError
        );

      }

    }

    /* =========================
       SUCCESS
    ========================= */

    return Response.json({
      success: true,
      message:
        "Custom cake request submitted successfully."
    });

  } catch (error) {

    console.error(
      "CUSTOM CAKE API ERROR:",
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