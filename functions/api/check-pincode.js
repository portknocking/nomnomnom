export async function onRequestPost(context) {

  try {

    const body =
      await context.request.json();

    const pincode =
      String(
        body.pincode || ""
      ).trim();

    /* =========================
       FORMAT VALIDATION
    ========================= */

    if (
      !/^\d{6}$/.test(pincode)
    ) {

      return Response.json(
        {
          success: false,
          available: false,
          message:
            "Invalid pincode format"
        },
        {
          status: 400
        }
      );

    }

    /* =========================
       DELIVERY ZONES
    ========================= */

    const allowedPincodes = [
      "440001",
      "440010",
      "440015",
      "440022"
    ];

    const available =
      allowedPincodes.includes(
        pincode
      );

    /* =========================
       RESPONSE
    ========================= */

    return Response.json({
      success: true,
      available,

      message: available
        ? "Delivery available"
        : "Delivery unavailable"
    });

  } catch (error) {

    return Response.json(
      {
        success: false,
        available: false,
        message:
          "Server error"
      },
      {
        status: 500
      }
    );

  }

}