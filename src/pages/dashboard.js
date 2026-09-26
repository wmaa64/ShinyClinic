import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useStateContext } from "../../context/StateContext";


const Dashboard = () => {

    const { i18n } = useTranslation();
    const router = useRouter();

    const {
        userInfo,
        logoutUser,
        loadingUser
    } = useStateContext();


    const [loading, setLoading] = useState(true);

    const [dashboardData, setDashboardData] = useState({
        totalPatients: 0,
        todayAppointments: 0,
        pendingAppointments: 0,
        completedToday: 0,
        appointments: [],
        recentPatients: [],
    });

    const isRTL = i18n.language === "ar"; // true if Arabic

    // =====================================================
    // CHECK LOGIN
    // =====================================================

    useEffect(() => {

        if (loadingUser) {
            return;
        }

        if (!userInfo) {
            router.replace("/login");
            return;
        }

    }, [loadingUser, userInfo, router]);


    // =====================================================
    // LOAD DASHBOARD DATA
    // =====================================================

    useEffect(() => {

        if (loadingUser || !userInfo) {
            return;
        }

        loadDashboard();

    }, [loadingUser, userInfo]);


    // =====================================================
    // LOAD DASHBOARD
    // =====================================================

    const loadDashboard = async () => {
        try {
            setLoading(true);

            const response = await fetch("/api/dashboard");

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to load dashboard data."
                );
            }

            setDashboardData({
                totalPatients: Number(data.totalPatients || 0),
                todayAppointments: Number(data.todayAppointments || 0),
                pendingAppointments: Number(data.pendingAppointments || 0),
                completedToday: Number(data.completedToday || 0),
                appointments: Array.isArray(data.appointments) ? data.appointments : [],
                recentPatients: [],
            });
        } catch (error) {
            console.error("Error loading dashboard:", error);

            toast.error(
                error.message || "Unable to load dashboard"
            );
        } finally {
            setLoading(false);
        }
    };

    // =====================================================
    // WAIT FOR USER
    // =====================================================

    if (loadingUser || !userInfo) {

        return (
            <div className="dashboard-loading">
                Loading ClinicPro...
            </div>
        );
    }


    // =====================================================
    // DASHBOARD PAGE RENDER
    // =====================================================

    return (

        <div className="dashboard-page">


            {/* =================================================
                HEADER
               ================================================= */}

            <div className="dashboard-header">

                <div>
                    <h1>{isRTL ? "لوحة المعلومات" : "Dashboard"}</h1>
                    <p>{isRTL ? "مرحبا بعودتك," : "Welcome back,"}{" "}<strong>{userInfo.FullName}</strong></p>
                </div>


                <div className="dashboard-user">

                    <div className="dashboard-user-info">

                        <span className="dashboard-user-name">
                            {userInfo.FullName}
                        </span>

                        <span className="dashboard-user-role">
                            {userInfo.RoleID === 2 ? isRTL ? "طبيب" : "Doctor"
                                : isRTL ? "طاقم العيادة" : "Clinic Staff"
                            }
                        </span>

                    </div>


                    <button
                        className="dashboard-logout"
                        onClick={() => {

                            logoutUser();

                            router.replace("/login");

                        }}
                    >
                        {isRTL ? "تسجيل الخروج" : "Logout"}
                    </button>

                </div>

            </div>


            {/* =================================================
                STATISTICS
               ================================================= */}

            <div className="dashboard-stats">


                <div className="dashboard-stat-card">

                    <div className="stat-icon">
                        👥
                    </div>

                    <div>

                        <span className="stat-title">
                            {isRTL ? "إجمالي المرضى" : "Total Patients"}
                        </span>

                        <strong className="stat-value">
                            {dashboardData.totalPatients}
                        </strong>

                    </div>

                </div>


                <div className="dashboard-stat-card">

                    <div className="stat-icon">
                        📅
                    </div>

                    <div>

                        <span className="stat-title">
                            {isRTL ? " المواعيد اليوم" : "Today's Appointments"}
                        </span>

                        <strong className="stat-value">
                            {dashboardData.todayAppointments}
                        </strong>

                    </div>

                </div>


                <div className="dashboard-stat-card">

                    <div className="stat-icon">
                        ⏳
                    </div>

                    <div>

                        <span className="stat-title">
                            {isRTL ? "قيد الانتظار" : "Pending"}
                        </span>

                        <strong className="stat-value">
                            {dashboardData.pendingAppointments}
                        </strong>

                    </div>

                </div>


                <div className="dashboard-stat-card">

                    <div className="stat-icon">
                        ✓
                    </div>

                    <div>
                        <span className="stat-title">{isRTL ? "المواعيد المكتملة اليوم" : "Completed Today"}</span>
                        <strong className="stat-value">{dashboardData.completedToday}</strong>
                    </div>

                </div>

            </div>

            {/* =================================================
                QUICK ACTIONS
               ================================================= */}

            <div className="dashboard-section">

                <div className="dashboard-section-title">
                    <h2>{isRTL ? "الإجراءات السريعة" : "Quick Actions"}</h2>
                </div>


                <div className="quick-actions">

                    <button  onClick={() =>router.push("/appointments")}  className="quick-action">
                        <span className="quick-action-icon">📅</span>
                        <span>{isRTL ? "موعد جديد" : "New Appointment"}</span>
                    </button>

                    <button  onClick={() =>router.push("/patients")}  className="quick-action">
                        <span className="quick-action-icon">👤</span>
                        <span>{isRTL ? "المرضى" : "Patients"}</span>
                    </button>


                    <button  onClick={() =>router.push("/patients")}  className="quick-action">
                        <span className="quick-action-icon">➕</span>
                        <span>{isRTL ? "إضافة مريض" : "Add Patient"}</span>
                    </button>


                    <button  onClick={() =>router.push("/appointments")}  className="quick-action">
                        <span className="quick-action-icon">🗓</span>
                        <span>{isRTL ? "التقويم" : "Calendar"}</span>
                    </button>

                </div>

            </div>

            {/* =================================================
                MAIN CONTENT
               ================================================= */}

            <div className="dashboard-columns">

                {/* =================================================
                    TODAY'S APPOINTMENTS
                   ================================================= */}

                <div className="dashboard-panel">

                    <div className="panel-header">
                        <h2>{isRTL ? " المواعيد اليوم" : "Today's Appointments"}</h2>
                        <button  onClick={() => router.push("/appointments")}>{isRTL ? "عرض الكل" : "View All"}</button>
                    </div>


                    {loading ? (

                        <div className="dashboard-empty">
                            Loading appointments...
                        </div>

                    ) : dashboardData.appointments.length === 0 ? (

                        <div className="dashboard-empty">

                            <div className="empty-icon">
                                📅
                            </div>

                            <p>{isRTL ? "لا توجد مواعيد اليوم" : "No appointments today"}</p>
                        </div>

                    ) : (

                        <div className="appointment-list">

                            {dashboardData.appointments.map(
                                (appointment, index) => (

                                    <div key={appointment.AppointmentID ||  index } className="dashboard-appointment">

                                        <div className="appointment-time">
                                            {appointment.Time}
                                        </div>

                                        <div className="appointment-info">
                                            <strong>{appointment.PatientName}</strong>
                                            <span>{appointment.DoctorName}</span>
                                        </div>

                                        <div
                                            className={`appointment-status ` + 
                                                `status-${String(appointment.Status || "").toLowerCase()}`
                                            }
                                        >
                                            {appointment.Status}
                                        </div>

                                    </div>

                                )
                            )}

                        </div>

                    )}

                </div>


                {/* =================================================
                    RECENT PATIENTS
                   ================================================= */}

                <div className="dashboard-panel">

                    <div className="panel-header">
                        <h2>{isRTL ? "المرضى الجدد" : "Recent Patients"}</h2>
                        <button  onClick={() => router.push("/patients")}>
                            {isRTL ? "عرض الكل" : "View All"}
                        </button>

                    </div>


                    {dashboardData.recentPatients.length === 0 ? (

                        <div className="dashboard-empty">

                            <div className="empty-icon">
                                👥
                            </div>
                            <p>{isRTL ? "لا توجد مرضى جدد" : "No recent patients"}</p>

                        </div>

                    ) : (

                        <div className="patient-list">

                            {dashboardData.recentPatients.map(
                                (patient, index) => (

                                    <div
                                        key={
                                            patient.PatientID ||
                                            index
                                        }
                                        className="dashboard-patient"
                                    >

                                        <div className="patient-avatar">
                                            {patient.FullName ?.charAt(0) ?.toUpperCase()}
                                        </div>

                                        <div className="patient-info">
                                            <strong>{patient.FullName}</strong>
                                            <span>{patient.Phone}</span>
                                        </div>

                                    </div>

                                )
                            )}

                        </div>

                    )}

                </div>

            </div>

        </div>
    );
}

export default Dashboard;