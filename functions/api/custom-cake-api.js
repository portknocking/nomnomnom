export async function onRequestPost(context) {
  try {
    const formData = await context.request.formData();

    const name = String(formData.get("name") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const details = String(formData.get("details") || "").trim();
    const image = formData.get("image");

    /* =========================
       VALIDATION
    ========================= */
    if (name.length < 2) {
      return Response.json(
        { success: false, message: "Invalid name input" },
        { status: 400 }
      );
    }

    const phoneRegex = /^(?:\+91|91)?[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return Response.json(
        { success: false, message: "Invalid phone number format" },
        { status: 400 }
      );
    }

    if (details.length < 10) {
      return Response.json(
        { success: false, message: "Please provide a more descriptive specification (min 10 chars)" },
        { status: 400 }
      );
    }

    // Ensure image file block exists and holds content
    if (!image || typeof image === "string" || image.size === 0) {
      return Response.json(
        { success: false, message: "Inspiration image upload is required" },
        { status: 400 }
      );
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(image.type)) {
      return Response.json(
        { success: false, message: "Invalid image type. Only JPG, PNG, and WEBP are supported." },
        { status: 400 }
      );
    }

    /* =========================
       TELEGRAM PIPELINE
    ========================= */
    const telegramToken = context.env.TELEGRAM_BOT_TOKEN;
    const chatIdsRaw = context.env.TELEGRAM_CHAT_IDS;

    if (!telegramToken || !chatIdsRaw) {
      return Response.json(
        { success: false, message: "Missing server communication configuration" },
        { status: 500 }
      );
    }

    const chatIds = chatIdsRaw.split(",");
    const telegramURL = `https://api.telegram.org/bot${telegramToken}/sendPhoto`;

    const captionText = 
`🎂 CUSTOM CAKE REQUEST

👤 Customer: ${name}
📞 Contact: ${phone}

📝 Details:
${details}`;

    // Loop through administrative chat contexts
    for (const chatId of chatIds) {
      try {
        const telegramForm = new FormData();
        telegramForm.append("chat_id", chatId.trim());
        telegramForm.append("photo", image);
        telegramForm.append("caption", captionText);

        await fetch(telegramURL, {
          method: "POST",
          body: telegramForm
        });
      } catch (telegramError) {
        // Logging the notification failure without failing the entire request loop
        console.error(`Failed pushing custom cake log to chat ID: ${chatId}`, telegramError);
      }
    }

    /* =========================
       RESPONSE SUCCESS
    ========================= */
    return Response.json({
      success: true,
      message: "Custom cake inquiry submitted successfully."
    });

  } catch (error) {
    console.error("CUSTOM CAKE SYSTEM API ERROR:", error);
    return Response.json(
      { success: false, message: "Internal application processing error" },
      { status: 500 }
    );
  }
}