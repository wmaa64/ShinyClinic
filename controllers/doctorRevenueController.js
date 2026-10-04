import connectDB, { sql } from "../lib/db";

// Load line-item service revenue and attributed offer usage revenue for one
// doctor. Both result sets use the session date so the report period reflects
// when the doctor performed the work.
export const getDoctorRevenue = async (doctorID, fromDate, toDate) => {
  const parsedDoctorID = Number(doctorID);

  if (!Number.isInteger(parsedDoctorID) || parsedDoctorID <= 0) {
    throw new Error("Valid DoctorID is required");
  }
  if (!fromDate || !toDate) {
    throw new Error("FromDate and ToDate are required");
  }
  if (fromDate > toDate) {
    throw new Error("FromDate cannot be after ToDate");
  }

  const pool = await connectDB();

  const request = pool.request()
    .input("DoctorID", sql.Int, parsedDoctorID)
    .input("FromDate", sql.Date, fromDate)
    .input("ToDate", sql.Date, toDate);

  const result = await request.query(`
    SELECT
      LS.SessionID,
      CAST(LS.SessionDate AS DATE) AS SessionDate,
      P.FileNo,
      P.FullName AS PatientName,
      SS.SessionServiceID,
      S.ServiceName,
      SC.CategoryName,
      SS.Qty,
      SS.UnitPrice,
      SS.LineTotal
    FROM dbo.SessionServices SS
    INNER JOIN dbo.LaserSessions LS ON LS.SessionID = SS.SessionID
    INNER JOIN dbo.Patients P ON P.PatientID = LS.PatientID
    INNER JOIN dbo.Services S ON S.ServiceID = SS.ServiceID
    LEFT JOIN dbo.ServiceCategories SC ON SC.CategoryID = S.CategoryID
    WHERE LS.UserID = @DoctorID
      AND LS.SessionDate >= @FromDate
      AND LS.SessionDate < DATEADD(DAY, 1, @ToDate)
    ORDER BY LS.SessionDate, LS.SessionID, SS.SessionServiceID;

    SELECT
      LS.SessionID,
      CAST(LS.SessionDate AS DATE) AS SessionDate,
      P.FileNo,
      P.FullName AS PatientName,
      OSU.OfferSubscriptionUsageID,
      O.OfferName,
      OC.CategoryName,
      OSU.ConsumedQuantity,
      OSU.PulsesNo,
      OS.ForPrice AS SubscriptionPrice,
      OS.GivenQuantity AS SubscriptionQuantity,
      CAST(
        CASE
          WHEN ISNULL(OS.GivenQuantity, 0) = 0 THEN 0
          ELSE OS.ForPrice * OSU.ConsumedQuantity / NULLIF(OS.GivenQuantity, 0)
        END AS DECIMAL(18, 2)
      ) AS AttributedRevenue
    FROM dbo.OfferSubscriptionUsage OSU
    INNER JOIN dbo.OfferSubscriptions OS
      ON OS.OfferSubscriptionID = OSU.OfferSubscriptionID
    INNER JOIN dbo.Offers O ON O.OfferID = OS.OfferID
    LEFT JOIN dbo.OfferCategories OC ON OC.CategoryID = O.CategoryID
    INNER JOIN dbo.LaserSessions LS ON LS.SessionID = OSU.SessionID
    INNER JOIN dbo.Patients P ON P.PatientID = LS.PatientID
    WHERE LS.UserID = @DoctorID
      AND LS.SessionDate >= @FromDate
      AND LS.SessionDate < DATEADD(DAY, 1, @ToDate)
    ORDER BY LS.SessionDate, LS.SessionID, OSU.OfferSubscriptionUsageID;

    SELECT
      DRP.DoctorRevenuePercentageID,
      DRP.UserID,
      U.FullName AS DoctorName,
      U.UserName,
      DRP.Percentage,
      DRP.IsActive,
      DRP.CreatedAt
    FROM dbo.DoctorRevenuePercentages DRP
    INNER JOIN dbo.Users U 
      ON DRP.UserID = U.UserID
    WHERE DRP.UserID = @DoctorID
    AND U.RoleID = 2
  `);

  return {
    sessionServices: result.recordsets[0] || [],
    offerUsage: result.recordsets[1] || [],
    doctorRevenuePercentage: result.recordsets[2]?.[0] ?? null,
  };
};
