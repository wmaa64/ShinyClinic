import connectDB, { sql } from "../lib/db";

const validateSupply = ({ SupplyName, UnitID, CostPrice, MinimumStock }) => {
  if (!SupplyName || !SupplyName.trim()) {
    throw new Error("Supply name is required");
  }

  const unitID = Number(UnitID);
  if (!Number.isInteger(unitID) || unitID <= 0) {
    throw new Error("A valid UnitID is required");
  }

  const costPrice = Number(CostPrice);
  if (!Number.isFinite(costPrice) || costPrice < 0) {
    throw new Error("CostPrice must be zero or greater");
  }

  const minimumStock = Number(MinimumStock ?? 0);
  if (!Number.isFinite(minimumStock) || minimumStock < 0) {
    throw new Error("MinimumStock must be zero or greater");
  }

  return {
    SupplyName: SupplyName.trim(),
    UnitID: unitID,
    CostPrice: costPrice,
    MinimumStock: minimumStock,
  };
};

export const getSupplies = async (search = "", includeInactive = false) => {
  const pool = await connectDB();
  const request = pool.request();

  let whereClause = "";

  if (!includeInactive) {
    whereClause = "WHERE S.IsActive = 1";
  }

  if (search && search.trim()) {
    request.input("Search", sql.NVarChar(150), `%${search.trim()}%`);

    whereClause += whereClause
      ? " AND S.SupplyName LIKE @Search"
      : "WHERE S.SupplyName LIKE @Search";
  }

  const result = await request.query(`
    SELECT
      S.SupplyID,
      S.SupplyName,
      S.UnitID,
      U.UnitName,
      S.CostPrice,
      S.MinimumStock,
      S.IsActive,
      S.Notes,
      S.CreatedAt,
      ISNULL(B.QuantityOnHand, 0) AS QuantityOnHand,
      CASE
        WHEN ISNULL(B.QuantityOnHand, 0) <= S.MinimumStock
        THEN 1
        ELSE 0
      END AS IsLowStock
    FROM dbo.Supplies S
    INNER JOIN dbo.SupplyUnits U
      ON S.UnitID = U.UnitID
    LEFT JOIN dbo.StoreBalances B
      ON S.SupplyID = B.SupplyID
    ${whereClause}
    ORDER BY S.SupplyName;
  `);

  return result.recordset;
};

export const getSupplyById = async (supplyID) => {
  const id = Number(supplyID);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid SupplyID");
  }

  const pool = await connectDB();

  const result = await pool.request()
    .input("SupplyID", sql.Int, id)
    .query(`
      SELECT
        S.SupplyID,
        S.SupplyName,
        S.UnitID,
        U.UnitName,
        S.CostPrice,
        S.MinimumStock,
        S.IsActive,
        S.Notes,
        S.CreatedAt,
        ISNULL(B.QuantityOnHand, 0) AS QuantityOnHand,
        CASE
          WHEN ISNULL(B.QuantityOnHand, 0) <= S.MinimumStock
          THEN 1
          ELSE 0
        END AS IsLowStock
      FROM dbo.Supplies S
      INNER JOIN dbo.SupplyUnits U
        ON S.UnitID = U.UnitID
      LEFT JOIN dbo.StoreBalances B
        ON S.SupplyID = B.SupplyID
      WHERE S.SupplyID = @SupplyID;
    `);

  if (result.recordset.length === 0) {
    throw new Error("Supply not found");
  }

  return result.recordset[0];
};

export const createSupply = async (data) => {
  const supply = validateSupply(data);

  const pool = await connectDB();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    const request = new sql.Request(transaction);

    request.input("SupplyName", sql.NVarChar(150), supply.SupplyName);
    request.input("UnitID", sql.Int, supply.UnitID);
    request.input("CostPrice", sql.Decimal(18, 2), supply.CostPrice);
    request.input("MinimumStock", sql.Decimal(18, 3), supply.MinimumStock);
    request.input("Notes", sql.NVarChar(500), data.Notes || null);

    const result = await request.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM dbo.SupplyUnits
        WHERE UnitID = @UnitID
          AND IsActive = 1
      )
      BEGIN
        THROW 50001, 'Selected unit does not exist or is inactive', 1;
      END;

      INSERT INTO dbo.Supplies (
        SupplyName,
        UnitID,
        CostPrice,
        MinimumStock,
        Notes
      )
      OUTPUT INSERTED.SupplyID
      VALUES (
        @SupplyName,
        @UnitID,
        @CostPrice,
        @MinimumStock,
        @Notes
      );
    `);

    const supplyID = result.recordset[0].SupplyID;

    await new sql.Request(transaction)
      .input("SupplyID", sql.Int, supplyID)
      .query(`
        INSERT INTO dbo.StoreBalances (SupplyID, QuantityOnHand)
        VALUES (@SupplyID, 0);
      `);

    await transaction.commit();

    return await getSupplyById(supplyID);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

export const updateSupply = async (supplyID, data) => {
  const id = Number(supplyID);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid SupplyID");
  }

  const supply = validateSupply(data);
  const pool = await connectDB();

  const result = await pool.request()
    .input("SupplyID", sql.Int, id)
    .input("SupplyName", sql.NVarChar(150), supply.SupplyName)
    .input("UnitID", sql.Int, supply.UnitID)
    .input("CostPrice", sql.Decimal(18, 2), supply.CostPrice)
    .input("MinimumStock", sql.Decimal(18, 3), supply.MinimumStock)
    .input("Notes", sql.NVarChar(500), data.Notes || null)
    .query(`
      UPDATE S
      SET
        SupplyName = @SupplyName,
        UnitID = @UnitID,
        CostPrice = @CostPrice,
        MinimumStock = @MinimumStock,
        Notes = @Notes
      FROM dbo.Supplies S
      WHERE S.SupplyID = @SupplyID
        AND EXISTS (
          SELECT 1
          FROM dbo.SupplyUnits U
          WHERE U.UnitID = @UnitID
            AND U.IsActive = 1
        );

      IF @@ROWCOUNT = 0
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM dbo.Supplies WHERE SupplyID = @SupplyID
        )
          THROW 50002, 'Supply not found', 1;

        THROW 50003, 'Selected unit does not exist or is inactive', 1;
      END;
    `);

  return await getSupplyById(id);
};

export const deactivateSupply = async (supplyID) => {
  const id = Number(supplyID);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid SupplyID");
  }

  const pool = await connectDB();

  const result = await pool.request()
    .input("SupplyID", sql.Int, id)
    .query(`
      UPDATE dbo.Supplies
      SET IsActive = 0
      WHERE SupplyID = @SupplyID
        AND IsActive = 1;

      SELECT @@ROWCOUNT AS AffectedRows;
    `);

  if (result.recordset[0].AffectedRows === 0) {
    throw new Error("Supply not found or already inactive");
  }

  return { SupplyID: id, IsActive: false };
};
