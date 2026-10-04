import connectDB, { sql } from "../lib/db";

// ============================================================
// GET DOCTOR REVENUE PERCENTAGES
// ============================================================
export const getDoctorRevenuePercentages = async (search) => {
  const pool = await connectDB();

  const request = pool.request();

  let query = `
    SELECT
      DRP.DoctorRevenuePercentageID,
      DRP.UserID,
      U.FullName AS DoctorName,
      U.UserName,
      DRP.Percentage,
      DRP.IsActive,
      DRP.CreatedAt

    FROM dbo.DoctorRevenuePercentages DRP

    INNER JOIN dbo.Users U
      ON DRP.UserID = U.UserID

    WHERE U.RoleID = 2
  `;

  // SEARCH
  if (search && search.trim()) {
    request.input(
      "Search",
      sql.NVarChar(200),
      `%${search.trim()}%`
    );

    query += `
      AND (
        U.FullName LIKE @Search
        OR U.UserName LIKE @Search
      )
    `;
  }

  query += `
    ORDER BY
      U.FullName ASC,
      DRP.DoctorRevenuePercentageID ASC
  `;

  const result = await request.query(query);

  return result.recordset;
};


// ============================================================
// GET ONE DOCTOR REVENUE PERCENTAGE
// ============================================================
export const getDoctorRevenuePercentageById = async (id) => {
  const doctorRevenuePercentageID = Number(id);

  if (
    !Number.isInteger(doctorRevenuePercentageID) ||
    doctorRevenuePercentageID <= 0
  ) {
    throw new Error(
      "Invalid DoctorRevenuePercentageID"
    );
  }

  const pool = await connectDB();

  const result = await pool
    .request()
    .input(
      "DoctorRevenuePercentageID",
      sql.Int,
      doctorRevenuePercentageID
    )
    .query(`
      SELECT
        DRP.DoctorRevenuePercentageID,
        DRP.UserID,
        U.FullName AS DoctorName,
        U.UserName,
        DRP.Percentage,
        DRP.IsActive,
        DRP.CreatedAt

      FROM dbo.DoctorRevenuePercentages DRP

      INNER JOIN dbo.Users U
        ON DRP.UserID = U.UserID

      WHERE
        DRP.DoctorRevenuePercentageID =
          @DoctorRevenuePercentageID
        AND U.RoleID = 2
    `);

  return result.recordset[0] || null;
};


// ============================================================
// CREATE DOCTOR REVENUE PERCENTAGE
// ============================================================
export const createDoctorRevenuePercentage = async ({
  UserID,
  Percentage,
  IsActive = true,
}) => {
  const userID = Number(UserID);
  const percentage = Number(Percentage);

  // VALIDATE USER ID
  if (
    !Number.isInteger(userID) ||
    userID <= 0
  ) {
    throw new Error("Invalid UserID");
  }

  // VALIDATE PERCENTAGE
  if (
    !Number.isFinite(percentage) ||
    percentage < 0 ||
    percentage > 100
  ) {
    throw new Error(
      "Percentage must be between 0 and 100"
    );
  }

  const pool = await connectDB();

  // VERIFY DOCTOR
  const doctorResult = await pool
    .request()
    .input("UserID", sql.Int, userID)
    .query(`
      SELECT
        UserID,
        FullName,
        UserName
      FROM dbo.Users
      WHERE
        UserID = @UserID
        AND RoleID = 2
    `);

  if (doctorResult.recordset.length === 0) {
    throw new Error(
      "The selected user is not a doctor"
    );
  }

  // CHECK EXISTING PERCENTAGE
  const existingResult = await pool
    .request()
    .input("UserID", sql.Int, userID)
    .query(`
      SELECT
        DoctorRevenuePercentageID
      FROM dbo.DoctorRevenuePercentages
      WHERE UserID = @UserID
    `);

  if (existingResult.recordset.length > 0) {
    throw new Error(
      "This doctor already has a revenue percentage"
    );
  }

  // CREATE
  const result = await pool
    .request()
    .input("UserID", sql.Int, userID)
    .input(
      "Percentage",
      sql.Decimal(5, 2),
      percentage
    )
    .input(
      "IsActive",
      sql.Bit,
      Boolean(IsActive)
    )
    .query(`
      INSERT INTO dbo.DoctorRevenuePercentages
      (
        UserID,
        Percentage,
        IsActive
      )

      OUTPUT
        INSERTED.DoctorRevenuePercentageID,
        INSERTED.UserID,
        INSERTED.Percentage,
        INSERTED.IsActive,
        INSERTED.CreatedAt

      VALUES
      (
        @UserID,
        @Percentage,
        @IsActive
      )
    `);

  const created =
    result.recordset[0];

  // RETURN WITH DOCTOR NAME
  return getDoctorRevenuePercentageById(
    created.DoctorRevenuePercentageID
  );
};


// ============================================================
// UPDATE DOCTOR REVENUE PERCENTAGE
// ============================================================
export const updateDoctorRevenuePercentage = async (
  id,
  {
    UserID,
    Percentage,
    IsActive = true,
  }
) => {
  const doctorRevenuePercentageID =
    Number(id);

  const userID = Number(UserID);
  const percentage = Number(Percentage);

  // VALIDATE ID
  if (
    !Number.isInteger(
      doctorRevenuePercentageID
    ) ||
    doctorRevenuePercentageID <= 0
  ) {
    throw new Error(
      "Invalid DoctorRevenuePercentageID"
    );
  }

  // VALIDATE USER ID
  if (
    !Number.isInteger(userID) ||
    userID <= 0
  ) {
    throw new Error("Invalid UserID");
  }

  // VALIDATE PERCENTAGE
  if (
    !Number.isFinite(percentage) ||
    percentage < 0 ||
    percentage > 100
  ) {
    throw new Error(
      "Percentage must be between 0 and 100"
    );
  }

  const pool = await connectDB();

  // VERIFY EXISTING RECORD
  const existingResult = await pool
    .request()
    .input(
      "DoctorRevenuePercentageID",
      sql.Int,
      doctorRevenuePercentageID
    )
    .query(`
      SELECT
        DoctorRevenuePercentageID,
        UserID
      FROM dbo.DoctorRevenuePercentages
      WHERE
        DoctorRevenuePercentageID =
          @DoctorRevenuePercentageID
    `);

  if (existingResult.recordset.length === 0) {
    return null;
  }

  // VERIFY DOCTOR
  const doctorResult = await pool
    .request()
    .input("UserID", sql.Int, userID)
    .query(`
      SELECT
        UserID,
        FullName,
        UserName
      FROM dbo.Users
      WHERE
        UserID = @UserID
        AND RoleID = 2
    `);

  if (doctorResult.recordset.length === 0) {
    throw new Error(
      "The selected user is not a doctor"
    );
  }

  // CHECK WHETHER ANOTHER RECORD USES THIS DOCTOR
  const duplicateResult = await pool
    .request()
    .input("UserID", sql.Int, userID)
    .input(
      "DoctorRevenuePercentageID",
      sql.Int,
      doctorRevenuePercentageID
    )
    .query(`
      SELECT
        DoctorRevenuePercentageID
      FROM dbo.DoctorRevenuePercentages
      WHERE
        UserID = @UserID
        AND DoctorRevenuePercentageID <>
          @DoctorRevenuePercentageID
    `);

  if (duplicateResult.recordset.length > 0) {
    throw new Error(
      "This doctor already has another revenue percentage"
    );
  }

  // UPDATE
  await pool
    .request()
    .input(
      "DoctorRevenuePercentageID",
      sql.Int,
      doctorRevenuePercentageID
    )
    .input("UserID", sql.Int, userID)
    .input(
      "Percentage",
      sql.Decimal(5, 2),
      percentage
    )
    .input(
      "IsActive",
      sql.Bit,
      Boolean(IsActive)
    )
    .query(`
      UPDATE dbo.DoctorRevenuePercentages

      SET
        UserID = @UserID,
        Percentage = @Percentage,
        IsActive = @IsActive

      WHERE
        DoctorRevenuePercentageID =
          @DoctorRevenuePercentageID
    `);

  // RETURN UPDATED RECORD
  return getDoctorRevenuePercentageById(
    doctorRevenuePercentageID
  );
};


// ============================================================
// DELETE DOCTOR REVENUE PERCENTAGE
// ============================================================
export const deleteDoctorRevenuePercentage = async (
  id
) => {
  const doctorRevenuePercentageID =
    Number(id);

  if (
    !Number.isInteger(
      doctorRevenuePercentageID
    ) ||
    doctorRevenuePercentageID <= 0
  ) {
    throw new Error(
      "Invalid DoctorRevenuePercentageID"
    );
  }

  const pool = await connectDB();

  // CHECK RECORD
  const existingResult = await pool
    .request()
    .input(
      "DoctorRevenuePercentageID",
      sql.Int,
      doctorRevenuePercentageID
    )
    .query(`
      SELECT
        DRP.DoctorRevenuePercentageID,
        DRP.UserID,
        U.FullName AS DoctorName
      FROM dbo.DoctorRevenuePercentages DRP
      INNER JOIN dbo.Users U
        ON DRP.UserID = U.UserID
      WHERE
        DRP.DoctorRevenuePercentageID =
          @DoctorRevenuePercentageID
    `);

  if (existingResult.recordset.length === 0) {
    return null;
  }

  // DELETE
  await pool
    .request()
    .input(
      "DoctorRevenuePercentageID",
      sql.Int,
      doctorRevenuePercentageID
    )
    .query(`
      DELETE FROM dbo.DoctorRevenuePercentages
      WHERE
        DoctorRevenuePercentageID =
          @DoctorRevenuePercentageID
    `);

  return {
    DoctorRevenuePercentageID:
      doctorRevenuePercentageID,
    message:
      "Doctor revenue percentage deleted successfully",
  };
};