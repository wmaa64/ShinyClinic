import connectDB, { sql } from "../lib/db";

export const getRevenue = async (fromDate, toDate) => {
  if (!fromDate) {
    throw new Error("FromDate is required");
  }

  if (!toDate) {
    throw new Error("ToDate is required");
  }

  const pool = await connectDB();

  const result = await pool
    .request()
    .input("FromDate", sql.Date, fromDate)
    .input("ToDate", sql.Date, toDate)
    .query(`
      SELECT
        U.FullName AS DoctorName,

        P.FileNo,

        P.FullName AS PatientName,

        LS.SessionID,

        CAST(LS.SessionDate AS DATE) AS SessionDate,

        ISNULL(S.ServicesNet, 0) AS ServicesNet,

        ISNULL(S.ConsumablesTotal, 0) AS ConsumablesTotal,

        ISNULL(PM.TotalPaid, 0) AS TotalPaid,

        ISNULL(S.ServicesNet, 0)
          - ISNULL(PM.TotalPaid, 0) AS Remaining

      FROM LaserSessions LS

      INNER JOIN Users U
        ON LS.UserID = U.UserID

      INNER JOIN Patients P
        ON LS.PatientID = P.PatientID

      LEFT JOIN
      (
        SELECT
          SS.SessionID,

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

        GROUP BY SS.SessionID

      ) S
        ON LS.SessionID = S.SessionID

      LEFT JOIN
      (
        SELECT
          SessionID,
          SUM(AmountPaid) AS TotalPaid

        FROM SessionPayments

        GROUP BY SessionID

      ) PM
        ON LS.SessionID = PM.SessionID

      WHERE
        CAST(LS.SessionDate AS DATE)
        BETWEEN @FromDate AND @ToDate

      ORDER BY
        U.FullName,
        LS.SessionDate,
        LS.SessionID
    `);

  return result.recordset;
};