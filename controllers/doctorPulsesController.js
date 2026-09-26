import connectDB, { sql } from "../lib/db";

export const getDoctorPulses = async (doctorID, fromDate, toDate) => {
  if (!doctorID) {
    throw new Error("DoctorID is required");
  }

  if (!fromDate) {
    throw new Error("FromDate is required");
  }

  if (!toDate) {
    throw new Error("ToDate is required");
  }

  const pool = await connectDB();

  const result = await pool
    .request()
    .input("DoctorID", sql.Int, doctorID)
    .input("FromDate", sql.Date, fromDate)
    .input("ToDate", sql.Date, toDate)
    .query(`
      SELECT
        U.UserID,
        U.UserName AS DoctorName,

        P.FileNo,
        P.FullName AS PatientName,

        LS.SessionID,
        CAST(LS.SessionDate AS DATE) AS SessionDate,

        ISNULL(S.TotalPulses, 0) AS TotalPulses

      FROM LaserSessions LS

      INNER JOIN Users U
        ON LS.UserID = U.UserID

      INNER JOIN Patients P
        ON LS.PatientID = P.PatientID

      LEFT JOIN (
        SELECT
          SS.SessionID,
          SUM(ISNULL(SS.PulsesNo, 0)) AS TotalPulses
        FROM SessionServices SS
        GROUP BY SS.SessionID
      ) S
        ON LS.SessionID = S.SessionID

      WHERE
        U.UserID = @DoctorID
        AND CAST(LS.SessionDate AS DATE)
            BETWEEN @FromDate AND @ToDate

      ORDER BY
        LS.SessionDate,
        LS.SessionID
    `);

  return result.recordset;
};