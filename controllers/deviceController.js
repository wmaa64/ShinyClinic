import connectDB, { sql } from "../lib/db";


// =====================================================
// GET ALL DEVICES
// =====================================================

const getDevices = async () => {

  const pool = await connectDB();

  const result = await pool.request().query(`
    SELECT
      DeviceID,
      DeviceName,
      Manufacturer,
      DeviceType,
      IsActive

    FROM dbo.Devices

    ORDER BY DeviceID DESC
  `);

  return result.recordset;
};


// =====================================================
// GET DEVICES WITH SEARCH CRITERIA
// =====================================================

const getSearchedDevices = async (search) => {

  const pool = await connectDB();

  const request = pool.request();

  request.input(
    "Search",
    sql.NVarChar,
    `%${search}%`
  );

  const result = await request.query(`
    SELECT
      DeviceID,
      DeviceName,
      Manufacturer,
      DeviceType,
      IsActive

    FROM dbo.Devices

    WHERE
      DeviceName LIKE @Search
      OR Manufacturer LIKE @Search
      OR DeviceType LIKE @Search

    ORDER BY DeviceID DESC
  `);

  return result.recordset;
};


// =====================================================
// GET DEVICE BY ID
// =====================================================

const getDeviceById = async (id) => {

  const pool = await connectDB();

  const result = await pool
    .request()
    .input(
      "DeviceID",
      sql.Int,
      Number(id)
    )
    .query(`
      SELECT
        DeviceID,
        DeviceName,
        Manufacturer,
        DeviceType,
        IsActive

      FROM dbo.Devices

      WHERE
        DeviceID = @DeviceID
    `);

  return result.recordset[0] || null;
};


// =====================================================
// CREATE DEVICE
// =====================================================

const createDevice = async (data) => {

  const pool = await connectDB();

  const {
    DeviceName,
    Manufacturer,
    DeviceType,
    IsActive,
  } = data;


  const result = await pool
    .request()

    .input(
      "DeviceName",
      sql.NVarChar,
      DeviceName
    )

    .input(
      "Manufacturer",
      sql.NVarChar,
      Manufacturer || null
    )

    .input(
      "DeviceType",
      sql.NVarChar,
      DeviceType || null
    )

    .input(
      "IsActive",
      sql.Bit,
      IsActive === undefined
        ? true
        : Boolean(IsActive)
    )

    .query(`
      INSERT INTO dbo.Devices
      (
        DeviceName,
        Manufacturer,
        DeviceType,
        IsActive
      )

      OUTPUT
        INSERTED.DeviceID,
        INSERTED.DeviceName,
        INSERTED.Manufacturer,
        INSERTED.DeviceType,
        INSERTED.IsActive

      VALUES
      (
        @DeviceName,
        @Manufacturer,
        @DeviceType,
        @IsActive
      )
    `);


  return result.recordset[0] || null;
};


// =====================================================
// UPDATE DEVICE
// =====================================================

const updateDevice = async (id, data) => {

  const pool = await connectDB();

  const {
    DeviceName,
    Manufacturer,
    DeviceType,
    IsActive,
  } = data;


  const result = await pool
    .request()

    .input(
      "DeviceID",
      sql.Int,
      Number(id)
    )

    .input(
      "DeviceName",
      sql.NVarChar,
      DeviceName
    )

    .input(
      "Manufacturer",
      sql.NVarChar,
      Manufacturer || null
    )

    .input(
      "DeviceType",
      sql.NVarChar,
      DeviceType || null
    )

    .input(
      "IsActive",
      sql.Bit,
      IsActive === undefined
        ? true
        : Boolean(IsActive)
    )

    .query(`
      UPDATE dbo.Devices

      SET
        DeviceName = @DeviceName,
        Manufacturer = @Manufacturer,
        DeviceType = @DeviceType,
        IsActive = @IsActive

      OUTPUT
        INSERTED.DeviceID,
        INSERTED.DeviceName,
        INSERTED.Manufacturer,
        INSERTED.DeviceType,
        INSERTED.IsActive

      WHERE
        DeviceID = @DeviceID
    `);


  return result.recordset[0] || null;
};


// =====================================================
// DELETE DEVICE
// =====================================================

const deleteDevice = async (id) => {

  const pool = await connectDB();

  const result = await pool
    .request()

    .input(
      "DeviceID",
      sql.Int,
      Number(id)
    )

    .query(`
      DELETE FROM dbo.Devices

      OUTPUT
        DELETED.DeviceID

      WHERE
        DeviceID = @DeviceID
    `);


  return result.recordset[0] || null;
};


// =====================================================
// EXPORT
// =====================================================

export {
  getDevices,
  getSearchedDevices,
  getDeviceById,
  createDevice,
  updateDevice,
  deleteDevice,
};