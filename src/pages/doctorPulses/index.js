import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

// GET TODAY DATE
const getTodayDate = () => {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};


// GET FIRST DAY OF CURRENT MONTH
const getFirstDayOfMonth = () => {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}-01`;
};


const DoctorPulses = () => {
    const { i18n } = useTranslation();
    
    const isRTL = i18n.language === "ar" ;

  const [doctors, setDoctors] = useState([]);

  const [doctorID, setDoctorID] = useState("");

  const [fromDate, setFromDate] = useState(getFirstDayOfMonth() );

  const [toDate, setToDate] = useState(getTodayDate()  );

  const [pulses, setPulses] = useState([]);

  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingPulses, setLoadingPulses] = useState(false);


  // --------------------------------------------------
  // LOAD DOCTORS
  // --------------------------------------------------

  const loadDoctors = async () => {
    try {
      setLoadingDoctors(true);

      const response = await fetch("/api/users");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load doctors"
        );
      }

      // Only doctors
      const doctorList = data.filter((user) => Number(user.RoleID) === 2 );

      setDoctors(doctorList);

    } catch (error) {

      console.error("Load doctors error:", error);

      toast.error(
        error.message || "Failed to load doctors"
      );

    } finally {
      setLoadingDoctors(false);
    }
  };


  // --------------------------------------------------
  // LOAD DOCTOR PULSES
  // --------------------------------------------------

  const loadDoctorPulses = async () => {

    if (!doctorID) {
      toast.error("Please select a doctor");
      return;
    }

    if (!fromDate || !toDate) {
      toast.error("Please select the date range");
      return;
    }

    if (fromDate > toDate) {
      toast.error(
        "From date cannot be greater than To date"
      );
      return;
    }

    try {

      setLoadingPulses(true);

      const response = await fetch(
        `/api/doctorPulses?doctorID=${doctorID}&fromDate=${fromDate}&toDate=${toDate}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load doctor pulses"
        );
      }

      setPulses(data);

    } catch (error) {

      console.error(
        "Load doctor pulses error:",
        error
      );

      toast.error(
        error.message ||
        "Failed to load doctor pulses"
      );

      setPulses([]);

    } finally {

      setLoadingPulses(false);

    }
  };


  // --------------------------------------------------
  // LOAD DOCTORS ON PAGE LOAD
  // --------------------------------------------------

  useEffect(() => {
    loadDoctors();
  }, []);


  // --------------------------------------------------
  // SUMMARY
  // --------------------------------------------------

  const summary = useMemo(() => {

    const totalSessions = pulses.length;

    const totalPulses = pulses.reduce((sum, row) =>  sum + Number(row.TotalPulses || 0),  0    );

    return {
      totalSessions,
      totalPulses,
    };

  }, [pulses]);


  // --------------------------------------------------
  // SELECTED DOCTOR
  // --------------------------------------------------

  const selectedDoctor = useMemo(() => {

    return doctors.find( (doctor) =>  String(doctor.UserID) === String(doctorID)    );

  }, [doctors, doctorID]);


  // --------------------------------------------------
  // FORMAT NUMBER
  // --------------------------------------------------

  const formatNumber = (value) => {

    return Number(value || 0).toLocaleString(
      "en-US"
    );

  };


  return (
    <div className="doctor-pulses-page">

      {/* ----------------------------------------- */}
      {/* HEADER */}
      {/* ----------------------------------------- */}

      <div className="doctor-pulses-header">

        <div>
          <h1>{isRTL ? "تقرير نبضات الأطباء" : "Doctor Pulses Report"}</h1>

          <p>
            {isRTL
              ? "عرض نبضات الليزر المستخدمة من قبل طبيب خلال فترة محددة."
              : "View laser pulses used by a doctor during a selected period."}
          </p>
        </div>

      </div>


      {/* ----------------------------------------- */}
      {/* FILTERS */}
      {/* ----------------------------------------- */}

      <div className="doctor-pulses-filter-card">

        <div className="doctor-pulses-field">

          <label>
            {isRTL ? "الطبيب" : "Doctor"}
          </label>

          <select
            value={doctorID}
            onChange={(e) =>  setDoctorID(e.target.value)  }
            disabled={loadingDoctors}
          >

            <option value="">
              {loadingDoctors
                ? isRTL ? "جارٍ تحميل الأطباء..." : "Loading doctors..."
                : isRTL ? "اختر طبيب" : "Select Doctor"}
            </option>

            {doctors.map((doctor) => (

              <option
                key={doctor.UserID}
                value={doctor.UserID}
              >
                {doctor.UserName}
              </option>

            ))}

          </select>

        </div>


        <div className="doctor-pulses-field">

          <label>
            {isRTL ? "من التاريخ" : "From Date"}
          </label>

          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value) }
          />

        </div>


        <div className="doctor-pulses-field">

          <label>
            {isRTL ? "إلى التاريخ" : "To Date"}
          </label>

          <input
            type="date"
            value={toDate}
            onChange={(e) =>  setToDate(e.target.value)     }
          />

        </div>


        <div className="doctor-pulses-filter-actions">

          <button
            type="button"
            onClick={loadDoctorPulses}
            disabled={loadingPulses}
            className="doctor-pulses-search-button"
          >
            {loadingPulses
              ? isRTL ? "جارٍ البحث..." : "Searching..."
              : isRTL ? "بحث" : "Search"}
          </button>

        </div>

      </div>


      {/* ----------------------------------------- */}
      {/* SUMMARY */}
      {/* ----------------------------------------- */}

      {pulses.length > 0 && (

        <div className="doctor-pulses-summary">

          <div className="doctor-pulses-summary-card">

            <span>
              Doctor
            </span>

            <strong>
              {selectedDoctor?.UserName || "-"}
            </strong>

          </div>


          <div className="doctor-pulses-summary-card">

            <span>
              {isRTL ? "الفترة" : "Period"}
            </span>

            <strong>
              {fromDate} → {toDate}
            </strong>

          </div>


          <div className="doctor-pulses-summary-card">

            <span>
              {isRTL ? "إجمالي الجلسات" : "Total Sessions"}
            </span>

            <strong>
              {formatNumber(
                summary.totalSessions
              )}
            </strong>

          </div>


          <div className="doctor-pulses-summary-card doctor-pulses-total-card">

            <span>
              {isRTL ? "إجمالي النبضات" : "Total Pulses"}
            </span>

            <strong>
              {formatNumber(
                summary.totalPulses
              )}
            </strong>

          </div>

        </div>

      )}


      {/* ----------------------------------------- */}
      {/* DETAILS */}
      {/* ----------------------------------------- */}

      <div className="doctor-pulses-section">

        <div className="doctor-pulses-section-header">

          <h2>
            {isRTL ? "تفاصيل الجلسة" : "Session Details"}
          </h2>

        </div>


        {loadingPulses ? (

          <div className="doctor-pulses-loading">
            {isRTL ? "جارٍ تحميل التقرير..." : "Loading report..."}
          </div>

        ) : pulses.length === 0 ? (

          <div className="doctor-pulses-empty">

            {doctorID
              ? isRTL ? "لم يتم العثور على جلسات لالطبيب المحدد والنطاق الزمني." 
                : "No sessions found for the selected doctor and date range."
              : isRTL ? "اختر طبيب ونطاق زمني، ثم انقر على بحث." 
                : "Select a doctor and date range, then click Search."
            }

          </div>

        ) : (

          <div className="doctor-pulses-table-wrapper">

            <table className="doctor-pulses-table">

              <thead>

                <tr>

                  <th>
                    #
                  </th>

                  <th>
                    {isRTL ? "التاريخ" : "Date"}
                  </th>

                  <th>
                    {isRTL ? "معرف الجلسة" : "Session ID"}
                  </th>

                  <th>
                    {isRTL ? "رقم الملف" : "File No"}
                  </th>

                  <th>
                    {isRTL ? "المريض" : "Patient"}
                  </th>

                  <th>
                    {isRTL ? "النبضات" : "Pulses"}
                  </th>

                </tr>

              </thead>


              <tbody>

                {pulses.map(
                  (row, index) => (

                    <tr
                      key={row.SessionID}
                    >

                      <td>
                        {index + 1}
                      </td>

                      <td>
                        {row.SessionDate
                          ? String(
                              row.SessionDate
                            ).substring(0, 10)
                          : "-"
                        }
                      </td>

                      <td>
                        {row.SessionID}
                      </td>

                      <td>
                        {row.FileNo}
                      </td>

                      <td>
                        {row.PatientName}
                      </td>

                      <td className="doctor-pulses-number">

                        {formatNumber(
                          row.TotalPulses
                        )}

                      </td>

                    </tr>

                  )
                )}

              </tbody>


              <tfoot>

                <tr>

                  <td
                    colSpan="5"
                    className="doctor-pulses-footer-label"
                  >
                    {isRTL ? "إجمالي النبضات" : "Total Pulses"}
                  </td>

                  <td className="doctor-pulses-footer-total">

                    {formatNumber(
                      summary.totalPulses
                    )}

                  </td>

                </tr>

              </tfoot>

            </table>

          </div>

        )}

      </div>

    </div>
  );
};


export default DoctorPulses;