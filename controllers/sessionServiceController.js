import connectDB, { sql } from "../lib/db";


// =====================================================
// GET SESSION SERVICES
// =====================================================
//
// Only services belonging to TODAY'S session for the
// specified patient can be returned.
//
// =====================================================

const getSessionServices = async (sessionId, patientId) => {

  const pool = await connectDB();

  const parsedSessionId = Number(sessionId);
  const parsedPatientId = Number(patientId);

  if (
    !Number.isInteger(parsedSessionId) ||
    parsedSessionId <= 0
  ) {
    throw new Error("Invalid SessionID");
  }

  if (
    !Number.isInteger(parsedPatientId) ||
    parsedPatientId <= 0
  ) {
    throw new Error("Invalid PatientID");
  }


  const result = await pool
    .request()
    .input(
      "SessionID",
      sql.Int,
      parsedSessionId
    )
    .input(
      "PatientID",
      sql.Int,
      parsedPatientId
    )
    .query(`
      SELECT
        ss.SessionServiceID,
        ss.SessionID,
        ss.PatientID,

        ss.ServiceID,
        s.ServiceName,
        s.CategoryID,
        sc.CategoryName,

        ss.Qty,
        ss.PulsesNo,
        ss.UnitPrice,
        ss.LineTotal,
        ss.Discount,
        ss.Notes,
        ss.CreatedAt

      FROM dbo.SessionServices ss

      INNER JOIN dbo.Services s
        ON ss.ServiceID = s.ServiceID

      LEFT JOIN dbo.ServiceCategories sc
        ON s.CategoryID = sc.CategoryID

      INNER JOIN dbo.LaserSessions ls
        ON ss.SessionID = ls.SessionID

      WHERE
        ss.SessionID = @SessionID
        AND ss.PatientID = @PatientID

        -- TODAY ONLY
        AND ls.SessionDate >= CAST(GETDATE() AS DATE)
        AND ls.SessionDate < DATEADD(
          DAY,
          1,
          CAST(GETDATE() AS DATE)
        )

      ORDER BY
        ss.SessionServiceID ASC
    `);

  return result.recordset;
};


// =====================================================
// SAVE ALL SESSION SERVICES
// =====================================================
//
// Replace-all strategy:
//
// DELETE all current services for today's session
// INSERT the services currently present in the page
//
// IMPORTANT:
// The session must:
//   1. exist
//   2. belong to PatientID
//   3. have today's SessionDate
//
// =====================================================

const saveSessionServices = async (
  sessionId,
  patientId,
  services
) => {

  const pool = await connectDB();

  const parsedSessionId = Number(sessionId);
  const parsedPatientId = Number(patientId);


  // ---------------------------------------------------
  // BASIC VALIDATION
  // ---------------------------------------------------

  if (
    !Number.isInteger(parsedSessionId) ||
    parsedSessionId <= 0
  ) {
    throw new Error("Invalid SessionID");
  }


  if (
    !Number.isInteger(parsedPatientId) ||
    parsedPatientId <= 0
  ) {
    throw new Error("Invalid PatientID");
  }


  if (!Array.isArray(services)) {
    throw new Error("Services must be an array");
  }


  const transaction = new sql.Transaction(pool);


  try {

    // =================================================
    // BEGIN TRANSACTION
    // =================================================

    await transaction.begin();


    // =================================================
    // VERIFY TODAY'S SESSION
    // =================================================

    const sessionRequest =
      new sql.Request(transaction);

    const sessionResult =
      await sessionRequest

        .input(
          "SessionID",
          sql.Int,
          parsedSessionId
        )

        .input(
          "PatientID",
          sql.Int,
          parsedPatientId
        )

        .query(`
          SELECT
            SessionID,
            PatientID,
            SessionDate

          FROM dbo.LaserSessions

          WHERE
            SessionID = @SessionID
            AND PatientID = @PatientID

            -- TODAY ONLY
            AND SessionDate >= CAST(GETDATE() AS DATE)
            AND SessionDate < DATEADD(
              DAY,
              1,
              CAST(GETDATE() AS DATE)
            )
        `);


    const session =
      sessionResult.recordset[0];


    if (!session) {
      throw new Error(
        "Today's session was not found for this patient"
      );
    }


    // =================================================
    // DELETE EXISTING SERVICES
    // =================================================

    const deleteRequest =
      new sql.Request(transaction);

    await deleteRequest

      .input(
        "SessionID",
        sql.Int,
        parsedSessionId
      )

      .input(
        "PatientID",
        sql.Int,
        parsedPatientId
      )

      .query(`
        DELETE FROM dbo.SessionServices

        WHERE
          SessionID = @SessionID
          AND PatientID = @PatientID
      `);


    // =================================================
    // INSERT CURRENT SERVICES
    // =================================================

    for (const service of services) {

      const serviceId =
        Number(service.ServiceID);

      const qty =
        Number(service.Qty);

      const unitPrice =
        Number(service.UnitPrice);

      const pulsesNo =  service.PulsesNo === undefined ||  service.PulsesNo === null ||  service.PulsesNo === ""
                        ? null
                        : Number(service.PulsesNo);

      const discount =
        service.Discount === undefined ||
        service.Discount === null ||
        service.Discount === ""
          ? 0
          : Number(service.Discount);

      const notes =
        service.Notes === undefined ||
        service.Notes === null ||
        service.Notes === ""
          ? null
          : String(service.Notes);


      // -------------------------------------------------
      // VALIDATE SERVICE ID
      // -------------------------------------------------

      if (
        !Number.isInteger(serviceId) ||
        serviceId <= 0
      ) {
        throw new Error(
          "Invalid ServiceID"
        );
      }


      // -------------------------------------------------
      // VALIDATE QUANTITY
      // -------------------------------------------------

      if (
        !Number.isFinite(qty) ||
        qty <= 0
      ) {
        throw new Error(
          "Quantity must be greater than zero"
        );
      }

      // -------------------------------------------------
      // VALIDATE PULSES NUMBER
      // -------------------------------------------------

      if (
        pulsesNo !== null &&
        (
          !Number.isInteger(pulsesNo) ||
          pulsesNo < 0
        )
      ) {
        throw new Error(
          "PulsesNo must be a valid whole number"
        );
      }

      // -------------------------------------------------
      // VALIDATE UNIT PRICE
      // -------------------------------------------------

      if (
        !Number.isFinite(unitPrice) ||
        unitPrice < 0
      ) {
        throw new Error(
          "Invalid UnitPrice"
        );
      }


      // -------------------------------------------------
      // VALIDATE DISCOUNT
      // -------------------------------------------------

      if (
        !Number.isFinite(discount) ||
        discount < 0
      ) {
        throw new Error(
          "Discount cannot be negative"
        );
      }


      // -------------------------------------------------
      // CALCULATE LINE TOTAL
      // -------------------------------------------------

      const lineTotal =
        (qty * unitPrice) - discount;


      if (lineTotal < 0) {
        throw new Error(
          "Discount cannot be greater than the service total"
        );
      }


      // -------------------------------------------------
      // INSERT
      // -------------------------------------------------

      const insertRequest =
        new sql.Request(transaction);

      await insertRequest

        .input(
          "SessionID",
          sql.Int,
          parsedSessionId
        )

        .input(
          "PatientID",
          sql.Int,
          parsedPatientId
        )

        .input(
          "ServiceID",
          sql.Int,
          serviceId
        )

        .input(
          "Qty",
          sql.Decimal(18, 2),
          qty
        )

        .input(
          "PulsesNo",
          sql.Int,
          pulsesNo
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
          "Discount",
          sql.Decimal(18, 2),
          discount
        )

        .input(
          "Notes",
          sql.NVarChar(300),
          notes
        )

        .query(`
          INSERT INTO dbo.SessionServices
          (
            SessionID,
            PatientID,
            ServiceID,
            Qty,
            PulsesNo,
            UnitPrice,
            LineTotal,
            Discount,
            Notes,
            CreatedAt
          )

          VALUES
          (
            @SessionID,
            @PatientID,
            @ServiceID,
            @Qty,
            @PulsesNo,
            @UnitPrice,
            @LineTotal,
            @Discount,
            @Notes,
            GETDATE()
          )
        `);
    }


    // =================================================
    // COMMIT
    // =================================================

    await transaction.commit();


    // =================================================
    // RETURN SAVED SERVICES
    // =================================================

    return await getSessionServices(
      parsedSessionId,
      parsedPatientId
    );

  } catch (error) {

    // =================================================
    // ROLLBACK
    // =================================================

    try {
      await transaction.rollback();
    } catch (rollbackError) {

      console.error(
        "SessionServices rollback failed:",
        rollbackError
      );
    }

    throw error;
  }
};


// =====================================================
// GET PATIENT PAYABLE TOTAL
// =====================================================
//
// TODAY'S SESSION ONLY
//
// CategoryID = 10
//     → consumable
//     → excluded from patient payable total
//
// CategoryID <> 10
//     → included
//
// =====================================================

const getSessionPayableTotal = async (
  sessionId,
  patientId
) => {

  const pool = await connectDB();

  const parsedSessionId = Number(sessionId);
  const parsedPatientId = Number(patientId);


  if (
    !Number.isInteger(parsedSessionId) ||
    parsedSessionId <= 0
  ) {
    throw new Error("Invalid SessionID");
  }


  if (
    !Number.isInteger(parsedPatientId) ||
    parsedPatientId <= 0
  ) {
    throw new Error("Invalid PatientID");
  }


  const result = await pool
    .request()

    .input(
      "SessionID",
      sql.Int,
      parsedSessionId
    )

    .input(
      "PatientID",
      sql.Int,
      parsedPatientId
    )

    .query(`
      SELECT
        ISNULL(
          SUM(
            CASE
              WHEN s.CategoryID <> 10
                THEN ss.LineTotal
              ELSE 0
            END
          ),
          0
        ) AS PayableTotal

      FROM dbo.SessionServices ss

      INNER JOIN dbo.Services s
        ON ss.ServiceID = s.ServiceID

      INNER JOIN dbo.LaserSessions ls
        ON ss.SessionID = ls.SessionID

      WHERE
        ss.SessionID = @SessionID
        AND ss.PatientID = @PatientID

        -- TODAY ONLY
        AND ls.SessionDate >= CAST(GETDATE() AS DATE)
        AND ls.SessionDate < DATEADD(
          DAY,
          1,
          CAST(GETDATE() AS DATE)
        )
    `);


  return Number(
    result.recordset[0]?.PayableTotal || 0
  );
};


// =====================================================
// EXPORT
// =====================================================

export {
  getSessionServices,
  saveSessionServices,
  getSessionPayableTotal,
};