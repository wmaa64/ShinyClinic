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
    .input(
      "SessionID",
      sql.Int,
      Number(sessionID)
    )
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
 * Create a new session payment
 *
 * Normal payment:
 *   SessionPayments
 *   + MoneySafeTransactions Payment
 *   + MoneySafeAccounts CurrentBalance
 *
 * Coupon payment:
 *   SessionPayments only
 *   No Money Safe movement
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

  if (    !Number.isInteger(numericSessionID) ||    numericSessionID <= 0  ) {
    throw new Error("Valid SessionID is required.");
  }

  if (    !Number.isInteger(numericPatientID) ||    numericPatientID <= 0  ) {
    throw new Error("Valid PatientID is required.");
  }

  if (    !Number.isFinite(numericAmountPaid) ||    numericAmountPaid <= 0  ) {
    throw new Error(
      "Payment amount must be greater than zero."
    );
  }

  if (    !Number.isInteger(numericUserID) ||    numericUserID <= 0  ) {
    throw new Error("Valid UserID is required.");
  }

  if (!paymentMethod) {
    throw new Error("Payment method is required.");
  }


  const transaction = new sql.Transaction(pool);


  try {

    await transaction.begin();


    // =====================================================
    // VALIDATE SESSION / PATIENT
    // =====================================================

    const sessionRequest =   new sql.Request(transaction);

    sessionRequest.input(      "SessionID",      sql.Int,      numericSessionID    );

    sessionRequest.input(      "PatientID",      sql.Int,      numericPatientID    );

    const sessionResult =
      await sessionRequest.query(`
        SELECT TOP 1
          SessionID,
          PatientID
        FROM dbo.LaserSessions
        WHERE
          SessionID = @SessionID
          AND PatientID = @PatientID
      `);


    if (      sessionResult.recordset.length === 0    ) {

      throw new Error(
        "The selected session does not belong to this patient."
      );

    }


    let validCouponID = null;
    let validCouponNo = null;


    // =====================================================
    // COUPON VALIDATION
    // =====================================================

    if (paymentMethod === "Coupon") {

      const numericCouponID =        Number(couponID);


      if (        !Number.isInteger(numericCouponID) ||        numericCouponID <= 0      ) {

        throw new Error(
          "Valid CouponID is required."
        );

      }


      const couponRequest =        new sql.Request(transaction);


      couponRequest.input(        "CouponID",        sql.Int,        numericCouponID      );

      couponRequest.input(        "PatientID",        sql.Int,        numericPatientID      );


      const couponResult =
        await couponRequest.query(`
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


      if (
        couponResult.recordset.length === 0
      ) {

        throw new Error(
          "This coupon is invalid, expired, not started yet, already used, or does not belong to this patient."
        );

      }


      const coupon =        couponResult.recordset[0];

      const couponAmount =        Number(coupon.Amount);


      if (        numericAmountPaid !== couponAmount      ) {

        throw new Error(
          "The payment amount must equal the coupon value."
        );

      }


      if (        couponNo &&        String(couponNo) !==          String(coupon.CouponNo)      ) {

        throw new Error(
          "Coupon number does not match CouponID."
        );

      }


      validCouponID =        coupon.CouponID;

      validCouponNo =        coupon.CouponNo;

    }


    // =====================================================
    // INSERT SESSION PAYMENT
    // =====================================================

    const paymentRequest =      new sql.Request(transaction);


    paymentRequest.input(      "SessionID",      sql.Int,      numericSessionID    );

    paymentRequest.input(      "PatientID",      sql.Int,      numericPatientID    );

    paymentRequest.input(      "AmountPaid",      sql.Decimal(18, 2),      numericAmountPaid    );

    paymentRequest.input(      "PaymentMethod",      sql.NVarChar(50),      paymentMethod    );

    paymentRequest.input(      "Notes",  sql.NVarChar(500),   notes        ? String(notes).trim()        : null    );

    paymentRequest.input(      "UserID",      sql.Int,      numericUserID    );

    paymentRequest.input(      "CouponID",      sql.Int,      validCouponID    );

    paymentRequest.input(      "CouponNo",      sql.NVarChar(50),      validCouponNo    );


    const paymentResult =
      await paymentRequest.query(`
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


    const payment =
      paymentResult.recordset[0];


    // =====================================================
    // MONEY SAFE
    // COUPON DOES NOT REPRESENT MONEY RECEIVED
    // =====================================================

    if (paymentMethod !== "Coupon") {

      // -----------------------------------------------
      // Find the Money Safe account
      // -----------------------------------------------

      const accountRequest =        new sql.Request(transaction);

      accountRequest.input(        "PaymentMethod",        sql.NVarChar(30),        paymentMethod      );

      const accountResult =
        await accountRequest.query(`
          SELECT TOP 1
            MoneySafeAccountID,
            AccountName,
            CurrentBalance,
            IsActive
          FROM dbo.MoneySafeAccounts WITH (UPDLOCK, HOLDLOCK)
          WHERE
            PaymentMethod = @PaymentMethod
            AND IsActive = 1
        `);


      if (
        accountResult.recordset.length === 0
      ) {

        throw new Error(
          `No active Money Safe account exists for payment method "${paymentMethod}".`
        );

      }


      const account =
        accountResult.recordset[0];


      // -----------------------------------------------
      // Increase current balance
      // -----------------------------------------------

      const balanceRequest =        new sql.Request(transaction);

      balanceRequest.input(        "MoneySafeAccountID",        sql.Int,        account.MoneySafeAccountID      );

      balanceRequest.input(        "Amount",        sql.Decimal(18, 2),        numericAmountPaid      );

      await balanceRequest.query(`
        UPDATE dbo.MoneySafeAccounts
        SET
          CurrentBalance =
            CurrentBalance + @Amount
        WHERE
          MoneySafeAccountID =
            @MoneySafeAccountID
      `);


      // -----------------------------------------------
      // Record Money Safe transaction
      // -----------------------------------------------

      const safeRequest =        new sql.Request(transaction);

      safeRequest.input(        "MoneySafeAccountID",        sql.Int,        account.MoneySafeAccountID      );

      safeRequest.input(        "TransactionType",        sql.NVarChar(30),        "Payment"      );

      safeRequest.input(        "Amount",        sql.Decimal(18, 2),        numericAmountPaid      );

      safeRequest.input(        "ReferenceType",        sql.NVarChar(50),        "SessionPayment"      );

      safeRequest.input(        "ReferenceID",        sql.Int,        payment.SessionPaymentID      );

      safeRequest.input(        "Description",  sql.NVarChar(500), `Session payment #${payment.SessionPaymentID}`  );

      safeRequest.input(        "UserID",        sql.Int,        numericUserID      );


      await safeRequest.query(`
        INSERT INTO dbo.MoneySafeTransactions
        (
          MoneySafeAccountID,
          TransactionType,
          Amount,
          ReferenceType,
          ReferenceID,
          Description,
          UserID
        )
        VALUES
        (
          @MoneySafeAccountID,
          @TransactionType,
          @Amount,
          @ReferenceType,
          @ReferenceID,
          @Description,
          @UserID
        )
      `);

    }


    // =====================================================
    // MARK COUPON AS USED
    // =====================================================

    if (paymentMethod === "Coupon") {

      const updateCouponRequest =        new sql.Request(transaction);


      updateCouponRequest.input(        "CouponID",        sql.Int,        validCouponID      );

      updateCouponRequest.input(        "PatientID",        sql.Int,        numericPatientID      );

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


      if (        updateCouponResult.rowsAffected[0] !== 1      ) {

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
 *
 * Money Safe transactions are never deleted.
 *
 * If the payment amount/method changes:
 *
 * 1. Reverse the original Money Safe movement.
 * 2. Create a new Payment movement.
 *
 * This preserves the complete financial audit trail.
 */
const updateSessionPayment = async ({
  paymentID,
  amountPaid,
  paymentMethod,
  notes,
  userID,
}) => {

  if (!paymentID) {
    throw new Error("Payment ID is required.");
  }

  if (
    amountPaid === undefined ||
    amountPaid === null ||
    amountPaid === ""
  ) {
    throw new Error(
      "Payment amount is required."
    );
  }

  const amount = Number(amountPaid);


  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {

    throw new Error(
      "Payment amount must be greater than zero."
    );

  }


  if (paymentMethod === "Coupon") {

    throw new Error(
      "Coupon payments cannot be created or converted through payment editing."
    );

  }


  const numericPaymentID =
    Number(paymentID);

  const numericUserID =
    Number(userID);


  if (
    !Number.isInteger(numericPaymentID) ||
    numericPaymentID <= 0
  ) {

    throw new Error(
      "Valid Payment ID is required."
    );

  }


  if (
    !Number.isInteger(numericUserID) ||
    numericUserID <= 0
  ) {

    throw new Error(
      "Valid UserID is required."
    );

  }


  if (!paymentMethod) {

    throw new Error(
      "Payment method is required."
    );

  }


  const pool =
    await connectDB();

  const transaction =
    new sql.Transaction(pool);


  try {

    await transaction.begin();


    // =====================================================
    // GET ORIGINAL PAYMENT
    // =====================================================

    const paymentRequest =
      new sql.Request(transaction);

    paymentRequest.input(
      "PaymentID",
      sql.Int,
      numericPaymentID
    );


    const paymentResult =
      await paymentRequest.query(`
        SELECT TOP 1
          SessionPaymentID,
          SessionID,
          PatientID,
          AmountPaid,
          PaymentMethod,
          CouponID,
          CouponNo
        FROM dbo.SessionPayments
        WHERE
          SessionPaymentID =
            @PaymentID
      `);


    if (
      paymentResult.recordset.length === 0
    ) {

      throw new Error(
        "Payment record not found."
      );

    }


    const oldPayment =
      paymentResult.recordset[0];


    if (oldPayment.CouponID) {

      throw new Error(
        "Coupon payments cannot be edited."
      );

    }


    const oldAmount =
      Number(oldPayment.AmountPaid);

    const oldPaymentMethod =
      oldPayment.PaymentMethod;


    // =====================================================
    // GET ORIGINAL MONEY SAFE TRANSACTION
    // =====================================================

    const oldSafeRequest =
      new sql.Request(transaction);

    oldSafeRequest.input(
      "ReferenceID",
      sql.Int,
      numericPaymentID
    );


    const oldSafeResult =
      await oldSafeRequest.query(`
        SELECT TOP 1
          MoneySafeTransactionID,
          MoneySafeAccountID,
          Amount,
          TransactionType,
          ReferenceType
        FROM dbo.MoneySafeTransactions
        WHERE
          ReferenceType = N'SessionPayment'
          AND ReferenceID = @ReferenceID
          AND TransactionType = N'Payment'
        ORDER BY
          MoneySafeTransactionID DESC
      `);


    if (
      oldSafeResult.recordset.length === 0
    ) {

      throw new Error(
        "The original Money Safe transaction was not found."
      );

    }


    const oldSafeTransaction =
      oldSafeResult.recordset[0];


    // =====================================================
    // REVERSE ORIGINAL MONEY SAFE TRANSACTION
    // =====================================================

    const oldAccountRequest =
      new sql.Request(transaction);

    oldAccountRequest.input(
      "MoneySafeAccountID",
      sql.Int,
      oldSafeTransaction.MoneySafeAccountID
    );

    oldAccountRequest.input(
      "Amount",
      sql.Decimal(18, 2),
      oldAmount
    );


    const oldAccountResult =
      await oldAccountRequest.query(`
        SELECT TOP 1
          MoneySafeAccountID,
          AccountName,
          PaymentMethod,
          CurrentBalance
        FROM dbo.MoneySafeAccounts WITH (UPDLOCK, HOLDLOCK)
        WHERE
          MoneySafeAccountID =
            @MoneySafeAccountID
      `);


    if (
      oldAccountResult.recordset.length === 0
    ) {

      throw new Error(
        "The original Money Safe account was not found."
      );

    }


    const oldAccount =
      oldAccountResult.recordset[0];


    if (
      Number(oldAccount.CurrentBalance) <
      oldAmount
    ) {

      throw new Error(
        `Insufficient balance in Money Safe account "${oldAccount.AccountName}" to reverse this payment.`
      );

    }


    const reverseBalanceRequest =
      new sql.Request(transaction);

    reverseBalanceRequest.input(
      "MoneySafeAccountID",
      sql.Int,
      oldAccount.MoneySafeAccountID
    );

    reverseBalanceRequest.input(
      "Amount",
      sql.Decimal(18, 2),
      oldAmount
    );


    await reverseBalanceRequest.query(`
      UPDATE dbo.MoneySafeAccounts
      SET
        CurrentBalance =
          CurrentBalance - @Amount
      WHERE
        MoneySafeAccountID =
          @MoneySafeAccountID
    `);


    // -----------------------------------------------
    // Audit reversal
    // -----------------------------------------------

    const reverseRequest =
      new sql.Request(transaction);

    reverseRequest.input(
      "MoneySafeAccountID",
      sql.Int,
      oldAccount.MoneySafeAccountID
    );

    reverseRequest.input(
      "Amount",
      sql.Decimal(18, 2),
      oldAmount
    );

    reverseRequest.input(
      "ReferenceID",
      sql.Int,
      numericPaymentID
    );

    reverseRequest.input(
      "UserID",
      sql.Int,
      numericUserID
    );

    reverseRequest.input(
      "Description",
      sql.NVarChar(500),
      `Reversal of session payment #${numericPaymentID}`
    );


    await reverseRequest.query(`
      INSERT INTO dbo.MoneySafeTransactions
      (
        MoneySafeAccountID,
        TransactionType,
        Amount,
        ReferenceType,
        ReferenceID,
        Description,
        UserID
      )
      VALUES
      (
        @MoneySafeAccountID,
        N'AdjustmentOut',
        @Amount,
        N'SessionPayment',
        @ReferenceID,
        @Description,
        @UserID
      )
    `);


    // =====================================================
    // UPDATE SESSION PAYMENT
    // =====================================================

    const updatePaymentRequest =
      new sql.Request(transaction);

    updatePaymentRequest.input(
      "SessionPaymentID",
      sql.Int,
      numericPaymentID
    );

    updatePaymentRequest.input(
      "AmountPaid",
      sql.Decimal(18, 2),
      amount
    );

    updatePaymentRequest.input(
      "PaymentMethod",
      sql.NVarChar(50),
      paymentMethod
    );

    updatePaymentRequest.input(
      "Notes",
      sql.NVarChar(500),
      notes
        ? String(notes).trim()
        : null
    );


    const updateResult =
      await updatePaymentRequest.query(`
        UPDATE dbo.SessionPayments
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
          INSERTED.CreatedAt,
          INSERTED.CouponID,
          INSERTED.CouponNo
        WHERE
          SessionPaymentID =
            @SessionPaymentID
      `);


    if (
      updateResult.recordset.length === 0
    ) {

      throw new Error(
        "Payment record could not be updated."
      );

    }


    const updatedPayment =
      updateResult.recordset[0];


    // =====================================================
    // FIND NEW MONEY SAFE ACCOUNT
    // =====================================================

    const newAccountRequest =
      new sql.Request(transaction);

    newAccountRequest.input(
      "PaymentMethod",
      sql.NVarChar(30),
      paymentMethod
    );


    const newAccountResult =
      await newAccountRequest.query(`
        SELECT TOP 1
          MoneySafeAccountID,
          AccountName,
          PaymentMethod,
          CurrentBalance,
          IsActive
        FROM dbo.MoneySafeAccounts WITH (UPDLOCK, HOLDLOCK)
        WHERE
          PaymentMethod =
            @PaymentMethod
          AND IsActive = 1
      `);


    if (
      newAccountResult.recordset.length === 0
    ) {

      throw new Error(
        `No active Money Safe account exists for payment method "${paymentMethod}".`
      );

    }


    const newAccount =
      newAccountResult.recordset[0];


    // =====================================================
    // ADD NEW MONEY SAFE BALANCE
    // =====================================================

    const newBalanceRequest =
      new sql.Request(transaction);

    newBalanceRequest.input(
      "MoneySafeAccountID",
      sql.Int,
      newAccount.MoneySafeAccountID
    );

    newBalanceRequest.input(
      "Amount",
      sql.Decimal(18, 2),
      amount
    );


    await newBalanceRequest.query(`
      UPDATE dbo.MoneySafeAccounts
      SET
        CurrentBalance =
          CurrentBalance + @Amount
      WHERE
        MoneySafeAccountID =
          @MoneySafeAccountID
    `);


    // =====================================================
    // RECORD NEW PAYMENT MOVEMENT
    // =====================================================

    const newSafeRequest =
      new sql.Request(transaction);

    newSafeRequest.input(
      "MoneySafeAccountID",
      sql.Int,
      newAccount.MoneySafeAccountID
    );

    newSafeRequest.input(
      "Amount",
      sql.Decimal(18, 2),
      amount
    );

    newSafeRequest.input(
      "ReferenceID",
      sql.Int,
      numericPaymentID
    );

    newSafeRequest.input(
      "UserID",
      sql.Int,
      numericUserID
    );

    newSafeRequest.input(
      "Description",
      sql.NVarChar(500),
      `Updated session payment #${numericPaymentID}`
    );


    await newSafeRequest.query(`
      INSERT INTO dbo.MoneySafeTransactions
      (
        MoneySafeAccountID,
        TransactionType,
        Amount,
        ReferenceType,
        ReferenceID,
        Description,
        UserID
      )
      VALUES
      (
        @MoneySafeAccountID,
        N'Payment',
        @Amount,
        N'SessionPayment',
        @ReferenceID,
        @Description,
        @UserID
      )
    `);


    await transaction.commit();


    return updatedPayment;

  } catch (error) {

    try {

      await transaction.rollback();

    } catch (rollbackError) {

      console.error(
        "Payment update rollback error:",
        rollbackError
      );

    }

    throw error;

  }

};


/**
 * Delete an existing payment
 *
 * The original Money Safe Payment transaction
 * is NEVER deleted.
 *
 * Instead, an AdjustmentOut transaction is created
 * to reverse the money movement.
 */
const deleteSessionPayment = async (
  paymentID,
  userID
) => {

  const numericPaymentID =
    Number(paymentID);

  const numericUserID =
    Number(userID);


  if (
    !Number.isInteger(numericPaymentID) ||
    numericPaymentID <= 0
  ) {

    throw new Error(
      "Valid Payment ID is required."
    );

  }


  if (
    !Number.isInteger(numericUserID) ||
    numericUserID <= 0
  ) {

    throw new Error(
      "Valid UserID is required."
    );

  }


  const pool =
    await connectDB();

  const transaction =
    new sql.Transaction(pool);


  try {

    await transaction.begin();


    // =====================================================
    // GET PAYMENT
    // =====================================================

    const paymentRequest =
      new sql.Request(transaction);

    paymentRequest.input(
      "PaymentID",
      sql.Int,
      numericPaymentID
    );


    const paymentResult =
      await paymentRequest.query(`
        SELECT TOP 1
          SessionPaymentID,
          SessionID,
          PatientID,
          AmountPaid,
          PaymentMethod,
          CouponID,
          CouponNo
        FROM dbo.SessionPayments
        WHERE
          SessionPaymentID =
            @PaymentID
      `);


    if (
      paymentResult.recordset.length === 0
    ) {

      throw new Error(
        "Payment not found."
      );

    }


    const payment =
      paymentResult.recordset[0];


    // =====================================================
    // COUPON PAYMENT
    // =====================================================

    if (payment.CouponID) {

      const deleteCouponPaymentRequest =
        new sql.Request(transaction);

      deleteCouponPaymentRequest.input(
        "PaymentID",
        sql.Int,
        numericPaymentID
      );


      await deleteCouponPaymentRequest.query(`
        DELETE FROM dbo.SessionPayments
        WHERE
          SessionPaymentID =
            @PaymentID
      `);


      // -----------------------------------------------
      // Restore coupon
      // -----------------------------------------------

      const restoreCouponRequest =
        new sql.Request(transaction);

      restoreCouponRequest.input(
        "CouponID",
        sql.Int,
        payment.CouponID
      );


      await restoreCouponRequest.query(`
        UPDATE dbo.Coupons
        SET
          Status = N'Valid',
          UsedAt = NULL
        WHERE
          CouponID =
            @CouponID
      `);


      await transaction.commit();


      return {
        message:
          "Coupon payment deleted successfully.",
        payment,
      };

    }


    // =====================================================
    // FIND ORIGINAL MONEY SAFE TRANSACTION
    // =====================================================

    const safeRequest =
      new sql.Request(transaction);

    safeRequest.input(
      "ReferenceID",
      sql.Int,
      numericPaymentID
    );


    const safeResult =
      await safeRequest.query(`
        SELECT TOP 1
          MoneySafeTransactionID,
          MoneySafeAccountID,
          Amount,
          TransactionType
        FROM dbo.MoneySafeTransactions
        WHERE
          ReferenceType = N'SessionPayment'
          AND ReferenceID = @ReferenceID
          AND TransactionType = N'Payment'
        ORDER BY
          MoneySafeTransactionID DESC
      `);


    if (
      safeResult.recordset.length === 0
    ) {

      throw new Error(
        "The original Money Safe transaction was not found."
      );

    }


    const safeTransaction =
      safeResult.recordset[0];


    const paymentAmount =
      Number(payment.AmountPaid);


    // =====================================================
    // LOCK MONEY SAFE ACCOUNT
    // =====================================================

    const accountRequest =
      new sql.Request(transaction);

    accountRequest.input(
      "MoneySafeAccountID",
      sql.Int,
      safeTransaction.MoneySafeAccountID
    );


    const accountResult =
      await accountRequest.query(`
        SELECT TOP 1
          MoneySafeAccountID,
          AccountName,
          CurrentBalance
        FROM dbo.MoneySafeAccounts WITH (UPDLOCK, HOLDLOCK)
        WHERE
          MoneySafeAccountID =
            @MoneySafeAccountID
      `);


    if (
      accountResult.recordset.length === 0
    ) {

      throw new Error(
        "Money Safe account not found."
      );

    }


    const account =
      accountResult.recordset[0];


    if (
      Number(account.CurrentBalance) <
      paymentAmount
    ) {

      throw new Error(
        `Insufficient balance in Money Safe account "${account.AccountName}" to reverse this payment.`
      );

    }


    // =====================================================
    // DECREASE MONEY SAFE BALANCE
    // =====================================================

    const balanceRequest =
      new sql.Request(transaction);

    balanceRequest.input(
      "MoneySafeAccountID",
      sql.Int,
      account.MoneySafeAccountID
    );

    balanceRequest.input(
      "Amount",
      sql.Decimal(18, 2),
      paymentAmount
    );


    await balanceRequest.query(`
      UPDATE dbo.MoneySafeAccounts
      SET
        CurrentBalance =
          CurrentBalance - @Amount
      WHERE
        MoneySafeAccountID =
          @MoneySafeAccountID
    `);


    // =====================================================
    // RECORD AUDIT REVERSAL
    // =====================================================

    const adjustmentRequest =
      new sql.Request(transaction);

    adjustmentRequest.input(
      "MoneySafeAccountID",
      sql.Int,
      account.MoneySafeAccountID
    );

    adjustmentRequest.input(
      "Amount",
      sql.Decimal(18, 2),
      paymentAmount
    );

    adjustmentRequest.input(
      "ReferenceID",
      sql.Int,
      numericPaymentID
    );

    adjustmentRequest.input(
      "UserID",
      sql.Int,
      numericUserID
    );

    adjustmentRequest.input(
      "Description",
      sql.NVarChar(500),
      `Reversal of deleted session payment #${numericPaymentID}`
    );


    await adjustmentRequest.query(`
      INSERT INTO dbo.MoneySafeTransactions
      (
        MoneySafeAccountID,
        TransactionType,
        Amount,
        ReferenceType,
        ReferenceID,
        Description,
        UserID
      )
      VALUES
      (
        @MoneySafeAccountID,
        N'AdjustmentOut',
        @Amount,
        N'SessionPayment',
        @ReferenceID,
        @Description,
        @UserID
      )
    `);


    // =====================================================
    // DELETE SESSION PAYMENT
    // =====================================================

    const deleteRequest =
      new sql.Request(transaction);

    deleteRequest.input(
      "PaymentID",
      sql.Int,
      numericPaymentID
    );


    await deleteRequest.query(`
      DELETE FROM dbo.SessionPayments
      WHERE
        SessionPaymentID =
          @PaymentID
    `);


    await transaction.commit();


    return {
      message:
        "Payment deleted successfully.",
      payment,
    };

  } catch (error) {

    try {

      await transaction.rollback();

    } catch (rollbackError) {

      console.error(
        "Payment delete rollback error:",
        rollbackError
      );

    }

    throw error;

  }

};


/**
 * EXPORTS
 */
export {
  createSessionPayment,
  getSessionPayments,
  updateSessionPayment,
  deleteSessionPayment
};