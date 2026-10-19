import connectDB, { sql } from "../lib/db";

// Get supply items already consumed in one patient session.
const getSessionSupplies = async (sessionID) => {
  const parsedSessionID = Number(sessionID);
  if (!Number.isInteger(parsedSessionID) || parsedSessionID <= 0) {
    throw new Error("A valid SessionID is required");
  }

  const pool = await connectDB();
  const result = await pool.request()
    .input("SessionID", sql.Int, parsedSessionID)
    .query(`
      SELECT
        SS.SessionSupplyID,
        SS.SessionID,
        SS.SupplyID,
        S.SupplyName,
        U.UnitName,
        SS.Qty AS Quantity,
        SS.UnitCost AS UnitCostAtUse,
        SS.LineCost AS TotalCost,
        SS.CreatedAt
      FROM dbo.SessionSupplies SS
      INNER JOIN dbo.Supplies S ON S.SupplyID = SS.SupplyID
      INNER JOIN dbo.SupplyUnits U ON U.UnitID = S.UnitID
      WHERE SS.SessionID = @SessionID
      ORDER BY SS.CreatedAt, SS.SessionSupplyID;
    `);

  return result.recordset;
};

// Replace all supply usage for a session and reconcile stock in one transaction.
const addSessionSupplies = async ({ SessionID, Supplies, UserID = null, Notes = null }) => {
  const sessionID = Number(SessionID);
  const userID = UserID === null || UserID === undefined || UserID === "" ? null : Number(UserID);

  if (!Number.isInteger(sessionID) || sessionID <= 0) {
    throw new Error("A valid SessionID is required");
  }
  if (!Array.isArray(Supplies)) {
    throw new Error("Supplies must be an array");
  }
  if (userID !== null && (!Number.isInteger(userID) || userID <= 0)) {
    throw new Error("Invalid UserID");
  }
  if (Notes !== null && typeof Notes !== "string") {
    throw new Error("Notes must be text");
  }

  const rows = Supplies.map((item) => {
    const supplyID = Number(item.SupplyID);
    const quantity = Number(item.Quantity);
    if (!Number.isInteger(supplyID) || supplyID <= 0) {
      throw new Error("A valid SupplyID is required for each supply");
    }
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 999999999999999.999) {
      throw new Error("Each supply quantity must be greater than zero");
    }
    return { SupplyID: supplyID, Quantity: quantity };
  });

  if (new Set(rows.map((item) => item.SupplyID)).size !== rows.length) {
    throw new Error("A supply can only be included once per save");
  }

  const pool = await connectDB();
  const transaction = new sql.Transaction(pool);
  await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

  try {
    const sessionCheck = await new sql.Request(transaction)
      .input("SessionID", sql.Int, sessionID)
      .query(`
        SELECT SessionID, PatientID
        FROM dbo.LaserSessions WITH (UPDLOCK, HOLDLOCK)
        WHERE SessionID = @SessionID;
      `);

    if (!sessionCheck.recordset[0]) {
      throw new Error("Session not found");
    }
    const patientID = sessionCheck.recordset[0].PatientID;

    // Restore the previous set and record return movements so the stock ledger stays auditable.
    await new sql.Request(transaction)
      .input("SessionID", sql.Int, sessionID)
      .input("UserID", sql.Int, userID)
      .input("Notes", sql.NVarChar(500), Notes || "Session supplies replaced")
      .query(`
        DECLARE @PreviousUsage TABLE (
          SessionSupplyID INT,
          SupplyID INT,
          Qty DECIMAL(18,3),
          UnitCost DECIMAL(18,2)
        );

        INSERT INTO @PreviousUsage (SessionSupplyID, SupplyID, Qty, UnitCost)
        SELECT SessionSupplyID, SupplyID, Qty, UnitCost
        FROM dbo.SessionSupplies WITH (UPDLOCK, HOLDLOCK)
        WHERE SessionID = @SessionID;

        UPDATE B
        SET B.QuantityOnHand = B.QuantityOnHand + P.Qty,
            B.UpdatedAt = GETDATE()
        FROM dbo.StoreBalances B WITH (UPDLOCK, HOLDLOCK)
        INNER JOIN (
          SELECT SupplyID, SUM(Qty) AS Qty
          FROM @PreviousUsage
          GROUP BY SupplyID
        ) P ON P.SupplyID = B.SupplyID;

        -- Detach old consumption movements before deleting rows they reference.
        UPDATE M
        SET M.SessionSupplyID = NULL
        FROM dbo.SupplyStockMovements M
        INNER JOIN @PreviousUsage P ON P.SessionSupplyID = M.SessionSupplyID;

        -- Log a stock return for each previously saved supply row.
        INSERT INTO dbo.SupplyStockMovements
        (
          SupplyID, MovementType, Qty, UnitCost, SessionID, UserID, Notes
        )
        SELECT
          SupplyID, 'RETURN_IN', Qty, UnitCost, @SessionID, @UserID, @Notes
        FROM @PreviousUsage;

        DELETE FROM dbo.SessionSupplies
        WHERE SessionID = @SessionID;
      `);

    const savedRows = [];

    for (const item of rows) {
      const request = new sql.Request(transaction)
        .input("SessionID", sql.Int, sessionID)
        .input("PatientID", sql.Int, patientID)
        .input("SupplyID", sql.Int, item.SupplyID)
        .input("Quantity", sql.Decimal(18, 3), item.Quantity)
        .input("UserID", sql.Int, userID)
        .input("Notes", sql.NVarChar(500), Notes || null);

      const result = await request.query(`
        DECLARE @CurrentQuantity DECIMAL(18,3);
        DECLARE @UnitCost DECIMAL(18,2);
        DECLARE @SessionSupplyID INT;

        -- Lock supply first, then its balance, matching the purchase flow's lock order.
        SELECT
          @UnitCost = S.CostPrice,
          @CurrentQuantity = ISNULL(B.QuantityOnHand, 0)
        FROM dbo.Supplies S WITH (UPDLOCK, HOLDLOCK)
        LEFT JOIN dbo.StoreBalances B WITH (UPDLOCK, HOLDLOCK)
          ON B.SupplyID = S.SupplyID
        WHERE S.SupplyID = @SupplyID
          AND S.IsActive = 1;

        IF @UnitCost IS NULL
          THROW 50101, 'Supply not found or inactive', 1;

        IF @CurrentQuantity < @Quantity
          THROW 50102, 'Insufficient stock for one or more selected supplies', 1;

        INSERT INTO dbo.SessionSupplies
        (
          SessionID,
          PatientID,
          SupplyID,
          Qty,
          UnitCost
        )
        VALUES
        (
          @SessionID,
          @PatientID,
          @SupplyID,
          @Quantity,
          @UnitCost
        );

        SET @SessionSupplyID = SCOPE_IDENTITY();

        UPDATE dbo.StoreBalances
        SET
          QuantityOnHand = QuantityOnHand - @Quantity,
          UpdatedAt = GETDATE()
        WHERE SupplyID = @SupplyID
          AND QuantityOnHand >= @Quantity;

        IF @@ROWCOUNT = 0
          THROW 50102, 'Insufficient stock for one or more selected supplies', 1;

        INSERT INTO dbo.SupplyStockMovements
        (
          SupplyID,
          MovementType,
          Qty,
          UnitCost,
          SessionID,
          SessionSupplyID,
          UserID,
          Notes
        )
        VALUES
        (
          @SupplyID,
          'SESSION_OUT',
          @Quantity,
          @UnitCost,
          @SessionID,
          @SessionSupplyID,
          @UserID,
          @Notes
        );

        SELECT
          @SessionSupplyID AS SessionSupplyID,
          @SessionID AS SessionID,
          @SupplyID AS SupplyID,
          @Quantity AS Quantity,
          @UnitCost AS UnitCostAtUse,
          CAST(@Quantity * @UnitCost AS DECIMAL(18,2)) AS TotalCost,
          @CurrentQuantity AS PreviousQuantity,
          B.QuantityOnHand AS QuantityOnHand
        FROM dbo.StoreBalances B
        WHERE B.SupplyID = @SupplyID;
      `);

      savedRows.push(result.recordset[0]);
    }

    await transaction.commit();
    return savedRows;
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      console.error("Session supplies rollback failed:", rollbackError);
    }
    throw error;
  }
};

export { getSessionSupplies, addSessionSupplies };