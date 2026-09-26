import connectDB, { sql } from "../lib/db";

// =====================================================
// GET TODAY'S APPOINTMENTS
// =====================================================

const getTodayAppointments = async (date) => {

  const pool = await connectDB();

  const result = await pool
    .request()
    .input("AppointmentDate", sql.Date, date)
    .query(`
      SELECT

        a.AppointmentID,

        a.PatientID,

        p.FullName AS PatientName,
        p.FileNo,

        a.AppointmentDate,
        CONVERT(varchar(5), a.AppointmentTime, 108) AS  AppointmentTime,

        a.Status,
        a.Notes,

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
        a.AppointmentTime ASC,
        a.AppointmentID ASC
    `);

  return result.recordset;
};

// =====================================================
// GET SESSION BY ID
// =====================================================

const getSessionById = async (id) => {

  const pool = await connectDB();

  const result = await pool
    .request()
    .input(
      "SessionID",
      sql.Int,
      Number(id)
    )
    .query(`
      SELECT
        ls.SessionID,
        ls.PatientID,

        p.FullName AS PatientName,
        p.FileNo,

        ls.SessionDate,

        ls.Area,
        ls.Device,

        ls.SessionPrice,
        ls.Notes,

        ls.PlanID,
        ls.AreaID,
        ls.DeviceID,

        ls.UserID,

        u.UserName AS DoctorName

      FROM dbo.LaserSessions ls

      LEFT JOIN dbo.Patients p
        ON ls.PatientID = p.PatientID

      LEFT JOIN dbo.Users u
        ON ls.UserID = u.UserID

      WHERE
        ls.SessionID = @SessionID
    `);

  return result.recordset[0] || null;
};


// =====================================================
// GET SESSIONS BY PATIENT
// =====================================================

const getSessionsByPatient = async (patientID) => {

  const pool = await connectDB();

  const result = await pool
    .request()
    .input(
      "PatientID",
      sql.Int,
      Number(patientID)
    )
    .query(`
      SELECT
        ls.SessionID,
        ls.PatientID,

        p.FullName AS PatientName,
        p.FileNo,

        ls.SessionDate,

        ls.Area,
        ls.Device,

        ls.SessionPrice,
        ls.Notes,

        ls.PlanID,
        ls.AreaID,
        ls.DeviceID,

        ls.UserID,

        u.UserName AS DoctorName

      FROM dbo.LaserSessions ls

      LEFT JOIN dbo.Patients p
        ON ls.PatientID = p.PatientID

      LEFT JOIN dbo.Users u
        ON ls.UserID = u.UserID

      WHERE
        ls.PatientID = @PatientID

      ORDER BY
        ls.SessionDate DESC,
        ls.SessionID DESC
    `);

  return result.recordset;
};

// =====================================================
// GET TODAY'S SESSION BY PATIENT
// =====================================================

const getTodaySessionByPatient = async (patientID, date) => {

  const pool = await connectDB();

  const result = await pool
    .request()

    .input(
      "PatientID",
      sql.Int,
      Number(patientID)
    )

    .input(
      "SessionDate",
      sql.Date,
      date
    )

    .query(`
      SELECT

        ls.SessionID,
        ls.PatientID,

        p.FullName AS PatientName,
        p.FileNo,

        ls.SessionDate,

        ls.Area,
        ls.Device,

        ls.SessionPrice,
        ls.Notes,

        ls.PlanID,
        ls.AreaID,
        ls.DeviceID,

        ls.UserID,

        u.UserName AS DoctorName

      FROM dbo.LaserSessions ls

      LEFT JOIN dbo.Patients p
        ON ls.PatientID = p.PatientID

      LEFT JOIN dbo.Users u
        ON ls.UserID = u.UserID

      WHERE
        ls.PatientID = @PatientID

        AND CAST(
          ls.SessionDate AS date
        ) = @SessionDate

      ORDER BY
        ls.SessionID DESC
    `);

  return result.recordset[0] || null;
};

// =====================================================
// CREATE SESSION
// =====================================================

const createSession = async (data) => {

  const pool = await connectDB();

  const {
    PatientID,
    SessionDate,
    Area,
    Device,
    SessionPrice,
    Notes,
    PlanID,
    AreaID,
    DeviceID,
    UserID,
  } = data;


  const result = await pool
    .request()

    .input(
      "PatientID",
      sql.Int,
      PatientID
        ? Number(PatientID)
        : null
    )

    .input(
      "SessionDate",
      sql.DateTime,
      SessionDate
        ? new Date(SessionDate)
        : new Date()
    )

    .input(
      "Area",
      sql.NVarChar(100),
      Area || null
    )

    .input(
      "Device",
      sql.NVarChar(100),
      Device || null
    )

    .input(
      "SessionPrice",
      sql.Decimal(18, 2),
      SessionPrice === undefined ||
      SessionPrice === null ||
      SessionPrice === ""
        ? 0
        : Number(SessionPrice)
    )

    .input(
      "Notes",
      sql.NVarChar(sql.MAX),
      Notes || null
    )

    .input(
      "PlanID",
      sql.Int,
      PlanID
        ? Number(PlanID)
        : null
    )

    .input(
      "AreaID",
      sql.Int,
      AreaID
        ? Number(AreaID)
        : null
    )

    .input(
      "DeviceID",
      sql.Int,
      DeviceID
        ? Number(DeviceID)
        : null
    )

    .input(
      "UserID",
      sql.Int,
      UserID
        ? Number(UserID)
        : null
    )

    .query(`
      INSERT INTO dbo.LaserSessions
      (
        PatientID,
        SessionDate,
        Area,
        Device,
        SessionPrice,
        Notes,
        PlanID,
        DeviceID,
        AreaID,
        UserID
      )

      OUTPUT
        INSERTED.SessionID,
        INSERTED.PatientID,
        INSERTED.SessionDate,
        INSERTED.Area,
        INSERTED.Device,
        INSERTED.SessionPrice,
        INSERTED.Notes,
        INSERTED.PlanID,
        INSERTED.DeviceID,
        INSERTED.AreaID,
        INSERTED.UserID

      VALUES
      (
        @PatientID,
        @SessionDate,
        @Area,
        @Device,
        @SessionPrice,
        @Notes,
        @PlanID,
        @DeviceID,
        @AreaID,
        @UserID
      )
    `);


  const session = result.recordset[0];

  if (!session) {
    return null;
  }


  // ---------------------------------------------------
  // GET PATIENT / DOCTOR INFORMATION
  // ---------------------------------------------------

  const details = await pool
    .request()
    .input(
      "SessionID",
      sql.Int,
      session.SessionID
    )
    .query(`
      SELECT

        ls.SessionID,
        ls.PatientID,

        p.FullName AS PatientName,
        p.FileNo,

        ls.SessionDate,

        ls.Area,
        ls.Device,

        ls.SessionPrice,
        ls.Notes,

        ls.PlanID,
        ls.AreaID,
        ls.DeviceID,

        ls.UserID,

        u.UserName AS DoctorName

      FROM dbo.LaserSessions ls

      LEFT JOIN dbo.Patients p
        ON ls.PatientID = p.PatientID

      LEFT JOIN dbo.Users u
        ON ls.UserID = u.UserID

      WHERE
        ls.SessionID = @SessionID
    `);


  return details.recordset[0] || session;
};


// =====================================================
// UPDATE SESSION
// =====================================================

const updateSession = async (id, data) => {

  const pool = await connectDB();

  const {
    PatientID,
    SessionDate,
    Area,
    Device,
    SessionPrice,
    Notes,
    PlanID,
    AreaID,
    DeviceID,
    UserID,
  } = data;


  const result = await pool
    .request()

    .input(
      "SessionID",
      sql.Int,
      Number(id)
    )

    .input(
      "PatientID",
      sql.Int,
      PatientID
        ? Number(PatientID)
        : null
    )

    .input(
      "SessionDate",
      sql.DateTime,
      SessionDate
        ? new Date(SessionDate)
        : new Date()
    )

    .input(
      "Area",
      sql.NVarChar(100),
      Area || null
    )

    .input(
      "Device",
      sql.NVarChar(100),
      Device || null
    )

    .input(
      "SessionPrice",
      sql.Decimal(18, 2),
      SessionPrice === undefined ||
      SessionPrice === null ||
      SessionPrice === ""
        ? 0
        : Number(SessionPrice)
    )

    .input(
      "Notes",
      sql.NVarChar(sql.MAX),
      Notes || null
    )

    .input(
      "PlanID",
      sql.Int,
      PlanID
        ? Number(PlanID)
        : null
    )

    .input(
      "AreaID",
      sql.Int,
      AreaID
        ? Number(AreaID)
        : null
    )

    .input(
      "DeviceID",
      sql.Int,
      DeviceID
        ? Number(DeviceID)
        : null
    )

    .input(
      "UserID",
      sql.Int,
      UserID
        ? Number(UserID)
        : null
    )

    .query(`
      UPDATE dbo.LaserSessions

      SET

        PatientID = @PatientID,
        SessionDate = @SessionDate,

        Area = @Area,
        Device = @Device,

        SessionPrice = @SessionPrice,
        Notes = @Notes,

        PlanID = @PlanID,
        AreaID = @AreaID,
        DeviceID = @DeviceID,

        UserID = @UserID

      OUTPUT
        INSERTED.SessionID

      WHERE
        SessionID = @SessionID
    `);


  if (!result.recordset[0]) {
    return null;
  }


  return getSessionById(id);
};


// =====================================================
// DELETE SESSION
// =====================================================

const deleteSession = async (id) => {

  const pool = await connectDB();

  const transaction = new sql.Transaction(pool);

  try {

    await transaction.begin();


    // ---------------------------------------------------
    // DELETE SESSION SERVICES FIRST
    // ---------------------------------------------------

    await transaction
      .request()
      .input(
        "SessionID",
        sql.Int,
        Number(id)
      )
      .query(`
        DELETE FROM dbo.SessionServices
        WHERE SessionID = @SessionID
      `);


    // ---------------------------------------------------
    // DELETE SESSION
    // ---------------------------------------------------

    const result = await transaction
      .request()
      .input(
        "SessionID",
        sql.Int,
        Number(id)
      )
      .query(`
        DELETE FROM dbo.LaserSessions

        OUTPUT
          DELETED.SessionID

        WHERE
          SessionID = @SessionID
      `);


    await transaction.commit();


    return result.recordset[0] || null;

  }

  catch (error) {

    try {
      await transaction.rollback();
    } catch (rollbackError) {
      console.error(
        "Session rollback error:",
        rollbackError
      );
    }

    throw error;
  }
};


// =====================================================
// GET SESSION SERVICES
// =====================================================

const getSessionServices = async (sessionID) => {

  const pool = await connectDB();

  const result = await pool
    .request()
    .input(
      "SessionID",
      sql.Int,
      Number(sessionID)
    )
    .query(`
      SELECT

        ss.SessionServiceID,
        ss.SessionID,
        ss.PatientID,

        ss.ServiceID,

        s.ServiceName,

        s.CategoryID,

        ss.Qty,
        ss.UnitPrice,
        ss.Discount,
        ss.LineTotal,

        ss.Notes,
        ss.CreatedAt

      FROM dbo.SessionServices ss

      INNER JOIN dbo.Services s
        ON ss.ServiceID = s.ServiceID

      WHERE
        ss.SessionID = @SessionID

      ORDER BY
        ss.SessionServiceID ASC
    `);


  return result.recordset;
};


// =====================================================
// SAVE SESSION SERVICES
// =====================================================

const saveSessionServices = async (
  sessionID,
  patientID,
  services
) => {

  const pool = await connectDB();

  const transaction =
    new sql.Transaction(pool);


  try {

    await transaction.begin();


    // ---------------------------------------------------
    // DELETE CURRENT SERVICES
    // ---------------------------------------------------

    await transaction
      .request()
      .input(
        "SessionID",
        sql.Int,
        Number(sessionID)
      )
      .query(`
        DELETE FROM dbo.SessionServices

        WHERE
          SessionID = @SessionID
      `);


    // ---------------------------------------------------
    // INSERT CURRENT SERVICES
    // ---------------------------------------------------

    for (const service of services) {

      const qty =
        service.Qty === undefined ||
        service.Qty === null ||
        service.Qty === ""
          ? 1
          : Number(service.Qty);


      const unitPrice =
        service.UnitPrice === undefined ||
        service.UnitPrice === null ||
        service.UnitPrice === ""
          ? 0
          : Number(service.UnitPrice);


      const discount =
        service.Discount === undefined ||
        service.Discount === null ||
        service.Discount === ""
          ? 0
          : Number(service.Discount);


      const lineTotal =
        (qty * unitPrice) - discount;


      await transaction
        .request()

        .input(
          "SessionID",
          sql.Int,
          Number(sessionID)
        )

        .input(
          "PatientID",
          sql.Int,
          Number(patientID)
        )

        .input(
          "ServiceID",
          sql.Int,
          Number(service.ServiceID)
        )

        .input(
          "Qty",
          sql.Decimal(18, 2),
          qty
        )

        .input(
          "UnitPrice",
          sql.Decimal(18, 2),
          unitPrice
        )

        .input(
          "LineTotal",
          sql.Decimal(18, 2),
          lineTotal
        )

        .input(
          "Notes",
          sql.NVarChar(300),
          service.Notes || null
        )

        .input(
          "Discount",
          sql.Decimal(18, 2),
          discount
        )

        .query(`
          INSERT INTO dbo.SessionServices
          (
            SessionID,
            PatientID,
            ServiceID,
            Qty,
            UnitPrice,
            LineTotal,
            Notes,
            CreatedAt,
            Discount
          )

          VALUES
          (
            @SessionID,
            @PatientID,
            @ServiceID,
            @Qty,
            @UnitPrice,
            @LineTotal,
            @Notes,
            GETDATE(),
            @Discount
          )
        `);
    }


    await transaction.commit();


    // ---------------------------------------------------
    // RETURN SAVED SERVICES
    // ---------------------------------------------------

    return getSessionServices(sessionID);

  }

  catch (error) {

    try {
      await transaction.rollback();
    } catch (rollbackError) {
      console.error(
        "Session services rollback error:",
        rollbackError
      );
    }

    throw error;
  }
};


// =====================================================
// EXPORT
// =====================================================

export {
  getTodayAppointments,

  getSessionById,
  getSessionsByPatient,
  getTodaySessionByPatient,
  createSession,
  updateSession,
  deleteSession,

  getSessionServices,
  saveSessionServices,
};