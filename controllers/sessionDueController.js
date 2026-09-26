import connectDB, { sql } from "../lib/db";


// ============================================================
// GET ALL SESSIONS FOR A SELECTED DATE
// ============================================================

const getSessionsDueByDate = async (sessionDate) => {

  if (!sessionDate) {
    throw new Error("Session date is required.");
  }

  const pool = await connectDB();

  const result = await pool
    .request()
    .input(
      "SessionDate",
      sql.Date,
      sessionDate
    )
    .query(`
      SELECT

        LS.SessionID,

        LS.PatientID,

        LS.UserID,

        P.FullName AS PatientName,

        U.FullName AS DoctorName,

        CONVERT(varchar(5), LS.SessionDate, 108) AS SessionTime,

        ISNULL(S.ServicesTotal, 0) AS ServicesTotal,

        ISNULL(S.ServicesDiscount, 0) AS ServicesDiscount,

        ISNULL(S.ServicesNet, 0) AS ServicesNet,

        ISNULL(PM.TotalPaid, 0) AS TotalPaid,

        ISNULL(S.ServicesNet, 0)
          - ISNULL(PM.TotalPaid, 0) AS Remaining,

        ISNULL(S.ConsumablesTotal, 0) AS ConsumablesTotal

      FROM LaserSessions LS

      INNER JOIN Patients P
        ON LS.PatientID = P.PatientID

      INNER JOIN Users U
        ON LS.UserID = U.UserID

      LEFT JOIN
      (
        SELECT

          SS.SessionID,

          SUM(
            CASE
              WHEN SV.CategoryID <> 10
              THEN SS.Qty * SS.UnitPrice
              ELSE 0
            END
          ) AS ServicesTotal,

          SUM(
            CASE
              WHEN SV.CategoryID <> 10
              THEN SS.Discount
              ELSE 0
            END
          ) AS ServicesDiscount,

          SUM(
            CASE
              WHEN SV.CategoryID <> 10
              THEN SS.LineTotal
              ELSE 0
            END
          ) AS ServicesNet,

          SUM(
            CASE
              WHEN SV.CategoryID = 10
              THEN SS.LineTotal
              ELSE 0
            END
          ) AS ConsumablesTotal

        FROM SessionServices SS

        INNER JOIN Services SV
          ON SS.ServiceID = SV.ServiceID

        GROUP BY
          SS.SessionID

      ) S
        ON LS.SessionID = S.SessionID

      LEFT JOIN
      (
        SELECT

          SessionID,

          SUM(AmountPaid) AS TotalPaid

        FROM SessionPayments

        GROUP BY
          SessionID

      ) PM
        ON LS.SessionID = PM.SessionID

      WHERE
        CAST(LS.SessionDate AS DATE) = @SessionDate

      ORDER BY
        LS.SessionDate
    `);

  return result.recordset;
};


// ============================================================
// GET SERVICES FOR ONE SESSION
// ============================================================

const getSessionDueServices = async (sessionID) => {

  if (!sessionID) {
    throw new Error("Session ID is required.");
  }

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

        SS.SessionServiceID,

        SS.SessionID,

        SS.PatientID,

        SS.ServiceID,

        SV.ServiceName,

        SV.CategoryID,

        SC.CategoryName,

        SS.Qty,

        SS.UnitPrice,

        SS.Discount,

        SS.LineTotal,

        SS.Notes,

        SS.CreatedAt

      FROM SessionServices SS

      INNER JOIN Services SV
        ON SS.ServiceID = SV.ServiceID

      LEFT JOIN ServiceCategories SC
        ON SV.CategoryID = SC.CategoryID

      WHERE
        SS.SessionID = @SessionID

      ORDER BY
        SS.SessionServiceID
    `);

  return result.recordset;
};

export {getSessionsDueByDate, getSessionDueServices}