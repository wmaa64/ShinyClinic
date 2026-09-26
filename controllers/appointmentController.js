import connectDB, { sql } from "../lib/db";


// =====================================================
// GET APPOINTMENTS
// =====================================================

const getAppointments = async () => {

  const pool = await connectDB();

  const result = await pool
    .request()
    .query(`
      SELECT
        a.AppointmentID,
        a.PatientID,
        p.FullName AS PatientName,
        p.FileNo,

        a.AppointmentDate,
        CONVERT(varchar(5), a.AppointmentTime, 108) AS AppointmentTime,

        a.Status,
        a.Notes,
        a.CreatedAt,

        a.AppointmentService,

        a.UserID,
        u.UserName AS DoctorName

      FROM dbo.Appointments a

      INNER JOIN dbo.Patients p
        ON a.PatientID = p.PatientID

      LEFT JOIN dbo.Users u
        ON a.UserID = u.UserID
        AND u.RoleID = 2

      ORDER BY
        a.AppointmentDate ASC,
        a.AppointmentTime ASC
    `);

  return result.recordset;
};


// =====================================================
// GET APPOINTMENTS BY DATE
// =====================================================

const getAppointmentsByDate = async (date) => {

  const pool = await connectDB();

  const request = pool
    .request()
    .input(
      "AppointmentDate",
      sql.Date,
      date
    );


  const result = await request.query(`
    SELECT
      a.AppointmentID,
      a.PatientID,
      p.FullName AS PatientName,
      p.FileNo,

      a.AppointmentDate,
      CONVERT(varchar(5), a.AppointmentTime, 108) AS AppointmentTime,

      a.Status,
      a.Notes,
      a.CreatedAt,

      a.AppointmentService,

      a.UserID,
      u.UserName AS DoctorName

    FROM dbo.Appointments a

    INNER JOIN dbo.Patients p
      ON a.PatientID = p.PatientID

    LEFT JOIN dbo.Users u
      ON a.UserID = u.UserID
      AND u.RoleID = 2

    WHERE
      a.AppointmentDate = @AppointmentDate

    ORDER BY
      a.AppointmentTime ASC
  `);


  return result.recordset;
};


// =====================================================
// GET APPOINTMENT BY ID
// =====================================================

const getAppointmentById = async (id) => {

  const pool = await connectDB();


  const result = await pool
    .request()
    .input(
      "AppointmentID",
      sql.Int,
      Number(id)
    )
    .query(`
      SELECT
        a.AppointmentID,
        a.PatientID,
        p.FullName AS PatientName,
        p.FileNo,

        a.AppointmentDate,
        CONVERT(varchar(5), a.AppointmentTime, 108) AS AppointmentTime,

        a.Status,
        a.Notes,
        a.CreatedAt,

        a.AppointmentService,

        a.UserID,
        u.UserName AS DoctorName

      FROM dbo.Appointments a

      INNER JOIN dbo.Patients p
        ON a.PatientID = p.PatientID

      LEFT JOIN dbo.Users u
        ON a.UserID = u.UserID
        AND u.RoleID = 2

      WHERE
        a.AppointmentID = @AppointmentID
    `);


  return result.recordset[0] || null;
};

// Search appointments
const getSearchedAppointments = async (search) => {
  const pool = await connectDB();

  const request = pool.request();

  request.input(
    "Search",
    sql.NVarChar,
    `%${search}%`
  );

  const result = await request.query(`
    SELECT
      a.AppointmentID,
      a.PatientID,
      a.AppointmentDate,
      a.AppointmentTime,
      a.Status,
      a.Notes,
      a.CreatedAt,
      a.AppointmentService,
      a.UserID,
      p.FullName AS PatientName
    FROM dbo.Appointments a
    INNER JOIN dbo.Patients p
      ON a.PatientID = p.PatientID
    WHERE
      p.FullName LIKE @Search
      OR a.Status LIKE @Search
      OR a.AppointmentService LIKE @Search
      OR a.Notes LIKE @Search
    ORDER BY
      a.AppointmentDate ASC,
      a.AppointmentTime ASC
  `);

  return result.recordset;
};


// =====================================================
// CREATE APPOINTMENT
// =====================================================

const createAppointment = async (data) => {

  const pool = await connectDB();


  const {
    PatientID,
    AppointmentDate,
    AppointmentTime,
    Status,
    Notes,
    AppointmentService,
    UserID,
  } = data;


  // ---------------------------------------------------
  // INSERT APPOINTMENT
  // ---------------------------------------------------

  const result = await pool
    .request()

    .input(
      "PatientID",
      sql.Int,
      Number(PatientID)
    )

    .input(
      "AppointmentDate",
      sql.Date,
      AppointmentDate
    )

    .input(
      "AppointmentTime",
      sql.VarChar(5),
      AppointmentTime
    )

    .input(
      "Status",
      sql.NVarChar(50),
      Status || "Pending"
    )

    .input(
      "Notes",
      sql.NVarChar(sql.MAX),
      Notes || null
    )

    .input(
      "AppointmentService",
      sql.NVarChar(30),
      AppointmentService || null
    )

    .input(
      "UserID",
      sql.Int,
      UserID
        ? Number(UserID)
        : null
    )

    .query(`
      INSERT INTO dbo.Appointments
      (
        PatientID,
        AppointmentDate,
        AppointmentTime,
        Status,
        Notes,
        CreatedAt,
        AppointmentService,
        UserID
      )

      OUTPUT
        INSERTED.AppointmentID,
        INSERTED.PatientID,
        INSERTED.AppointmentDate,
        INSERTED.AppointmentTime,
        INSERTED.Status,
        INSERTED.Notes,
        INSERTED.CreatedAt,
        INSERTED.AppointmentService,
        INSERTED.UserID

      VALUES
      (
        @PatientID,
        @AppointmentDate,
        CAST(@AppointmentTime AS time),
        @Status,
        @Notes,
        GETDATE(),
        @AppointmentService,
        @UserID
      )
    `);


  const appointment =
    result.recordset[0];


  if (!appointment) {
    return null;
  }


  // ---------------------------------------------------
  // GET PATIENT + DOCTOR INFORMATION
  // ---------------------------------------------------

  const detailsResult =
    await pool
      .request()
      .input(
        "AppointmentID",
        sql.Int,
        appointment.AppointmentID
      )
      .query(`
        SELECT
          a.AppointmentID,
          a.PatientID,
          p.FullName AS PatientName,
          p.FileNo,

          a.AppointmentDate,
          CONVERT(varchar(5), a.AppointmentTime, 108) AS AppointmentTime,

          a.Status,
          a.Notes,
          a.CreatedAt,

          a.AppointmentService,

          a.UserID,
          u.UserName AS DoctorName

        FROM dbo.Appointments a

        INNER JOIN dbo.Patients p
          ON a.PatientID = p.PatientID

        LEFT JOIN dbo.Users u
          ON a.UserID = u.UserID
          AND u.RoleID = 2

        WHERE
          a.AppointmentID = @AppointmentID
      `);


  return detailsResult.recordset[0] || null;
};


// =====================================================
// UPDATE APPOINTMENT
// =====================================================

const updateAppointment = async (id, data) => {

  const pool = await connectDB();


  const {
    PatientID,
    AppointmentDate,
    AppointmentTime,
    Status,
    Notes,
    AppointmentService,
    UserID,
  } = data;


  const result = await pool
    .request()

    .input(
      "AppointmentID",
      sql.Int,
      Number(id)
    )

    .input(
      "PatientID",
      sql.Int,
      Number(PatientID)
    )

    .input(
      "AppointmentDate",
      sql.Date,
      AppointmentDate
    )

    .input(
      "AppointmentTime",
      sql.VarChar(5),
      AppointmentTime
    )

    .input(
      "Status",
      sql.NVarChar(50),
      Status || "Pending"
    )

    .input(
      "Notes",
      sql.NVarChar(sql.MAX),
      Notes || null
    )

    .input(
      "AppointmentService",
      sql.NVarChar(30),
      AppointmentService || null
    )

    .input(
      "UserID",
      sql.Int,
      UserID
        ? Number(UserID)
        : null
    )

    .query(`
      UPDATE dbo.Appointments

      SET
        PatientID = @PatientID,
        AppointmentDate = @AppointmentDate,
        AppointmentTime =  CAST(@AppointmentTime AS time),
        Status = @Status,
        Notes = @Notes,
        AppointmentService = @AppointmentService,
        UserID = @UserID

      OUTPUT
        INSERTED.AppointmentID

      WHERE
        AppointmentID = @AppointmentID
    `);


  if (
    result.recordset.length === 0
  ) {

    return null;

  }


  // ---------------------------------------------------
  // GET UPDATED APPOINTMENT
  // ---------------------------------------------------

  const updatedResult =
    await pool
      .request()
      .input(
        "AppointmentID",
        sql.Int,
        Number(id)
      )
      .query(`
        SELECT
          a.AppointmentID,
          a.PatientID,
          p.FullName AS PatientName,
          p.FileNo,

          a.AppointmentDate,
          CONVERT(varchar(5), a.AppointmentTime, 108) AS AppointmentTime,

          a.Status,
          a.Notes,
          a.CreatedAt,

          a.AppointmentService,

          a.UserID,
          u.UserName AS DoctorName

        FROM dbo.Appointments a

        INNER JOIN dbo.Patients p
          ON a.PatientID = p.PatientID

        LEFT JOIN dbo.Users u
          ON a.UserID = u.UserID
          AND u.RoleID = 2

        WHERE
          a.AppointmentID = @AppointmentID
      `);


  return updatedResult.recordset[0] || null;
};


// =====================================================
// DELETE APPOINTMENT
// =====================================================

const deleteAppointment = async (id) => {

  const pool = await connectDB();


  const result = await pool
    .request()

    .input(
      "AppointmentID",
      sql.Int,
      Number(id)
    )

    .query(`
      DELETE FROM dbo.Appointments

      OUTPUT
        DELETED.AppointmentID

      WHERE
        AppointmentID = @AppointmentID
    `);


  return result.recordset[0] || null;
};


// =====================================================
// EXPORT
// =====================================================

export {
  getAppointments,
  getAppointmentsByDate,
  getAppointmentById,
  getSearchedAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
};