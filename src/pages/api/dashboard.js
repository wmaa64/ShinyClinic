import {
    getDashboardStatistics,
    getTodayAppointments,
} from "../../../controllers/dashboardController";

export default async function handler(req, res) {

    if (req.method !== "GET") {
        res.setHeader("Allow", ["GET"]);

        return res.status(405).json({
            message: `Method ${req.method} not allowed`,
        });
    }

    try {
        const [statistics,  appointments, ] = await Promise.all([getDashboardStatistics(), getTodayAppointments(), ]);

        return res.status(200).json({...statistics,  appointments,});
    } catch (error) {
        console.error("Dashboard API error:", error);

        return res.status(500).json({
            message: error.message || "Failed to load dashboard data.",
        });
    }
}