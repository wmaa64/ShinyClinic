import connectDB, { sql } from "../lib/db";

// =====================================================
// GET SUPPLY UNITS
// =====================================================
const getSupplyUnits = async (includeInactive = false) => {
  await connectDB();

  const request = new sql.Request();

  let query = `
    SELECT
      UnitID,
      UnitName,
      IsActive,
      CreatedAt
    FROM dbo.SupplyUnits
  `;

  if (!includeInactive) {
    query += ` WHERE IsActive = 1`;
  }

  query += ` ORDER BY UnitName ASC`;

  const result = await request.query(query);

  return result.recordset;
};


// =====================================================
// GET SUPPLY UNIT BY ID
// =====================================================
const getSupplyUnitById = async (unitID) => {
  await connectDB();

  const result = await new sql.Request()
    .input("UnitID", sql.Int, unitID)
    .query(`
      SELECT
        UnitID,
        UnitName,
        IsActive,
        CreatedAt
      FROM dbo.SupplyUnits
      WHERE UnitID = @UnitID
    `);

  return result.recordset[0] || null;
};


// =====================================================
// CREATE SUPPLY UNIT
// =====================================================
const createSupplyUnit = async (data) => {
  const unitName = String(data.UnitName || "").trim();

  if (!unitName) {
    throw new Error("Unit name is required.");
  }

  if (unitName.length > 50) {
    throw new Error("Unit name cannot exceed 50 characters.");
  }

  await connectDB();

  const result = await new sql.Request()
    .input("UnitName", sql.NVarChar(50), unitName)
    .query(`
      IF EXISTS (
        SELECT 1
        FROM dbo.SupplyUnits
        WHERE UnitName = @UnitName
      )
      BEGIN
        THROW 50001, 'A unit with this name already exists.', 1;
      END;

      INSERT INTO dbo.SupplyUnits (UnitName)
      VALUES (@UnitName);

      SELECT
        UnitID,
        UnitName,
        IsActive,
        CreatedAt
      FROM dbo.SupplyUnits
      WHERE UnitID = SCOPE_IDENTITY();
    `);

  return result.recordset[0];
};


// =====================================================
// UPDATE SUPPLY UNIT
// =====================================================
const updateSupplyUnit = async (unitID, data) => {
  const unitName = String(data.UnitName || "").trim();
  const isActive =
    data.IsActive === undefined || data.IsActive === null
      ? null
      : Boolean(data.IsActive);

  if (!Number.isInteger(Number(unitID)) || Number(unitID) <= 0) {
    throw new Error("A valid unit ID is required.");
  }

  if (!unitName) {
    throw new Error("Unit name is required.");
  }

  if (unitName.length > 50) {
    throw new Error("Unit name cannot exceed 50 characters.");
  }

  await connectDB();

  const result = await new sql.Request()
    .input("UnitID", sql.Int, Number(unitID))
    .input("UnitName", sql.NVarChar(50), unitName)
    .input("IsActive", sql.Bit, isActive)
    .query(`
      IF NOT EXISTS (
        SELECT 1
        FROM dbo.SupplyUnits
        WHERE UnitID = @UnitID
      )
      BEGIN
        THROW 50002, 'Supply unit not found.', 1;
      END;

      IF EXISTS (
        SELECT 1
        FROM dbo.SupplyUnits
        WHERE UnitName = @UnitName
          AND UnitID <> @UnitID
      )
      BEGIN
        THROW 50001, 'A unit with this name already exists.', 1;
      END;

      UPDATE dbo.SupplyUnits
      SET
        UnitName = @UnitName,
        IsActive = COALESCE(@IsActive, IsActive)
      WHERE UnitID = @UnitID;

      SELECT
        UnitID,
        UnitName,
        IsActive,
        CreatedAt
      FROM dbo.SupplyUnits
      WHERE UnitID = @UnitID;
    `);

  return result.recordset[0];
};


// =====================================================
// DEACTIVATE SUPPLY UNIT
// =====================================================
const deactivateSupplyUnit = async (unitID) => {
  if (!Number.isInteger(Number(unitID)) || Number(unitID) <= 0) {
    throw new Error("A valid unit ID is required.");
  }

  await connectDB();

  const result = await new sql.Request()
    .input("UnitID", sql.Int, Number(unitID))
    .query(`
      UPDATE dbo.SupplyUnits
      SET IsActive = 0
      WHERE UnitID = @UnitID
        AND IsActive = 1;

      SELECT @@ROWCOUNT AS AffectedRows;
    `);

  if (result.recordset[0].AffectedRows === 0) {
    throw new Error("Supply unit not found or already inactive.");
  }

  return { message: "Supply unit deactivated successfully." };
};


// =====================================================
// EXPORTS
// =====================================================
module.exports = {
  getSupplyUnits,
  getSupplyUnitById,
  createSupplyUnit,
  updateSupplyUnit,
  deactivateSupplyUnit,
};
