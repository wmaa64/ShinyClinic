import connectDB, { sql } from "../lib/db";


// =====================================================
// GET MONEY SAFE ACCOUNTS
// =====================================================

const getMoneySafeAccounts = async (includeInactive = false) => {

  const pool = await connectDB();

  const request = pool.request();

  request.input(
    "IncludeInactive",
    sql.Bit,
    includeInactive ? 1 : 0
  );

  const result = await request.query(`
    SELECT
      MoneySafeAccountID,
      AccountName,
      PaymentMethod,
      OpeningBalance,
      CurrentBalance,
      IsActive,
      Notes,
      CreatedAt
    FROM dbo.MoneySafeAccounts
    WHERE
      @IncludeInactive = 1
      OR IsActive = 1
    ORDER BY
      MoneySafeAccountID
  `);

  return result.recordset;
};


// =====================================================
// GET ONE MONEY SAFE ACCOUNT
// =====================================================

const getMoneySafeAccountById = async (accountID) => {

  const pool = await connectDB();

  const request = pool.request();

  request.input(
    "MoneySafeAccountID",
    sql.Int,
    accountID
  );

  const result = await request.query(`
    SELECT
      MoneySafeAccountID,
      AccountName,
      PaymentMethod,
      OpeningBalance,
      CurrentBalance,
      IsActive,
      Notes,
      CreatedAt
    FROM dbo.MoneySafeAccounts
    WHERE MoneySafeAccountID = @MoneySafeAccountID
  `);

  return result.recordset[0] || null;
};


// =====================================================
// GET MONEY SAFE ACCOUNT BY PAYMENT METHOD
// =====================================================

const getMoneySafeAccountByPaymentMethod = async (
  paymentMethod
) => {

  const pool = await connectDB();

  const request = pool.request();

  request.input(
    "PaymentMethod",
    sql.NVarChar(30),
    paymentMethod
  );

  const result = await request.query(`
    SELECT
      MoneySafeAccountID,
      AccountName,
      PaymentMethod,
      OpeningBalance,
      CurrentBalance,
      IsActive,
      Notes,
      CreatedAt
    FROM dbo.MoneySafeAccounts
    WHERE PaymentMethod = @PaymentMethod
  `);

  return result.recordset[0] || null;
};


// =====================================================
// OPEN / SET OPENING BALANCE
// =====================================================

const setOpeningBalance = async (
  accountID,
  openingBalance,
  userID = null,
  notes = null
) => {

  const pool = await connectDB();

  const transaction = new sql.Transaction(pool);

  try {

    await transaction.begin();

    const request = new sql.Request(transaction);

    request.input(
      "MoneySafeAccountID",
      sql.Int,
      accountID
    );

    request.input(
      "OpeningBalance",
      sql.Decimal(18, 2),
      openingBalance
    );

    const accountResult = await request.query(`
      SELECT
        MoneySafeAccountID,
        CurrentBalance
      FROM dbo.MoneySafeAccounts  WITH (UPDLOCK, HOLDLOCK)
      WHERE MoneySafeAccountID = @MoneySafeAccountID
        AND IsActive = 1
    `);

    if (accountResult.recordset.length === 0) {

      throw new Error(
        "Money safe account not found or inactive."
      );

    }

    const account = accountResult.recordset[0];

    // Opening balance should only be established
    // before normal transactions are recorded.
    if (Number(account.CurrentBalance) !== 0) {

      throw new Error(
        "Opening balance can only be set when the current balance is zero."
      );

    }

    const updateRequest = new sql.Request(transaction);

    updateRequest.input(
      "MoneySafeAccountID",
      sql.Int,
      accountID
    );

    updateRequest.input(
      "OpeningBalance",
      sql.Decimal(18, 2),
      openingBalance
    );

    await updateRequest.query(`
      UPDATE dbo.MoneySafeAccounts
      SET
        OpeningBalance = @OpeningBalance,
        CurrentBalance = @OpeningBalance
      WHERE MoneySafeAccountID = @MoneySafeAccountID
    `);

    const transactionRequest = new sql.Request(transaction);

    transactionRequest.input(
      "MoneySafeAccountID",
      sql.Int,
      accountID
    );

    transactionRequest.input(
      "Amount",
      sql.Decimal(18, 2),
      openingBalance
    );

    transactionRequest.input(
      "Description",
      sql.NVarChar(500),
      notes || "Opening balance"
    );

    transactionRequest.input(
      "UserID",
      sql.Int,
      userID
    );

    await transactionRequest.query(`
      INSERT INTO dbo.MoneySafeTransactions
      (
        MoneySafeAccountID,
        TransactionDate,
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
        GETDATE(),
        'Opening',
        @Amount,
        NULL,
        NULL,
        @Description,
        @UserID
      )
    `);

    await transaction.commit();

    return await getMoneySafeAccountById(accountID);

  } catch (error) {

    try {
      await transaction.rollback();
    } catch (rollbackError) {
      console.error(
        "Money safe rollback error:",
        rollbackError
      );
    }

    throw error;
  }
};


// =====================================================
// CREATE MONEY SAFE TRANSACTION
// =====================================================

const createMoneySafeTransaction = async ({
  accountID,
  transactionType,
  amount,
  referenceType = null,
  referenceID = null,
  description = null,
  userID = null,
}) => {

  const pool = await connectDB();

  const transaction = new sql.Transaction(pool);

  try {

    await transaction.begin();

    // =================================================
    // VALIDATION
    // =================================================

    if (!accountID) {
      throw new Error(
        "Money safe account is required."
      );
    }

    if (!transactionType) {
      throw new Error(
        "Transaction type is required."
      );
    }

    if (
      amount === undefined ||
      amount === null ||
      Number(amount) <= 0
    ) {
      throw new Error(
        "Transaction amount must be greater than zero."
      );
    }

    const allowedTypes = [
      "Opening",
      "Payment",
      "Purchase",
      "Expense",
      "AdjustmentIn",
      "AdjustmentOut",
      "Withdrawal",
      "Deposit",
    ];

    if (!allowedTypes.includes(transactionType)) {
      throw new Error(
        "Invalid money safe transaction type."
      );
    }

    // Opening is handled separately.
    if (transactionType === "Opening") {
      throw new Error(
        "Opening balance must be created using setOpeningBalance."
      );
    }

    // =================================================
    // GET ACCOUNT WITH LOCK
    // =================================================

    const accountRequest = new sql.Request(transaction);

    accountRequest.input(
      "MoneySafeAccountID",
      sql.Int,
      accountID
    );

    const accountResult = await accountRequest.query(`
      SELECT
        MoneySafeAccountID,
        CurrentBalance,
        IsActive
      FROM dbo.MoneySafeAccounts WITH (UPDLOCK, HOLDLOCK)
      WHERE MoneySafeAccountID = @MoneySafeAccountID
    `);

    if (accountResult.recordset.length === 0) {

      throw new Error(
        "Money safe account not found."
      );

    }

    const account = accountResult.recordset[0];

    if (!account.IsActive) {

      throw new Error(
        "Money safe account is inactive."
      );

    }

    const currentBalance =
      Number(account.CurrentBalance);

    const transactionAmount =
      Number(amount);

    const moneyInTypes = [
      "Payment",
      "Deposit",
      "AdjustmentIn",
    ];

    const moneyOutTypes = [
      "Purchase",
      "Expense",
      "AdjustmentOut",
      "Withdrawal",
    ];

    let newBalance;

    if (moneyInTypes.includes(transactionType)) {

      newBalance =
        currentBalance + transactionAmount;

    } else if (moneyOutTypes.includes(transactionType)) {

      newBalance =
        currentBalance - transactionAmount;

      if (newBalance < 0) {

        throw new Error(
          "Transaction cannot make the money safe balance negative."
        );

      }

    } else {

      throw new Error(
        "Unable to determine transaction direction."
      );

    }

    // =================================================
    // INSERT TRANSACTION
    // =================================================

    const insertRequest =
      new sql.Request(transaction);

    insertRequest.input(
      "MoneySafeAccountID",
      sql.Int,
      accountID
    );

    insertRequest.input(
      "TransactionType",
      sql.NVarChar(30),
      transactionType
    );

    insertRequest.input(
      "Amount",
      sql.Decimal(18, 2),
      transactionAmount
    );

    insertRequest.input(
      "ReferenceType",
      sql.NVarChar(50),
      referenceType
    );

    insertRequest.input(
      "ReferenceID",
      sql.Int,
      referenceID
    );

    insertRequest.input(
      "Description",
      sql.NVarChar(500),
      description
    );

    insertRequest.input(
      "UserID",
      sql.Int,
      userID
    );

    const insertResult =
      await insertRequest.query(`
        INSERT INTO dbo.MoneySafeTransactions
        (
          MoneySafeAccountID,
          TransactionDate,
          TransactionType,
          Amount,
          ReferenceType,
          ReferenceID,
          Description,
          UserID
        )
        OUTPUT
          INSERTED.MoneySafeTransactionID,
          INSERTED.MoneySafeAccountID,
          INSERTED.TransactionDate,
          INSERTED.TransactionType,
          INSERTED.Amount,
          INSERTED.ReferenceType,
          INSERTED.ReferenceID,
          INSERTED.Description,
          INSERTED.UserID,
          INSERTED.CreatedAt
        VALUES
        (
          @MoneySafeAccountID,
          GETDATE(),
          @TransactionType,
          @Amount,
          @ReferenceType,
          @ReferenceID,
          @Description,
          @UserID
        )
      `);

    // =================================================
    // UPDATE CURRENT BALANCE
    // =================================================

    const updateRequest =
      new sql.Request(transaction);

    updateRequest.input(
      "MoneySafeAccountID",
      sql.Int,
      accountID
    );

    updateRequest.input(
      "CurrentBalance",
      sql.Decimal(18, 2),
      newBalance
    );

    await updateRequest.query(`
      UPDATE dbo.MoneySafeAccounts
      SET
        CurrentBalance = @CurrentBalance
      WHERE MoneySafeAccountID = @MoneySafeAccountID
    `);

    await transaction.commit();

    return {
      transaction:
        insertResult.recordset[0],

      CurrentBalance:
        newBalance,
    };

  } catch (error) {

    try {
      await transaction.rollback();
    } catch (rollbackError) {
      console.error(
        "Money safe rollback error:",
        rollbackError
      );
    }

    throw error;
  }
};


// =====================================================
// GET MONEY SAFE TRANSACTIONS
// =====================================================

const getMoneySafeTransactions = async ({
  accountID = null,
  fromDate = null,
  toDate = null,
  transactionType = null,
} = {}) => {

  const pool = await connectDB();

  const request = pool.request();

  request.input(
    "MoneySafeAccountID",
    sql.Int,
    accountID
  );

  request.input(
    "FromDate",
    sql.Date,
    fromDate
  );

  request.input(
    "ToDate",
    sql.Date,
    toDate
  );

  request.input(
    "TransactionType",
    sql.NVarChar(30),
    transactionType
  );

  const result = await request.query(`
    SELECT
      MST.MoneySafeTransactionID,
      MST.MoneySafeAccountID,
      MSA.AccountName,
      MSA.PaymentMethod,
      MST.TransactionDate,
      MST.TransactionType,
      MST.Amount,
      MST.ReferenceType,
      MST.ReferenceID,
      MST.Description,
      MST.UserID,
      U.UserName,
      U.FullName,
      MST.CreatedAt
    FROM dbo.MoneySafeTransactions MST

    INNER JOIN dbo.MoneySafeAccounts MSA
      ON MSA.MoneySafeAccountID =
         MST.MoneySafeAccountID

    LEFT JOIN dbo.Users U
      ON U.UserID = MST.UserID

    WHERE
      (
        @MoneySafeAccountID IS NULL
        OR MST.MoneySafeAccountID =
           @MoneySafeAccountID
      )

      AND
      (
        @FromDate IS NULL
        OR MST.TransactionDate >= @FromDate
      )

      AND
      (
        @ToDate IS NULL
        OR MST.TransactionDate <
           DATEADD(DAY, 1, @ToDate)
      )

      AND
      (
        @TransactionType IS NULL
        OR MST.TransactionType =
           @TransactionType
      )

    ORDER BY
      MST.TransactionDate DESC,
      MST.MoneySafeTransactionID DESC
  `);

  return result.recordset;
};


// =====================================================
// GET MONEY SAFE SUMMARY
// =====================================================

const getMoneySafeSummary = async () => {

  const pool = await connectDB();

  const result = await pool.request().query(`
    SELECT
      COUNT(*) AS AccountCount,

      ISNULL(
        SUM(
          CASE
            WHEN PaymentMethod = 'Cash'
            THEN CurrentBalance
            ELSE 0
          END
        ),
        0
      ) AS CashBalance,

      ISNULL(
        SUM(
          CASE
            WHEN PaymentMethod = 'Visa'
            THEN CurrentBalance
            ELSE 0
          END
        ),
        0
      ) AS VisaBalance,

      ISNULL(
        SUM(
          CASE
            WHEN PaymentMethod = 'Bank Transfer'
            THEN CurrentBalance
            ELSE 0
          END
        ),
        0
      ) AS BankTransferBalance,

      ISNULL(
        SUM(
          CASE
            WHEN PaymentMethod = 'Instapay'
            THEN CurrentBalance
            ELSE 0
          END
        ),
        0
      ) AS InstapayBalance,

      ISNULL(
        SUM(
          CASE
            WHEN PaymentMethod = 'Vodafone Cash'
            THEN CurrentBalance
            ELSE 0
          END
        ),
        0
      ) AS VodafoneCashBalance,

      ISNULL(
        SUM(CurrentBalance),
        0
      ) AS TotalBalance

    FROM dbo.MoneySafeAccounts
    WHERE IsActive = 1
  `);

  return result.recordset[0];
};


// =====================================================
// EXPORT
// =====================================================

export {
  getMoneySafeAccounts,
  getMoneySafeAccountById,
  getMoneySafeAccountByPaymentMethod,
  setOpeningBalance,
  createMoneySafeTransaction,
  getMoneySafeTransactions,
  getMoneySafeSummary,
};