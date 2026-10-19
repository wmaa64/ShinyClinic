import connectDB, { sql } from "../lib/db";

/*
  Record a purchase and increase store stock.

  Qty: quantity purchased
  UnitCost: purchase cost per unit
  UserID: userInfo.UserID from the application context
*/
export const recordStorePurchase = async ({  SupplyID,  Qty,  UnitCost,  UserID = null,  Notes = null,}) => {

  const supplyID = Number(SupplyID);
  const qty = Number(Qty);
  const unitCost = Number(UnitCost);
  const userID =  UserID === null || UserID === undefined || UserID === ""  ? null  : Number(UserID);

  if (!Number.isInteger(supplyID) || supplyID <= 0) {
    throw new Error("A valid SupplyID is required");
  }

  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error("Purchase quantity must be greater than zero");
  }

  if (!Number.isFinite(unitCost) || unitCost < 0) {
    throw new Error("UnitCost must be zero or greater");
  }

  if (
    userID !== null &&
    (!Number.isInteger(userID) || userID <= 0)
  ) {
    throw new Error("Invalid UserID");
  }

  if (Notes !== null && typeof Notes !== "string") {
    throw new Error("Notes must be text");
  }

  const pool = await connectDB();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    const request = new sql.Request(transaction);

    request.input("SupplyID", sql.Int, supplyID);
    request.input("Qty", sql.Decimal(18, 3), qty);
    request.input("UnitCost", sql.Decimal(18, 2), unitCost);
    request.input("UserID", sql.Int, userID);
    request.input("Notes", sql.NVarChar(500), Notes || null);

    const result = await request.query(`
      DECLARE @CurrentQuantity DECIMAL(18,3);
      DECLARE @MovementID BIGINT;

      -- Lock the supply while the purchase is processed.
      IF NOT EXISTS (
        SELECT 1
        FROM dbo.Supplies WITH (UPDLOCK, HOLDLOCK)
        WHERE SupplyID = @SupplyID
          AND IsActive = 1
      )
      BEGIN
        THROW 50001, 'Supply not found or inactive', 1;
      END;

      -- Lock the existing balance row.
      SELECT @CurrentQuantity = QuantityOnHand
      FROM dbo.StoreBalances WITH (UPDLOCK, HOLDLOCK)
      WHERE SupplyID = @SupplyID;

      -- Create a balance row if one does not exist.
      IF @CurrentQuantity IS NULL
      BEGIN
        INSERT INTO dbo.StoreBalances (
          SupplyID,
          QuantityOnHand
        )
        VALUES (
          @SupplyID,
          0
        );

        SET @CurrentQuantity = 0;
      END;

      IF @CurrentQuantity + @Qty > 999999999999999.999
      BEGIN
        THROW 50002, 'Purchase quantity exceeds the supported stock limit', 1;
      END;

      -- Increase stock.
      UPDATE dbo.StoreBalances
      SET
        QuantityOnHand = QuantityOnHand + @Qty,
        UpdatedAt = GETDATE()
      WHERE SupplyID = @SupplyID;

      -- Update the latest purchase cost.
      UPDATE dbo.Supplies
      SET CostPrice = @UnitCost
      WHERE SupplyID = @SupplyID;

      -- Record the purchase movement.
      INSERT INTO dbo.SupplyStockMovements (
        SupplyID,
        MovementType,
        Qty,
        UnitCost,
        UserID,
        Notes
      )
      VALUES (
        @SupplyID,
        'PURCHASE_IN',
        @Qty,
        @UnitCost,
        @UserID,
        @Notes
      );

      SET @MovementID = SCOPE_IDENTITY();

      SELECT
        @MovementID AS StockMovementID,
        @SupplyID AS SupplyID,
        'PURCHASE_IN' AS MovementType,
        @Qty AS Qty,
        @UnitCost AS UnitCost,
        @CurrentQuantity AS PreviousQuantity,
        B.QuantityOnHand AS QuantityOnHand,
        @UserID AS UserID
      FROM dbo.StoreBalances B
      WHERE B.SupplyID = @SupplyID;
    `);

    await transaction.commit();

    return result.recordset[0];
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};


/*
  Correct stock using a physical count.

  ActualQuantity is the quantity physically counted in the store.
  The controller calculates the difference automatically.
*/
export const adjustStoreStock = async ({
  SupplyID,
  ActualQuantity,
  UserID = null,
  Notes,
}) => {
  const supplyID = Number(SupplyID);
  const actualQuantity = Number(ActualQuantity);
  const userID =
    UserID === null || UserID === undefined || UserID === ""
      ? null
      : Number(UserID);

  if (!Number.isInteger(supplyID) || supplyID <= 0) {
    throw new Error("A valid SupplyID is required");
  }

  if (
    !Number.isFinite(actualQuantity) ||
    actualQuantity < 0 ||
    actualQuantity > 999999999999999.999
  ) {
    throw new Error("ActualQuantity must be a valid non-negative quantity");
  }

  if (
    userID !== null &&
    (!Number.isInteger(userID) || userID <= 0)
  ) {
    throw new Error("Invalid UserID");
  }

  if (!Notes || !Notes.trim()) {
    throw new Error("A reason for the stock adjustment is required");
  }

  const pool = await connectDB();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    const request = new sql.Request(transaction);

    request.input("SupplyID", sql.Int, supplyID);
    request.input(
      "ActualQuantity",
      sql.Decimal(18, 3),
      actualQuantity
    );
    request.input("UserID", sql.Int, userID);
    request.input("Notes", sql.NVarChar(500), Notes.trim());

    const result = await request.query(`
      DECLARE @CurrentQuantity DECIMAL(18,3);
      DECLARE @UnitCost DECIMAL(18,2);
      DECLARE @Difference DECIMAL(18,3);
      DECLARE @MovementType NVARCHAR(30);
      DECLARE @MovementID BIGINT;

      -- Lock the supply and read its current cost.
      SELECT @UnitCost = CostPrice
      FROM dbo.Supplies WITH (UPDLOCK, HOLDLOCK)
      WHERE SupplyID = @SupplyID
        AND IsActive = 1;

      IF @@ROWCOUNT = 0
      BEGIN
        THROW 50003, 'Supply not found or inactive', 1;
      END;

      -- Lock the balance row.
      SELECT @CurrentQuantity = QuantityOnHand
      FROM dbo.StoreBalances WITH (UPDLOCK, HOLDLOCK)
      WHERE SupplyID = @SupplyID;

      IF @CurrentQuantity IS NULL
      BEGIN
        INSERT INTO dbo.StoreBalances (
          SupplyID,
          QuantityOnHand
        )
        VALUES (
          @SupplyID,
          0
        );

        SET @CurrentQuantity = 0;
      END;

      SET @Difference = @ActualQuantity - @CurrentQuantity;

      IF @Difference = 0
      BEGIN
        SELECT
          CAST(NULL AS BIGINT) AS StockMovementID,
          @SupplyID AS SupplyID,
          CAST(NULL AS NVARCHAR(30)) AS MovementType,
          CAST(0 AS DECIMAL(18,3)) AS Qty,
          @UnitCost AS UnitCost,
          @CurrentQuantity AS PreviousQuantity,
          @CurrentQuantity AS QuantityOnHand,
          @UserID AS UserID,
          CAST(0 AS BIT) AS AdjustmentRecorded;

        RETURN;
      END;

      IF @Difference > 0
        SET @MovementType = 'ADJUSTMENT_IN';
      ELSE
        SET @MovementType = 'ADJUSTMENT_OUT';

      -- Update the balance to the actual counted quantity.
      UPDATE dbo.StoreBalances
      SET
        QuantityOnHand = @ActualQuantity,
        UpdatedAt = GETDATE()
      WHERE SupplyID = @SupplyID;

      -- Movement quantity must always be positive.
      INSERT INTO dbo.SupplyStockMovements (
        SupplyID,
        MovementType,
        Qty,
        UnitCost,
        UserID,
        Notes
      )
      VALUES (
        @SupplyID,
        @MovementType,
        ABS(@Difference),
        @UnitCost,
        @UserID,
        @Notes
      );

      SET @MovementID = SCOPE_IDENTITY();

      SELECT
        @MovementID AS StockMovementID,
        @SupplyID AS SupplyID,
        @MovementType AS MovementType,
        ABS(@Difference) AS Qty,
        @UnitCost AS UnitCost,
        @CurrentQuantity AS PreviousQuantity,
        @ActualQuantity AS QuantityOnHand,
        @UserID AS UserID,
        CAST(1 AS BIT) AS AdjustmentRecorded;
    `);

    await transaction.commit();

    return result.recordset[0];
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};


/*
  Get stock movement history.

  Optional filters:
  SupplyID, FromDate, ToDate, MovementType
*/
export const getStoreMovements = async ({
  SupplyID = null,
  FromDate = null,
  ToDate = null,
  MovementType = null,
} = {}) => {
  const pool = await connectDB();
  const request = pool.request();

  const conditions = [];

  if (SupplyID !== null && SupplyID !== "") {
    const supplyID = Number(SupplyID);

    if (!Number.isInteger(supplyID) || supplyID <= 0) {
      throw new Error("Invalid SupplyID");
    }

    request.input("SupplyID", sql.Int, supplyID);
    conditions.push("M.SupplyID = @SupplyID");
  }

  if (FromDate) {
    request.input("FromDate", sql.Date, FromDate);
    conditions.push("M.CreatedAt >= @FromDate");
  }

  if (ToDate) {
    request.input("ToDate", sql.Date, ToDate);
    conditions.push("M.CreatedAt < DATEADD(DAY, 1, @ToDate)");
  }

  const validTypes = [
    "PURCHASE_IN",
    "SESSION_OUT",
    "ADJUSTMENT_IN",
    "ADJUSTMENT_OUT",
    "RETURN_IN",
  ];

  if (MovementType) {
    if (!validTypes.includes(MovementType)) {
      throw new Error("Invalid MovementType");
    }

    request.input(
      "MovementType",
      sql.NVarChar(30),
      MovementType
    );

    conditions.push("M.MovementType = @MovementType");
  }

  const whereClause =
    conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

  const result = await request.query(`
    SELECT
      M.StockMovementID,
      M.SupplyID,
      S.SupplyName,
      U.UnitName,
      M.MovementType,
      M.Qty,
      M.UnitCost,
      CAST(M.Qty * M.UnitCost AS DECIMAL(18,2)) AS MovementCost,
      M.SessionID,
      M.SessionSupplyID,
      M.UserID,
      US.UserName,
      US.FullName AS UserFullName,
      M.Notes,
      M.CreatedAt
    FROM dbo.SupplyStockMovements M
    INNER JOIN dbo.Supplies S
      ON M.SupplyID = S.SupplyID
    INNER JOIN dbo.SupplyUnits U
      ON S.UnitID = U.UnitID
    LEFT JOIN dbo.Users US
      ON M.UserID = US.UserID
    ${whereClause}
    ORDER BY
      M.CreatedAt DESC,
      M.StockMovementID DESC;
  `);

  return result.recordset;
};
