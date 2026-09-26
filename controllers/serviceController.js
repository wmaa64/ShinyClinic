import connectDB, { sql } from "../lib/db";


// =====================================================
// GET ALL SERVICES
// =====================================================

const getServices = async () => {

  const pool = await connectDB();

  const result = await pool.request().query(`
    SELECT
      s.ServiceID,
      s.ServiceName,
      s.DefaultPrice,
      s.IsActive,
      s.Notes,
      s.CreatedAt,
      s.CategoryID,
      sc.CategoryName

    FROM dbo.Services s

    LEFT JOIN dbo.ServiceCategories sc
      ON s.CategoryID = sc.CategoryID

    WHERE S.IsActive=1

    ORDER BY sc.CategoryName, s.ServiceName
  `);

  return result.recordset;
};


// =====================================================
// GET SERVICES WITH SEARCH CRITERIA
// =====================================================

const getSearchedServices = async (search) => {

  const pool = await connectDB();

  const request = pool.request();

  request.input(
    "Search",
    sql.NVarChar,
    `%${search}%`
  );

  const result = await request.query(`
    SELECT
      s.ServiceID,
      s.ServiceName,
      s.DefaultPrice,
      s.IsActive,
      s.Notes,
      s.CreatedAt,
      s.CategoryID,
      sc.CategoryName

    FROM dbo.Services s

    LEFT JOIN dbo.ServiceCategories sc
      ON s.CategoryID = sc.CategoryID

    WHERE  S.IsActive=1 AND (
      s.ServiceName LIKE @Search
      OR s.Notes LIKE @Search
      OR sc.CategoryName LIKE @Search
      )
    ORDER BY sc.CategoryName, s.ServiceName
  `);

  return result.recordset;
};


// =====================================================
// GET SERVICE BY ID
// =====================================================

const getServiceById = async (id) => {

  const pool = await connectDB();

  const result = await pool
    .request()
    .input(
      "ServiceID",
      sql.Int,
      Number(id)
    )
    .query(`
      SELECT
        s.ServiceID,
        s.ServiceName,
        s.DefaultPrice,
        s.IsActive,
        s.Notes,
        s.CreatedAt,
        s.CategoryID,
        sc.CategoryName

      FROM dbo.Services s

      LEFT JOIN dbo.ServiceCategories sc
        ON s.CategoryID = sc.CategoryID

      WHERE
        s.ServiceID = @ServiceID
    `);

  return result.recordset[0] || null;
};


// =====================================================
// CREATE SERVICE
// =====================================================

const createService = async (data) => {

  const pool = await connectDB();

  const {
    ServiceName,
    DefaultPrice,
    IsActive,
    Notes,
    CategoryID,
  } = data;


  const result = await pool
    .request()

    .input(
      "ServiceName",
      sql.NVarChar,
      ServiceName
    )

    .input(
      "DefaultPrice",
      sql.Decimal(18, 2),
      DefaultPrice || 0
    )

    .input(
      "IsActive",
      sql.Bit,
      IsActive === undefined
        ? true
        : Boolean(IsActive)
    )

    .input(
      "Notes",
      sql.NVarChar,
      Notes || null
    )

    .input(
      "CategoryID",
      sql.Int,
      CategoryID || null
    )

    .query(`
      INSERT INTO dbo.Services
      (
        ServiceName,
        DefaultPrice,
        IsActive,
        Notes,
        CreatedAt,
        CategoryID
      )

      OUTPUT
        INSERTED.ServiceID,
        INSERTED.ServiceName,
        INSERTED.DefaultPrice,
        INSERTED.IsActive,
        INSERTED.Notes,
        INSERTED.CreatedAt,
        INSERTED.CategoryID

      VALUES
      (
        @ServiceName,
        @DefaultPrice,
        @IsActive,
        @Notes,
        GETDATE(),
        @CategoryID
      )
    `);


  const service = result.recordset[0];

  // ---------------------------------------------------
  // GET CATEGORY NAME
  // ---------------------------------------------------

  if (service) {

    const categoryResult = await pool
      .request()
      .input(
        "CategoryID",
        sql.Int,
        service.CategoryID
      )
      .query(`
        SELECT
          CategoryName
        FROM dbo.ServiceCategories
        WHERE CategoryID = @CategoryID
      `);

    service.CategoryName =
      categoryResult.recordset[0]?.CategoryName || null;
  }


  return service;
};


// =====================================================
// UPDATE SERVICE
// =====================================================

const updateService = async (id, data) => {

  const pool = await connectDB();

  const {
    ServiceName,
    DefaultPrice,
    IsActive,
    Notes,
    CategoryID,
  } = data;


  const result = await pool
    .request()

    .input(
      "ServiceID",
      sql.Int,
      Number(id)
    )

    .input(
      "ServiceName",
      sql.NVarChar,
      ServiceName
    )

    .input(
      "DefaultPrice",
      sql.Decimal(18, 2),
      DefaultPrice || 0
    )

    .input(
      "IsActive",
      sql.Bit,
      IsActive === undefined
        ? true
        : Boolean(IsActive)
    )

    .input(
      "Notes",
      sql.NVarChar,
      Notes || null
    )

    .input(
      "CategoryID",
      sql.Int,
      CategoryID || null
    )

    .query(`
      UPDATE dbo.Services

      SET
        ServiceName = @ServiceName,
        DefaultPrice = @DefaultPrice,
        IsActive = @IsActive,
        Notes = @Notes,
        CategoryID = @CategoryID

      OUTPUT
        INSERTED.ServiceID,
        INSERTED.ServiceName,
        INSERTED.DefaultPrice,
        INSERTED.IsActive,
        INSERTED.Notes,
        INSERTED.CreatedAt,
        INSERTED.CategoryID

      WHERE
        ServiceID = @ServiceID
    `);


  const service = result.recordset[0];

  if (!service) {
    return null;
  }


  // ---------------------------------------------------
  // GET CATEGORY NAME
  // ---------------------------------------------------

  const categoryResult = await pool
    .request()
    .input(
      "CategoryID",
      sql.Int,
      service.CategoryID
    )
    .query(`
      SELECT
        CategoryName
      FROM dbo.ServiceCategories
      WHERE CategoryID = @CategoryID
    `);


  service.CategoryName =
    categoryResult.recordset[0]?.CategoryName || null;


  return service;
};


// =====================================================
// DELETE SERVICE
// =====================================================

const deleteService = async (id) => {

  const pool = await connectDB();

  const result = await pool
    .request()

    .input(
      "ServiceID",
      sql.Int,
      Number(id)
    )

    .query(`
      DELETE FROM dbo.Services

      OUTPUT
        DELETED.ServiceID

      WHERE
        ServiceID = @ServiceID
    `);


  return result.recordset[0] || null;
};


// =====================================================
// EXPORT
// =====================================================

export {
  getServices,
  getSearchedServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
};