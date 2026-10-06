import connectDB, { sql } from "../lib/db";

export const getOfferSubscriptionReport = async (  patientID,  fromDate,  toDate) => {
  
    if (!patientID) {
    throw new Error("PatientID is required");
  }

  if (!fromDate) {
    throw new Error("FromDate is required");
  }

  if (!toDate) {
    throw new Error("ToDate is required");
  }

  const patientIdNumber = Number(patientID);

  if (!Number.isInteger(patientIdNumber) || patientIdNumber <= 0) {
    throw new Error("Invalid PatientID");
  }

  if (new Date(fromDate) > new Date(toDate)) {
    throw new Error("FromDate cannot be greater than ToDate");
  }

  const pool = await connectDB();

  const result = await pool
    .request()
    .input("PatientID", sql.Int, patientIdNumber)
    .input("FromDate", sql.Date, fromDate)
    .input("ToDate", sql.Date, toDate)
    .query(`
      SELECT
        OS.OfferSubscriptionID,

        OS.PatientID,
        P.FileNo,
        P.FullName AS PatientName,

        OS.OfferID,
        O.OfferName,

        OS.SubscriptionDate,

        OC.CategoryID,
        OC.CategoryName,

        OS.GivenQuantity,
        OS.ConsumedQuantity,

        (
          OS.GivenQuantity - OS.ConsumedQuantity
        ) AS RemainingQuantity,

        OS.ForPrice,

        ISNULL(PA.TotalPaid, 0) AS TotalPaid,

        (
          OS.ForPrice - ISNULL(PA.TotalPaid, 0)
        ) AS RemainingToPay,

        OS.Status,
        OS.Notes

      FROM dbo.OfferSubscriptions OS

      INNER JOIN dbo.Patients P
        ON OS.PatientID = P.PatientID

      INNER JOIN dbo.Offers O
        ON OS.OfferID = O.OfferID

      LEFT JOIN dbo.OfferCategories OC
        ON O.CategoryID = OC.CategoryID

      LEFT JOIN (
        SELECT
          OfferSubscriptionID,
          SUM(AmountPaid) AS TotalPaid
        FROM dbo.OfferSubscriptionPayments
        GROUP BY OfferSubscriptionID
      ) PA
        ON OS.OfferSubscriptionID = PA.OfferSubscriptionID

      WHERE
        OS.PatientID = @PatientID
        AND CAST(OS.SubscriptionDate AS DATE)
            BETWEEN @FromDate AND @ToDate

      ORDER BY
        OS.SubscriptionDate DESC,
        OS.OfferSubscriptionID DESC
    `);

  return result.recordset;
};
