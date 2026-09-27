import { useEffect, useState } from "react";
import { useStateContext } from "../../../context/StateContext";
import { useTranslation } from "react-i18next";

  // GET TODAY'S DATE  // =====================================================
  const getTodayDate = () => {

    const today = new Date();
    const year =  today.getFullYear();
    const month =  String(today.getMonth() + 1).padStart(2, "0");
    const day =  String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  
const SessionsPage = () => {
  
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  const { userInfo } = useStateContext();

  // STATE
  const [appointments, setAppointments] = useState([]);

  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // TREATMENT AREAS
  const [treatmentAreas, setTreatmentAreas] = useState([]);
  const [areasLoading, setAreasLoading] = useState(false);

  // DEVICES
  const [devices, setDevices] = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(false);

  // SESSION FORM
  const [sessionDate, setSessionDate] = useState(getTodayDate());
  const [areaID, setAreaID] = useState("");
  const [deviceID, setDeviceID] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");
  const [savingSession, setSavingSession] = useState(false);
  const [createdSession, setCreatedSession] = useState(null);

  // SERVICES CATALOG
  const [services, setServices] = useState([]);
  const [servicesCatalogLoading, setServicesCatalogLoading] =  useState(false);
  const [serviceSearch, setServiceSearch] = useState("");

  // SESSION SERVICES
  const [sessionServices, setSessionServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);

  const [savingServices, setSavingServices] = useState(false);

  const [selectedServiceIds, setSelectedServiceIds] = useState([]);

  const [showServicesModal, setShowServicesModal] =  useState(false);

  // is Doctor logged in Case
  const [IsDoctorCase, setIsDoctorCase] =useState(true);

  // INITIAL LOAD
  useEffect(() => {

    loadTodayAppointments();

    loadTreatmentAreas();

    loadDevices();

    loadServices();

    setSessionDate(getTodayDate());

  }, []);

  // LOAD TODAY'S APPOINTMENTS
  const loadTodayAppointments = async () => {

    try {

      setLoading(true);
      setError("");

      // GET TODAY'S DATE
      const date = getTodayDate();

      // API
      const response = await fetch(`/api/sessions/today?date=${date}`);

      const data =  await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load today's appointments");
      }

      setAppointments(data);
    }
    catch (error) {
      console.error("Load today's appointments error:", error);
      setError(error.message || "Failed to load today's appointments");
    }
    finally {
      setLoading(false);
    }

  };

  // LOAD TREATMENT AREAS  // =====================================================
  const loadTreatmentAreas = async () => {

    try {

      setAreasLoading(true);

      const response =  await fetch("/api/treatmentAreas");

      const data =  await response.json();

      if (!response.ok) {
        throw new Error(data.message ||"Failed to load treatment areas");
      }

      setTreatmentAreas(data);
    }
    catch (error) {
      console.error("Load treatment areas error:", error);
      setError(error.message || "Failed to load treatment areas");
    }
    finally {
      setAreasLoading(false);
    }

  };

  // LOAD DEVICES  // =====================================================
  const loadDevices = async () => {

    try {

      setDevicesLoading(true);

      const response = await fetch("/api/devices");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load devices");
      }

      setDevices(data);
    }
    catch (error) {
      console.error("Load devices error:", error);
      setError(error.message || "Failed to load devices");
    }
    finally {
      setDevicesLoading(false);
    }

  };

  // LOAD ALL SERVICES    // =====================================================
  const loadServices = async () => {

    try {

        const response =  await fetch("/api/services");

        const data =     await response.json();

        if (!response.ok) {
        throw new Error(data.message || "Failed to load services");
        }

        setServices(data) ;
    }
    catch (error) {
        console.error("Load services error:", error);
        setError(error.message || "Failed to load services");
    }

  };

  // FORMAT TIME  // =====================================================
  const formatTime = (time) => {

    if (!time) {
      return "";
    }

    const parts =  String(time).split(":");

    if (parts.length < 2) {
      return String(time);
    }

    let hour = Number(parts[0]);
    const minute =  parts[1];

    const ampm =  hour >= 12  ? "PM" : "AM";

    hour =  hour % 12 || 12;

    return `${hour}:${minute} ${ampm}`;

  };


// SELECT APPOINTMENT// =====================================================
const handleSelectAppointment = async (appointmentID) => {

  const appointment =
    appointments.find(item => String(item.AppointmentID) === String(appointmentID));

  setSelectedAppointment(appointment || null);

  // CLEAR PREVIOUS DATA
  setCreatedSession(null);
  setSessionServices([]);
  setError("");

  if (!appointment) {
    setSessionDate(getTodayDate());
    setAreaID("");
    setDeviceID("");
    setSessionNotes("");
    return;
  }

  // RESET SESSION FORM
  setSessionDate(getTodayDate());
  setAreaID("");
  setDeviceID("");
  setSessionNotes("");

  try {

    setLoading(true);

    // CHECK TODAY'S SESSION
    const response =
      await fetch(`/api/sessions?patientID=${appointment.PatientID}&date=${getTodayDate()}`);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to check today's session");
    }

    // NO SESSION TODAY
    if (!data) {
      setCreatedSession(null);
      setIsDoctorCase(true);
      return;
    }

    // SESSION ALREADY EXISTS
    setCreatedSession(data);

    // LOAD EXISTING SESSION DATA
    setSessionDate(data.SessionDate ? String(data.SessionDate).substring(0, 10) : getTodayDate());
    setAreaID(data.AreaID ? String(data.AreaID) : "");
    setDeviceID(data.DeviceID ? String(data.DeviceID) : "");
    setSessionNotes(data.Notes || "");

    // Check if it is Doctor Case
    (data.UserID === userInfo.UserID) ? setIsDoctorCase(true) : setIsDoctorCase(false);
    
    // LOAD EXISTING SERVICES
    await loadSessionServices(data.SessionID, appointment.PatientID);

  }
  catch (error) {
    console.error("Check today's session error:", error);
    setError(error.message || "Failed to check today's session");
  }
  finally {
    setLoading(false);
  }

};

// LOAD TODAY'S SESSION SERVICES// =====================================================
const loadSessionServices = async (sessionID, patientID) => {

  if (!sessionID || !patientID) {
    setSessionServices([]);
    return;
  }

  try {

    setServicesLoading(true);

    const response = await fetch(`/api/sessionServices?sessionId=${sessionID}&patientId=${patientID}`);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to load session services");
    }

    setSessionServices(Array.isArray(data) ? data.map(service => ({...service, _rowId:
              `existing-${service.SessionServiceID}`, })) : [] );

  }
  catch (error) {
    console.error("Load session services error:", error);
    setError(error.message || "Failed to load session services");
  }
  finally {
    setServicesLoading(false);
  }

};

// OPEN ADD SERVICES MODAL// =====================================================
const handleOpenServicesModal = () => {
  setSelectedServiceIds([]);
  setServiceSearch("");
  setShowServicesModal(true);
};

// CLOSE ADD SERVICES MODAL// =====================================================
const handleCloseServicesModal = () => {
  setSelectedServiceIds([]);
  setServiceSearch("");
  setShowServicesModal(false);
};

// TOGGLE SERVICE SELECTION// =====================================================
const handleToggleService = (serviceID) => {

  setSelectedServiceIds(previous => {

    const exists = previous.some(id => String(id) === String(serviceID));

    if (exists) {
      return previous.filter(id => String(id) !==  String(serviceID));
    }

    return [...previous, serviceID, ];

  });

};

// ADD SELECTED SERVICES TO SESSION STATE// =====================================================
const handleAddSelectedServices = () => {

  if (selectedServiceIds.length === 0 ) {
    return;
  }

  const selectedServices =  services.filter(service =>
      selectedServiceIds.some(id => String(id) ===  String(service.ServiceID)));

  const newSessionServices =  selectedServices.map(service => ({
      _rowId: `new-${Date.now()}-${service.ServiceID}`,

      SessionServiceID: null,
      SessionID:  createdSession?.SessionID,
      PatientID:  selectedAppointment?.PatientID,
      ServiceID:  service.ServiceID,
      ServiceName:  service.ServiceName,
      CategoryID:   service.CategoryID,
      CategoryName:  service.CategoryName,

      // ORIGINAL SERVICE DEFAULT PRICE
      DefaultPrice: Number(service.DefaultPrice || 0),

      // CURRENT DEFAULT PRICE
      UnitPrice:  Number(service.DefaultPrice || 0 ),
      Qty: 1,
      
      // Number of pulses actually used for this service
      PulsesNo: 0,

      Discount: 0,
      LineTotal: Number( service.DefaultPrice || 0 ),
      Notes: "",

    }));

  setSessionServices(previous => [...previous, ...newSessionServices, ]);

  setSelectedServiceIds([]);

  setShowServicesModal(false);

};


// CREATE SESSION  // =====================================================
const handleCreateSession = async () => {

  if (!selectedAppointment) {
    setError("Please select a patient first.");
    return;
  }

  if (!areaID) {
    setError("Please select a treatment area.");
    return;
  }

  if (!deviceID) {
    setError("Please select a device.");
    return;
  }

  try {

    setSavingSession(true);
    setError("");

    // GET LOGGED-IN USER
    const storedUserInfo = localStorage.getItem("userInfo");

    const userInfo =  storedUserInfo ? JSON.parse(storedUserInfo) : null;

    if (!userInfo?.UserID) {
      throw new Error("Logged-in doctor information was not found.");
    }

    // DETERMINE CREATE OR UPDATE
    const isUpdating =  Boolean(createdSession?.SessionID);

    const method = isUpdating  ? "PUT"  : "POST";

    // REQUEST DATA
    const requestData = {
      PatientID: Number(selectedAppointment.PatientID),

      // Always today's date.
      // The UI does not allow changing it.
      SessionDate: getTodayDate(),

      AreaID: Number(areaID),

      DeviceID: Number(deviceID),

      Notes:  sessionNotes.trim() || null,

      UserID:  Number(userInfo.UserID),

      // Legacy compatibility only.
      PlanID: null,
    };

    // ADD SESSION ID WHEN UPDATING
    if (isUpdating) {
      requestData.SessionID =  Number(createdSession.SessionID);
    }

    // SAVE SESSION
    const response =  await fetch("/api/sessions",
        {
          method,
          headers: {
            "Content-Type": "application/json",
          },

          body:
            JSON.stringify(requestData),
        }
      );

    const data =  await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || ( isUpdating  ? "Failed to update session"  : "Failed to create session" ));
    }

    // STORE UPDATED / CREATED SESSION
    setCreatedSession(data);

    // LOAD SERVICES
    await loadSessionServices(data.SessionID, data.PatientID);

  }
  catch (error) {
    console.error("Save session error:", error);
    setError(error.message || "Failed to save session");
  }
  finally {
    setSavingSession(false);
  }

};

// UPDATE SERVICE QUANTITY// =====================================================
const handleQtyChange = (rowId, value) => {

  let qty = parseInt(value, 10);

  if (isNaN(qty) || qty < 1) {
    qty = 1;
  }

  setSessionServices(previous =>
    previous.map(service => {

      if (service._rowId !== rowId) {
        return service;
      }

      const unitPrice =  Number(service.UnitPrice || 0);

      const discount =   Number(service.Discount || 0);

      return {...service, Qty: qty, LineTotal: Math.max(0, (qty * unitPrice) - discount),};

    })
  );
};

// UPDATE SERVICE UNIT PRICE
const handleUnitPriceChange = (rowId, value) => {

  let unitPrice = Number(value);

  if (isNaN(unitPrice) || unitPrice < 0) { unitPrice = 0; }

  setSessionServices(previous =>
    previous.map(service => {

      if (service._rowId !== rowId) {
        return service;
      }

      const qty =  Number(service.Qty || 1);

      const discount =   Number(service.Discount || 0);

      const lineTotal =   Math.max( 0,  (qty * unitPrice) - discount  );

      return { ...service,  UnitPrice: unitPrice,  LineTotal: lineTotal,   };

    })
  );
};


// UPDATE SERVICE PULSES
const handlePulsesNoChange = (rowId, value) => {

  let pulsesNo = parseInt(value, 10);

  if (isNaN(pulsesNo) || pulsesNo < 0) {
    pulsesNo = 0;
  }

  setSessionServices(previous =>
    previous.map(service => {

      if (service._rowId !== rowId) {
        return service;
      }

      return {
        ...service,
        PulsesNo: pulsesNo,
      };

    })
  );
};

// UPDATE SERVICE DISCOUNT // =====================================================
const handleDiscountChange = (rowId, value) => {

  let discount = parseInt(value, 10);

  if (isNaN(discount) || discount < 0) {
    discount = 0;
  }

  setSessionServices(previous =>
    previous.map(service => {

      if (service._rowId !== rowId) {
        return service;
      }

      const qty =  Number(service.Qty || 1);

      const unitPrice =  Number(service.UnitPrice || 0);

      return {...service, Discount: discount, LineTotal: Math.max(0, (qty * unitPrice) - discount),};

    })
  );
};

// REMOVE SERVICE FROM STATE// =====================================================
const handleRemoveService = (rowId) => {
  setSessionServices(previous => previous.filter(service => service._rowId !== rowId));
};

// SAVE SERVICES// =====================================================
const handleSaveServices = async () => {

  if (!createdSession?.SessionID) {
    setError("Please register the session first.");
    return;
  }

  if (!selectedAppointment?.PatientID) {
    setError("Patient information is missing.");
    return;
  }

  try {

    setSavingServices(true);
    setError("");


    const requestData = {

      sessionId: Number(createdSession.SessionID),

      patientId: Number(selectedAppointment.PatientID),

      services:
        sessionServices.map(service => ({

          ServiceID: Number(service.ServiceID),

          Qty: Number(service.Qty),
          
          PulsesNo:  service.PulsesNo === undefined || service.PulsesNo === null || service.PulsesNo === ""
              ? null
              : Number(service.PulsesNo),

          UnitPrice: Number(service.UnitPrice),

          Discount: Number(service.Discount || 0),

          Notes: service.Notes || null,

        })),

    };

    const response =  await fetch("/api/sessionServices",
        {
          method: "POST",
          headers: {
            "Content-Type":  "application/json",
          },

          body: JSON.stringify(requestData),
        }
      );

    const data =  await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to save services");
    }

    // DATABASE RESULT BECOMES NEW STATE
    setSessionServices(Array.isArray(data.services) ? data.services.map(service => ({...service,
            _rowId: `existing-${service.SessionServiceID}`, }))  : [] );

    setError("");
  }
  catch (error) {
    console.error("Save services error:", error);
    setError(error.message || "Failed to save services");
  }
  finally {
    setSavingServices(false);
  }

};

// SESSION SERVICES SUMMARY
// CategoryID = 10 (Consumables) are completely excluded// =====================================================
const getSessionServicesSummary = () => {

  let totalBeforeDiscount = 0;
  let totalDiscount = 0;

  sessionServices.forEach(service => {

    // CONSUMABLES ARE EXCLUDED FROM ALL CALCULATIONS
    if (Number(service.CategoryID) === 10) {
      return;
    }

    const qty =  Number(service.Qty || 0);

    const unitPrice =  Number(service.UnitPrice || 0);

    const discount =  Number(service.Discount || 0);

    totalBeforeDiscount +=  qty * unitPrice;

    totalDiscount +=  discount;

  });

  const netDue =  Math.max(0, totalBeforeDiscount -  totalDiscount);

  return {totalBeforeDiscount, totalDiscount, netDue,};

};

const {totalBeforeDiscount, totalDiscount, netDue,} = getSessionServicesSummary();

const normalizedServiceSearch = serviceSearch.trim().toLocaleLowerCase();
const filteredServices = services.filter(service =>
  !normalizedServiceSearch ||
  String(service.ServiceName || "").toLocaleLowerCase().includes(normalizedServiceSearch) ||
  String(service.CategoryName || "").toLocaleLowerCase().includes(normalizedServiceSearch)
);

  // RENDER  // =====================================================
  return (

    <div className="sessions-page">


      {/* =================================================
          HEADER
      ================================================= */}

      <div className="sessions-header">
        <div>
          <h1>{isRTL ? "الجلسات" : "Sessions"}</h1>
          <p>{isRTL ? "سجل جلسة المريض اليوم" : "Register today s patient session"}</p>
        </div>
      </div>


      {/* =================================================
          ERROR
      ================================================= */}

      {error && (

        <div className="sessions-error">
          {error}
        </div>
      )}

      {/* =================================================
          PATIENT SELECTION
      ================================================= */}

      <div className="sessions-section">
        <div className="sessions-section-header">
          <h2>{isRTL ? "اختر المريض" : "Select Patient"}</h2>
          <span>{isRTL ? "مواعيد اليوم" : "Today s Appointments"}</span>
        </div>

        {loading ? (

          <div className="sessions-loading">
            {isRTL ? "جارٍ تحميل مواعيد اليوم..." : "Loading today s appointments..."}
          </div>

        ) : appointments.length === 0 ? (

          <div className="sessions-empty">
            {isRTL ? "لا توجد مواعيد لليوم" : "No appointments for today."}
          </div>

        ) : (

          <div className="sessions-patient-selection">

            {/* =================================================
                SELECT
            ================================================= */}

            <div className="sessions-form-group">

              <label>{isRTL ? "المريض" : "Patient"}</label>

              <select   value={selectedAppointment?.AppointmentID || ""}
                        onChange={(e) => handleSelectAppointment(e.target.value)}
              >
                <option value="">
                  {isRTL ? "اختر المريض" : "Select today s patient"}
                </option>

                {appointments.map((appointment) => (

                    <option key={appointment.AppointmentID}
                            value={appointment.AppointmentID}
                    >
                      {formatTime( appointment.AppointmentTime)} {" - "}
                                  {appointment.PatientName} {" - "}
                                  {appointment.FileNo} {" - "}
                                  {appointment.AppointmentService} {" - Dr."}
                                  {appointment.DoctorName}
                    </option>
                  )
                )}
              </select>

            </div>

          </div>

        )}

      </div>


      {/* =================================================
          REGISTER SESSION
      ================================================= */}

      {selectedAppointment && (

        <div className="sessions-section">

          <div className="sessions-section-header">
            <h2>{isRTL ? "سجل الجلسة" : "Register Session"}</h2>
            <span>{selectedAppointment.PatientName}</span>
          </div>

          <div className="sessions-form">

            {/* =============================================
                PATIENT
            ============================================= */}

            <div className="sessions-form-group">
              <label>{isRTL ? "المريض" : "Patient"}</label>
              <input  type="text"
                      value={`${selectedAppointment.PatientName} - ${selectedAppointment.FileNo}`}
                      readOnly
              />
            </div>


            {/* =============================================
                SESSION DATE
            ============================================= */}

            <div className="sessions-form-group">

              <label>
                {isRTL ? "تاريخ الجلسة" : "Session Date"}
              </label>


              <input
                type="date"
                value={sessionDate}
                readOnly
              />

            </div>


            {/* =============================================
                TREATMENT AREA
            ============================================= */}

            <div className="sessions-form-group">

              <label>
                {isRTL ? "منطقة العلاج" : "Treatment Area"}
              </label>


              <select
                value={areaID}
                onChange={(e) =>
                  setAreaID(
                    e.target.value
                  )
                }

                disabled={
                  areasLoading
                }
              >

                <option value="">

                  {areasLoading  ? (isRTL ? "جارٍ تحميل المناطق..." : "Loading areas...")
                    : (isRTL ? "اختر منطقة العلاج" : "Select treatment area")}

                </option>


                {treatmentAreas
                  .filter(
                    area =>
                      area.IsActive !== false
                  )
                  .map(
                    area => (

                      <option
                        key={
                          area.AreaID
                        }

                        value={
                          area.AreaID
                        }
                      >

                        {area.AreaName}

                      </option>

                    )
                  )}

              </select>

            </div>


            {/* =============================================
                DEVICE
            ============================================= */}

            <div className="sessions-form-group">

              <label>
                {isRTL ? "الجهاز" : "Device"}
              </label>


              <select
                value={deviceID}
                onChange={(e) =>
                  setDeviceID(
                    e.target.value
                  )
                }

                disabled={
                  devicesLoading
                }
              >

                <option value="">

                  {devicesLoading ? (isRTL ? "جارٍ تحميل الأجهزة..." : "Loading devices...")
                    : (isRTL ? "اختر الجهاز" : "Select device")}

                </option>


                {devices
                  .filter(
                    device =>
                      device.IsActive !== false
                  )
                  .map(
                    device => (

                      <option
                        key={
                          device.DeviceID
                        }

                        value={
                          device.DeviceID
                        }
                      >

                        {device.DeviceName}

                      </option>

                    )
                  )}

              </select>

            </div>


            {/* =============================================
                NOTES
            ============================================= */}

            <div className="sessions-form-group">

              <label>
                {isRTL ? "الملاحظات" : "Notes"}
              </label>


              <textarea
                value={sessionNotes}

                onChange={(e) =>
                  setSessionNotes(
                    e.target.value
                  )
                }

                rows={4}

                placeholder={isRTL ? "ملاحظات الجلسة..." : "Session notes..."}
              />

            </div>


            {/* SAVE SESSION */}
            <button type="button"  className="sessions-save-button"
                    onClick={handleCreateSession}
                    disabled={savingSession || !IsDoctorCase}
            >
                {savingSession? (isRTL ? "جارٍ الحفظ..." : "Saving...") : 
                  createdSession? (isRTL ? "تحديث الجلسة" : "Update Session") : 
                    (isRTL ? "سجل الجلسة" : "Register Session")}
            </button>

            {/* =============================================
                CREATED SESSION
            ============================================= */}

            {createdSession && (

              <div className="sessions-success">

                {isRTL ? "تم تسجيل الجلسة بنجاح." : "Session registered successfully."}

                <br />

                {isRTL ? "معرف الجلسة:" : "Session ID:"}
                {" "}
                {createdSession.SessionID}

              </div>

            )}

          </div>

        </div>

      )}

  {/* =================================================
    SESSION SERVICES
================================================= */}

{createdSession && (

  <div className="sessions-section">

    <div className="sessions-section-header">

      <h2>
        {isRTL ? "خدمات الجلسة" : "Session Services"}
      </h2>

      <span>
        {isRTL ? "الجلسة #" : "Session #"} {createdSession.SessionID}
      </span>

    </div>


    {/* =================================================
        ADD SERVICES BUTTON
    ================================================= */}

    <div className="sessions-services-toolbar">

      <button   type="button"    className="sessions-add-services-button"
                onClick={handleOpenServicesModal}
                disabled={savingServices || !IsDoctorCase  }
      >
        + {isRTL ? "إضافة خدمات" : "Add Services"}
      </button>

    </div>


    {/* =================================================
        SERVICES TABLE
    ================================================= */}

    {servicesLoading ? (

      <div className="sessions-loading">

        {isRTL ? "جارٍ تحميل خدمات الجلسة..." : "Loading session services..."}

      </div>

    ) : sessionServices.length === 0 ? (

      <div className="sessions-empty">

        {isRTL ? "لم يتم إضافة خدمات إلى هذه الجلسة بعد." : "No services added to this session yet."}

      </div>

    ) : (

      <div className="sessions-services-table-wrapper">

        <table className="sessions-services-table">

          <thead>

            <tr>

              <th>
                {isRTL ? "الخدمة" : "Service"}
              </th>

              <th>
                {isRTL ? "الكمية" : "Qty"}
              </th>

              <th>
                {isRTL ? "عدد النبضات" : "Pulses"}
              </th>

              <th>
                {isRTL ? "سعر الوحدة" : "Unit Price"}
              </th>

              <th>
                {isRTL ? "الخصم" : "Discount"}
              </th>

              <th>
                {isRTL ? "المجموع" : "Line Total"}
              </th>

              <th>
                {isRTL ? "الإجراء" : "Action"}
              </th>

            </tr>

          </thead>


          <tbody>

            {sessionServices.map(
              service => (

                <tr
                  key={service._rowId ||  service.SessionServiceID  }
                >

                  {/* SERVICE */}

                  <td>

                    <strong>
                      {service.ServiceName}
                    </strong>

                    {service.CategoryID === 10 && (
                      <span className="sessions-consumable-label">
                        {isRTL ? "مستهلك" : "Consumable"}
                      </span>
                    )}

                  </td>


                  {/* QTY */}

                    <td>
                        <input
                            type="number"
                            min="1"
                            step="1"
                            value={service.Qty}
                            onChange={(e) =>
                            handleQtyChange(
                                service._rowId,
                                e.target.value
                            )
                            }
                            disabled={savingServices}
                        />
                    </td>

                    {/* PULSES NO */}

                    <td>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={service.PulsesNo ?? 0}
                        onChange={(e) =>
                          handlePulsesNoChange(
                            service._rowId,
                            e.target.value
                          )
                        }
                        disabled={savingServices}
                      />
                    </td>

                  {/* UNIT PRICE */}

                  <td>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={service.UnitPrice ?? 0}

                      onChange={(e) =>
                        handleUnitPriceChange( service._rowId, e.target.value ) }

                      readOnly={
                        Number(service.DefaultPrice || 0) > 0
                      }

                      disabled={savingServices}
                    />

                  </td>


                  {/* DISCOUNT */}

                    <td>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            value={service.Discount}
                            onChange={(e) =>
                            handleDiscountChange(
                                service._rowId,
                                e.target.value
                            )
                            }
                            disabled={savingServices}
                        />
                    </td>

                  {/* LINE TOTAL */}

                  <td>

                    <strong>
                      {Number(
                        service.LineTotal || 0
                      ).toFixed(2)}
                    </strong>

                  </td>


                  {/* REMOVE */}

                  <td>

                    <button
                      type="button"
                      className="sessions-remove-service-button"

                      onClick={() =>
                        handleRemoveService(
                          service._rowId
                        )
                      }

                      disabled={
                        savingServices
                      }
                    >
                      {isRTL ? "إزالة" : "Remove"}
                    </button>

                  </td>

                </tr>

              )
            )}

          </tbody>

        </table>

      </div>

    )}

    {/* =================================================
        SESSION SERVICES SUMMARY
    ================================================= */}

    <div className="sessions-services-summary">

      <div className="sessions-summary-item">

        <span className="sessions-summary-label">
          {isRTL ? "المجموع قبل الخصم" : "Total Before Discount"}
        </span>

        <strong className="sessions-summary-value">
          {totalBeforeDiscount.toFixed(2)}
        </strong>

      </div>


      <div className="sessions-summary-item">

        <span className="sessions-summary-label">
          {isRTL ? "إجمالي الخصم" : "Total Discount"}
        </span>

        <strong className="sessions-summary-value">
          {totalDiscount.toFixed(2)}
        </strong>

      </div>


      <div className="sessions-summary-item sessions-summary-net">

        <span className="sessions-summary-label">
          {isRTL ? "الصافي" : "Net Due"}
        </span>

        <strong className="sessions-summary-value">
          {netDue.toFixed(2)}
        </strong>

      </div>

    </div>

    {/* =================================================
        SAVE SERVICES
    ================================================= */}

    <div className="sessions-services-footer">

      <button   type="button"    className="sessions-save-services-button"
                onClick={handleSaveServices}
                disabled={savingServices || !IsDoctorCase}
      >
        {savingServices ? ( isRTL ? "جارٍ حفظ الخدمات..." : "Saving Services..." ) : 
                          ( isRTL ? "حفظ الخدمات" : "Save Services" )}
      </button>

    </div>


    {/* =================================================
        ADD SERVICES MODAL
    ================================================= */}

    {showServicesModal && (

      <div className="sessions-modal-overlay">

        <div className="sessions-services-modal">


          {/* -------------------------------------------
              MODAL HEADER
          ------------------------------------------- */}

          <div className="sessions-modal-header">

            <h2>
              {isRTL ? "اختر الخدمات" : "Select Services"}
            </h2>


            <button
              type="button"
              className="sessions-modal-close"

              onClick={
                handleCloseServicesModal
              }
            >
              ×
            </button>

          </div>

          <div className="sessions-modal-search">
            <input
              type="search"
              value={serviceSearch}
              onChange={(e) => setServiceSearch(e.target.value)}
              placeholder={isRTL ? "ابحث باسم الخدمة أو الفئة..." : "Search by service or category..."}
              aria-label={isRTL ? "ابحث عن خدمة أو فئة" : "Search services or categories"}
            />
          </div>


          {/* -------------------------------------------
              SERVICE LIST
          ------------------------------------------- */}

          <div className="sessions-modal-body">

            {services.length === 0 ? (

              <div className="sessions-empty">

                {isRTL ? "لا توجد خدمات نشطة متاحة." : "No active services available."}

              </div>

            ) : filteredServices.length === 0 ? (

              <div className="sessions-empty">
                {isRTL ? "لا توجد خدمات مطابقة للبحث." : "No services match your search."}
              </div>

            ) : (

              filteredServices.map(service => {

                  const alreadyAdded =
                    sessionServices.some(item => String(item.ServiceID) === String(service.ServiceID));

                  const checked =
                    selectedServiceIds.some(id => String(id) === String(service.ServiceID));

                  return (

                    <label
                      key={
                        service.ServiceID
                      }

                      className={
                        `sessions-service-option ${
                          alreadyAdded
                            ? "already-added"
                            : ""
                        }`
                      }
                    >

                      <input
                        type="checkbox"

                        checked={
                          checked
                        }

                        disabled={
                          alreadyAdded
                        }

                        onChange={() =>
                          handleToggleService(
                            service.ServiceID
                          )
                        }
                      />


                      <span className="sessions-service-option-name">
                        <span>{service.ServiceName}</span>
                        <span className="sessions-service-option-category">
                          {service.CategoryName || (isRTL ? "بدون فئة" : "Uncategorized")}
                        </span>

                      </span>


                      <span className="sessions-service-option-price">

                        {Number(
                          service.DefaultPrice || 0
                        ).toFixed(2)}

                      </span>


                      {alreadyAdded && (

                        <span className="sessions-service-option-status">

                          {isRTL ? "مُضَاف بالفعل" : "Already added"}

                        </span>

                      )}

                    </label>

                  );

                }
              )

            )}

          </div>


          {/* MODAL FOOTER */}
          <div className="sessions-modal-footer">

            <button type="button" className="sessions-modal-cancel"
                    onClick={handleCloseServicesModal}
            >
              {isRTL ? "إلغاء" : "Cancel"}
            </button>

            <button type="button"  className="sessions-modal-add"
                    onClick={handleAddSelectedServices}
                    disabled={selectedServiceIds.length === 0}
            >
              {isRTL ? "إضافة الاختيارات" : "Add Selections"}
            </button>

          </div>

        </div>

      </div>

    )}

  </div>

)}

    </div>

  );

};


export default SessionsPage;