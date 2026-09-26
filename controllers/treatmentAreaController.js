import connectDB, { sql } from "../lib/db";


// =====================================================
// GET ALL TREATMENT AREAS
// =====================================================

const getTreatmentAreas = async () => {

  const pool = await connectDB();

  const result = await pool.request().query(`
    SELECT
      AreaID,
      AreaName,
      IsActive

    FROM dbo.TreatmentAreas

    ORDER BY AreaID DESC
  `);

  return result.recordset;
};


// =====================================================
// GET TREATMENT AREAS WITH SEARCH CRITERIA
// =====================================================

const getSearchedTreatmentAreas = async (search) => {

  const pool = await connectDB();

  const request = pool.request();

  request.input(
    "Search",
    sql.NVarChar,
    `%${search}%`
  );

  const result = await request.query(`
    SELECT
      AreaID,
      AreaName,
      IsActive

    FROM dbo.TreatmentAreas

    WHERE
      AreaName LIKE @Search

    ORDER BY AreaID DESC
  `);

  return result.recordset;
};


// =====================================================
// GET TREATMENT AREA BY ID
// =====================================================

const getTreatmentAreaById = async (id) => {

  const pool = await connectDB();

  const result = await pool
    .request()
    .input(
      "AreaID",
      sql.Int,
      Number(id)
    )
    .query(`
      SELECT
        AreaID,
        AreaName,
        IsActive

      FROM dbo.TreatmentAreas

      WHERE
        AreaID = @AreaID
    `);

  return result.recordset[0] || null;
};


// =====================================================
// CREATE TREATMENT AREA
// =====================================================

const createTreatmentArea = async (data) => {

  const pool = await connectDB();

  const {
    AreaName,
    IsActive,
  } = data;


  const result = await pool
    .request()

    .input(
      "AreaName",
      sql.NVarChar,
      AreaName
    )

    .input(
      "IsActive",
      sql.Bit,
      IsActive === undefined
        ? true
        : Boolean(IsActive)
    )

    .query(`
      INSERT INTO dbo.TreatmentAreas
      (
        AreaName,
        IsActive
      )

      OUTPUT
        INSERTED.AreaID,
        INSERTED.AreaName,
        INSERTED.IsActive

      VALUES
      (
        @AreaName,
        @IsActive
      )
    `);


  return result.recordset[0] || null;
};


// =====================================================
// UPDATE TREATMENT AREA
// =====================================================

const updateTreatmentArea = async (id, data) => {

  const pool = await connectDB();

  const {
    AreaName,
    IsActive,
  } = data;


  const result = await pool
    .request()

    .input(
      "AreaID",
      sql.Int,
      Number(id)
    )

    .input(
      "AreaName",
      sql.NVarChar,
      AreaName
    )

    .input(
      "IsActive",
      sql.Bit,
      IsActive === undefined
        ? true
        : Boolean(IsActive)
    )

    .query(`
      UPDATE dbo.TreatmentAreas

      SET
        AreaName = @AreaName,
        IsActive = @IsActive

      OUTPUT
        INSERTED.AreaID,
        INSERTED.AreaName,
        INSERTED.IsActive

      WHERE
        AreaID = @AreaID
    `);


  return result.recordset[0] || null;
};


// =====================================================
// DELETE TREATMENT AREA
// =====================================================

const deleteTreatmentArea = async (id) => {

  const pool = await connectDB();

  const result = await pool
    .request()

    .input(
      "AreaID",
      sql.Int,
      Number(id)
    )

    .query(`
      DELETE FROM dbo.TreatmentAreas

      OUTPUT
        DELETED.AreaID

      WHERE
        AreaID = @AreaID
    `);


  return result.recordset[0] || null;
};


// =====================================================
// EXPORT
// =====================================================

export {
  getTreatmentAreas,
  getSearchedTreatmentAreas,
  getTreatmentAreaById,
  createTreatmentArea,
  updateTreatmentArea,
  deleteTreatmentArea,
};