import connectDB, { sql } from "../lib/db";

export const getRevenue = async (fromDate, toDate) => {
  if (!fromDate) {
    throw new Error("FromDate is required");
  }

  if (!toDate) {
    throw new Error("ToDate is required");
  }

  const pool = await connectDB();

  // Sum all session service charges and payments for sessions in the period.
  const sessionRequest = pool.request()
    .input("FromDate", sql.Date, fromDate)
    .input("ToDate", sql.Date, toDate);

  // Sum subscription prices and their recorded payments for subscriptions in the period.
  const offerRequest = pool.request()
    .input("FromDate", sql.Date, fromDate)
    .input("ToDate", sql.Date, toDate);

  // Sum supply costs for supplies used in sessions in the period.
  const suppliesRequest = pool.request()
    .input("FromDate", sql.Date, fromDate)
    .input("ToDate", sql.Date, toDate);

  const [sessionResult, offerResult, suppliesResult] = await Promise.all([
    sessionRequest.query(`
      SELECT
        ISNULL(SUM(SessionTotals.TotalDue), 0) AS TotalDue,
        ISNULL(SUM(SessionTotals.TotalPaid), 0) AS TotalPaid,
        ISNULL(SUM(SessionTotals.TotalDue - SessionTotals.TotalPaid), 0) AS Remaining
      FROM
      (
        SELECT
          LS.SessionID,
          ISNULL(ServiceTotals.TotalDue, 0) AS TotalDue,
          ISNULL(PaymentTotals.TotalPaid, 0) AS TotalPaid
        FROM dbo.LaserSessions LS
        LEFT JOIN
        (
          SELECT
            SessionID,
            SUM(LineTotal) AS TotalDue
          FROM dbo.SessionServices
          GROUP BY SessionID
        ) ServiceTotals
          ON LS.SessionID = ServiceTotals.SessionID
        LEFT JOIN
        (
          SELECT
            SessionID,
            SUM(AmountPaid) AS TotalPaid
          FROM dbo.SessionPayments
          GROUP BY SessionID
        ) PaymentTotals
          ON LS.SessionID = PaymentTotals.SessionID
        WHERE CAST(LS.SessionDate AS DATE)
          BETWEEN @FromDate AND @ToDate
      ) SessionTotals
    `),

    offerRequest.query(`
      SELECT
        ISNULL(SUM(OfferTotals.TotalDue), 0) AS TotalDue,
        ISNULL(SUM(OfferTotals.TotalPaid), 0) AS TotalPaid,
        ISNULL(SUM(OfferTotals.TotalDue - OfferTotals.TotalPaid), 0) AS Remaining
      FROM
      (
        SELECT
          OS.OfferSubscriptionID,
          OS.ForPrice AS TotalDue,
          ISNULL(PaymentTotals.TotalPaid, 0) AS TotalPaid
        FROM dbo.OfferSubscriptions OS
        OUTER APPLY
        (
          SELECT SUM(OSP.AmountPaid) AS TotalPaid
          FROM dbo.OfferSubscriptionPayments OSP
          WHERE OSP.OfferSubscriptionID = OS.OfferSubscriptionID
        ) PaymentTotals
        WHERE CAST(OS.SubscriptionDate AS DATE)
          BETWEEN @FromDate AND @ToDate
      ) OfferTotals
    `),

      suppliesRequest.query(`
      SELECT
        ISNULL(SUM(LineCost), 0) AS TotalSuppliesCost
      FROM dbo.SessionSupplies ss
        LEFT JOIN dbo.LaserSessions LS 
          ON ss.SessionID = LS.SessionID
      WHERE 
        CAST(LS.SessionDate AS DATE)
          BETWEEN @FromDate AND @ToDate

    `),


  ]);


  return {
    sessions: sessionResult.recordset[0],
    offers: offerResult.recordset[0],
    suppliesCost: suppliesResult.recordset[0].TotalSuppliesCost || 0,
  };
};
