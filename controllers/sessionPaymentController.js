import connectDB, { sql } from "../lib/db";

/**
 * Get all payments for a specific session
 */
 const getSessionPayments = async (sessionID) => {
  if (!sessionID) {
    throw new Error("Session ID is required.");
  }

  const pool = await connectDB();

  const result = await pool
    .request()
    .input("SessionID", sql.Int, Number(sessionID))
    .query(`
      SELECT
        SP.SessionPaymentID,
        SP.SessionID,
        SP.PatientID,
        SP.PaymentDate,
        SP.AmountPaid,
        SP.PaymentMethod,
        SP.Notes,
        SP.UserID,
        SP.CreatedAt,
        SP.CouponID,
        SP.CouponNo,
        U.FullName AS UserName
      FROM dbo.SessionPayments SP
      INNER JOIN dbo.Users U
        ON SP.UserID = U.UserID
      WHERE SP.SessionID = @SessionID
      ORDER BY SP.PaymentDate DESC
    `);

  return result.recordset;
};

/**
 * Create a new payment
 */

const createSessionPayment = async ({
  sessionID,
  patientID,
  amountPaid,
  paymentMethod,
  notes,
  userID,
  couponID,
  couponNo,
}) => {
  const pool = await connectDB();

  const numericSessionID = Number(sessionID);
  const numericPatientID = Number(patientID);
  const numericAmountPaid = Number(amountPaid);
  const numericUserID = Number(userID);

  if (
    !Number.isInteger(numericSessionID) ||
    numericSessionID <= 0
  ) {
    throw new Error("Valid SessionID is required.");
  }

  if (
    !Number.isInteger(numericPatientID) ||
    numericPatientID <= 0
  ) {
    throw new Error("Valid PatientID is required.");
  }

  if (
    !Number.isFinite(numericAmountPaid) ||
    numericAmountPaid <= 0
  ) {
    throw new Error("Payment amount must be greater than zero.");
  }

  if (
    !Number.isInteger(numericUserID) ||
    numericUserID <= 0
  ) {
    throw new Error("Valid UserID is required.");
  }

  if (!paymentMethod) {
    throw new Error("Payment method is required.");
  }

  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const request = new sql.Request(transaction);

    // -----------------------------------------------
    // Validate session and patient relationship
    // -----------------------------------------------

    request.input("SessionID", sql.Int, numericSessionID);
    request.input("PatientID", sql.Int, numericPatientID);

    const sessionResult = await request.query(`
      SELECT TOP 1
        SessionID,
        PatientID
      FROM dbo.LaserSessions
      WHERE
        SessionID = @SessionID
        AND PatientID = @PatientID
    `);

    if (sessionResult.recordset.length === 0) {
      throw new Error(
        "The selected session does not belong to this patient."
      );
    }

    let validCouponID = null;
    let validCouponNo = null;

    // -----------------------------------------------
    // Coupon payment validation
    // -----------------------------------------------

    if (paymentMethod === "Coupon") {
      const numericCouponID = Number(couponID);

      if (
        !Number.isInteger(numericCouponID) ||
        numericCouponID <= 0
      ) {
        throw new Error("Valid CouponID is required.");
      }

      const couponRequest = new sql.Request(transaction);

      couponRequest.input(
        "CouponID",
        sql.Int,
        numericCouponID
      );

      couponRequest.input(
        "PatientID",
        sql.Int,
        numericPatientID
      );

      const couponResult = await couponRequest.query(`
        SELECT TOP 1
          CouponID,
          CouponNo,
          PatientID,
          Amount,
          FromDate,
          ToDate,
          Status
        FROM dbo.Coupons
        WHERE
          CouponID = @CouponID
          AND PatientID = @PatientID
          AND Status = N'Valid'
          AND CAST(GETDATE() AS date)
              BETWEEN FromDate AND ToDate
      `);

      if (couponResult.recordset.length === 0) {
        throw new Error(
          "This coupon is invalid, expired, not started yet, already used, or does not belong to this patient."
        );
      }

      const coupon = couponResult.recordset[0];
      const couponAmount = Number(coupon.Amount);

      if (numericAmountPaid !== couponAmount) {
        throw new Error(
          "The payment amount must equal the coupon value."
        );
      }

      if (
        couponNo &&
        String(couponNo) !== String(coupon.CouponNo)
      ) {
        throw new Error("Coupon number does not match CouponID.");
      }

      validCouponID = coupon.CouponID;
      validCouponNo = coupon.CouponNo;
    }

    // -----------------------------------------------
    // Insert payment
    // -----------------------------------------------

    const paymentRequest = new sql.Request(transaction);

    paymentRequest.input(
      "SessionID",
      sql.Int,
      numericSessionID
    );

    paymentRequest.input(
      "PatientID",
      sql.Int,
      numericPatientID
    );

    paymentRequest.input(
      "AmountPaid",
      sql.Decimal(18, 2),
      numericAmountPaid
    );

    paymentRequest.input(
      "PaymentMethod",
      sql.NVarChar(50),
      paymentMethod
    );

    paymentRequest.input(
      "Notes",
      sql.NVarChar(500),
      notes ? String(notes).trim() : null
    );

    paymentRequest.input(
      "UserID",
      sql.Int,
      numericUserID
    );

    paymentRequest.input(
      "CouponID",
      sql.Int,
      validCouponID
    );

    paymentRequest.input(
      "CouponNo",
      sql.NVarChar(50),
      validCouponNo
    );

    const paymentResult = await paymentRequest.query(`
      INSERT INTO dbo.SessionPayments
      (
        SessionID,
        PatientID,
        AmountPaid,
        PaymentMethod,
        Notes,
        UserID,
        CouponID,
        CouponNo
      )
      OUTPUT
        INSERTED.SessionPaymentID,
        INSERTED.SessionID,
        INSERTED.PatientID,
        INSERTED.PaymentDate,
        INSERTED.AmountPaid,
        INSERTED.PaymentMethod,
        INSERTED.Notes,
        INSERTED.UserID,
        INSERTED.CreatedAt,
        INSERTED.CouponID,
        INSERTED.CouponNo
      VALUES
      (
        @SessionID,
        @PatientID,
        @AmountPaid,
        @PaymentMethod,
        @Notes,
        @UserID,
        @CouponID,
        @CouponNo
      )
    `);

    // -----------------------------------------------
    // Mark coupon as used
    // -----------------------------------------------

    if (paymentMethod === "Coupon") {
      const updateCouponRequest = new sql.Request(
        transaction
      );

      updateCouponRequest.input(
        "CouponID",
        sql.Int,
        validCouponID
      );

      updateCouponRequest.input(
        "PatientID",
        sql.Int,
        numericPatientID
      );

      const updateCouponResult =
        await updateCouponRequest.query(`
          UPDATE dbo.Coupons
          SET
            Status = N'Used',
            UsedAt = GETDATE()
          WHERE
            CouponID = @CouponID
            AND PatientID = @PatientID
            AND Status = N'Valid'
            AND CAST(GETDATE() AS date)
                BETWEEN FromDate AND ToDate
        `);

      if (updateCouponResult.rowsAffected[0] !== 1) {
        throw new Error(
          "The coupon could not be marked as used."
        );
      }
    }

    await transaction.commit();

    return paymentResult.recordset[0];
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      console.error(
        "Payment transaction rollback error:",
        rollbackError
      );
    }

    throw error;
  }
};


/**
 * Update an existing payment
 */
const updateSessionPayment = async ({
  paymentID,
  amountPaid,
  paymentMethod,
  notes,
}) => {
  if (!paymentID) {
    throw new Error("Payment ID is required.");
  }

  if (amountPaid === undefined || amountPaid === null || amountPaid === "") {
    throw new Error("Payment amount is required.");
  }

  const amount = Number(amountPaid);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  if (paymentMethod === "Coupon") {
    throw new Error(
      "Coupon payments cannot be created or converted through payment editing."
    );
  }

  const pool = await connectDB();

  const result = await pool
    .request()
    .input(
      "SessionPaymentID",
      sql.Int,
      Number(paymentID)
    )
    .input(
      "AmountPaid",
      sql.Decimal(18, 2),
      amount
    )
    .input(
      "PaymentMethod",
      sql.NVarChar(50),
      paymentMethod || null
    )
    .input(
      "Notes",
      sql.NVarChar(500),
      notes || null
    )
    .query(`
      UPDATE SessionPayments
      SET
          AmountPaid = @AmountPaid,
          PaymentMethod = @PaymentMethod,
          Notes = @Notes
      OUTPUT
          INSERTED.SessionPaymentID,
          INSERTED.SessionID,
          INSERTED.PatientID,
          INSERTED.PaymentDate,
          INSERTED.AmountPaid,
          INSERTED.PaymentMethod,
          INSERTED.Notes,
          INSERTED.UserID,
          INSERTED.CreatedAt
      WHERE SessionPaymentID = @SessionPaymentID
    `);

  if (result.recordset.length === 0) {
    throw new Error("Payment record not found.");
  }

  return result.recordset[0];
};


/**
 * Delete an existing payment
 */
 async function deleteSessionPayment(paymentID) {
  const pool = await connectDB();

  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    // 1. Get payment and coupon information
    const paymentResult = await new sql.Request(transaction)
      .input("PaymentID", sql.Int, paymentID)
      .query(`
        SELECT
          SessionPaymentID,
          SessionID,
          PatientID,
          AmountPaid,
          PaymentMethod,
          CouponID,
          CouponNo
        FROM dbo.SessionPayments
        WHERE SessionPaymentID = @PaymentID
      `);

    if (paymentResult.recordset.length === 0) {
      throw new Error("Payment not found.");
    }

    const payment = paymentResult.recordset[0];

    // 2. Delete the payment using the same transaction
    await new sql.Request(transaction)
      .input("PaymentID", sql.Int, paymentID)
      .query(`
        DELETE FROM dbo.SessionPayments
        WHERE SessionPaymentID = @PaymentID
      `);

    // 3. If it was a coupon payment, restore the coupon
    if (payment.CouponID) {
      await new sql.Request(transaction)
        .input("CouponID", sql.Int, payment.CouponID)
        .query(`
          UPDATE dbo.Coupons
          SET
            Status = N'Valid',
            UsedAt = NULL
          WHERE CouponID = @CouponID
        `);
    }

    await transaction.commit();

    return {
      message: "Payment deleted successfully.",
      payment,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}


export {
  createSessionPayment,
  getSessionPayments,
  updateSessionPayment,
  deleteSessionPayment
};