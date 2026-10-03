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

  
const ReceptionSessionsPage  = () => {
  
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  const { userInfo } = useStateContext();

  // DOCTORS
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [selectedDoctorID, setSelectedDoctorID] = useState("");

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

  // Offer subscriptions available to this patient for the current session.
  const [patientOfferSubscriptions, setPatientOfferSubscriptions] = useState([]);
  const [sessionOfferUsages, setSessionOfferUsages] = useState([]);
  const [selectedOfferSubscription, setSelectedOfferSubscription] = useState(null);
  const [showOffersModal, setShowOffersModal] = useState(false);
  const [offersLoading, setOffersLoading] = useState(false);
  const [savingOfferUsage, setSavingOfferUsage] = useState(false);
  const [offerPulsesNo, setOfferPulsesNo] = useState("");
  const [offerUsageMessage, setOfferUsageMessage] = useState("");
  const [offerError, setOfferError] = useState("");
  const [editingOfferUsageID, setEditingOfferUsageID] = useState(null);
  const [offerUsageEditForm, setOfferUsageEditForm] = useState({ PulsesNo: "", Notes: "" });

  // is Doctor logged in Case
  const [IsDoctorCase, setIsDoctorCase] =useState(true);

  // INITIAL LOAD
  useEffect(() => {

    loadDoctors();

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


  // =====================================================
  // LOAD DOCTORS
  // =====================================================

  const loadDoctors = async () => {

    try {

      setDoctorsLoading(true);

      const response = await fetch("/api/users");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load doctors"
        );
      }

      const doctorList = Array.isArray(data)
        ? data.filter(user => Number(user.RoleID) === 2 )
        : [];

      setDoctors(doctorList);

    } catch (error) {

      console.error(
        "Load doctors error:",
        error
      );

      setError(
        error.message ||
        "Failed to load doctors"
      );

    } finally {

      setDoctorsLoading(false);

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

  // Load every offer usage row attached to the current session.
  const loadSessionOfferUsages = async (sessionID) => {
    if (!sessionID) {
      setSessionOfferUsages([]);
      return [];
    }

    const response = await fetch(`/api/sessionOfferUsage?sessionID=${sessionID}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to load session offer usage.");
    }

    const usages = Array.isArray(data) ? data : [];
    setSessionOfferUsages(usages);
    return usages;
  };

  // Load current active subscriptions for the patient, excluding empty balances.
  const loadPatientActiveOffers = async (patientID) => {
    if (!patientID) {
      setPatientOfferSubscriptions([]);
      return [];
    }

    const response = await fetch(
      `/api/offerSubscriptions?patientID=${patientID}&activeOnly=true`
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to load active offers.");
    }

    const availableOffers = Array.isArray(data)
      ? data.filter((subscription) => Number(subscription.RemainingQuantity || 0) > 0)
      : [];

    setPatientOfferSubscriptions(availableOffers);
    return availableOffers;
  };


// SELECT APPOINTMENT// =====================================================
const handleSelectAppointment = async (appointmentID) => {

  const appointment =
    appointments.find(item => String(item.AppointmentID) === String(appointmentID));

  setSelectedAppointment(appointment || null);

  // CLEAR PREVIOUS DATA
  setCreatedSession(null);
  setSessionServices([]);
  setPatientOfferSubscriptions([]);
  setSessionOfferUsages([]);
  setSelectedOfferSubscription(null);
  setShowOffersModal(false);
  setOfferPulsesNo("");
  setOfferUsageMessage("");
  setOfferError("");
  setEditingOfferUsageID(null);
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
      setSessionOfferUsages([]);
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

    // LOAD EXISTING SERVICES
    await loadSessionServices(data.SessionID, appointment.PatientID);

    // LOAD OFFER USAGE ALREADY RECORDED FOR THIS SESSION.
    await loadSessionOfferUsages(data.SessionID);

  }
  catch (error) {
    console.error("Check today's session error:", error);
    setError(error.message || "Failed to check today's session");
  }
  finally {
    setLoading(false);
  }

};

// LOAD ACTIVE OFFER SUBSCRIPTIONS FOR THE SELECTED PATIENT
const handleOpenOffersModal = async () => {

  if (!createdSession?.SessionID || !selectedAppointment?.PatientID) {
    setError(isRTL ? "سجل الجلسة أولاً قبل إضافة عرض." : "Register the session before adding an offer.");
    return;
  }

  setShowOffersModal(true);
  setOffersLoading(true);
  setSelectedOfferSubscription(null);
  setOfferPulsesNo("");
  setOfferUsageMessage("");
  setError("");

  try {
    await loadPatientActiveOffers(selectedAppointment.PatientID);
  } catch (loadError) {
    setOfferError(loadError.message || "Failed to load active offers.");
    setPatientOfferSubscriptions([]);
  } finally {
    setOffersLoading(false);
  }
};

// SELECT ONE OFFER FROM THE PATIENT'S AVAILABLE SUBSCRIPTIONS.
const handleSelectOfferSubscription = (subscription) => {
  setSelectedOfferSubscription(subscription);
  setOfferPulsesNo("");
  setShowOffersModal(false);
  setOfferUsageMessage("");
  setOfferError("");
};

// SAVE HOW MUCH OF THE SELECTED OFFER WAS USED IN THIS SESSION.
const handleSaveOfferUsage = async () => {

  if (!selectedOfferSubscription || !createdSession?.SessionID || !selectedAppointment?.PatientID) {
    return;
  }

  const isPulseOffer = Number(selectedOfferSubscription.CategoryID) === 2;
  const enteredPulses = offerPulsesNo.trim() === "" ? 0 : Number(offerPulsesNo);

  if (isPulseOffer && (!Number.isFinite(enteredPulses) || enteredPulses <= 0)) {
    setOfferError(isRTL ? "أدخل عدد نبضات أكبر من صفر." : "Enter a pulse quantity greater than zero.");
    return;
  }

  if (!Number.isFinite(enteredPulses) || enteredPulses < 0) {
    setOfferError(isRTL ? "أدخل عدد نبضات صالحاً." : "Enter a valid pulse quantity.");
    return;
  }

  try {
    setSavingOfferUsage(true);
    setOfferError("");
    setOfferUsageMessage("");

    const response = await fetch(
      `/api/offerSubscriptions/${selectedOfferSubscription.OfferSubscriptionID}/usage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          SessionID: Number(createdSession.SessionID),
          PatientID: Number(selectedAppointment.PatientID),
          // Session offers allow optional pulses; pulse offers consume that count.
          PulsesNo: enteredPulses,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to save offer usage.");
    }

    // Reload both views to show the new balance and the usage row just saved.
    await Promise.all([
      loadPatientActiveOffers(selectedAppointment.PatientID),
      loadSessionOfferUsages(createdSession.SessionID),
    ]);

    setSelectedOfferSubscription(null);
    setOfferPulsesNo("");
    setOfferUsageMessage(
      isRTL ? "تم حفظ استخدام العرض في الجلسة." : "Offer usage saved for this session."
    );
  } catch (saveError) {
    setOfferError(saveError.message || "Failed to save offer usage.");
  } finally {
    setSavingOfferUsage(false);
  }
};

// Close the picker without changing any offer subscription.
const handleCloseOffersModal = () => {
  if (offersLoading) return;
  setShowOffersModal(false);
  setOfferError("");
};

// Start editing the pulses and notes for one saved usage row.
const handleEditOfferUsage = (usage) => {
  setEditingOfferUsageID(usage.OfferSubscriptionUsageID);
  setOfferUsageEditForm({
    PulsesNo: String(usage.PulsesNo ?? 0),
    Notes: usage.Notes || "",
  });
  setOfferError("");
};

// Discard the inline usage edit without sending it to the API.
const handleCancelEditOfferUsage = () => {
  setEditingOfferUsageID(null);
  setOfferUsageEditForm({ PulsesNo: "", Notes: "" });
};

// Save an edited usage and refresh the current session balance display.
const handleUpdateOfferUsage = async (event, usage) => {
  event.preventDefault();

  const isPulseOffer = Number(usage.CategoryID) === 2;
  const pulsesNo = offerUsageEditForm.PulsesNo.trim() === ""
    ? 0
    : Number(offerUsageEditForm.PulsesNo);

  if (!Number.isFinite(pulsesNo) || pulsesNo < 0 || (isPulseOffer && pulsesNo <= 0)) {
    setOfferError(isRTL ? "أدخل عدد نبضات صالحاً." : "Enter a valid pulse quantity.");
    return;
  }

  try {
    setSavingOfferUsage(true);
    setOfferError("");

    const response = await fetch(
      `/api/sessionOfferUsage/${usage.OfferSubscriptionUsageID}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          PulsesNo: pulsesNo,
          Notes: offerUsageEditForm.Notes.trim() || null,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to update offer usage.");
    }

    await Promise.all([
      loadSessionOfferUsages(createdSession.SessionID),
      loadPatientActiveOffers(selectedAppointment.PatientID),
    ]);

    handleCancelEditOfferUsage();
    setOfferUsageMessage(isRTL ? "تم تحديث استخدام العرض." : "Offer usage updated.");
  } catch (updateError) {
    setOfferError(updateError.message || "Failed to update offer usage.");
  } finally {
    setSavingOfferUsage(false);
  }
};

// Delete one usage row; the API restores its consumed quantity to the subscription.
const handleDeleteOfferUsage = async (usage) => {
  const confirmed = window.confirm(
    isRTL ? "هل تريد حذف استخدام هذا العرض؟" : "Delete this offer usage? Its quantity will be restored."
  );

  if (!confirmed) return;

  try {
    setSavingOfferUsage(true);
    setOfferError("");

    const response = await fetch(
      `/api/sessionOfferUsage/${usage.OfferSubscriptionUsageID}`,
      { method: "DELETE" }
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to delete offer usage.");
    }

    await Promise.all([
      loadSessionOfferUsages(createdSession.SessionID),
      loadPatientActiveOffers(selectedAppointment.PatientID),
    ]);

    if (editingOfferUsageID === usage.OfferSubscriptionUsageID) {
      handleCancelEditOfferUsage();
    }

    setOfferUsageMessage(isRTL ? "تم حذف استخدام العرض واستعادة الرصيد." : "Offer usage deleted and its balance restored.");
  } catch (deleteError) {
    setOfferError(deleteError.message || "Failed to delete offer usage.");
  } finally {
    setSavingOfferUsage(false);
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

    if (!selectedDoctorID) {

      throw new Error(
        isRTL ? "يرجى اختيار الطبيب أولاً."   : "Please select a doctor first."   );
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

      UserID: Number(selectedDoctorID),

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
    await loadSessionOfferUsages(data.SessionID);

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

// Subscriptions already used in this session cannot be selected a second time.
const usedOfferSubscriptionIDs = new Set(
  sessionOfferUsages.map((usage) => String(usage.OfferSubscriptionID))
);

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
          DOCTOR SELECTION
      ================================================= */}

      <div className="sessions-section">

        <div className="sessions-section-header">
          <h2>{isRTL ? "اختر الطبيب" : "Select Doctor"} </h2>
          <span>{isRTL  ? "الطبيب المسؤول عن الجلسة"  : "Doctor responsible for the session"}</span>
        </div>

        <div className="sessions-patient-selection">

          <div className="sessions-form-group">

            <label>{isRTL ? "الطبيب" : "Doctor"}</label>

            <select
              value={selectedDoctorID}
              onChange={(e) => {

                setSelectedDoctorID(e.target.value);

                // Clear previously selected patient/session
                setSelectedAppointment(null);
                setCreatedSession(null);
                setSessionServices([]);
                setPatientOfferSubscriptions([]);
                setSessionOfferUsages([]);
                setSelectedOfferSubscription(null);
                setShowOffersModal(false);
                setOfferPulsesNo("");
                setOfferUsageMessage("");
                setOfferError("");
                setEditingOfferUsageID(null);

                setSessionDate(getTodayDate() );

                setAreaID("");
                setDeviceID("");
                setSessionNotes("");
                setError("");

              }}

              disabled={doctorsLoading}
            >

              <option value="">
                {doctorsLoading
                  ? ( isRTL ? "جارٍ تحميل الأطباء..."   : "Loading doctors..."   )
                  : ( isRTL ? "اختر الطبيب"           : "Select doctor"         )
                }
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

        </div>

      </div>

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

                        disabled={!selectedDoctorID}
              >

                <option value="">
                  {!selectedDoctorID
                    ? (
                      isRTL
                        ? "اختر الطبيب أولاً"
                        : "Select doctor first"
                    )
                    : (
                      isRTL
                        ? "اختر المريض"
                        : "Select today's patient"
                    )
                  }
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
                    disabled={savingSession || !selectedDoctorID}
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
                disabled={savingServices }
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
                disabled={savingServices}
      >
        {savingServices ? ( isRTL ? "جارٍ حفظ الخدمات..." : "Saving Services..." ) : 
                          ( isRTL ? "حفظ الخدمات" : "Save Services" )}
      </button>

    </div>


    {/* =================================================
        OFFER USAGE
        Offer usage is stored separately from SessionServices.
    ================================================= */}

    <section className="sessions-offers-section">

      <div className="sessions-offers-heading">
        <div>
          <h3>{isRTL ? "استخدام العروض" : "Offer Usage"}</h3>
          <p>
            {isRTL
              ? "استخدم رصيد اشتراك المريض في هذه الجلسة."
              : "Use one of the patient’s offer subscriptions in this session."}
          </p>
        </div>

        <button
          type="button"
          className="sessions-add-services-button"
          onClick={handleOpenOffersModal}
          disabled={savingOfferUsage || savingServices}
        >
          + {isRTL ? "إضافة عرض" : "Add Offer"}
        </button>
      </div>

      {offerUsageMessage && (
        <div className="sessions-offer-success" role="status">
          {offerUsageMessage}
        </div>
      )}

      {offerError && !selectedOfferSubscription && (
        <div className="sessions-error sessions-offer-error" role="alert">
          {offerError}
        </div>
      )}

      {/* Show every offer usage already recorded for this session. */}
      {sessionOfferUsages.length > 0 && (
        <div className="sessions-offer-usage-list">
          <h4>{isRTL ? "العروض المستخدمة في هذه الجلسة" : "Offers Used in This Session"}</h4>

          {sessionOfferUsages.map((usage) => (
            <div className="sessions-offer-usage-entry" key={usage.OfferSubscriptionUsageID}>
              {editingOfferUsageID === usage.OfferSubscriptionUsageID ? (
                <form
                  className="sessions-offer-usage-edit-form"
                  onSubmit={(event) => handleUpdateOfferUsage(event, usage)}
                >
                  <strong>{usage.OfferName}</strong>

                  <label htmlFor={`edit-offer-pulses-${usage.OfferSubscriptionUsageID}`}>
                    {isRTL ? "عدد النبضات" : "Pulses Used"}
                    {Number(usage.CategoryID) === 2 ? " *" : ""}
                  </label>
                  <input
                    id={`edit-offer-pulses-${usage.OfferSubscriptionUsageID}`}
                    type="number"
                    min={Number(usage.CategoryID) === 2 ? "1" : "0"}
                    max={Number(usage.CategoryID) === 2
                      ? Number(usage.RemainingQuantity || 0) + Number(usage.ConsumedQuantity || 0)
                      : undefined}
                    step="1"
                    value={offerUsageEditForm.PulsesNo}
                    onChange={(event) => setOfferUsageEditForm((current) => ({
                      ...current,
                      PulsesNo: event.target.value,
                    }))}
                    required={Number(usage.CategoryID) === 2}
                    disabled={savingOfferUsage}
                  />

                  <label htmlFor={`edit-offer-notes-${usage.OfferSubscriptionUsageID}`}>
                    {isRTL ? "ملاحظات" : "Notes"}
                  </label>
                  <input
                    id={`edit-offer-notes-${usage.OfferSubscriptionUsageID}`}
                    type="text"
                    maxLength={500}
                    value={offerUsageEditForm.Notes}
                    onChange={(event) => setOfferUsageEditForm((current) => ({
                      ...current,
                      Notes: event.target.value,
                    }))}
                    disabled={savingOfferUsage}
                  />

                  <div className="sessions-offer-usage-row-actions">
                    <button
                      type="button"
                      className="sessions-modal-cancel"
                      onClick={handleCancelEditOfferUsage}
                      disabled={savingOfferUsage}
                    >
                      {isRTL ? "إلغاء" : "Cancel"}
                    </button>
                    <button
                      type="submit"
                      className="sessions-modal-add"
                      disabled={savingOfferUsage}
                    >
                      {savingOfferUsage
                        ? (isRTL ? "جارٍ الحفظ..." : "Saving...")
                        : (isRTL ? "حفظ" : "Save")}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="sessions-offer-usage-details">
                    <strong>{usage.OfferName}</strong>
                    <span>{usage.CategoryName}</span>
                    <span>
                      {isRTL ? "المستهلك" : "Consumed"}: {Number(usage.ConsumedQuantity || 0).toLocaleString()}
                    </span>
                    <span>
                      {isRTL ? "النبضات" : "Pulses"}: {Number(usage.PulsesNo || 0).toLocaleString()}
                    </span>
                    <span>
                      {isRTL ? "رصيد العرض" : "Offer Remaining"}: {Number(usage.RemainingQuantity || 0).toLocaleString()}
                    </span>
                    <span>{usage.UsageDate ? new Date(usage.UsageDate).toLocaleDateString() : "-"}</span>
                  </div>

                  <div className="sessions-offer-usage-row-actions">
                    <button
                      type="button"
                      className="sessions-offer-edit-button"
                      onClick={() => handleEditOfferUsage(usage)}
                      disabled={savingOfferUsage}
                    >
                      {isRTL ? "تعديل" : "Edit"}
                    </button>
                    <button
                      type="button"
                      className="sessions-offer-delete-button"
                      onClick={() => handleDeleteOfferUsage(usage)}
                      disabled={savingOfferUsage}
                    >
                      {isRTL ? "حذف" : "Delete"}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedOfferSubscription && (
        <div className="sessions-selected-offer">
          {offerError && (
            <div className="sessions-error sessions-offer-error" role="alert">
              {offerError}
            </div>
          )}

          <div className="sessions-selected-offer-summary">
            <strong>{selectedOfferSubscription.OfferName}</strong>
            <span>
              {selectedOfferSubscription.CategoryName ||
                (Number(selectedOfferSubscription.CategoryID) === 2 ? "Pulse" : "Session")}
            </span>
            <span>
              {isRTL ? "المتاح" : "Remaining"}: {Number(selectedOfferSubscription.RemainingQuantity || 0).toLocaleString()}
            </span>
          </div>

          <div className="sessions-offer-usage-form">
            <label htmlFor="offer-usage-pulses">
              {isRTL ? "عدد النبضات" : "Pulses Used"}
              {Number(selectedOfferSubscription.CategoryID) === 2 ? " *" : ""}
            </label>
            <input
              id="offer-usage-pulses"
              type="number"
              min={Number(selectedOfferSubscription.CategoryID) === 2 ? "1" : "0"}
              max={Number(selectedOfferSubscription.CategoryID) === 2
                ? Number(selectedOfferSubscription.RemainingQuantity || 0)
                : undefined}
              step="1"
              value={offerPulsesNo}
              onChange={(event) => setOfferPulsesNo(event.target.value)}
              placeholder={isRTL ? "اختياري لعروض الجلسات" : "Optional for session offers"}
              required={Number(selectedOfferSubscription.CategoryID) === 2}
              disabled={savingOfferUsage}
            />
            <p>
              {Number(selectedOfferSubscription.CategoryID) === 2
                ? (isRTL
                  ? "سيُخصم عدد النبضات المدخل من رصيد العرض."
                  : "The entered pulse count will be deducted from the offer balance.")
                : (isRTL
                  ? "سيُخصم استخدام جلسة واحدة. يمكن تسجيل عدد النبضات اختيارياً."
                  : "One session will be consumed. You may also record pulses used.")}
            </p>

            <div className="sessions-offer-usage-actions">
              <button
                type="button"
                className="sessions-modal-cancel"
                onClick={() => setSelectedOfferSubscription(null)}
                disabled={savingOfferUsage}
              >
                {isRTL ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                className="sessions-modal-add"
                onClick={handleSaveOfferUsage}
                disabled={savingOfferUsage}
              >
                {savingOfferUsage
                  ? (isRTL ? "جارٍ حفظ الاستخدام..." : "Saving Usage...")
                  : (isRTL ? "حفظ استخدام العرض" : "Save Offer Usage")}
              </button>
            </div>
          </div>
        </div>
      )}

    </section>


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


    {/* =================================================
        ACTIVE OFFER SUBSCRIPTIONS MODAL
    ================================================= */}

    {showOffersModal && (
      <div className="sessions-modal-overlay" onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleCloseOffersModal();
      }}>
        <section
          className="sessions-services-modal sessions-offers-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sessions-offers-modal-title"
        >
          <header className="sessions-modal-header">
            <div>
              <h2 id="sessions-offers-modal-title">
                {isRTL ? "العروض النشطة للمريض" : "Patient’s Active Offers"}
              </h2>
              <p>{selectedAppointment?.PatientName}</p>
            </div>
            <button
              type="button"
              className="sessions-modal-close"
              onClick={handleCloseOffersModal}
              disabled={offersLoading}
              aria-label={isRTL ? "إغلاق" : "Close"}
            >
              ×
            </button>
          </header>

          {offerError && (
            <div className="sessions-error sessions-offer-error" role="alert">
              {offerError}
            </div>
          )}

          {usedOfferSubscriptionIDs.size > 0 && (
            <p className="sessions-offers-modal-notice">
              {isRTL
                ? "تم استخدام بعض الاشتراكات في هذه الجلسة؛ يمكنك اختيار اشتراك نشط آخر."
                : "Subscriptions already used in this session are disabled. You can select another active offer."}
            </p>
          )}

          <div className="sessions-offers-modal-body">
            {offersLoading ? (
              <div className="sessions-loading">
                {isRTL ? "جارٍ تحميل العروض..." : "Loading active offers..."}
              </div>
            ) : patientOfferSubscriptions.length === 0 ? (
              <div className="sessions-empty">
                {isRTL
                  ? "لا توجد اشتراكات نشطة لها رصيد متبقٍ."
                  : "This patient has no active offers with remaining balance."}
              </div>
            ) : (
              <div className="sessions-offers-table-wrapper">
                <table className="sessions-offers-table">
                  <thead>
                    <tr>
                      <th>{isRTL ? "العرض" : "Offer"}</th>
                      <th>{isRTL ? "النوع" : "Type"}</th>
                      <th>{isRTL ? "الكمية" : "Given"}</th>
                      <th>{isRTL ? "المستهلك" : "Consumed"}</th>
                      <th>{isRTL ? "المتبقي" : "Remaining"}</th>
                      <th>{isRTL ? "الإجراء" : "Action"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patientOfferSubscriptions.map((subscription) => {
                      const alreadyUsedInSession = usedOfferSubscriptionIDs.has(
                        String(subscription.OfferSubscriptionID)
                      );

                      return (
                      <tr key={subscription.OfferSubscriptionID}>
                        <td>
                          <strong>{subscription.OfferName}</strong>
                        </td>
                        <td>
                          {subscription.CategoryName ||
                            (Number(subscription.CategoryID) === 2 ? "Pulse" : "Session")}
                        </td>
                        <td>{Number(subscription.GivenQuantity || 0).toLocaleString()}</td>
                        <td>{Number(subscription.ConsumedQuantity || 0).toLocaleString()}</td>
                        <td>{Number(subscription.RemainingQuantity || 0).toLocaleString()}</td>
                        <td>
                          <button
                            type="button"
                            className="sessions-modal-add"
                            onClick={() => handleSelectOfferSubscription(subscription)}
                            disabled={alreadyUsedInSession}
                            title={alreadyUsedInSession
                              ? (isRTL ? "تم استخدام هذا الاشتراك في الجلسة" : "This subscription is already used in this session")
                              : ""}
                          >
                            {alreadyUsedInSession
                              ? (isRTL ? "مستخدم بالفعل" : "Already Used")
                              : (isRTL ? "اختيار" : "Select")}
                          </button>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <footer className="sessions-modal-footer">
            <button
              type="button"
              className="sessions-modal-cancel"
              onClick={handleCloseOffersModal}
              disabled={offersLoading}
            >
              {isRTL ? "إغلاق" : "Close"}
            </button>
          </footer>
        </section>
      </div>
    )}

  </div>

)}

    </div>

  );

};


export default ReceptionSessionsPage;
