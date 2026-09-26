import connectDB, { sql } from "../lib/db";

// ============================================
// GET DAILY PULSE READING
// ============================================
export const getDailyPulseReading = async (pulseDate) => {
  if (!pulseDate) {
    throw new Error("PulseDate is required");
  }

  const pool = await connectDB();

  const result = await pool
    .request()
    .input("PulseDate", sql.Date, pulseDate)
    .query(`
      SELECT
        PulseDate,
        StartingPulses,
        EndingPulses
      FROM DailyPulseReadings
      WHERE PulseDate = @PulseDate
    `);

  return result.recordset[0] || null;
};


// ============================================
// CREATE DAILY PULSE READING
// ============================================
export const createDailyPulseReading = async (
  pulseDate,
  startingPulses
) => {
  if (!pulseDate) {
    throw new Error("PulseDate is required");
  }

  if (
    startingPulses === undefined ||
    startingPulses === null ||
    startingPulses === ""
  ) {
    throw new Error("StartingPulses is required");
  }

  startingPulses = Number(startingPulses);

  if (
    !Number.isInteger(startingPulses) ||
    startingPulses < 0
  ) {
    throw new Error(
      "StartingPulses must be a valid whole number"
    );
  }

  const pool = await connectDB();

  // Make sure there isn't already a reading for this date
  const existing = await pool
    .request()
    .input("PulseDate", sql.Date, pulseDate)
    .query(`
      SELECT PulseDate
      FROM DailyPulseReadings
      WHERE PulseDate = @PulseDate
    `);

  if (existing.recordset.length > 0) {
    throw new Error(
      "A daily pulse reading already exists for this date"
    );
  }

  const result = await pool
    .request()
    .input("PulseDate", sql.Date, pulseDate)
    .input("StartingPulses", sql.Int, startingPulses)
    .query(`
      INSERT INTO DailyPulseReadings (
        PulseDate,
        StartingPulses,
        EndingPulses
      )
      OUTPUT
        INSERTED.PulseDate,
        INSERTED.StartingPulses,
        INSERTED.EndingPulses
      VALUES (
        @PulseDate,
        @StartingPulses,
        NULL
      )
    `);

  return result.recordset[0];
};


// ============================================
// UPDATE DAILY PULSE READING
// ============================================
export const updateDailyPulseReading = async (
  pulseDate,
  startingPulses,
  endingPulses
) => {
  if (!pulseDate) {
    throw new Error("PulseDate is required");
  }

  if (
    startingPulses === undefined ||
    startingPulses === null ||
    startingPulses === ""
  ) {
    throw new Error("StartingPulses is required");
  }

  startingPulses = Number(startingPulses);

  if (
    !Number.isInteger(startingPulses) ||
    startingPulses < 0
  ) {
    throw new Error(
      "StartingPulses must be a valid whole number"
    );
  }

  if (
    endingPulses !== undefined &&
    endingPulses !== null &&
    endingPulses !== ""
  ) {
    endingPulses = Number(endingPulses);

    if (
      !Number.isInteger(endingPulses) ||
      endingPulses < 0
    ) {
      throw new Error(
        "EndingPulses must be a valid whole number"
      );
    }
  } else {
    endingPulses = null;
  }

  const pool = await connectDB();

  const result = await pool
    .request()
    .input("PulseDate", sql.Date, pulseDate)
    .input("StartingPulses", sql.Int, startingPulses)
    .input("EndingPulses", sql.Int, endingPulses)
    .query(`
      UPDATE DailyPulseReadings
      SET
        StartingPulses = @StartingPulses,
        EndingPulses = @EndingPulses
      WHERE PulseDate = @PulseDate;

      SELECT
        PulseDate,
        StartingPulses,
        EndingPulses
      FROM DailyPulseReadings
      WHERE PulseDate = @PulseDate;
    `);

  if (result.recordset.length === 0) {
    throw new Error(
      "Daily pulse reading not found for this date"
    );
  }

  return result.recordset[0];
};


// ============================================
// GET CONSUMED PULSES FOR A DAY
// ============================================
export const getDailyConsumedPulses = async (pulseDate) => {
  if (!pulseDate) {
    throw new Error("PulseDate is required");
  }

  const pool = await connectDB();

  const result = await pool
    .request()
    .input("PulseDate", sql.Date, pulseDate)
    .query(`
      SELECT
        ISNULL(SUM(ISNULL(SS.PulsesNo, 0)), 0) AS ConsumedPulses
      FROM SessionServices SS
      INNER JOIN LaserSessions LS
        ON SS.SessionID = LS.SessionID
      WHERE LS.SessionDate = @PulseDate
    `);

  return Number(
    result.recordset[0]?.ConsumedPulses || 0
  );
};

// GET DAILY SESSION PULSE DETAILS
export const getDailyPulseDetails = async (pulseDate) => {
  if (!pulseDate) {
    throw new Error("PulseDate is required");
  }

  const pool = await connectDB();

  const result = await pool.request()
    .input("PulseDate", sql.Date, pulseDate)
    .query(`
      SELECT
        LS.SessionID,
        LS.PatientID,
        P.FullName AS PatientName,
        LS.SessionDate,

        SS.SessionServiceID,
        SS.ServiceID,
        S.ServiceName,

        SS.Qty,
        SS.PulsesNo,
        SS.UnitPrice,
        SS.LineTotal

      FROM LaserSessions LS

      INNER JOIN SessionServices SS
        ON LS.SessionID = SS.SessionID

      INNER JOIN Patients P
        ON LS.PatientID = P.PatientID

      INNER JOIN Services S
        ON SS.ServiceID = S.ServiceID

      WHERE
        LS.SessionDate = @PulseDate
        AND ISNULL(SS.PulsesNo, 0) > 0

      ORDER BY
        LS.SessionID,
        SS.SessionServiceID
    `);

  return result.recordset;
};