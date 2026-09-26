import connectDB, { sql } from "../lib/db";

const getDashboardStatistics = async () => {
    const pool = await connectDB();

    const result = await pool.request().query(`
        SELECT
            (
                SELECT COUNT(*)
                FROM dbo.Patients
            ) AS TotalPatients,

            (
                SELECT COUNT(*)
                FROM dbo.Appointments
                WHERE CAST(AppointmentDate AS date) = CAST(GETDATE() AS date)
            ) AS TodayAppointments,

            (
                SELECT COUNT(*)
                FROM dbo.Appointments
                WHERE CAST(AppointmentDate AS date) = CAST(GETDATE() AS date)
                  AND Status = N'Pending'
            ) AS PendingAppointments,

            (
                SELECT COUNT(*)
                FROM dbo.Appointments
                WHERE CAST(AppointmentDate AS date) = CAST(GETDATE() AS date)
                  AND Status = N'Done'
            ) AS CompletedToday
    `);

    const statistics = result.recordset[0];

    return {
        totalPatients: Number(statistics.TotalPatients || 0),
        todayAppointments: Number(statistics.TodayAppointments || 0),
        pendingAppointments: Number(statistics.PendingAppointments || 0),
        completedToday: Number(statistics.CompletedToday || 0),
    };
}

const getTodayAppointments = async () => {
    const pool = await connectDB();

    const result = await pool.request().query(`
        SELECT
            a.AppointmentID,
            a.PatientID,
            p.FullName AS PatientName,
            CONVERT(varchar(5), a.AppointmentTime, 108) AS AppointmentTime,
            a.AppointmentService,
            a.Status,
            u.UserName AS DoctorName
        FROM dbo.Appointments a
        INNER JOIN dbo.Patients p
            ON a.PatientID = p.PatientID
        LEFT JOIN dbo.Users u
            ON a.UserID = u.UserID
           AND u.RoleID = 2
        WHERE CAST(a.AppointmentDate AS date)
              = CAST(GETDATE() AS date)
        ORDER BY
            a.AppointmentTime ASC,
            a.AppointmentID ASC
    `);

    return result.recordset;
}


export  { getDashboardStatistics, getTodayAppointments };