/*
  Record a purchase and increase store stock.

  Qty: quantity purchased
  UnitCost: purchase cost per unit
  PaymentMethod: Money Safe payment method
  UserID: userInfo.UserID from the application context
*/

const recordStorePurchase = async ({
  SupplyID,
  Qty,
  UnitCost,
  PaymentMethod,
  UserID = null,
  Notes = null,
}) => {

  const supplyID = Number(SupplyID);
  const qty = Number(Qty);
  const unitCost = Number(UnitCost);

  const userID =
    UserID === null ||
    UserID === undefined ||
    UserID === ""
      ? null
      : Number(UserID);


  // =====================================================
  // VALIDATION
  // =====================================================

  if (
    !Number.isInteger(supplyID) ||
    supplyID <= 0
  ) {
    throw new Error(
      "A valid SupplyID is required"
    );
  }


  if (
    !Number.isFinite(qty) ||
    qty <= 0
  ) {
    throw new Error(
      "Purchase quantity must be greater than zero"
    );
  }


  if (
    !Number.isFinite(unitCost) ||
    unitCost < 0
  ) {
    throw new Error(
      "UnitCost must be zero or greater"
    );
  }


  if (
    !PaymentMethod ||
    typeof PaymentMethod !== "string"
  ) {
    throw new Error(
      "PaymentMethod is required"
    );
  }


  const allowedPaymentMethods = [
    "Cash",
    "Visa",
    "Bank Transfer",
    "Instapay",
    "Vodafone Cash"
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


  if (
    userID !== null &&
    (
      !Number.isInteger(userID) ||
      userID <= 0
    )
  ) {
    throw new Error(
      "Invalid UserID"
    );
  }


  if (
    Notes !== null &&
    typeof Notes !== "string"
  ) {
    throw new Error(
      "Notes must be text"
    );
  }


  // =====================================================
  // CALCULATE PURCHASE TOTAL
  // =====================================================

  const purchaseTotal =
    qty * unitCost;


  if (
    !Number.isFinite(purchaseTotal) ||
    purchaseTotal <= 0
  ) {
    throw new Error(
      "Invalid purchase total"
    );
  }


  // =====================================================
  // DATABASE TRANSACTION
  // =====================================================

  const pool =
    await connectDB();

  const transaction =
    new sql.Transaction(pool);


  await transaction.begin(
    sql.ISOLATION_LEVEL.SERIALIZABLE
  );


  try {

    const request =
      new sql.Request(transaction);


    request.input(
      "SupplyID",
      sql.Int,
      supplyID
    );


    request.input(
      "Qty",
      sql.Decimal(18, 3),
      qty
    );


    request.input(
      "UnitCost",
      sql.Decimal(18, 2),
      unitCost
    );


    request.input(
      "PaymentMethod",
      sql.NVarChar(30),
      PaymentMethod
    );


    request.input(
      "UserID",
      sql.Int,
      userID
    );


    request.input(
      "Notes",
      sql.NVarChar(500),
      Notes
        ? Notes.trim()
        : null
    );


    // =================================================
    // LOCK SUPPLY
    // =================================================

    const supplyResult =
      await request.query(`
        SELECT
          SupplyID,
          SupplyName,
          CostPrice
        FROM dbo.Supplies WITH (UPDLOCK, HOLDLOCK)
        WHERE
          SupplyID = @SupplyID
          AND IsActive = 1
      `);


    const supply =
      supplyResult.recordset[0];


    if (!supply) {
      throw new Error(
        "Supply not found or inactive"
      );
    }


    // =================================================
    // LOCK STORE BALANCE
    // =================================================

    const balanceResult =
      await new sql.Request(transaction)

        .input(
          "SupplyID",
          sql.Int,
          supplyID
        )

        .query(`
          SELECT
            QuantityOnHand
          FROM dbo.StoreBalances
            WITH (UPDLOCK, HOLDLOCK)
          WHERE
            SupplyID = @SupplyID
        `);


    let currentQuantity =
      balanceResult.recordset[0]
        ?.QuantityOnHand;


    // =================================================
    // CREATE BALANCE ROW IF NEEDED
    // =================================================

    if (
      currentQuantity === undefined ||
      currentQuantity === null
    ) {

      await new sql.Request(transaction)

        .input(
          "SupplyID",
          sql.Int,
          supplyID
        )

        .query(`
          INSERT INTO dbo.StoreBalances
          (
            SupplyID,
            QuantityOnHand,
            UpdatedAt
          )
          VALUES
          (
            @SupplyID,
            0,
            GETDATE()
          )
        `);


      currentQuantity = 0;
    }


    currentQuantity =
      Number(currentQuantity);


    // =================================================
    // CHECK STOCK LIMIT
    // =================================================

    if (
      currentQuantity + qty >
      999999999999999.999
    ) {
      throw new Error(
        "Purchase quantity exceeds the supported stock limit"
      );
    }


    // =================================================
    // UPDATE STORE STOCK
    // =================================================

    await new sql.Request(transaction)

      .input(
        "SupplyID",
        sql.Int,
        supplyID
      )

      .input(
        "Qty",
        sql.Decimal(18, 3),
        qty
      )

      .query(`
        UPDATE dbo.StoreBalances

        SET
          QuantityOnHand =
            QuantityOnHand + @Qty,

          UpdatedAt =
            GETDATE()

        WHERE
          SupplyID = @SupplyID
      `);


    const newQuantity =
      currentQuantity + qty;


    // =================================================
    // UPDATE LATEST SUPPLY COST
    // =================================================

    await new sql.Request(transaction)

      .input(
        "SupplyID",
        sql.Int,
        supplyID
      )

      .input(
        "UnitCost",
        sql.Decimal(18, 2),
        unitCost
      )

      .query(`
        UPDATE dbo.Supplies

        SET
          CostPrice = @UnitCost

        WHERE
          SupplyID = @SupplyID
      `);


    // =================================================
    // RECORD STOCK MOVEMENT
    // =================================================

    const movementResult =
      await new sql.Request(transaction)

        .input(
          "SupplyID",
          sql.Int,
          supplyID
        )

        .input(
          "Qty",
          sql.Decimal(18, 3),
          qty
        )

        .input(
          "UnitCost",
          sql.Decimal(18, 2),
          unitCost
        )

        .input(
          "UserID",
          sql.Int,
          userID
        )

        .input(
          "Notes",
          sql.NVarChar(500),
          Notes
            ? Notes.trim()
            : null
        )

        .query(`
          INSERT INTO dbo.SupplyStockMovements
          (
            SupplyID,
            MovementType,
            Qty,
            UnitCost,
            UserID,
            Notes
          )

          OUTPUT
            INSERTED.StockMovementID

          VALUES
          (
            @SupplyID,
            'PURCHASE_IN',
            @Qty,
            @UnitCost,
            @UserID,
            @Notes
          )
        `);


    const stockMovementID =
      movementResult.recordset[0]
        ?.StockMovementID;


    if (!stockMovementID) {
      throw new Error(
        "Failed to record stock purchase movement"
      );
    }


    // =================================================
    // GET MONEY SAFE ACCOUNT
    // =================================================
    //
    // The account is selected by PaymentMethod.
    //
    // Example:
    // Cash -> Cash account
    // Visa -> Visa account
    // Instapay -> Instapay account
    //
    // UPDLOCK/HOLDLOCK prevents two simultaneous
    // transactions from using the same old balance.
    // =================================================

    const moneySafeResult =
      await new sql.Request(transaction)

        .input(
          "PaymentMethod",
          sql.NVarChar(30),
          PaymentMethod
        )

        .query(`
          SELECT TOP 1

            MoneySafeAccountID,
            AccountName,
            PaymentMethod,
            CurrentBalance

          FROM dbo.MoneySafeAccounts
            WITH (UPDLOCK, HOLDLOCK)

          WHERE
            PaymentMethod =
            @PaymentMethod

            AND IsActive = 1
        `);


    const moneySafeAccount =
      moneySafeResult.recordset[0];


    if (!moneySafeAccount) {
      throw new Error(
        `Money Safe account not found for payment method: ${PaymentMethod}`
      );
    }


    const currentMoneySafeBalance =
      Number(
        moneySafeAccount.CurrentBalance
      );


    const newMoneySafeBalance =
      currentMoneySafeBalance -
      purchaseTotal;


    // =================================================
    // CHECK MONEY SAFE BALANCE
    // =================================================

    if (
      newMoneySafeBalance < 0
    ) {
      throw new Error(
        `Insufficient balance in ${moneySafeAccount.AccountName}`
      );
    }


    // =================================================
    // RECORD MONEY SAFE TRANSACTION
    // =================================================

    await new sql.Request(transaction)

      .input(
        "MoneySafeAccountID",
        sql.Int,
        moneySafeAccount.MoneySafeAccountID
      )

      .input(
        "Amount",
        sql.Decimal(18, 2),
        purchaseTotal
      )

      .input(
        "ReferenceType",
        sql.NVarChar(50),
        "StorePurchase"
      )

      .input(
        "ReferenceID",
        sql.Int,
        stockMovementID
      )

      .input(
        "Description",
        sql.NVarChar(500),
        `Store purchase: ${supply.SupplyName}`
      )

      .input(
        "UserID",
        sql.Int,
        userID
      )

      .query(`
        INSERT INTO dbo.MoneySafeTransactions
        (
          MoneySafeAccountID,
          TransactionDate,
          TransactionType,
          Amount,
          ReferenceType,
          ReferenceID,
          Description,
          UserID,
          CreatedAt
        )

        VALUES
        (
          @MoneySafeAccountID,
          GETDATE(),
          N'Purchase',
          @Amount,
          @ReferenceType,
          @ReferenceID,
          @Description,
          @UserID,
          GETDATE()
        )
      `);


    // =================================================
    // UPDATE MONEY SAFE BALANCE
    // =================================================

    await new sql.Request(transaction)

      .input(
        "MoneySafeAccountID",
        sql.Int,
        moneySafeAccount.MoneySafeAccountID
      )

      .input(
        "CurrentBalance",
        sql.Decimal(18, 2),
        newMoneySafeBalance
      )

      .query(`
        UPDATE dbo.MoneySafeAccounts

        SET
          CurrentBalance =
            @CurrentBalance

        WHERE
          MoneySafeAccountID =
          @MoneySafeAccountID
      `);


    // =================================================
    // COMMIT EVERYTHING
    // =================================================

    await transaction.commit();


    // =================================================
    // RETURN RESULT
    // =================================================

    return {

      StockMovementID:
        Number(stockMovementID),

      SupplyID:
        supplyID,

      SupplyName:
        supply.SupplyName,

      MovementType:
        "PURCHASE_IN",

      Qty:
        qty,

      UnitCost:
        unitCost,

      PurchaseTotal:
        purchaseTotal,

      PaymentMethod:
        PaymentMethod,

      PreviousQuantity:
        currentQuantity,

      QuantityOnHand:
        newQuantity,

      MoneySafeAccountID:
        moneySafeAccount.MoneySafeAccountID,

      PreviousMoneySafeBalance:
        currentMoneySafeBalance,

      NewMoneySafeBalance:
        newMoneySafeBalance,

      UserID:
        userID
    };


  } catch (error) {

    try {
      await transaction.rollback();
    } catch (rollbackError) {

      console.error(
        "Store purchase rollback failed:",
        rollbackError
      );
    }

    throw error;
  }
};

export { recordStorePurchase };