import connectDB, { sql } from "../lib/db";


// =====================================================
// GET ALL LASER TYPES
// =====================================================

const getLaserTypes = async () => {

  const pool = await connectDB();

  const result = await pool.request().query(`
    SELECT
      LaserTypeID,
      LaserTypeName,
      IsActive,
      SortOrder

    FROM dbo.LaserTypes

    ORDER BY SortOrder ASC, LaserTypeID DESC
  `);

  return result.recordset;
};


// =====================================================
// GET LASER TYPES WITH SEARCH CRITERIA
// =====================================================

const getSearchedLaserTypes = async (search) => {

  const pool = await connectDB();

  const request = pool.request();

  request.input(
    "Search",
    sql.NVarChar,
    `%${search}%`
  );

  const result = await request.query(`
    SELECT
      LaserTypeID,
      LaserTypeName,
      IsActive,
      SortOrder

    FROM dbo.LaserTypes

    WHERE
      LaserTypeName LIKE @Search

    ORDER BY SortOrder ASC, LaserTypeID DESC
  `);

  return result.recordset;
};


// =====================================================
// GET LASER TYPE BY ID
// =====================================================

const getLaserTypeById = async (id) => {

  const pool = await connectDB();

  const result = await pool
    .request()
    .input(
      "LaserTypeID",
      sql.Int,
      Number(id)
    )
    .query(`
      SELECT
        LaserTypeID,
        LaserTypeName,
        IsActive,
        SortOrder

      FROM dbo.LaserTypes

      WHERE
        LaserTypeID = @LaserTypeID
    `);

  return result.recordset[0] || null;
};


// =====================================================
// CREATE LASER TYPE
// =====================================================

const createLaserType = async (data) => {

  const pool = await connectDB();

  const {
    LaserTypeName,
    IsActive,
    SortOrder,
  } = data;


  const result = await pool
    .request()

    .input(
      "LaserTypeName",
      sql.NVarChar,
      LaserTypeName
    )

    .input(
      "IsActive",
      sql.Bit,
      IsActive === undefined
        ? true
        : Boolean(IsActive)
    )

    .input(
      "SortOrder",
      sql.Int,
      SortOrder === undefined
        ? 0
        : Number(SortOrder)
    )

    .query(`
      INSERT INTO dbo.LaserTypes
      (
        LaserTypeName,
        IsActive,
        SortOrder
      )

      OUTPUT
        INSERTED.LaserTypeID,
        INSERTED.LaserTypeName,
        INSERTED.IsActive,
        INSERTED.SortOrder

      VALUES
      (
        @LaserTypeName,
        @IsActive,
        @SortOrder
      )
    `);


  return result.recordset[0] || null;
};


// =====================================================
// UPDATE LASER TYPE
// =====================================================

const updateLaserType = async (id, data) => {

  const pool = await connectDB();

  const {
    LaserTypeName,
    IsActive,
    SortOrder,
  } = data;


  const result = await pool
    .request()

    .input(
      "LaserTypeID",
      sql.Int,
      Number(id)
    )

    .input(
      "LaserTypeName",
      sql.NVarChar,
      LaserTypeName
    )

    .input(
      "IsActive",
      sql.Bit,
      IsActive === undefined
        ? true
        : Boolean(IsActive)
    )

    .input(
      "SortOrder",
      sql.Int,
      SortOrder === undefined
        ? 0
        : Number(SortOrder)
    )

    .query(`
      UPDATE dbo.LaserTypes

      SET
        LaserTypeName = @LaserTypeName,
        IsActive = @IsActive,
        SortOrder = @SortOrder

      OUTPUT
        INSERTED.LaserTypeID,
        INSERTED.LaserTypeName,
        INSERTED.IsActive,
        INSERTED.SortOrder

      WHERE
        LaserTypeID = @LaserTypeID
    `);


  return result.recordset[0] || null;
};


// =====================================================
// DELETE LASER TYPE
// =====================================================

const deleteLaserType = async (id) => {

  const pool = await connectDB();

  const result = await pool
    .request()

    .input(
      "LaserTypeID",
      sql.Int,
      Number(id)
    )

    .query(`
      DELETE FROM dbo.LaserTypes

      OUTPUT
        DELETED.LaserTypeID

      WHERE
        LaserTypeID = @LaserTypeID
    `);


  return result.recordset[0] || null;
};


// =====================================================
// EXPORT
// =====================================================

export {
  getLaserTypes,
  getSearchedLaserTypes,
  getLaserTypeById,
  createLaserType,
  updateLaserType,
  deleteLaserType,
};