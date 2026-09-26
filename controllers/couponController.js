import  connectDB, { sql } from "../lib/db";

const getPatientValidCoupon = async (patientID) => {
  const pool = await connectDB();

  const numericPatientID = Number(patientID);

  if (!Number.isInteger(numericPatientID) || numericPatientID <= 0) {
    throw new Error("Valid PatientID is required.");
  }

  const result = await pool
    .request()
    .input("PatientID", sql.Int, numericPatientID)
    .query(`
      SELECT TOP 1
        CouponID,
        CouponNo,
        PatientID,
        Amount,
        FromDate,
        ToDate,
        Status,
        CreatedAt,
        UsedAt,
        Notes
      FROM dbo.Coupons
      WHERE
        PatientID = @PatientID
        AND Status = N'Valid'
        AND CAST(GETDATE() AS date)
            BETWEEN FromDate AND ToDate
      ORDER BY
        CouponID ASC
    `);

  return result.recordset[0] || null;
};

// ============================================================
// Generate Coupon Number
// ============================================================

const generateCouponNo = async (pool) => {
  const year = new Date().getFullYear();

  const prefix = `CP${year}-%`;

  const result = await pool
    .request()
    .input("Prefix", sql.NVarChar, prefix)
    .query(`
      SELECT ISNULL(
        MAX(CAST(RIGHT(CouponNo, 6) AS INT)),
        0
      ) AS LastNo
      FROM dbo.Coupons
      WHERE CouponNo LIKE @Prefix
    `);

  const lastNo = Number(result.recordset[0].LastNo || 0);

  return `CP${year}-${String(lastNo + 1).padStart(6, "0")}`;
};


// ============================================================
// Create Coupon
// ============================================================

const createCoupon = async ({
  patientID,
  amount,
  fromDate,
  toDate,
  notes,
}) => {
  const pool = await connectDB();

  // ----------------------------------------------------------
  // Validate PatientID
  // ----------------------------------------------------------

  if (!Number.isInteger(Number(patientID)) || Number(patientID) <= 0) {
    throw new Error("Valid PatientID is required.");
  }

  // ----------------------------------------------------------
  // Validate Amount
  // ----------------------------------------------------------

  const couponAmount = Number(amount);

  if (![100, 200,300, 400,500, 600, 700, 800, 900, 1000].includes(couponAmount)) {
    throw new Error("Coupon amount must be a valid denomination.");
  }

  // ----------------------------------------------------------
  // Validate Dates
  // ----------------------------------------------------------

  if (!fromDate) {
    throw new Error("From Date is required.");
  }

  if (!toDate) {
    throw new Error("To Date is required.");
  }

  if (new Date(fromDate) > new Date(toDate)) {
    throw new Error("To Date cannot be earlier than From Date.");
  }

  // ----------------------------------------------------------
  // Generate Coupon Number
  // ----------------------------------------------------------

  const couponNo = await generateCouponNo(pool);

  // ----------------------------------------------------------
  // Insert Coupon
  // ----------------------------------------------------------

  const result = await pool
    .request()
    .input("CouponNo", sql.NVarChar(30), couponNo)
    .input("PatientID", sql.Int, Number(patientID))
    .input("Amount", sql.Decimal(18, 2), couponAmount)
    .input("FromDate", sql.Date, fromDate)
    .input("ToDate", sql.Date, toDate)
    .input("Status", sql.NVarChar(20), "Valid")
    .input("Notes", sql.NVarChar(500), notes ? String(notes).trim() : null )
    .query(`
      INSERT INTO dbo.Coupons
      (
        CouponNo,
        PatientID,
        Amount,
        FromDate,
        ToDate,
        Status,
        Notes
      )
      OUTPUT
        INSERTED.CouponID,
        INSERTED.CouponNo,
        INSERTED.PatientID,
        INSERTED.Amount,
        INSERTED.FromDate,
        INSERTED.ToDate,
        INSERTED.Status,
        INSERTED.CreatedAt,
        INSERTED.UsedAt,
        INSERTED.Notes
      VALUES
      (
        @CouponNo,
        @PatientID,
        @Amount,
        @FromDate,
        @ToDate,
        @Status,
        @Notes
      )
    `);

  return result.recordset[0];
};


export {
  generateCouponNo,
  createCoupon,
  getPatientValidCoupon
};