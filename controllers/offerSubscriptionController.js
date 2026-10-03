import connectDB, { sql } from "../lib/db";


// =====================================================
// CREATE OFFER SUBSCRIPTION
// =====================================================
//
// Patient subscribes to an offer.
//
// The values GivenQuantity and ForPrice are copied
// from the offer at the time of subscription.
//
// This is intentional because the original offer may
// be changed later.
//
// =====================================================

const createOfferSubscription = async (data) => {
  const pool = await connectDB();
  const { PatientID, OfferID, SubscriptionDate, Notes } = data;
  const parsedPatientID = Number(PatientID);
  const parsedOfferID = Number(OfferID);

  if (!Number.isInteger(parsedPatientID) || parsedPatientID <= 0) throw new Error("Invalid PatientID");
  if (!Number.isInteger(parsedOfferID) || parsedOfferID <= 0) throw new Error("Invalid OfferID");

  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

    const offerResult = await new sql.Request(transaction)
      .input("OfferID", sql.Int, parsedOfferID)
      .query(`
        SELECT OfferID, GivenQuantity, ForPrice, IsActive
        FROM dbo.Offers WITH (UPDLOCK, HOLDLOCK)
        WHERE OfferID = @OfferID
      `);
    const offer = offerResult.recordset[0];
    if (!offer) throw new Error("Offer not found");
    if (!offer.IsActive) throw new Error("This offer is not active");

    const patientResult = await new sql.Request(transaction)
      .input("PatientID", sql.Int, parsedPatientID)
      .query(`
        SELECT PatientID
        FROM dbo.Patients WITH (UPDLOCK, HOLDLOCK)
        WHERE PatientID = @PatientID
      `);
    if (!patientResult.recordset[0]) throw new Error("Patient not found");

    const duplicateResult = await new sql.Request(transaction)
      .input("PatientID", sql.Int, parsedPatientID)
      .input("OfferID", sql.Int, parsedOfferID)
      .query(`
        SELECT TOP 1 OfferSubscriptionID
        FROM dbo.OfferSubscriptions WITH (UPDLOCK, HOLDLOCK)
        WHERE PatientID = @PatientID
          AND OfferID = @OfferID
          AND Status = N'Active'
      `);
    if (duplicateResult.recordset[0]) {
      throw new Error("Patient already has an active subscription for this offer");
    }

    const result = await new sql.Request(transaction)
      .input("PatientID", sql.Int, parsedPatientID)
      .input("OfferID", sql.Int, parsedOfferID)
      .input("SubscriptionDate", sql.DateTime, SubscriptionDate ? new Date(SubscriptionDate) : new Date())
      .input("GivenQuantity", sql.Decimal(18, 2), Number(offer.GivenQuantity))
      .input("ForPrice", sql.Decimal(18, 2), Number(offer.ForPrice))
      .input("Notes", sql.NVarChar(500), Notes || null)
      .query(`
        INSERT INTO dbo.OfferSubscriptions
        (PatientID, OfferID, SubscriptionDate, GivenQuantity, ConsumedQuantity, ForPrice, Status, Notes, CreatedAt)
        OUTPUT INSERTED.OfferSubscriptionID
        VALUES (@PatientID, @OfferID, @SubscriptionDate, @GivenQuantity, 0, @ForPrice, N'Active', @Notes, GETDATE())
      `);

    const subscriptionID = result.recordset[0]?.OfferSubscriptionID;
    if (!subscriptionID) throw new Error("Failed to create offer subscription");
    await transaction.commit();
    return getOfferSubscriptionById(subscriptionID);
  } catch (error) {
    try { await transaction.rollback(); } catch (rollbackError) {
      console.error("Offer subscription create rollback failed:", rollbackError);
    }
    throw error;
  }
};

// =====================================================
// GET OFFER SUBSCRIPTION BY ID
// =====================================================

const getOfferSubscriptionById = async (offerSubscriptionID) => {

  const pool = await connectDB();

  const parsedID =
    Number(offerSubscriptionID);


  if (
    !Number.isInteger(parsedID) ||
    parsedID <= 0
  ) {
    throw new Error(
      "Invalid OfferSubscriptionID"
    );
  }


  const result = await pool
    .request()

    .input(
      "OfferSubscriptionID",
      sql.Int,
      parsedID
    )

    .query(`
      SELECT

        os.OfferSubscriptionID,

        os.PatientID,

        p.FullName AS PatientName,
        p.FileNo,

        os.OfferID,

        o.OfferName,

        o.CategoryID,

        oc.CategoryName,

        os.SubscriptionDate,

        os.GivenQuantity,

        os.ConsumedQuantity,

        ( os.GivenQuantity -  os.ConsumedQuantity ) AS RemainingQuantity,

        os.ForPrice,

        os.Status,

        os.Notes,

        os.CreatedAt

      FROM dbo.OfferSubscriptions os

      INNER JOIN dbo.Patients p
        ON os.PatientID = p.PatientID

      INNER JOIN dbo.Offers o
        ON os.OfferID = o.OfferID

      LEFT JOIN dbo.OfferCategories oc
        ON o.CategoryID = oc.CategoryID

      WHERE
        os.OfferSubscriptionID =  @OfferSubscriptionID
    `);


  return result.recordset[0] || null;
};


// =====================================================
// UPDATE OFFER SUBSCRIPTION
// =====================================================
const updateOfferSubscription = async (offerSubscriptionID, data) => {
  const pool = await connectDB();
  const parsedID = Number(offerSubscriptionID);
  const parsedOfferID = Number(data.OfferID);

  if (!Number.isInteger(parsedID) || parsedID <= 0) throw new Error("Invalid OfferSubscriptionID");
  if (!Number.isInteger(parsedOfferID) || parsedOfferID <= 0) throw new Error("Invalid OfferID");

  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const subscriptionResult = await new sql.Request(transaction)
      .input("OfferSubscriptionID", sql.Int, parsedID)
      .query(`
        SELECT OfferSubscriptionID, PatientID, OfferID, GivenQuantity, ForPrice, Status
        FROM dbo.OfferSubscriptions WITH (UPDLOCK, HOLDLOCK)
        WHERE OfferSubscriptionID = @OfferSubscriptionID
      `);
    const subscription = subscriptionResult.recordset[0];
    if (!subscription) throw new Error("Offer subscription not found");

    const usageResult = await new sql.Request(transaction)
      .input("OfferSubscriptionID", sql.Int, parsedID)
      .query(`SELECT COUNT(1) AS UsageCount FROM dbo.OfferSubscriptionUsage WITH (HOLDLOCK) WHERE OfferSubscriptionID = @OfferSubscriptionID`);
    if (Number(usageResult.recordset[0]?.UsageCount || 0) > 0) {
      throw new Error("Cannot edit this subscription because it has already been used");
    }

    const offerChanged = Number(subscription.OfferID) !== parsedOfferID;
    let offer = null;
    if (offerChanged && subscription.Status === "Active") {
      const duplicateResult = await new sql.Request(transaction)
        .input("PatientID", sql.Int, Number(subscription.PatientID))
        .input("OfferID", sql.Int, parsedOfferID)
        .input("OfferSubscriptionID", sql.Int, parsedID)
        .query(`
          SELECT TOP 1 OfferSubscriptionID
          FROM dbo.OfferSubscriptions WITH (UPDLOCK, HOLDLOCK)
          WHERE PatientID = @PatientID
            AND OfferID = @OfferID
            AND Status = N'Active'
            AND OfferSubscriptionID <> @OfferSubscriptionID
        `);
      if (duplicateResult.recordset[0]) {
        throw new Error("Patient already has an active subscription for this offer");
      }
    }
    if (offerChanged) {
      const paymentsResult = await new sql.Request(transaction)
        .input("OfferSubscriptionID", sql.Int, parsedID)
        .query(`SELECT COUNT(1) AS PaymentCount FROM dbo.OfferSubscriptionPayments WITH (HOLDLOCK) WHERE OfferSubscriptionID = @OfferSubscriptionID`);
      if (Number(paymentsResult.recordset[0]?.PaymentCount || 0) > 0) {
        throw new Error("Cannot change the offer after a payment has been recorded");
      }

      const offerResult = await new sql.Request(transaction)
        .input("OfferID", sql.Int, parsedOfferID)
        .query(`
          SELECT OfferID, GivenQuantity, ForPrice
          FROM dbo.Offers
          WHERE OfferID = @OfferID AND IsActive = 1
        `);
      offer = offerResult.recordset[0];
      if (!offer) throw new Error("Offer not found or inactive");
    }

    const notes = data.Notes === undefined || data.Notes === null || data.Notes === ""
      ? null
      : String(data.Notes);

    await new sql.Request(transaction)
      .input("OfferSubscriptionID", sql.Int, parsedID)
      .input("OfferID", sql.Int, parsedOfferID)
      .input("GivenQuantity", sql.Decimal(18, 2), offerChanged ? Number(offer.GivenQuantity) : Number(subscription.GivenQuantity))
      .input("ForPrice", sql.Decimal(18, 2), offerChanged ? Number(offer.ForPrice) : Number(subscription.ForPrice))
      .input("Notes", sql.NVarChar(500), notes)
      .query(`
        UPDATE dbo.OfferSubscriptions
        SET OfferID = @OfferID,
            GivenQuantity = @GivenQuantity,
            ForPrice = @ForPrice,
            Notes = @Notes
        WHERE OfferSubscriptionID = @OfferSubscriptionID
      `);

    await transaction.commit();
    return getOfferSubscriptionById(parsedID);
  } catch (error) {
    try { await transaction.rollback(); } catch (rollbackError) {
      console.error("Offer subscription update rollback failed:", rollbackError);
    }
    throw error;
  }
};

// =====================================================
// DELETE OFFER SUBSCRIPTION
// =====================================================
const deleteOfferSubscription = async (offerSubscriptionID) => {
  const pool = await connectDB();
  const parsedID = Number(offerSubscriptionID);
  if (!Number.isInteger(parsedID) || parsedID <= 0) throw new Error("Invalid OfferSubscriptionID");

  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const subscriptionResult = await new sql.Request(transaction)
      .input("OfferSubscriptionID", sql.Int, parsedID)
      .query(`SELECT OfferSubscriptionID FROM dbo.OfferSubscriptions WITH (UPDLOCK, HOLDLOCK) WHERE OfferSubscriptionID = @OfferSubscriptionID`);
    if (!subscriptionResult.recordset[0]) throw new Error("Offer subscription not found");

    const usageResult = await new sql.Request(transaction)
      .input("OfferSubscriptionID", sql.Int, parsedID)
      .query(`SELECT COUNT(1) AS UsageCount FROM dbo.OfferSubscriptionUsage WITH (HOLDLOCK) WHERE OfferSubscriptionID = @OfferSubscriptionID`);
    if (Number(usageResult.recordset[0]?.UsageCount || 0) > 0) {
      throw new Error("Cannot delete this subscription because it has already been used");
    }

    const paymentsResult = await new sql.Request(transaction)
      .input("OfferSubscriptionID", sql.Int, parsedID)
      .query(`SELECT COUNT(1) AS PaymentCount FROM dbo.OfferSubscriptionPayments WITH (HOLDLOCK) WHERE OfferSubscriptionID = @OfferSubscriptionID`);
    if (Number(paymentsResult.recordset[0]?.PaymentCount || 0) > 0) {
      throw new Error("Cannot delete a subscription with payment history");
    }

    await new sql.Request(transaction)
      .input("OfferSubscriptionID", sql.Int, parsedID)
      .query(`DELETE FROM dbo.OfferSubscriptions WHERE OfferSubscriptionID = @OfferSubscriptionID`);
    await transaction.commit();
    return { OfferSubscriptionID: parsedID };
  } catch (error) {
    try { await transaction.rollback(); } catch (rollbackError) {
      console.error("Offer subscription delete rollback failed:", rollbackError);
    }
    throw error;
  }
};

// =====================================================
// GET PATIENT OFFER SUBSCRIPTIONS
// =====================================================

const getPatientOfferSubscriptions = async ( patientID,  activeOnly = false ) => {

  const pool = await connectDB();

  const parsedPatientID =
    Number(patientID);


  if (
    !Number.isInteger(parsedPatientID) ||
    parsedPatientID <= 0
  ) {
    throw new Error("Invalid PatientID");
  }


  const request = pool
    .request()

    .input(
      "PatientID",
      sql.Int,
      parsedPatientID
    );


  const statusCondition =  activeOnly  ? `AND os.Status = 'Active'`  : "";


  const result = await request.query(`
    SELECT

      os.OfferSubscriptionID,

      os.PatientID,

      p.FullName AS PatientName,
      p.FileNo,

      os.OfferID,

      o.OfferName,

      o.CategoryID,

      oc.CategoryName,

      os.SubscriptionDate,

      os.GivenQuantity,

      os.ConsumedQuantity,

      ( os.GivenQuantity -  os.ConsumedQuantity ) AS RemainingQuantity,

      os.ForPrice,

      paymentTotals.TotalPaid,

      os.ForPrice - paymentTotals.TotalPaid AS RemainingToPay,

      usageTotals.UsageCount,

      os.Status,

      os.Notes,

      os.CreatedAt

    FROM dbo.OfferSubscriptions os

    INNER JOIN dbo.Patients p
      ON os.PatientID = p.PatientID

    INNER JOIN dbo.Offers o
      ON os.OfferID = o.OfferID

    LEFT JOIN dbo.OfferCategories oc
      ON o.CategoryID = oc.CategoryID

    OUTER APPLY (
      SELECT ISNULL(SUM(osp.AmountPaid), 0) AS TotalPaid
      FROM dbo.OfferSubscriptionPayments osp
      WHERE osp.OfferSubscriptionID = os.OfferSubscriptionID
    ) paymentTotals

    OUTER APPLY (
      SELECT COUNT(1) AS UsageCount
      FROM dbo.OfferSubscriptionUsage osu
      WHERE osu.OfferSubscriptionID = os.OfferSubscriptionID
    ) usageTotals

    WHERE
      os.PatientID = @PatientID

      ${statusCondition}

    ORDER BY
      os.SubscriptionDate DESC,
      os.OfferSubscriptionID DESC
  `);


  return result.recordset;
};


// =====================================================
// GET ACTIVE PATIENT OFFERS
// =====================================================
//
// This is the function our Sessions page will use
// when the receptionist/doctor presses:
//
//       Add Offer
//
// Only ACTIVE subscriptions are returned.
//
// =====================================================

const getActivePatientOffers = async ( patientID) => {

  return getPatientOfferSubscriptions( patientID,  true );
};


// =====================================================
// GET OFFER SUBSCRIPTION PAYMENTS
// =====================================================

const getOfferSubscriptionPayments = async ( offerSubscriptionID ) => {

  const pool = await connectDB();

  const parsedID =
    Number(offerSubscriptionID);


  if (
    !Number.isInteger(parsedID) ||
    parsedID <= 0
  ) {
    throw new Error(
      "Invalid OfferSubscriptionID"
    );
  }


  const result = await pool
    .request()

    .input(
      "OfferSubscriptionID",
      sql.Int,
      parsedID
    )

    .query(`
      SELECT

        osp.OfferSubscriptionPaymentID,

        osp.OfferSubscriptionID,

        osp.PaymentDate,

        osp.AmountPaid,

        osp.PaymentMethod,

        osp.UserID,

        u.UserName,

        osp.Notes,

        osp.CreatedAt

      FROM dbo.OfferSubscriptionPayments osp

      LEFT JOIN dbo.Users u
        ON osp.UserID = u.UserID

      WHERE
        osp.OfferSubscriptionID =
        @OfferSubscriptionID

      ORDER BY
        osp.PaymentDate ASC,
        osp.OfferSubscriptionPaymentID ASC
    `);


  return result.recordset;
};


// =====================================================
// GET OFFER SUBSCRIPTION PAYMENT TOTAL
// =====================================================

const getOfferSubscriptionPaidTotal = async ( offerSubscriptionID ) => {

  const pool = await connectDB();

  const parsedID =
    Number(offerSubscriptionID);


  if (
    !Number.isInteger(parsedID) ||
    parsedID <= 0
  ) {
    throw new Error(
      "Invalid OfferSubscriptionID"
    );
  }


  const result = await pool
    .request()

    .input(
      "OfferSubscriptionID",
      sql.Int,
      parsedID
    )

    .query(`
      SELECT

        ISNULL( SUM(AmountPaid), 0 ) AS TotalPaid

      FROM dbo.OfferSubscriptionPayments

      WHERE
        OfferSubscriptionID =
        @OfferSubscriptionID
    `);


  return Number(
    result.recordset[0]?.TotalPaid || 0
  );
};

// =====================================================
// ADD PAYMENT TO OFFER SUBSCRIPTION
// =====================================================
//
// Records a payment for an existing subscription.
//
// The payment amount must not make the total paid
// exceed the offer price.
//
// =====================================================

const addOfferSubscriptionPayment = async ( offerSubscriptionID, data ) => {

  const pool = await connectDB();

  const parsedSubscriptionID =  Number(offerSubscriptionID);


  // ---------------------------------------------------
  // VALIDATE SUBSCRIPTION ID
  // ---------------------------------------------------

  if (
    !Number.isInteger(parsedSubscriptionID) ||
    parsedSubscriptionID <= 0
  ) {
    throw new Error(
      "Invalid OfferSubscriptionID"
    );
  }


  const {
    AmountPaid,
    PaymentMethod,
    UserID,
    PaymentDate,
    Notes,
  } = data;


  const amountPaid =
    Number(AmountPaid);


  // ---------------------------------------------------
  // VALIDATE AMOUNT
  // ---------------------------------------------------

  if (
    !Number.isFinite(amountPaid) ||
    amountPaid <= 0
  ) {
    throw new Error(
      "AmountPaid must be greater than zero"
    );
  }


  // ---------------------------------------------------
  // VALIDATE PAYMENT METHOD
  // ---------------------------------------------------

  const allowedPaymentMethods = [
    "Cash",
    "Visa",
    "Bank Transfer",
    "Instapay",
    "Vodafone Cash",
  ];


  if (
    !allowedPaymentMethods.includes(
      PaymentMethod
    )
  ) {
    throw new Error(
      "Invalid payment method"
    );
  }


  // ===================================================
  // TRANSACTION
  // ===================================================

  const transaction =
    new sql.Transaction(pool);


  try {

    await transaction.begin();


    // =================================================
    // GET SUBSCRIPTION
    // =================================================

    const subscriptionRequest =
      new sql.Request(transaction);

    const subscriptionResult =
      await subscriptionRequest

        .input(
          "OfferSubscriptionID",
          sql.Int,
          parsedSubscriptionID
        )

        .query(`
          SELECT

            OfferSubscriptionID,

            PatientID,

            OfferID,

            ForPrice,

            Status

          FROM dbo.OfferSubscriptions

          WHERE
            OfferSubscriptionID =  @OfferSubscriptionID
        `);


    const subscription =
      subscriptionResult.recordset[0];


    if (!subscription) {
      throw new Error(
        "Offer subscription not found"
      );
    }


    // -------------------------------------------------
    // CANCELLED SUBSCRIPTION
    // -------------------------------------------------

    if (
      subscription.Status ===
      "Cancelled"
    ) {
      throw new Error(
        "Cannot add payment to a cancelled subscription"
      );
    }


    // =================================================
    // GET ALREADY PAID
    // =================================================

    const paidRequest =
      new sql.Request(transaction);

    const paidResult =
      await paidRequest

        .input(
          "OfferSubscriptionID",
          sql.Int,
          parsedSubscriptionID
        )

        .query(`
          SELECT

            ISNULL( SUM(AmountPaid), 0 ) AS TotalPaid

          FROM dbo.OfferSubscriptionPayments

          WHERE
            OfferSubscriptionID =
            @OfferSubscriptionID
        `);


    const totalPaid =  Number( paidResult.recordset[0]?.TotalPaid || 0  );


    // =================================================
    // CHECK PAYMENT LIMIT
    // =================================================

    const offerPrice =
      Number(subscription.ForPrice);


    const remainingToPay =
      offerPrice - totalPaid;


    if (remainingToPay <= 0) {

      throw new Error(
        "This offer subscription has already been fully paid"
      );

    }


    if (
      amountPaid > remainingToPay
    ) {

      throw new Error(
        `Payment cannot exceed remaining amount of ${remainingToPay}`
      );

    }


    // =================================================
    // USER ID
    // =================================================

    const parsedUserID =
      UserID === undefined ||
      UserID === null ||
      UserID === ""
        ? null
        : Number(UserID);


    if (
      parsedUserID !== null &&
      (
        !Number.isInteger(parsedUserID) ||
        parsedUserID <= 0
      )
    ) {

      throw new Error(
        "Invalid UserID"
      );

    }


    // =================================================
    // INSERT PAYMENT
    // =================================================

    const paymentRequest =
      new sql.Request(transaction);


    paymentRequest

      .input(
        "OfferSubscriptionID",
        sql.Int,
        parsedSubscriptionID
      )

      .input(
        "PaymentDate",
        sql.DateTime,
        PaymentDate
          ? new Date(PaymentDate)
          : new Date()
      )

      .input(
        "AmountPaid",
        sql.Decimal(18, 2),
        amountPaid
      )

      .input(
        "PaymentMethod",
        sql.NVarChar(30),
        PaymentMethod
      )

      .input(
        "UserID",
        sql.Int,
        parsedUserID
      )

      .input(
        "Notes",
        sql.NVarChar(500),
        Notes || null
      );


    const paymentResult =
      await paymentRequest.query(`

        INSERT INTO dbo.OfferSubscriptionPayments
        (
          OfferSubscriptionID,
          PaymentDate,
          AmountPaid,
          PaymentMethod,
          UserID,
          Notes,
          CreatedAt
        )

        OUTPUT
          INSERTED.OfferSubscriptionPaymentID

        VALUES
        (
          @OfferSubscriptionID,
          @PaymentDate,
          @AmountPaid,
          @PaymentMethod,
          @UserID,
          @Notes,
          GETDATE()
        )

      `);


    const payment =
      paymentResult.recordset[0];


    if (!payment) {

      throw new Error(
        "Failed to create payment"
      );

    }


    // =================================================
    // COMMIT
    // =================================================

    await transaction.commit();


    // =================================================
    // RETURN UPDATED SUBSCRIPTION
    // =================================================

    return {
      payment:
        await getOfferSubscriptionPayments(
          parsedSubscriptionID
        ),

      subscription:
        await getOfferSubscriptionById(
          parsedSubscriptionID
        ),

      totalPaid:
        totalPaid + amountPaid,

      remainingToPay:
        remainingToPay - amountPaid,
    };

  } catch (error) {

    // =================================================
    // ROLLBACK
    // =================================================

    try {
      await transaction.rollback();
    } catch (rollbackError) {

      console.error(
        "Offer payment rollback failed:",
        rollbackError
      );

    }

    throw error;
  }
};

// =====================================================
// UPDATE OFFER SUBSCRIPTION PAYMENT
// =====================================================
const updateOfferSubscriptionPayment = async (offerSubscriptionID, paymentID, data) => {
  const pool = await connectDB();

  const parsedSubscriptionID = Number(offerSubscriptionID);
  const parsedPaymentID = Number(paymentID);
  const amountPaid = Number(data.AmountPaid);
  const paymentMethod = data.PaymentMethod;
  const allowedMethods = ["Cash", "Visa", "Bank Transfer", "Instapay", "Vodafone Cash"];

  if (!Number.isInteger(parsedSubscriptionID) || parsedSubscriptionID <= 0) {
    throw new Error("Invalid OfferSubscriptionID");
  }

  if (!Number.isInteger(parsedPaymentID) || parsedPaymentID <= 0) {
    throw new Error("Invalid OfferSubscriptionPaymentID");
  }

  if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
    throw new Error("AmountPaid must be greater than zero");
  }

  if (!allowedMethods.includes(paymentMethod)) {
    throw new Error("Invalid payment method");
  }

  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

    // Lock the subscription while checking its price and usage history.
    const subscriptionResult = await new sql.Request(transaction)
      .input("OfferSubscriptionID", sql.Int, parsedSubscriptionID)
      .query(`
        SELECT OfferSubscriptionID, ForPrice
        FROM dbo.OfferSubscriptions WITH (UPDLOCK, HOLDLOCK)
        WHERE OfferSubscriptionID = @OfferSubscriptionID
      `);

    const subscription = subscriptionResult.recordset[0];
    if (!subscription) throw new Error("Offer subscription not found");

    const usageResult = await new sql.Request(transaction)
      .input("OfferSubscriptionID", sql.Int, parsedSubscriptionID)
      .query(`
        SELECT COUNT(1) AS UsageCount
        FROM dbo.OfferSubscriptionUsage WITH (HOLDLOCK)
        WHERE OfferSubscriptionID = @OfferSubscriptionID
      `);

    if (Number(usageResult.recordset[0]?.UsageCount || 0) > 0) {
      throw new Error("Cannot modify payments after this offer subscription has been used");
    }

    // Confirm the payment belongs to this subscription and lock it for the update.
    const paymentResult = await new sql.Request(transaction)
      .input("OfferSubscriptionID", sql.Int, parsedSubscriptionID)
      .input("PaymentID", sql.Int, parsedPaymentID)
      .query(`
        SELECT OfferSubscriptionPaymentID, AmountPaid
        FROM dbo.OfferSubscriptionPayments WITH (UPDLOCK, HOLDLOCK)
        WHERE OfferSubscriptionID = @OfferSubscriptionID
          AND OfferSubscriptionPaymentID = @PaymentID
      `);

    const payment = paymentResult.recordset[0];
    if (!payment) throw new Error("Offer subscription payment not found");

    const totalResult = await new sql.Request(transaction)
      .input("OfferSubscriptionID", sql.Int, parsedSubscriptionID)
      .query(`
        SELECT ISNULL(SUM(AmountPaid), 0) AS TotalPaid
        FROM dbo.OfferSubscriptionPayments
        WHERE OfferSubscriptionID = @OfferSubscriptionID
      `);

    const currentTotal = Number(totalResult.recordset[0]?.TotalPaid || 0);
    const nextTotal = currentTotal - Number(payment.AmountPaid) + amountPaid;

    if (nextTotal > Number(subscription.ForPrice)) {
      const remainingBeforeEdit = Number(subscription.ForPrice)
        - (currentTotal - Number(payment.AmountPaid));

      throw new Error(`Payment cannot exceed remaining amount of ${remainingBeforeEdit}`);
    }

    const notes = data.Notes === undefined || data.Notes === null || data.Notes === ""
      ? null
      : String(data.Notes);

    await new sql.Request(transaction)
      .input("OfferSubscriptionID", sql.Int, parsedSubscriptionID)
      .input("PaymentID", sql.Int, parsedPaymentID)
      .input("AmountPaid", sql.Decimal(18, 2), amountPaid)
      .input("PaymentMethod", sql.NVarChar(30), paymentMethod)
      .input("Notes", sql.NVarChar(500), notes)
      .query(`
        UPDATE dbo.OfferSubscriptionPayments
        SET
          AmountPaid = @AmountPaid,
          PaymentMethod = @PaymentMethod,
          Notes = @Notes
        WHERE OfferSubscriptionID = @OfferSubscriptionID
          AND OfferSubscriptionPaymentID = @PaymentID
      `);

    await transaction.commit();

    const updatedTotal = await getOfferSubscriptionPaidTotal(parsedSubscriptionID);

    return {
      payments: await getOfferSubscriptionPayments(parsedSubscriptionID),
      totalPaid: updatedTotal,
      remainingToPay: Number(subscription.ForPrice) - Number(updatedTotal),
    };
  } catch (error) {
    try { await transaction.rollback(); } catch (rollbackError) {
      console.error("Offer payment update rollback failed:", rollbackError);
    }
    throw error;
  }
};

// =====================================================
// DELETE OFFER SUBSCRIPTION PAYMENT
// =====================================================
const deleteOfferSubscriptionPayment = async (offerSubscriptionID, paymentID) => {
  const pool = await connectDB();

  const parsedSubscriptionID = Number(offerSubscriptionID);
  const parsedPaymentID = Number(paymentID);

  if (!Number.isInteger(parsedSubscriptionID) || parsedSubscriptionID <= 0) {
    throw new Error("Invalid OfferSubscriptionID");
  }

  if (!Number.isInteger(parsedPaymentID) || parsedPaymentID <= 0) {
    throw new Error("Invalid OfferSubscriptionPaymentID");
  }

  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

    // Keep edits and deletes consistent with the subscription usage guard.
    const subscriptionResult = await new sql.Request(transaction)
      .input("OfferSubscriptionID", sql.Int, parsedSubscriptionID)
      .query(`
        SELECT OfferSubscriptionID, ForPrice
        FROM dbo.OfferSubscriptions WITH (UPDLOCK, HOLDLOCK)
        WHERE OfferSubscriptionID = @OfferSubscriptionID
      `);

    const subscription = subscriptionResult.recordset[0];
    if (!subscription) throw new Error("Offer subscription not found");

    const usageResult = await new sql.Request(transaction)
      .input("OfferSubscriptionID", sql.Int, parsedSubscriptionID)
      .query(`
        SELECT COUNT(1) AS UsageCount
        FROM dbo.OfferSubscriptionUsage WITH (HOLDLOCK)
        WHERE OfferSubscriptionID = @OfferSubscriptionID
      `);

    if (Number(usageResult.recordset[0]?.UsageCount || 0) > 0) {
      throw new Error("Cannot modify payments after this offer subscription has been used");
    }

    const paymentResult = await new sql.Request(transaction)
      .input("OfferSubscriptionID", sql.Int, parsedSubscriptionID)
      .input("PaymentID", sql.Int, parsedPaymentID)
      .query(`
        SELECT OfferSubscriptionPaymentID
        FROM dbo.OfferSubscriptionPayments WITH (UPDLOCK, HOLDLOCK)
        WHERE OfferSubscriptionID = @OfferSubscriptionID
          AND OfferSubscriptionPaymentID = @PaymentID
      `);

    if (!paymentResult.recordset[0]) throw new Error("Offer subscription payment not found");

    await new sql.Request(transaction)
      .input("OfferSubscriptionID", sql.Int, parsedSubscriptionID)
      .input("PaymentID", sql.Int, parsedPaymentID)
      .query(`
        DELETE FROM dbo.OfferSubscriptionPayments
        WHERE OfferSubscriptionID = @OfferSubscriptionID
          AND OfferSubscriptionPaymentID = @PaymentID
      `);

    await transaction.commit();

    const totalPaid = await getOfferSubscriptionPaidTotal(parsedSubscriptionID);

    return {
      payments: await getOfferSubscriptionPayments(parsedSubscriptionID),
      totalPaid: Number(totalPaid),
      remainingToPay: Number(subscription.ForPrice) - Number(totalPaid),
    };
  } catch (error) {
    try { await transaction.rollback(); } catch (rollbackError) {
      console.error("Offer payment delete rollback failed:", rollbackError);
    }
    throw error;
  }
};

// =====================================================
// USE OFFER IN A LASER SESSION
// =====================================================
//
// Session offer:
//     ConsumedQuantity = 1
//
// Pulse offer:
//     ConsumedQuantity = PulsesNo
//
// The usage is connected to LaserSessions through
// SessionID.
//
// =====================================================

const consumeOfferSubscription = async ( offerSubscriptionID, sessionID, patientID, pulsesNo, notes = null ) => {

  const pool = await connectDB();

  const parsedSubscriptionID =   Number(offerSubscriptionID);

  const parsedSessionID =   Number(sessionID);

  const parsedPatientID =   Number(patientID);


  // ===================================================
  // VALIDATION
  // ===================================================

  if (
    !Number.isInteger(parsedSubscriptionID) ||
    parsedSubscriptionID <= 0
  ) {
    throw new Error(
      "Invalid OfferSubscriptionID"
    );
  }


  if (
    !Number.isInteger(parsedSessionID) ||
    parsedSessionID <= 0
  ) {
    throw new Error(
      "Invalid SessionID"
    );
  }


  if (
    !Number.isInteger(parsedPatientID) ||
    parsedPatientID <= 0
  ) {
    throw new Error(
      "Invalid PatientID"
    );
  }


  const parsedPulsesNo =
    pulsesNo === undefined ||
    pulsesNo === null ||
    pulsesNo === ""
      ? 0
      : Number(pulsesNo);


  if (
    !Number.isFinite(parsedPulsesNo) ||
    parsedPulsesNo < 0
  ) {
    throw new Error(
      "Invalid PulsesNo"
    );
  }


  // ===================================================
  // TRANSACTION
  // ===================================================

  const transaction =
    new sql.Transaction(pool);


  try {

    await transaction.begin();


    // =================================================
    // GET SUBSCRIPTION
    // =================================================

    const subscriptionRequest =
      new sql.Request(transaction);


    const subscriptionResult =
      await subscriptionRequest

        .input(
          "OfferSubscriptionID",
          sql.Int,
          parsedSubscriptionID
        )

        .query(`
          SELECT

            os.OfferSubscriptionID,

            os.PatientID,

            os.OfferID,

            os.GivenQuantity,

            os.ConsumedQuantity,

            os.Status,

            o.OfferName,

            o.CategoryID,

            oc.CategoryName

          FROM dbo.OfferSubscriptions os WITH (UPDLOCK, HOLDLOCK)

          INNER JOIN dbo.Offers o
            ON os.OfferID = o.OfferID

          LEFT JOIN dbo.OfferCategories oc
            ON o.CategoryID = oc.CategoryID

          WHERE
            os.OfferSubscriptionID =   @OfferSubscriptionID
  
      `);


    const subscription =
      subscriptionResult.recordset[0];


    if (!subscription) {

      throw new Error(
        "Offer subscription not found"
      );

    }


    // =================================================
    // VERIFY PATIENT
    // =================================================

    if (
      Number(subscription.PatientID) !==
      parsedPatientID
    ) {

      throw new Error(
        "This offer subscription does not belong to this patient"
      );

    }


    // =================================================
    // VERIFY STATUS
    // =================================================

    if (
      subscription.Status !==
      "Active"
    ) {

      throw new Error(
        `Offer subscription is ${subscription.Status}`
      );

    }


    // =================================================
    // VERIFY SESSION
    // =================================================

    const sessionRequest =
      new sql.Request(transaction);


    const sessionResult =
      await sessionRequest

        .input(
          "SessionID",
          sql.Int,
          parsedSessionID
        )

        .input(
          "PatientID",
          sql.Int,
          parsedPatientID
        )

        .query(`
          SELECT

            SessionID,
            PatientID,
            SessionDate

          FROM dbo.LaserSessions

          WHERE
            SessionID = @SessionID

            AND PatientID = @PatientID
        `);


    const session =
      sessionResult.recordset[0];


    if (!session) {

      throw new Error(
        "Session not found for this patient"
      );

    }


    // Prevent using the same subscription more than once in the same session.
    const existingSubscriptionUsage = await new sql.Request(transaction)
      .input("SessionID", sql.Int, parsedSessionID)
      .input("OfferSubscriptionID", sql.Int, parsedSubscriptionID)
      .query(`
        SELECT TOP 1 OfferSubscriptionID
        FROM dbo.OfferSubscriptionUsage WITH (UPDLOCK, HOLDLOCK)
        WHERE SessionID = @SessionID
          AND OfferSubscriptionID = @OfferSubscriptionID
      `);

    if (existingSubscriptionUsage.recordset.length > 0) {
      throw new Error("This offer subscription is already used in this session");
    }


    // =================================================
    // DETERMINE OFFER TYPE
    // =================================================
    //
    // CategoryID:
    //
    // 1 = session
    // 2 = pulse
    //
    // =================================================

    const categoryID =
      Number(subscription.CategoryID);


    let consumedQuantity = 0;


    // =================================================
    // SESSION OFFER
    // =================================================

    if (categoryID === 1) {

      consumedQuantity = 1;

    }


    // =================================================
    // PULSE OFFER
    // =================================================

    else if (categoryID === 2) {

      if (
        !Number.isFinite(parsedPulsesNo) ||
        parsedPulsesNo <= 0
      ) {

        throw new Error(
          "PulsesNo must be greater than zero for a pulse offer"
        );

      }


      consumedQuantity =
        parsedPulsesNo;

    }


    // =================================================
    // UNKNOWN CATEGORY
    // =================================================

    else {

      throw new Error(
        "Invalid offer category"
      );

    }


    // =================================================
    // CURRENT BALANCE
    // =================================================

    const givenQuantity =
      Number(
        subscription.GivenQuantity
      );

    const consumedQuantityBefore =
      Number(
        subscription.ConsumedQuantity
      );


    const remainingQuantity =  givenQuantity -  consumedQuantityBefore;


    // =================================================
    // CHECK BALANCE
    // =================================================

    if (
      consumedQuantity >
      remainingQuantity
    ) {

      throw new Error(
        `Insufficient offer balance. Remaining quantity: ${remainingQuantity}`
      );

    }


    // =================================================
    // NEW CONSUMED QUANTITY
    // =================================================

    const newConsumedQuantity =
      consumedQuantityBefore +
      consumedQuantity;


    const newRemainingQuantity =   givenQuantity -   newConsumedQuantity;


    // =================================================
    // NEW STATUS
    // =================================================

    const newStatus =
      newRemainingQuantity === 0
        ? "Completed"
        : "Active";


    // =================================================
    // INSERT USAGE
    // =================================================

    const usageRequest =
      new sql.Request(transaction);


    const usageResult =
      await usageRequest

        .input(
          "OfferSubscriptionID",
          sql.Int,
          parsedSubscriptionID
        )

        .input(
          "SessionID",
          sql.Int,
          parsedSessionID
        )

        .input(
          "ConsumedQuantity",
          sql.Decimal(18, 2),
          consumedQuantity
        )

        .input(
          "PulsesNo",
          sql.Decimal(18, 2),
          parsedPulsesNo
        )

        .input(
          "Notes",
          sql.NVarChar(500),
          notes || null
        )

        .query(`
          INSERT INTO dbo.OfferSubscriptionUsage
          (
            OfferSubscriptionID,
            SessionID,
            ConsumedQuantity,
            PulsesNo,
            UsageDate,
            Notes,
            CreatedAt
          )

          OUTPUT
            INSERTED.OfferSubscriptionUsageID

          VALUES
          (
            @OfferSubscriptionID,
            @SessionID,
            @ConsumedQuantity,
            @PulsesNo,
            GETDATE(),
            @Notes,
            GETDATE()
          )
        `);


    const usage =
      usageResult.recordset[0];


    if (!usage) {

      throw new Error(
        "Failed to create offer usage record"
      );

    }


    // =================================================
    // UPDATE SUBSCRIPTION
    // =================================================

    const updateRequest =
      new sql.Request(transaction);


    await updateRequest

      .input(
        "OfferSubscriptionID",
        sql.Int,
        parsedSubscriptionID
      )

      .input(
        "ConsumedQuantity",
        sql.Decimal(18, 2),
        newConsumedQuantity
      )

      .input(
        "Status",
        sql.NVarChar(20),
        newStatus
      )

      .query(`
        UPDATE dbo.OfferSubscriptions

        SET
          ConsumedQuantity =  @ConsumedQuantity,

          Status =   @Status

        WHERE
          OfferSubscriptionID =   @OfferSubscriptionID
      `);


    // =================================================
    // COMMIT
    // =================================================

    await transaction.commit();


    // =================================================
    // RETURN UPDATED DATA
    // =================================================

    return {

      usage: {
        OfferSubscriptionUsageID:
          usage.OfferSubscriptionUsageID,

        OfferSubscriptionID:
          parsedSubscriptionID,

        SessionID:
          parsedSessionID,

        ConsumedQuantity:
          consumedQuantity,

        PulsesNo:
          parsedPulsesNo,
      },

      subscription: {

        OfferSubscriptionID:
          parsedSubscriptionID,

        PatientID:
          parsedPatientID,

        GivenQuantity:
          givenQuantity,

        ConsumedQuantity:
          newConsumedQuantity,

        RemainingQuantity:
          newRemainingQuantity,

        Status:
          newStatus,

      },

    };

  } catch (error) {

    // =================================================
    // ROLLBACK
    // =================================================

    try {

      await transaction.rollback();

    } catch (rollbackError) {

      console.error(
        "Offer usage rollback failed:",
        rollbackError
      );

    }

    throw error;

  }

};

// =====================================================
// GET OFFER USAGE FOR A SESSION
// =====================================================
const getSessionOfferUsages = async (sessionID) => {
  const parsedSessionID = Number(sessionID);

  if (!Number.isInteger(parsedSessionID) || parsedSessionID <= 0) {
    throw new Error("Invalid SessionID");
  }

  const pool = await connectDB();
  const result = await pool.request()
    .input("SessionID", sql.Int, parsedSessionID)
    .query(`
      SELECT
        osu.OfferSubscriptionUsageID,
        osu.OfferSubscriptionID,
        osu.SessionID,
        osu.ConsumedQuantity,
        osu.PulsesNo,
        osu.UsageDate,
        osu.Notes,
        os.GivenQuantity,
        os.ConsumedQuantity AS SubscriptionConsumedQuantity,
        (os.GivenQuantity - os.ConsumedQuantity) AS RemainingQuantity,
        os.Status AS SubscriptionStatus,
        o.OfferName,
        o.CategoryID,
        oc.CategoryName
      FROM dbo.OfferSubscriptionUsage osu
      INNER JOIN dbo.OfferSubscriptions os
        ON osu.OfferSubscriptionID = os.OfferSubscriptionID
      INNER JOIN dbo.Offers o
        ON os.OfferID = o.OfferID
      LEFT JOIN dbo.OfferCategories oc
        ON o.CategoryID = oc.CategoryID
      WHERE osu.SessionID = @SessionID
      ORDER BY osu.UsageDate, osu.OfferSubscriptionUsageID
    `);

  return result.recordset;
};

// =====================================================
// UPDATE OFFER SUBSCRIPTION USAGE
// =====================================================
const updateOfferSubscriptionUsage = async (usageID, data) => {
  const parsedUsageID = Number(usageID);
  const pulsesNo = data.PulsesNo === undefined || data.PulsesNo === null || data.PulsesNo === ""
    ? 0
    : Number(data.PulsesNo);

  if (!Number.isInteger(parsedUsageID) || parsedUsageID <= 0) {
    throw new Error("Invalid OfferSubscriptionUsageID");
  }

  if (!Number.isFinite(pulsesNo) || pulsesNo < 0) {
    throw new Error("Invalid PulsesNo");
  }

  const pool = await connectDB();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

    // Lock the usage and subscription so balance calculations stay consistent.
    const usageResult = await new sql.Request(transaction)
      .input("UsageID", sql.Int, parsedUsageID)
      .query(`
        SELECT
          osu.OfferSubscriptionUsageID,
          osu.OfferSubscriptionID,
          osu.SessionID,
          osu.ConsumedQuantity AS UsageConsumedQuantity,
          os.GivenQuantity,
          os.ConsumedQuantity AS SubscriptionConsumedQuantity,
          o.CategoryID
        FROM dbo.OfferSubscriptionUsage osu WITH (UPDLOCK, HOLDLOCK)
        INNER JOIN dbo.OfferSubscriptions os WITH (UPDLOCK, HOLDLOCK)
          ON osu.OfferSubscriptionID = os.OfferSubscriptionID
        INNER JOIN dbo.Offers o
          ON os.OfferID = o.OfferID
        WHERE osu.OfferSubscriptionUsageID = @UsageID
      `);

    const usage = usageResult.recordset[0];
    if (!usage) throw new Error("Offer usage not found");

    const isPulseOffer = Number(usage.CategoryID) === 2;

    if (![1, 2].includes(Number(usage.CategoryID))) {
      throw new Error("Invalid offer category");
    }

    if (isPulseOffer && pulsesNo <= 0) {
      throw new Error("PulsesNo must be greater than zero for a pulse offer");
    }

    // Session offers consume one session. Pulse offers consume the entered count.
    const newUsageConsumedQuantity = isPulseOffer ? pulsesNo : 1;
    const newSubscriptionConsumedQuantity =
      Number(usage.SubscriptionConsumedQuantity)
      - Number(usage.UsageConsumedQuantity)
      + newUsageConsumedQuantity;

    if (newSubscriptionConsumedQuantity > Number(usage.GivenQuantity)) {
      throw new Error("Updated usage exceeds the offer's remaining balance");
    }

    const notes = data.Notes === undefined || data.Notes === null || data.Notes === ""
      ? null
      : String(data.Notes);

    await new sql.Request(transaction)
      .input("UsageID", sql.Int, parsedUsageID)
      .input("ConsumedQuantity", sql.Decimal(18, 2), newUsageConsumedQuantity)
      .input("PulsesNo", sql.Decimal(18, 2), pulsesNo)
      .input("Notes", sql.NVarChar(500), notes)
      .query(`
        UPDATE dbo.OfferSubscriptionUsage
        SET
          ConsumedQuantity = @ConsumedQuantity,
          PulsesNo = @PulsesNo,
          Notes = @Notes
        WHERE OfferSubscriptionUsageID = @UsageID
      `);

    const newStatus = newSubscriptionConsumedQuantity >= Number(usage.GivenQuantity)
      ? "Completed"
      : "Active";

    await new sql.Request(transaction)
      .input("OfferSubscriptionID", sql.Int, Number(usage.OfferSubscriptionID))
      .input("ConsumedQuantity", sql.Decimal(18, 2), newSubscriptionConsumedQuantity)
      .input("Status", sql.NVarChar(20), newStatus)
      .query(`
        UPDATE dbo.OfferSubscriptions
        SET ConsumedQuantity = @ConsumedQuantity,
            Status = @Status
        WHERE OfferSubscriptionID = @OfferSubscriptionID
      `);

    await transaction.commit();

    return {
      OfferSubscriptionUsageID: parsedUsageID,
      OfferSubscriptionID: Number(usage.OfferSubscriptionID),
      SessionID: Number(usage.SessionID),
      ConsumedQuantity: newUsageConsumedQuantity,
      PulsesNo: pulsesNo,
      Notes: notes,
      subscription: {
        GivenQuantity: Number(usage.GivenQuantity),
        ConsumedQuantity: newSubscriptionConsumedQuantity,
        RemainingQuantity: Number(usage.GivenQuantity) - newSubscriptionConsumedQuantity,
        Status: newStatus,
      },
    };
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      console.error("Offer usage update rollback failed:", rollbackError);
    }

    throw error;
  }
};

// =====================================================
// DELETE OFFER SUBSCRIPTION USAGE
// =====================================================
const deleteOfferSubscriptionUsage = async (usageID) => {
  const parsedUsageID = Number(usageID);

  if (!Number.isInteger(parsedUsageID) || parsedUsageID <= 0) {
    throw new Error("Invalid OfferSubscriptionUsageID");
  }

  const pool = await connectDB();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

    // Lock the usage and its subscription before restoring the consumed quantity.
    const usageResult = await new sql.Request(transaction)
      .input("UsageID", sql.Int, parsedUsageID)
      .query(`
        SELECT
          osu.OfferSubscriptionUsageID,
          osu.OfferSubscriptionID,
          osu.ConsumedQuantity AS UsageConsumedQuantity,
          os.GivenQuantity,
          os.ConsumedQuantity AS SubscriptionConsumedQuantity
        FROM dbo.OfferSubscriptionUsage osu WITH (UPDLOCK, HOLDLOCK)
        INNER JOIN dbo.OfferSubscriptions os WITH (UPDLOCK, HOLDLOCK)
          ON osu.OfferSubscriptionID = os.OfferSubscriptionID
        WHERE osu.OfferSubscriptionUsageID = @UsageID
      `);

    const usage = usageResult.recordset[0];
    if (!usage) throw new Error("Offer usage not found");

    const newSubscriptionConsumedQuantity = Math.max(
      0,
      Number(usage.SubscriptionConsumedQuantity) - Number(usage.UsageConsumedQuantity)
    );
    const newStatus = newSubscriptionConsumedQuantity >= Number(usage.GivenQuantity)
      ? "Completed"
      : "Active";

    await new sql.Request(transaction)
      .input("UsageID", sql.Int, parsedUsageID)
      .query(`
        DELETE FROM dbo.OfferSubscriptionUsage
        WHERE OfferSubscriptionUsageID = @UsageID
      `);

    await new sql.Request(transaction)
      .input("OfferSubscriptionID", sql.Int, Number(usage.OfferSubscriptionID))
      .input("ConsumedQuantity", sql.Decimal(18, 2), newSubscriptionConsumedQuantity)
      .input("Status", sql.NVarChar(20), newStatus)
      .query(`
        UPDATE dbo.OfferSubscriptions
        SET ConsumedQuantity = @ConsumedQuantity,
            Status = @Status
        WHERE OfferSubscriptionID = @OfferSubscriptionID
      `);

    await transaction.commit();

    return {
      OfferSubscriptionUsageID: parsedUsageID,
      OfferSubscriptionID: Number(usage.OfferSubscriptionID),
      ConsumedQuantity: newSubscriptionConsumedQuantity,
      RemainingQuantity: Number(usage.GivenQuantity) - newSubscriptionConsumedQuantity,
      Status: newStatus,
    };
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      console.error("Offer usage delete rollback failed:", rollbackError);
    }

    throw error;
  }
};

// =====================================================
// GET OFFER SUBSCRIPTION USAGE HISTORY
// =====================================================
//
// Returns every session in which this offer
// subscription was consumed.
//
// =====================================================

const getOfferSubscriptionUsage = async ( offerSubscriptionID ) => {

  const pool = await connectDB();

  const parsedID =
    Number(offerSubscriptionID);


  // ---------------------------------------------------
  // VALIDATE SUBSCRIPTION ID
  // ---------------------------------------------------

  if (
    !Number.isInteger(parsedID) ||
    parsedID <= 0
  ) {
    throw new Error(
      "Invalid OfferSubscriptionID"
    );
  }


  // ===================================================
  // GET USAGE HISTORY
  // ===================================================

  const result = await pool
    .request()

    .input(
      "OfferSubscriptionID",
      sql.Int,
      parsedID
    )

    .query(`
      SELECT

        osu.OfferSubscriptionUsageID,

        osu.OfferSubscriptionID,

        osu.SessionID,

        CAST(
          ls.SessionDate AS DATE
        ) AS SessionDate,

        osu.ConsumedQuantity,

        osu.PulsesNo,

        osu.UsageDate,

        osu.Notes,

        osu.CreatedAt,

        p.PatientID,

        p.FileNo,

        p.FullName AS PatientName,

        o.OfferID,

        o.OfferName,

        oc.CategoryID,

        oc.CategoryName,

        u.UserID,

        u.UserName AS DoctorUserName

      FROM dbo.OfferSubscriptionUsage osu

      INNER JOIN dbo.LaserSessions ls
        ON osu.SessionID = ls.SessionID

      INNER JOIN dbo.Patients p
        ON ls.PatientID = p.PatientID

      INNER JOIN dbo.OfferSubscriptions os
        ON osu.OfferSubscriptionID =
           os.OfferSubscriptionID

      INNER JOIN dbo.Offers o
        ON os.OfferID = o.OfferID

      LEFT JOIN dbo.OfferCategories oc
        ON o.CategoryID = oc.CategoryID

      LEFT JOIN dbo.Users u
        ON ls.UserID = u.UserID

      WHERE
        osu.OfferSubscriptionID =
        @OfferSubscriptionID

      ORDER BY
        osu.UsageDate ASC,
        osu.OfferSubscriptionUsageID ASC
    `);


  return result.recordset;
};


// =====================================================
// EXPORT
// =====================================================

export {
  createOfferSubscription,

  getOfferSubscriptionById,

  updateOfferSubscription,

  deleteOfferSubscription,

  getPatientOfferSubscriptions,

  getActivePatientOffers,

  getOfferSubscriptionPayments,

  getOfferSubscriptionPaidTotal,

  addOfferSubscriptionPayment,

  updateOfferSubscriptionPayment,

  deleteOfferSubscriptionPayment,
  
  consumeOfferSubscription,

  getSessionOfferUsages,

  updateOfferSubscriptionUsage,

  deleteOfferSubscriptionUsage,
  
  getOfferSubscriptionUsage,
};
