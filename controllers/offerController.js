import connectDB, { sql } from "../lib/db";


// =====================================================
// GET OFFERS
// =====================================================
//
// If activeOnly = true:
//     returns active offers only
//
// Otherwise:
//     returns all offers
//
// =====================================================

const getOffers = async (activeOnly = false) => {

  const pool = await connectDB();

  const result = await pool
    .request()
    .input(
      "ActiveOnly",
      sql.Bit,
      activeOnly ? 1 : 0
    )
    .query(`
      SELECT

        o.OfferID,

        o.OfferName,

        o.GivenQuantity,

        o.ForPrice,

        o.ForUnitPrice,

        o.IsActive,

        o.Notes,

        o.CreatedAt,

        o.CategoryID,

        oc.CategoryName

      FROM dbo.Offers o

      LEFT JOIN dbo.OfferCategories oc
        ON o.CategoryID = oc.CategoryID

      WHERE
        @ActiveOnly = 0
        OR o.IsActive = 1

      ORDER BY
        o.OfferName ASC
    `);

  return result.recordset;
};

// =====================================================
// GET OFFERS WITH SEARCH CRITERIA
// =====================================================

const getOfferCategories = async () => {
  const pool = await connectDB();
  const result = await pool.request().query(`
    SELECT CategoryID, CategoryName
    FROM dbo.OfferCategories
    WHERE IsActive = 1
    ORDER BY CategoryName ASC
  `);
  return result.recordset;
};

const getSearchedOffers = async (search) => {
  const pool = await connectDB();
  const request = pool.request();
  request.input("Search", sql.NVarChar, `%${search}%`);

  const result = await request.query(`
    SELECT
      o.OfferID,
      o.OfferName,
      o.GivenQuantity,
      o.ForPrice,
      o.ForUnitPrice,
      o.IsActive,
      o.Notes,
      o.CreatedAt,
      o.CategoryID,
      oc.CategoryName
    FROM dbo.Offers o
    LEFT JOIN dbo.OfferCategories oc ON o.CategoryID = oc.CategoryID
    WHERE o.OfferName LIKE @Search OR oc.CategoryName LIKE @Search
    ORDER BY o.OfferName ASC
  `);
  return result.recordset;
};

// =====================================================
// GET ONE OFFER
// =====================================================

const getOfferById = async (offerID) => {

  const pool = await connectDB();

  const parsedOfferID =
    Number(offerID);


  if (
    !Number.isInteger(parsedOfferID) ||
    parsedOfferID <= 0
  ) {
    throw new Error(
      "Invalid OfferID"
    );
  }


  const result = await pool
    .request()
    .input(
      "OfferID",
      sql.Int,
      parsedOfferID
    )
    .query(`
      SELECT

        o.OfferID,

        o.OfferName,

        o.GivenQuantity,

        o.ForPrice,

        o.ForUnitPrice,

        o.IsActive,

        o.Notes,

        o.CreatedAt,

        o.CategoryID,

        oc.CategoryName

      FROM dbo.Offers o

      LEFT JOIN dbo.OfferCategories oc
        ON o.CategoryID = oc.CategoryID

      WHERE
        o.OfferID = @OfferID
    `);


  return result.recordset[0] || null;
};


// =====================================================
// CREATE OFFER
// =====================================================

const createOffer = async (data) => {

  const pool = await connectDB();


  const {
    OfferName,
    GivenQuantity,
    ForPrice,
    CategoryID,
    IsActive,
    Notes,
  } = data;


  const givenQuantity =
    Number(GivenQuantity);

  const forPrice =
    Number(ForPrice);

  const categoryID =
    Number(CategoryID);


  // ---------------------------------------------------
  // VALIDATION
  // ---------------------------------------------------

  if (
    !OfferName ||
    String(OfferName).trim() === ""
  ) {
    throw new Error(
      "OfferName is required"
    );
  }


  if (
    !Number.isFinite(givenQuantity) ||
    givenQuantity <= 0
  ) {
    throw new Error(
      "GivenQuantity must be greater than zero"
    );
  }


  if (
    !Number.isFinite(forPrice) ||
    forPrice < 0
  ) {
    throw new Error(
      "Invalid ForPrice"
    );
  }


  if (
    !Number.isInteger(categoryID) ||
    categoryID <= 0
  ) {
    throw new Error(
      "Invalid CategoryID"
    );
  }


  // ---------------------------------------------------
  // CALCULATE UNIT PRICE
  // ---------------------------------------------------

  const forUnitPrice =
    forPrice / givenQuantity;


  // ---------------------------------------------------
  // VERIFY CATEGORY
  // ---------------------------------------------------

  const categoryResult =
    await pool
      .request()
      .input(
        "CategoryID",
        sql.Int,
        categoryID
      )
      .query(`
        SELECT
          CategoryID
        FROM dbo.OfferCategories
        WHERE
          CategoryID = @CategoryID
          AND IsActive = 1
      `);


  if (
    categoryResult.recordset.length === 0
  ) {
    throw new Error(
      "Offer category not found or inactive"
    );
  }


  // ---------------------------------------------------
  // INSERT
  // ---------------------------------------------------

  const result =
    await pool
      .request()

      .input(
        "OfferName",
        sql.NVarChar(150),
        String(OfferName).trim()
      )

      .input(
        "GivenQuantity",
        sql.Decimal(18, 2),
        givenQuantity
      )

      .input(
        "ForPrice",
        sql.Decimal(18, 2),
        forPrice
      )

      .input(
        "ForUnitPrice",
        sql.Decimal(18, 2),
        forUnitPrice
      )

      .input(
        "IsActive",
        sql.Bit,
        IsActive === undefined
          ? 1
          : IsActive ? 1 : 0
      )

      .input(
        "Notes",
        sql.NVarChar(500),
        Notes || null
      )

      .input(
        "CategoryID",
        sql.Int,
        categoryID
      )

      .query(`
        INSERT INTO dbo.Offers
        (
          OfferName,
          GivenQuantity,
          ForPrice,
          ForUnitPrice,
          IsActive,
          Notes,
          CreatedAt,
          CategoryID
        )

        OUTPUT
          INSERTED.OfferID

        VALUES
        (
          @OfferName,
          @GivenQuantity,
          @ForPrice,
          @ForUnitPrice,
          @IsActive,
          @Notes,
          GETDATE(),
          @CategoryID
        )
      `);


  const offerID =
    result.recordset[0]?.OfferID;


  return await getOfferById(
    offerID
  );
};


// =====================================================
// UPDATE OFFER
// =====================================================

const updateOffer = async (
  offerID,
  data
) => {

  const pool = await connectDB();

  const parsedOfferID =
    Number(offerID);


  if (
    !Number.isInteger(parsedOfferID) ||
    parsedOfferID <= 0
  ) {
    throw new Error(
      "Invalid OfferID"
    );
  }


  const {
    OfferName,
    GivenQuantity,
    ForPrice,
    CategoryID,
    IsActive,
    Notes,
  } = data;


  const givenQuantity =
    Number(GivenQuantity);

  const forPrice =
    Number(ForPrice);

  const categoryID =
    Number(CategoryID);


  if (
    !OfferName ||
    String(OfferName).trim() === ""
  ) {
    throw new Error(
      "OfferName is required"
    );
  }


  if (
    !Number.isFinite(givenQuantity) ||
    givenQuantity <= 0
  ) {
    throw new Error(
      "GivenQuantity must be greater than zero"
    );
  }


  if (
    !Number.isFinite(forPrice) ||
    forPrice < 0
  ) {
    throw new Error(
      "Invalid ForPrice"
    );
  }


  if (
    !Number.isInteger(categoryID) ||
    categoryID <= 0
  ) {
    throw new Error(
      "Invalid CategoryID"
    );
  }


  const forUnitPrice =
    forPrice / givenQuantity;


  // ---------------------------------------------------
  // VERIFY CATEGORY
  // ---------------------------------------------------

  const categoryResult =
    await pool
      .request()
      .input(
        "CategoryID",
        sql.Int,
        categoryID
      )
      .query(`
        SELECT
          CategoryID
        FROM dbo.OfferCategories
        WHERE
          CategoryID = @CategoryID
          AND IsActive = 1
      `);


  if (
    categoryResult.recordset.length === 0
  ) {
    throw new Error(
      "Offer category not found or inactive"
    );
  }


  // ---------------------------------------------------
  // UPDATE
  // ---------------------------------------------------

  await pool
    .request()

    .input(
      "OfferID",
      sql.Int,
      parsedOfferID
    )

    .input(
      "OfferName",
      sql.NVarChar(150),
      String(OfferName).trim()
    )

    .input(
      "GivenQuantity",
      sql.Decimal(18, 2),
      givenQuantity
    )

    .input(
      "ForPrice",
      sql.Decimal(18, 2),
      forPrice
    )

    .input(
      "ForUnitPrice",
      sql.Decimal(18, 2),
      forUnitPrice
    )

    .input(
      "IsActive",
      sql.Bit,
      IsActive ? 1 : 0
    )

    .input(
      "Notes",
      sql.NVarChar(500),
      Notes || null
    )

    .input(
      "CategoryID",
      sql.Int,
      categoryID
    )

    .query(`
      UPDATE dbo.Offers

      SET

        OfferName =
          @OfferName,

        GivenQuantity =
          @GivenQuantity,

        ForPrice =
          @ForPrice,

        ForUnitPrice =
          @ForUnitPrice,

        IsActive =
          @IsActive,

        Notes =
          @Notes,

        CategoryID =
          @CategoryID

      WHERE
        OfferID = @OfferID
    `);


  return await getOfferById(
    parsedOfferID
  );
};


// =====================================================
// EXPORT
// =====================================================

export {
  getOffers,
  getOfferCategories,
  getSearchedOffers,
  getOfferById,
  createOffer,
  updateOffer,
};