import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

// INITIAL FORM // =====================================================
const emptyForm = {
  PatientID: "",
  AppointmentDate: "",
  AppointmentTime: "",
  Status: "Pending",
  Notes: "",
  AppointmentService: "",
  UserID: "",
};

// MONTH NAMES // =====================================================
const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December",];

// DAY NAMES // =====================================================
const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat",];

// APPOINTMENTS PAGE // =====================================================
const Appointments = () => {
  
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar" ;

  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] =  useState(false);
  const [error, setError] = useState("");


  // CALENDAR  // ===================================================
  const today = new Date();

  const today0000 = new Date();
  today0000.setHours(0, 0, 0, 0);

  const [currentMonth, setCurrentMonth] =   useState(today.getMonth());
  const [currentYear, setCurrentYear] =   useState(today.getFullYear());

  // FORM / MODAL  // ===================================================
  const [showForm, setShowForm] =   useState(false);
  const [editingAppointment, setEditingAppointment] =    useState(null);
  const [formData, setFormData] =    useState(emptyForm);

  // PATIENTS SEARCH // =================================================
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // LOAD APPOINTMENTS  // ===================================================
  const loadAppointments = async () => {

    try {
      setLoading(true);
      setError("");

      const response =        await fetch("/api/appointments");
      const data =        await response.json();

      if (!response.ok) {
        throw new Error(  data.message ||    "Failed to load appointments"   );
      }

      setAppointments(data);
    }
    catch (error) {
      console.error( "Load appointments error:",   error      );
      setError(  error.message ||  "Failed to load appointments"    );
    }
    finally {
      setLoading(false);
    }

  };

  // LOAD PATIENTS  // ===================================================
  const loadPatients = async () => {

    try {

      const response =       await fetch("/api/patients");
      const data =        await response.json();

      if (!response.ok) {
        throw new Error(          data.message ||          "Failed to load patients"        );
      }

      setPatients(data);
    }
    catch (error) {
      console.error(        "Load patients error:",        error      );
    }

  };


  // LOAD DOCTORS  // ===================================================
  const loadDoctors = async () => {

    try {
      const response =        await fetch(          "/api/users?roleId=2"        );
      const data =        await response.json();

      if (!response.ok) {
        throw new Error(          data.message ||          "Failed to load doctors"        );
      }
      
      setDoctors(data);
    }
    catch (error) {
      console.error(        "Load doctors error:",        error      );
    }

  };

  const searchPatients = async (value) => {

    setPatientSearch(value);

    const searchValue = value.trim();

    // Clear results if search is empty
    if (!searchValue) {
      setPatientResults([]);
      return;
    }

    try {
      setSearchingPatients(true);

      const response = await fetch(`/api/patients?search=${encodeURIComponent(searchValue)}` );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to search patients");
      }

      setPatientResults(data);

    } catch (error) {
      console.error("Search patients error:", error);
      setPatientResults([]);
    } finally {
      setSearchingPatients(false);
    }

};


  // INITIAL LOAD  // ===================================================
  useEffect(() => {
    loadAppointments();
    loadPatients();
    loadDoctors();
  }, []);


  // CALENDAR DAYS  // ===================================================
  const calendarDays = useMemo(() => {

    const firstDay =  new Date(currentYear, currentMonth, 1  );
    const lastDay =   new Date(currentYear, currentMonth + 1, 0 );
    const firstWeekDay =  firstDay.getDay();

    const daysInMonth =  lastDay.getDate();

    const previousMonthLastDay =  new Date( currentYear,  currentMonth, 0 ).getDate();

    const days = [];

    // PREVIOUS MONTH DAYS   // -------------------------------------------------
    for ( let i = firstWeekDay - 1;  i >= 0;  i--  ) {
      days.push({
        date:  previousMonthLastDay - i,
        fullDate: new Date(currentYear, currentMonth - 1,  previousMonthLastDay - i ),
        currentMonth: false,
      });
    }

    // CURRENT MONTH DAYS    // -------------------------------------------------
    for (let day = 1; day <= daysInMonth; day++ ) {
      days.push({
        date: day,
        fullDate: new Date(currentYear, currentMonth, day ),
        currentMonth: true,
      });
    }

    // NEXT MONTH DAYS    // -------------------------------------------------
    let nextDay = 1;

    while (days.length % 7 !== 0) {
      days.push({
        date: nextDay,
        fullDate: new Date(currentYear, currentMonth + 1 , nextDay ),
        currentMonth: false,
      });
      nextDay++;
    }

    return days;

  }, [
    currentMonth,
    currentYear,
  ]);


  // GET DATE STRING  // ===================================================
  const getDateString = (year, month, day ) => {

    const monthString =   String(month + 1).padStart(2, "0");
    const dayString =     String(day).padStart(2, "0");

    return `${year}-${monthString}-${dayString}`;

  };

  // GET APPOINTMENTS FOR DAY  // ===================================================
  const getAppointmentsForDay = (day) => {

    if (!day.currentMonth) {
      return [];
    }

    const dateString =  getDateString(currentYear, currentMonth, day.date );

    return appointments.filter((appointment) =>
      String(appointment.AppointmentDate).substring(0, 10) ===  dateString)
      .sort((a, b) => String(a.AppointmentTime || "").localeCompare(String(b.AppointmentTime || ""))
      );

  };

  // CHECK TODAY  // ===================================================
  const isToday = (day) => {

    if (!day.currentMonth) {
      return false;
    }

    return (day.date === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );

  };



  // PREVIOUS MONTH  // ===================================================
  const handlePreviousMonth = () => {

    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1 );
    }
    else {
      setCurrentMonth(currentMonth - 1 );
    }

  };


  // NEXT MONTH  // ===================================================
  const handleNextMonth = () => {

    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1 );
    }
    else {
      setCurrentMonth(
        currentMonth + 1 );
    }

  };


  // TODAY  // ===================================================
  const handleToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  // ADD APPOINTMENT  // ===================================================
  const handleAddAppointment = (selectedDate = "") => {

    setEditingAppointment(null);

    setFormData({
      ...emptyForm,
      AppointmentDate: selectedDate || 
        getDateString(today.getFullYear(), today.getMonth(), today.getDate()),
    });

     // RESET PATIENT SEARCH
    setPatientSearch("");
    setPatientResults([]);
    setSelectedPatient(null);

    setShowForm(true);
  };



  const formatDateForInput = (dateValue) => {

  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);

  if (isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatTimeForInput = (timeValue) => {

  if (!timeValue) {
    return "";
  }

  const timeString = String(timeValue);

  // SQL time returned as ISO date
  // Example:
  // 1970-01-01T16:30:00.000Z

  if (timeString.includes("T")) {

    const timePart =
      timeString.split("T")[1];

    return timePart.substring(0, 5);
  }


  // SQL time returned as normal string
  // Example:
  // 16:30:00.0000000

  if (timeString.includes(":")) {

    return timeString.substring(0, 5);
  }


  return "";
};

  // EDIT APPOINTMENT  // ===================================================
const handleEditAppointment = async (appointment) => {

  setEditingAppointment(appointment);

  console.log(
  "EDIT APPOINTMENT:",
  appointment
);

  // ---------------------------------------------------
  // RESET PATIENT SEARCH
  // ---------------------------------------------------

  setPatientSearch("");
  setPatientResults([]);


  // ---------------------------------------------------
  // LOAD THE PATIENT
  // ---------------------------------------------------

  try {

    const response = await fetch(
      `/api/patients/${appointment.PatientID}`
    );

    const patient = await response.json();


    if (response.ok) {

      setSelectedPatient(patient);

    } else {

      setSelectedPatient(null);

    }

  } catch (error) {

    console.error(
      "Error loading appointment patient:",
      error
    );

    setSelectedPatient(null);

  }


  // ---------------------------------------------------
  // LOAD APPOINTMENT DATA
  // ---------------------------------------------------

  setFormData({

    PatientID:
      appointment.PatientID ?? "",

    AppointmentDate:
      appointment.AppointmentDate
        ? formatDateForInput(
            appointment.AppointmentDate
          )
        : "",

    AppointmentTime:
            formatTimeForInput(
            appointment.AppointmentTime
          ),

    Status:
      appointment.Status || "Pending",

    Notes:
      appointment.Notes || "",

    AppointmentService:
      appointment.AppointmentService || "",

    UserID:
      appointment.UserID ?? "",

  });


  setShowForm(true);

};

  // CLOSE FORM  // ===================================================
  const handleCloseForm = () => {

    if (saving) {
      return;
    }

    setShowForm(false);

    setEditingAppointment(null);

    setFormData({
      ...emptyForm,
    });

     // RESET PATIENT SEARCH
    setPatientSearch("");
    setPatientResults([]);
    setSelectedPatient(null);
    
  };


  // FORM CHANGE  // ===================================================
  const handleChange = (event) => {

    const {name, value, } = event.target;

    setFormData((current) => ({ ...current,  [name]: value, }) );

  };


  // SAVE APPOINTMENT  // ===================================================
  const handleSubmit = async (event) => {

    event.preventDefault();

    // VALIDATION    // -------------------------------------------------
    if (!formData.PatientID ) {
      alert("Please select a patient." );

      return;
    }

    if (!formData.AppointmentDate ) {
      alert("Please select an appointment date." );

      return;
    }

    if (!formData.AppointmentTime ) {
      alert("Please select an appointment time."  );

      return;
    }

    if (!formData.AppointmentService ) {
      alert("Please select the appointment service."  );

      return;
    }

    try {

      setSaving(true);

      const url =  editingAppointment
          ? `/api/appointments/${editingAppointment.AppointmentID}`
          : "/api/appointments";

      const method = editingAppointment  ? "PUT"  : "POST";

      const body = {

        PatientID: Number(formData.PatientID),

        AppointmentDate: formData.AppointmentDate,

        AppointmentTime: formData.AppointmentTime,

        Status: formData.Status || "Pending",

        Notes: formData.Notes ||  null,

        AppointmentService: formData.AppointmentService ||  null,

        UserID: formData.UserID  ? Number(formData.UserID) : null,

      };

      const response = await fetch( url,
          {
            method,

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(body),
          }
        );

        const data =  await response.json();

      if (!response.ok) {
        throw new Error( data.message ||  "Failed to save appointment"  );
      }

      // UPDATE EXISTING  // ------------------------------------------------

      if (editingAppointment) {

        setAppointments((current) =>
            current.map((appointment) => appointment.AppointmentID ===  data.AppointmentID
                  ? data
                  : appointment
            )
        );

      }
      // ADD NEW  // ------------------------------------------------
      else {
        setAppointments((current) => [data, ...current, ] );
      }

      handleCloseForm();
    }
    catch (error) {
      console.error( "Save appointment error:",   error  );

      alert(error.message || "Unable to save appointment."  );
    }
    finally {
      setSaving(false);
    }
  };


  // DELETE APPOINTMENT  // ===================================================
  const handleDeleteAppointment = async (appointment) => {

    const confirmed = window.confirm(
        `Are you sure you want to delete the appointment for ${appointment.PatientName || 
            "this patient"}?`
      );

    if (!confirmed) {
      return;
    }

    try {

      const response = await fetch(`/api/appointments/${appointment.AppointmentID}`,
          {
            method: "DELETE",
          }
        );

      const data =  await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete appointment"  );
      }

      setAppointments((current) => current.filter((item) => 
          item.AppointmentID !== appointment.AppointmentID )
      );
    }
    catch (error) {
      console.error( "Delete appointment error:",  error );
      alert( error.message || "Unable to delete appointment." );
    }
  };


  // FORMAT TIME  // ===================================================

  const formatTime = (time) => {

    if (!time) {
      return "-";
    }

    const parts = String(time).split(":");

    if (parts.length < 2) {
      return time;
    }

    let hour = Number(parts[0]);

    const minute = parts[1];

    const ampm =  hour >= 12  ? "PM"  : "AM";

    hour = hour % 12 || 12;

    return `${hour}:${minute} ${ampm}`;
  };


  // GET STATUS CLASS  // ===================================================
  const getStatusClass = (status) => {

    switch (status) {
      case "Pending":
        return "appointment-status-pending";

      case "Confirmed":
        return "appointment-status-confirmed";

      case "Done":
        return "appointment-status-done";

      case "Cancelled":
        return "appointment-status-cancelled";

      default:
        return "appointment-status-default";
    }
  };


  // RENDER  // ===================================================
  return (

    <div className="appointments-page">

      {/* PAGE HEADER      ================================================= */}
      <div className="appointments-header">

        <div>
          <h1 className="appointments-title">{isRTL ? "المواعيد" : "Appointments"}</h1>
          <p className="appointments-subtitle">{isRTL ? "إدارة مواعيد المرضى" : "Manage patient appointments"}</p>
        </div>

        <button type="button"  className="appointments-add-button"
          onClick={() => handleAddAppointment() }
        >
          <span className="appointments-add-icon">+</span>
          {isRTL ? "إضافة موعد" : "Add Appointment"}
        </button>

      </div>

      {/* CALENDAR TOOLBAR    ================================================= */}

      <div className="appointments-calendar-toolbar">

        <div className="appointments-calendar-navigation">

          <button  type="button"  onClick={handlePreviousMonth}> ‹ </button>
          <button  type="button"  onClick={handleToday} className="appointments-today-button">
            {isRTL ? "اليوم" : "Today"}
          </button>
          <button  type="button"  onClick={handleNextMonth}> › </button>

        </div>

        <h2 className="appointments-month-title">{monthNames[currentMonth]}{" "}{currentYear}</h2>

        <div className="appointments-total">
          {appointments.length}{" "} {isRTL ? "مواعيد" : "appointments"} {appointments.length === 1 ? "" : "s"}
        </div>

      </div>


      {/* =================================================
          STATUS LEGEND
      ================================================= */}

      <div className="appointments-legend">

        <div className="appointments-legend-item">
          <span className="legend-color legend-pending"></span>
          {isRTL ? "قيد الانتظار" : "Pending"}
        </div>

        <div className="appointments-legend-item">
          <span className="legend-color legend-confirmed"></span>
          {isRTL ? "مؤكد" : "Confirmed"}
        </div>

        <div className="appointments-legend-item">
          <span className="legend-color legend-done"></span>
          {isRTL ? "مكتمل" : "Done"}
        </div>

        <div className="appointments-legend-item">
          <span className="legend-color legend-cancelled"></span>
          {isRTL ? "ملغى" : "Cancelled"}
        </div>

      </div>


      {/* ERROR     ================================================= */}
      {error && (
        <div className="appointments-error">{error}</div>
      )}


      {/* LOADING    ================================================= */}
      {loading ? (
        <div className="appointments-loading">{isRTL ? "جارٍ تحميل المواعيد..." 
                  : "Loading appointments..."}</div>) : (

        /* CALENDAR     ================================================= */
        <div className="appointments-calendar">

          {/* DAY HEADERS     ----------------------------------------------- */}
          <div className="appointments-week-header">

            {dayNames.map((day) => (
                <div  key={day} className="appointments-week-day" >{day}</div>
              )
            )}

          </div>


          {/* CALENDAR GRID   ----------------------------------------------- */}
          <div className="appointments-calendar-grid">

            {calendarDays.map((day, index) => {
                const dayAppointments =  getAppointmentsForDay(day);

                return (

                  <div  key={index}  className={`appointment-day-cell
                      ${!day.currentMonth ? "appointment-day-other-month" : "" }
                      ${isToday(day) ? "appointment-day-today" : ""  } `}
                    
                    onDoubleClick={() => {
                      if (day.fullDate >= today0000) {
                        handleAddAppointment(getDateString(currentYear, currentMonth, day.date));
                      }
                    }}
                  >
                    {/* DAY NUMBER */}
                    <div className="appointment-day-header">

                      <span className="appointment-day-number">{day.date}</span>

                      {day.fullDate >= today0000 && (

                        <button  type="button"  className="appointment-day-add"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleAddAppointment(getDateString(currentYear, currentMonth, day.date));
                          }}
                        >
                          +
                        </button>
                      )}

                    </div>


                    {/* APPOINTMENTS */}
                    <div className="appointment-day-list">

                      {dayAppointments.map((appointment) => (
                          <div  key={appointment.AppointmentID}
                            className={`appointment-card ${getStatusClass(appointment.Status)}`}
                            onClick={() => {
                              if (day.fullDate >= today0000){handleEditAppointment(appointment);}
                            }
                            }
                          >

                            {/* TIME */}
                            <div className="appointment-card-time">
                              {formatTime(appointment.AppointmentTime)}
                            </div>

                            {/* PATIENT */}
                            <div className="appointment-card-patient">
                              {appointment.PatientName || "Unknown Patient"}
                            </div>

                            {/* SERVICE */}
                            {appointment.AppointmentService && (
                              <div className="appointment-card-service">
                                {appointment.AppointmentService}
                              </div>

                            )}

                            {/* DOCTOR */}
                            <div className="appointment-card-doctor">
                              <span className="appointment-card-label">Doctor:</span>{" "}
                              {appointment.DoctorName || "No doctor"}
                            </div>

                            {/* ACTIONS */}
                            {day.fullDate >= today0000 && (
                                <div
                                  className="appointment-card-actions"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <button  type="button"  
                                    onClick={() =>handleEditAppointment(appointment)}
                                  >
                                    {isRTL ? "تعديل" : "Edit"}
                                  </button>

                                  <button  type="button"
                                    onClick={() =>handleDeleteAppointment(appointment)}
                                  >
                                    {isRTL ? "حذف" : "Delete"}
                                  </button>
                                
                                </div>
                                )
                            }
                            
                          </div>

                        )
                      )}

                    </div>

                  </div>

                );

              }
            )}

          </div>

        </div>

      )}


      {/* ADD / EDIT MODAL    ================================================= */}
      {showForm && (

        <div  className="appointments-modal-overlay"
          onMouseDown={(event) => {
            if (event.target ===  event.currentTarget ) {
              handleCloseForm();
            }
          }}
        >

          <div className="appointments-modal">

            {/* MODAL HEADER   --------------------------------------------- */}
            <div className="appointments-modal-header">

              <div>
                <h2>{editingAppointment ? (isRTL ? "تعديل الموعد" : "Edit Appointment") : 
                                          (isRTL ? "إضافة موعد" : "Add New Appointment")}</h2>
                <p>{editingAppointment  ? (isRTL ? "تحديث معلومات الموعد" : "Update appointment information") : 
                                          (isRTL ? "إدخال معلومات الموعد" : "Enter appointment information")}</p>
              </div>

              <button type="button" className="appointments-close-button"
                onClick={handleCloseForm} disabled={saving}
              >
                ×
              </button>

            </div>


            {/* ---------------------------------------------
                FORM
            --------------------------------------------- */}

            <form
              className="appointments-form"
              onSubmit={
                handleSubmit
              }
            >

              <div className="appointments-form-grid">
                
                <div className="appointments-form-group appointments-full-width">

                  <label>{isRTL ? "المريض *" : "Patient *"}</label>

                  {/* SELECTED PATIENT */}
                  {selectedPatient ? (

                    <div className="appointment-selected-patient">

                      <div className="appointment-selected-patient-info">

                        <strong>
                          {selectedPatient.FullName}
                        </strong>

                        <span>
                          {isRTL ? "رقم الملف:" : "File No:"} {selectedPatient.FileNo || "-"}
                        </span>

                        <span>
                          {isRTL ? "الهاتف:" : "Phone:"} {selectedPatient.Phone || "-"}
                        </span>

                      </div>


                      <button
                        type="button"
                        className="appointment-change-patient"
                        onClick={() => {

                          setSelectedPatient(null);

                          setFormData((current) => ({
                            ...current,
                            PatientID: "",
                          }));

                          setPatientSearch("");
                          setPatientResults([]);

                        }}
                      >
                        {isRTL ? "تغيير" : "Change"}
                      </button>

                    </div>

                  ) : (

                    <>
                      {/* PATIENT SEARCH */}
                      <div className="appointment-patient-search">

                        <input
                          type="text"
                          value={patientSearch}
                          placeholder={isRTL ? "بحث عن مريض بالاسم أو رقم الملف..." : 
                                               "Search patient by name or file number..."}
                          onChange={(event) =>
                            searchPatients(event.target.value)
                          }
                        />

                      </div>


                      {/* SEARCHING */}
                      {searchingPatients && (

                        <div className="appointment-patient-searching">
                          {isRTL ? "جاري البحث عن المرضى..." : "Searching patients..."}
                        </div>

                      )}


                      {/* SEARCH RESULTS */}
                      {!searchingPatients &&
                        patientSearch.trim() &&
                        patientResults.length > 0 && (

                        <div className="appointment-patient-results">

                          {patientResults.map((patient) => (

                            <button
                              type="button"
                              key={patient.PatientID}
                              className="appointment-patient-result"
                              onClick={() => {

                                setSelectedPatient(patient);

                                setFormData((current) => ({
                                  ...current,
                                  PatientID: patient.PatientID,
                                }));

                                setPatientSearch("");
                                setPatientResults([]);

                              }}
                            >

                              <div className="appointment-patient-result-name">
                                {patient.FullName}
                              </div>

                              <div className="appointment-patient-result-details">

                                <span>
                                  {isRTL ? "رقم الملف:" : "File No:"} {patient.FileNo || "-"}
                                </span>

                                <span>
                                  {isRTL ? "الهاتف:" : "Phone:"} {patient.Phone || "-"}
                                </span>

                              </div>

                            </button>

                          ))}

                        </div>

                      )}


                      {/* NO RESULTS */}
                      {!searchingPatients &&
                        patientSearch.trim() &&
                        patientResults.length === 0 && (

                        <div className="appointment-patient-no-results">
                          {isRTL ? "لم يتم العثور على مرضى." : "No patients found."}
                        </div>

                      )}

                    </>

                  )}

                </div>



                {/* DOCTOR */}

                <div className="appointments-form-group">

                  <label>
                    {isRTL ? "الطبيب" : "Doctor"}
                  </label>

                  <select
                    name="UserID"
                    value={
                      formData.UserID
                    }
                    onChange={
                      handleChange
                    }
                  >

                    <option value="">
                      {isRTL ? "اختر الطبيب" : "Select doctor"}
                    </option>


                    {doctors.map(
                      (doctor) => (

                        <option
                          key={
                            doctor.UserID
                          }
                          value={
                            doctor.UserID
                          }
                        >

                          {doctor.UserName}

                        </option>

                      )
                    )}

                  </select>

                </div>


                {/* DATE */}

                <div className="appointments-form-group">

                  <label>
                    {isRTL ? "التاريخ *" : "Date *"}
                  </label>

                  <input
                    type="date"
                    name="AppointmentDate"
                    value={
                      formData.AppointmentDate
                    }
                    onChange={
                      handleChange
                    }
                    required
                  />

                </div>


                {/* TIME */}

                <div className="appointments-form-group">

                  <label>
                    {isRTL ? "الوقت *" : "Time *"}
                  </label>

                  <input
                    type="time"
                    name="AppointmentTime"
                    value={
                      formData.AppointmentTime
                    }
                    onChange={
                      handleChange
                    }
                    required
                  />

                </div>


                {/* SERVICE */}

                <div className="appointments-form-group">

                  <label>
                    {isRTL ? "الخدمة *" : "Service *"}
                  </label>

                  <select
                    name="AppointmentService"
                    value={
                      formData.AppointmentService
                    }
                    onChange={
                      handleChange
                    }
                    required
                  >

                    <option value="">
                      {isRTL ? "اختر الخدمة" : "Select service"}
                    </option>

                    <option value="كشف">
                      كشف
                    </option>

                    <option value="سكين كير">
                      سكين كير
                    </option>

                    <option value="ليزر">
                      ليزر
                    </option>

                  </select>

                </div>


                {/* STATUS */}

                <div className="appointments-form-group">

                  <label>
                    {isRTL ? "الحالة" : "Status"}
                  </label>

                  <select
                    name="Status"
                    value={
                      formData.Status
                    }
                    onChange={
                      handleChange
                    }
                  >

                    <option value="Pending">
                      {isRTL ? "معلق" : "Pending"}
                    </option>

                    <option value="Confirmed">
                      {isRTL ? "مؤكد" : "Confirmed"}
                    </option>

                    <option value="Done">
                      {isRTL ? "مكتمل" : "Done"}
                    </option>

                    <option value="Cancelled">
                      {isRTL ? "ملغى" : "Cancelled"}
                    </option>

                  </select>

                </div>


                {/* NOTES */}

                <div className="appointments-form-group appointments-full-width">

                  <label>
                    {isRTL ? "الملاحظات" : "Notes"}
                  </label>

                  <textarea
                    name="Notes"
                    value={
                      formData.Notes
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Additional notes"
                    rows="4"
                  />

                </div>

              </div>


              {/* ---------------------------------------------
                  FORM ACTIONS
              --------------------------------------------- */}

              <div className="appointments-form-actions">

                <button
                  type="button"
                  className="appointments-cancel-button"
                  onClick={
                    handleCloseForm
                  }
                  disabled={saving}
                >
                  {isRTL ? "إلغاء" : "Cancel"}
                </button>


                <button
                  type="submit"
                  className="appointments-save-button"
                  disabled={saving}
                >

                  {saving  ? (isRTL ? "جارٍ الحفظ..." : "Saving...") : editingAppointment ?
                       (isRTL ? "تحديث الموعد" : "Update Appointment") :
                       (isRTL ? "حفظ الموعد" : "Save Appointment")}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>

  );

};


export default Appointments;