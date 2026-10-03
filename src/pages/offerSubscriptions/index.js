import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

// Payment methods shown in both the first-payment form and payment editor.
const PAYMENT_METHODS = ["Cash", "Visa", "Bank Transfer", "Instapay", "Vodafone Cash"];

// Shared starting values used when a payment form is opened or cleared.
const EMPTY_PAYMENT = { AmountPaid: "", PaymentMethod: "Cash", Notes: "" };

// Format amounts consistently as Egyptian pounds with two decimal places.
const money = (value) => Number(value || 0).toLocaleString("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Show dates without the time portion; return a dash for missing/invalid dates.
const dateOnly = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
};

const OfferSubscriptionsPage = () => {

  // Current language controls translated labels and right-to-left layout.
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  // Patient search results and the patient currently being managed.
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState([]);
  const [patientSearchDone, setPatientSearchDone] = useState(false);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  // Active offers available for new subscriptions.
  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(true);

  // Subscription creation form and the selected patient's subscriptions.
  const [subscriptions, setSubscriptions] = useState([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [offerID, setOfferID] = useState("");
  const [subscriptionNotes, setSubscriptionNotes] = useState("");
  const [initialPaymentAmount, setInitialPaymentAmount] = useState("");
  const [initialPaymentMethod, setInitialPaymentMethod] = useState("Cash");
  const [creatingSubscription, setCreatingSubscription] = useState(false);
  const [activeSubscription, setActiveSubscription] = useState(null);

  // Payment modal state: history, add form, selected edit row, and loading flags.
  const [payments, setPayments] = useState([]);
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT);
  const [editingPaymentID, setEditingPaymentID] = useState(null);
  const [editPaymentForm, setEditPaymentForm] = useState(EMPTY_PAYMENT);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  // Subscription edit form state.
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [editOfferID, setEditOfferID] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingSubscriptionID, setDeletingSubscriptionID] = useState(null);

  // Page-level status messages shown after requests succeed or fail.
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load active offers once when the page first opens.
  useEffect(() => {
    const loadOffers = async () => {
      try {
        setOffersLoading(true);
        const response = await fetch("/api/offers?activeOnly=true");
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to load offers.");
        setOffers(Array.isArray(data) ? data : []);
      } catch (loadError) {
        setError(loadError.message || "Failed to load offers.");
      } finally {
        setOffersLoading(false);
      }
    };
    loadOffers();
  }, []);

  // Fetch all subscriptions belonging to the selected patient.
  const loadSubscriptions = async (patientID) => {
    if (!patientID) {
      setSubscriptions([]);
      return;
    }
    try {
      setSubscriptionsLoading(true);
      setError("");
      const response = await fetch(`/api/offerSubscriptions?patientID=${patientID}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to load subscriptions.");
      setSubscriptions(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load subscriptions.");
      setSubscriptions([]);
    } finally {
      setSubscriptionsLoading(false);
    }
  };

  // Search patients by the criteria accepted by the patients API.
  const handlePatientSearch = async (event) => {
    event.preventDefault();
    const searchValue = search.trim();
    if (!searchValue) {
      setPatients([]);
      setPatientSearchDone(false);
      return;
    }
    try {
      setSearchingPatients(true);
      setError("");
      setSuccess("");
      const response = await fetch(`/api/patients?search=${encodeURIComponent(searchValue)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to search patients.");
      setPatients(Array.isArray(data) ? data : []);
      setPatientSearchDone(true);
    } catch (searchError) {
      setError(searchError.message || "Failed to search patients.");
    } finally {
      setSearchingPatients(false);
    }
  };

  // Select a patient, clear the new-subscription form, and load their records.
  const handleSelectPatient = async (patient) => {
    setSelectedPatient(patient);
    setSuccess("");
    setError("");
    setActiveSubscription(null);
    setOfferID("");
    setSubscriptionNotes("");
    setInitialPaymentAmount("");
    setInitialPaymentMethod("Cash");
    await loadSubscriptions(patient.PatientID);
  };

  // Create a subscription and, when entered, record its first payment separately.
  const handleCreateSubscription = async (event) => {
    event.preventDefault();
    if (!selectedPatient || !offerID) return;
    if (hasActiveSubscriptionForOffer(offerID)) {
      setError(isRTL ? "لدى هذا المريض اشتراك نشط بالفعل في هذا العرض." : "This patient already has an active subscription for this offer.");
      return;
    }
    const initialAmount = initialPaymentAmount.trim() === "" ? 0 : Number(initialPaymentAmount);
    if (!Number.isFinite(initialAmount) || initialAmount < 0) {
      setError(isRTL ? "أدخل مبلغ دفعة أولى صالحاً." : "Enter a valid initial payment amount.");
      return;
    }
    if (selectedOffer && initialAmount > Number(selectedOffer.ForPrice)) {
      setError(isRTL ? "الدفعة الأولى لا يمكن أن تتجاوز سعر العرض." : "The initial payment cannot exceed the offer price.");
      return;
    }
    try {
      setCreatingSubscription(true);
      setError("");
      setSuccess("");
      const response = await fetch("/api/offerSubscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          PatientID: Number(selectedPatient.PatientID),
          OfferID: Number(offerID),
          Notes: subscriptionNotes.trim() || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to create subscription.");

      setOfferID("");
      setSubscriptionNotes("");
      setInitialPaymentAmount("");
      setInitialPaymentMethod("Cash");

      // Subscription creation succeeds independently of the optional first payment.
      let initialPaymentError = "";
      if (initialAmount > 0) {
        try {
          const storedUserInfo = localStorage.getItem("userInfo");
          const userInfo = storedUserInfo ? JSON.parse(storedUserInfo) : null;
          const paymentResponse = await fetch(`/api/offerSubscriptions/${data.OfferSubscriptionID}/payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              AmountPaid: initialAmount,
              PaymentMethod: initialPaymentMethod,
              UserID: userInfo?.UserID ? Number(userInfo.UserID) : null,
            }),
          });
          const paymentData = await paymentResponse.json();
          if (!paymentResponse.ok) throw new Error(paymentData.message || "Payment could not be recorded.");
          setSuccess(isRTL ? "تم تسجيل الاشتراك والدفعة الأولى بنجاح." : "Subscription and initial payment recorded successfully.");
        } catch (paymentError) {
          setSuccess(isRTL ? "تم تسجيل الاشتراك، لكن لم يتم تسجيل الدفعة الأولى." : "Subscription created, but the initial payment was not recorded.");
          initialPaymentError = paymentError.message || "Record the payment from the subscription list.";
        }
      } else {
        setSuccess(isRTL ? "تم تسجيل اشتراك المريض بنجاح." : "Patient subscribed successfully.");
      }
      await loadSubscriptions(selectedPatient.PatientID);
      if (initialPaymentError) setError(initialPaymentError);
    } catch (createError) {
      setError(createError.message || "Failed to create subscription.");
    } finally {
      setCreatingSubscription(false);
    }
  };

  // Open the subscription editor only when the subscription has no usage history.
  const openEditSubscription = (subscription) => {
    if (Number(subscription.UsageCount || 0) > 0) {
      setError(isRTL ? "لا يمكن تعديل اشتراك تم استخدامه." : "A subscription cannot be edited after it has been used.");
      return;
    }
    setError("");
    setSuccess("");
    setEditingSubscription(subscription);
    setEditOfferID(String(subscription.OfferID));
    setEditNotes(subscription.Notes || "");
  };

  // Close the editor and clear its temporary form values.
  const closeEditSubscription = () => {
    if (savingEdit) return;
    setEditingSubscription(null);
    setEditOfferID("");
    setEditNotes("");
  };

  // Save the selected offer and notes, then refresh that row in the table.
  const handleEditSubscription = async (event) => {
    event.preventDefault();
    if (!editingSubscription) return;
    try {
      setSavingEdit(true);
      setError("");
      const response = await fetch(`/api/offerSubscriptions/${editingSubscription.OfferSubscriptionID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ OfferID: Number(editOfferID), Notes: editNotes.trim() || null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to update subscription.");
      setSubscriptions((current) => current.map((item) => item.OfferSubscriptionID === data.OfferSubscriptionID ? { ...item, ...data } : item));
      setEditingSubscription(null);
      setEditOfferID("");
      setEditNotes("");
      setSuccess(isRTL ? "تم تحديث الاشتراك." : "Subscription updated.");
    } catch (editError) {
      setError(editError.message || "Failed to update subscription.");
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete only subscriptions without usage or payment history.
  const handleDeleteSubscription = async (subscription) => {
    if (Number(subscription.UsageCount || 0) > 0) {
      setError(isRTL ? "لا يمكن حذف اشتراك تم استخدامه." : "A subscription cannot be deleted after it has been used.");
      return;
    }
    if (Number(subscription.TotalPaid || 0) > 0) {
      setError(isRTL ? "لا يمكن حذف اشتراك لديه سجل مدفوعات." : "A subscription with payment history cannot be deleted.");
      return;
    }
    const confirmed = window.confirm(isRTL ? "هل تريد حذف هذا الاشتراك؟" : `Delete the subscription for ${subscription.OfferName}?`);
    if (!confirmed) return;
    try {
      setDeletingSubscriptionID(subscription.OfferSubscriptionID);
      setError("");
      setSuccess("");
      const response = await fetch(`/api/offerSubscriptions/${subscription.OfferSubscriptionID}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to delete subscription.");
      setSubscriptions((current) => current.filter((item) => item.OfferSubscriptionID !== subscription.OfferSubscriptionID));
      setSuccess(isRTL ? "تم حذف الاشتراك." : "Subscription deleted.");
    } catch (deleteError) {
      setError(deleteError.message || "Failed to delete subscription.");
    } finally {
      setDeletingSubscriptionID(null);
    }
  };

  // Load the payment history for this specific patient subscription.
  const openPayment = async (subscription) => {
    setActiveSubscription(subscription);
    setPaymentForm({ ...EMPTY_PAYMENT });
    setEditingPaymentID(null);
    setEditPaymentForm({ ...EMPTY_PAYMENT });
    setPayments([]);
    setError("");
    setSuccess("");
    try {
      setLoadingPayments(true);
      const response = await fetch(`/api/offerSubscriptions/${subscription.OfferSubscriptionID}/payment`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to load payment history.");
      setPayments(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load payment history.");
    } finally {
      setLoadingPayments(false);
    }
  };

  // Close the payment modal and clear its history and new-payment form.
  const closePayment = () => {
    if (savingPayment) return;
    setActiveSubscription(null);
    setPaymentForm({ ...EMPTY_PAYMENT });
    setPayments([]);
  };

  // Keep the add-payment form synchronized with the user's input.
  const handlePaymentChange = (event) => {
    const { name, value } = event.target;
    setPaymentForm((current) => ({ ...current, [name]: value }));
  };

  // Validate and record a partial payment against the selected subscription balance.
  const handleRegisterPayment = async (event) => {
    event.preventDefault();
    if (!activeSubscription) return;
    const amount = Number(paymentForm.AmountPaid);
    const alreadyPaid = activeSubscription.TotalPaid === undefined
      ? payments.reduce((total, payment) => total + Number(payment.AmountPaid || 0), 0)
      : Number(activeSubscription.TotalPaid);
    const remaining = Math.max(0, Number(activeSubscription.ForPrice) - alreadyPaid);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError(isRTL ? "أدخل مبلغاً أكبر من صفر." : "Enter an amount greater than zero.");
      return;
    }
    if (amount > remaining) {
      setError(isRTL ? `المبلغ يتجاوز المتبقي ${money(remaining)} جنيه.` : `Amount cannot exceed the remaining balance of ${money(remaining)} EGP.`);
      return;
    }

    try {
      setSavingPayment(true);
      setError("");
      const storedUserInfo = localStorage.getItem("userInfo");
      const userInfo = storedUserInfo ? JSON.parse(storedUserInfo) : null;
      const response = await fetch(`/api/offerSubscriptions/${activeSubscription.OfferSubscriptionID}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          AmountPaid: amount,
          PaymentMethod: paymentForm.PaymentMethod,
          UserID: userInfo?.UserID ? Number(userInfo.UserID) : null,
          Notes: paymentForm.Notes.trim() || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to register payment.");

      setPayments(Array.isArray(data.payment) ? data.payment : payments);
      setActiveSubscription((current) => current ? {
        ...current,
        TotalPaid: Number(data.totalPaid || 0),
        RemainingToPay: Number(data.remainingToPay || 0),
      } : current);
      setSubscriptions((current) => current.map((item) => item.OfferSubscriptionID === activeSubscription.OfferSubscriptionID
        ? { ...item, TotalPaid: Number(data.totalPaid || 0), RemainingToPay: Number(data.remainingToPay || 0) }
        : item));
      setPaymentForm({ ...EMPTY_PAYMENT });
      setSuccess(isRTL ? "تم تسجيل الدفعة بنجاح." : "Payment registered successfully.");
    } catch (paymentError) {
      setError(paymentError.message || "Failed to register payment.");
    } finally {
      setSavingPayment(false);
    }
  };

  // Prevent the patient from having two active subscriptions to the same offer.
  const hasActiveSubscriptionForOffer = (selectedOfferID, excludedSubscriptionID = null) =>
    subscriptions.some((subscription) => subscription.Status === "Active"
      && String(subscription.OfferID) === String(selectedOfferID)
      && String(subscription.OfferSubscriptionID) !== String(excludedSubscriptionID));

  // Copy the selected payment into the inline editor.
  const beginEditPayment = (payment) => {
    setEditingPaymentID(payment.OfferSubscriptionPaymentID);
    setEditPaymentForm({
      AmountPaid: String(payment.AmountPaid ?? ""),
      PaymentMethod: payment.PaymentMethod || "Cash",
      Notes: payment.Notes || "",
    });
    setError("");
  };

  // Stop editing without sending a request and reset the editor fields.
  const cancelEditPayment = () => {
    setEditingPaymentID(null);
    setEditPaymentForm({ ...EMPTY_PAYMENT });
  };

  // Keep the modal and subscription table totals in sync after edits or deletion.
  const applyPaymentChanges = (data) => {
    setPayments(Array.isArray(data.payments) ? data.payments : []);
    setActiveSubscription((current) => current ? {
      ...current,
      TotalPaid: Number(data.totalPaid || 0),
      RemainingToPay: Number(data.remainingToPay || 0),
    } : current);
    setSubscriptions((current) => current.map((item) => item.OfferSubscriptionID === activeSubscription?.OfferSubscriptionID
      ? { ...item, TotalPaid: Number(data.totalPaid || 0), RemainingToPay: Number(data.remainingToPay || 0) }
      : item));
  };

  // Save changes to one payment, then update the history and totals.
  const handleUpdatePayment = async (event) => {
    event.preventDefault();
    if (!activeSubscription || !editingPaymentID) return;
    try {
      setSavingPayment(true);
      setError("");
      const response = await fetch(
        `/api/offerSubscriptions/${activeSubscription.OfferSubscriptionID}/payment`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            OfferSubscriptionPaymentID: Number(editingPaymentID),
            ...editPaymentForm,
            AmountPaid: Number(editPaymentForm.AmountPaid),
            Notes: editPaymentForm.Notes.trim() || null,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to update payment.");
      applyPaymentChanges(data);
      cancelEditPayment();
      setSuccess(isRTL ? "تم تحديث الدفعة." : "Payment updated.");
    } catch (updateError) {
      setError(updateError.message || "Failed to update payment.");
    } finally {
      setSavingPayment(false);
    }
  };

  // The API performs the same usage check, so this guard is only the UI safeguard.
  const handleDeletePayment = async (payment) => {
    if (Number(activeSubscription?.UsageCount || 0) > 0) {
      setError(isRTL ? "لا يمكن تعديل المدفوعات بعد استخدام الاشتراك." : "Payments cannot be changed after the subscription has been used.");
      return;
    }
    const confirmed = window.confirm(isRTL ? "هل تريد حذف هذه الدفعة؟" : `Delete the payment of ${money(payment.AmountPaid)} EGP?`);
    if (!confirmed) return;
    try {
      setSavingPayment(true);
      setError("");
      const response = await fetch(`/api/offerSubscriptions/${activeSubscription.OfferSubscriptionID}/payment`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ OfferSubscriptionPaymentID: Number(payment.OfferSubscriptionPaymentID) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to delete payment.");
      applyPaymentChanges(data);
      if (editingPaymentID === payment.OfferSubscriptionPaymentID) cancelEditPayment();
      setSuccess(isRTL ? "تم حذف الدفعة." : "Payment deleted.");
    } catch (deleteError) {
      setError(deleteError.message || "Failed to delete payment.");
    } finally {
      setSavingPayment(false);
    }
  };

  // Derive the selected offer and current payment balance for the modal.
  const selectedOffer = offers.find((offer) => String(offer.OfferID) === String(offerID));

  const activePaymentTotal = payments.reduce((total, payment) => total + Number(payment.AmountPaid || 0), 0);

  const activeRemaining = activeSubscription
    ? Math.max(0, Number(activeSubscription.ForPrice || 0) - (activeSubscription.TotalPaid === undefined ? activePaymentTotal : Number(activeSubscription.TotalPaid)))
    : 0;

  return (
    <main className="offer-subscriptions-page" dir={isRTL ? "rtl" : "ltr"}>
      {/* Page title and overall success/error messages. */}
      <header className="offer-subscriptions-header">
        <div>
          <h1>{isRTL ? "اشتراكات العروض" : "Offer Subscriptions"}</h1>
          <p>{isRTL ? "تسجيل اشتراك المريض ومتابعة المدفوعات" : "Subscribe patients to offers and record payments"}</p>
        </div>
      </header>

      {error && !activeSubscription && <div className="offer-subscriptions-alert error" role="alert">{error}</div>}
      {success && <div className="offer-subscriptions-alert success" role="status">{success}</div>}

      {/* Search for the patient whose subscriptions should be managed. */}
      <section className="offer-subscriptions-panel">
        <div className="offer-subscriptions-panel-heading">
          <h2>{isRTL ? "اختيار المريض" : "Find a Patient"}</h2>
        </div>
        <form className="offer-subscriptions-search" onSubmit={handlePatientSearch}>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={isRTL ? "ابحث بالاسم أو رقم الهاتف أو رقم الملف..." : "Search by patient name, phone, or file number..."}
            aria-label={isRTL ? "البحث عن مريض" : "Search patients"}
          />
          <button type="submit" disabled={searchingPatients}>
            {searchingPatients ? (isRTL ? "جارٍ البحث..." : "Searching...") : (isRTL ? "بحث" : "Search")}
          </button>
        </form>

        {searchingPatients ? (
          <div className="offer-subscriptions-message">{isRTL ? "جارٍ البحث عن المرضى..." : "Searching patients..."}</div>
        ) : patientSearchDone && patients.length === 0 ? (
          <div className="offer-subscriptions-message">{isRTL ? "لم يتم العثور على مرضى." : "No patients found."}</div>
        ) : patients.length > 0 ? (
          <div className="offer-subscriptions-patient-results">
            {patients.map((patient) => (
              <button
                type="button"
                key={patient.PatientID}
                className={`offer-subscriptions-patient ${selectedPatient?.PatientID === patient.PatientID ? "selected" : ""}`}
                onClick={() => handleSelectPatient(patient)}
              >
                <strong>{patient.FullName || "-"}</strong>
                <span>{isRTL ? "رقم الملف" : "File No."}: {patient.FileNo || "-"}</span>
                <span>{patient.Phone || "-"}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="offer-subscriptions-message">{isRTL ? "ابحث عن مريض لعرض اشتراكاته." : "Search for and select a patient to view their subscriptions."}</div>
        )}
      </section>

      {selectedPatient && (
        <>
          {/* Create a subscription and optionally record its first installment. */}
          <section className="offer-subscriptions-panel">
            <div className="offer-subscriptions-panel-heading">
              <div>
                <h2>{isRTL ? "اشتراك جديد" : "Create Subscription"}</h2>
                <p>{selectedPatient.FullName} · {isRTL ? "رقم الملف" : "File No."} {selectedPatient.FileNo || "-"}</p>
              </div>
            </div>
            <form className="offer-subscriptions-form" onSubmit={handleCreateSubscription}>
              <div className="offer-subscriptions-field">
                <label htmlFor="subscription-offer">{isRTL ? "العرض *" : "Offer *"}</label>
                <select id="subscription-offer" value={offerID} onChange={(event) => setOfferID(event.target.value)} required disabled={offersLoading || offers.length === 0}>
                  <option value="">{offersLoading ? (isRTL ? "جارٍ تحميل العروض..." : "Loading offers...") : (isRTL ? "اختر عرضاً" : "Select an offer")}</option>
                  {offers.map((offer) => {
                    const alreadySubscribed = hasActiveSubscriptionForOffer(offer.OfferID);
                    return (
                      <option key={offer.OfferID} value={offer.OfferID} disabled={alreadySubscribed}>
                        {offer.OfferName} · {offer.CategoryName || (isRTL ? "بدون فئة" : "Uncategorized")} · {Number(offer.GivenQuantity).toLocaleString()} · {money(offer.ForPrice)} EGP{alreadySubscribed ? (isRTL ? " — مشترك به بالفعل" : " — Already subscribed") : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="offer-subscriptions-field">
                <label htmlFor="initial-payment-amount">{isRTL ? "الدفعة الأولى (اختياري)" : "Initial Payment (Optional)"}</label>
                <input id="initial-payment-amount" type="number" min="0" step="0.01" max={selectedOffer?.ForPrice} value={initialPaymentAmount} onChange={(event) => setInitialPaymentAmount(event.target.value)} disabled={!selectedOffer} placeholder="0.00" />
              </div>
              <div className="offer-subscriptions-field">
                <label htmlFor="initial-payment-method">{isRTL ? "طريقة الدفع" : "Payment Method"}</label>
                <select id="initial-payment-method" value={initialPaymentMethod} onChange={(event) => setInitialPaymentMethod(event.target.value)} disabled={!selectedOffer || Number(initialPaymentAmount || 0) <= 0}>
                  {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
                </select>
              </div>
              <p className="offer-subscriptions-payment-hint">{isRTL ? "يمكن تسجيل دفعة جزئية أو ترك الحقل فارغاً للدفع لاحقاً." : "Enter a partial payment or leave blank to collect payment later."}</p>

              {selectedOffer && (
                <div className="offer-subscriptions-offer-summary">
                  <span>{isRTL ? "الكمية" : "Quantity"}: <strong>{Number(selectedOffer.GivenQuantity).toLocaleString()}</strong></span>
                  <span>{isRTL ? "سعر العرض" : "Offer price"}: <strong>{money(selectedOffer.ForPrice)} EGP</strong></span>
                  <span>{isRTL ? "سعر الوحدة" : "Unit price"}: <strong>{money(selectedOffer.ForUnitPrice)} EGP</strong></span>
                </div>
              )}
              <div className="offer-subscriptions-field">
                <label htmlFor="subscription-notes">{isRTL ? "ملاحظات" : "Notes"}</label>
                <textarea id="subscription-notes" value={subscriptionNotes} onChange={(event) => setSubscriptionNotes(event.target.value)} rows={2} maxLength={500} />
              </div>
              <div className="offer-subscriptions-actions">
                <button type="submit" disabled={creatingSubscription || offersLoading || !offerID || hasActiveSubscriptionForOffer(offerID)}>
                  {creatingSubscription ? (isRTL ? "جارٍ التسجيل..." : "Creating...") : (isRTL ? "تسجيل الاشتراك" : "Subscribe Patient")}
                </button>
              </div>
            </form>
          </section>

          {/* Show the selected patient's subscription balances and actions. */}
          <section className="offer-subscriptions-panel">
            <div className="offer-subscriptions-panel-heading">
              <div>
                <h2>{isRTL ? "اشتراكات المريض" : "Patient Subscriptions"}</h2>
                <p>{selectedPatient.FullName}</p>
              </div>
              <span className="offer-subscriptions-count">{subscriptions.length}</span>
            </div>
            {subscriptionsLoading ? (
              <div className="offer-subscriptions-message">{isRTL ? "جارٍ تحميل الاشتراكات..." : "Loading subscriptions..."}</div>
            ) : subscriptions.length === 0 ? (
              <div className="offer-subscriptions-message">{isRTL ? "لا توجد اشتراكات لهذا المريض." : "This patient has no offer subscriptions yet."}</div>
            ) : (
              <div className="offer-subscriptions-table-wrap">
                <table className="offer-subscriptions-table">
                  <thead>
                    <tr>
                      <th>{isRTL ? "العرض" : "Offer"}</th>
                      <th>{isRTL ? "التصنيف" : "Category"}</th>
                      <th>{isRTL ? "تاريخ الاشتراك" : "Subscribed"}</th>
                      <th>{isRTL ? "الكمية" : "Quantity"}</th>
                      <th>{isRTL ? "المستهلك" : "Consumed"}</th>
                      <th>{isRTL ? "المتبقي" : "Remaining"}</th>
                      <th>{isRTL ? "السعر" : "Price"}</th>
                      <th>{isRTL ? "المدفوع" : "Paid"}</th>
                      <th>{isRTL ? "المتبقي للدفع" : "Due"}</th>
                      <th>{isRTL ? "الحالة" : "Status"}</th>
                      <th>{isRTL ? "إجراء" : "Action"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((subscription) => {
                      const totalPaid = Number(subscription.TotalPaid || 0);
                      const remainingToPay = Math.max(0, Number(subscription.ForPrice || 0) - totalPaid);
                      return (
                        <tr key={subscription.OfferSubscriptionID}>
                          <td className="offer-subscriptions-name">{subscription.OfferName}</td>
                          <td>{subscription.CategoryName || "-"}</td>
                          <td>{dateOnly(subscription.SubscriptionDate)}</td>
                          <td>{Number(subscription.GivenQuantity || 0).toLocaleString()}</td>
                          <td>{Number(subscription.ConsumedQuantity || 0).toLocaleString()}</td>
                          <td>{Number(subscription.RemainingQuantity || 0).toLocaleString()}</td>
                          <td>{money(subscription.ForPrice)} EGP</td>
                          <td>{money(totalPaid)} EGP</td>
                          <td>{money(remainingToPay)} EGP</td>
                          <td><span className={`offer-subscriptions-status ${String(subscription.Status).toLowerCase()}`}>{subscription.Status}</span></td>
                          <td>
                            <div className="offer-subscriptions-row-actions">
                              <button type="button" className="offer-subscriptions-edit-button" onClick={() => openEditSubscription(subscription)} disabled={Number(subscription.UsageCount || 0) > 0} title={Number(subscription.UsageCount || 0) > 0 ? (isRTL ? "لا يمكن التعديل بعد الاستخدام" : "Cannot edit after usage") : ""}>
                                {isRTL ? "تعديل" : "Edit"}
                              </button>
                              <button type="button" className="offer-subscriptions-delete-button" onClick={() => handleDeleteSubscription(subscription)} disabled={Number(subscription.UsageCount || 0) > 0 || totalPaid > 0 || deletingSubscriptionID === subscription.OfferSubscriptionID} title={Number(subscription.UsageCount || 0) > 0 ? (isRTL ? "لا يمكن الحذف بعد الاستخدام" : "Cannot delete after usage") : totalPaid > 0 ? (isRTL ? "يوجد سجل مدفوعات" : "Payment history exists") : ""}>
                                {deletingSubscriptionID === subscription.OfferSubscriptionID ? (isRTL ? "جارٍ الحذف..." : "Deleting...") : (isRTL ? "حذف" : "Delete")}
                              </button>
                              <button
                                type="button"
                                className="offer-subscriptions-payment-button"
                                onClick={() => openPayment({ ...subscription, TotalPaid: totalPaid, RemainingToPay: remainingToPay })}
                                disabled={subscription.Status === "Cancelled"}
                              >
                                {remainingToPay > 0
                                  ? (isRTL ? "المدفوعات / تسجيل دفعة" : "Payments / Add Payment")
                                  : (isRTL ? "المدفوعات" : "Payments")}
                              </button>
                              {Number(subscription.UsageCount || 0) > 0 && <span className="offer-subscriptions-action-hint">{isRTL ? "مستخدم" : "Used"}</span>}
                              {Number(subscription.UsageCount || 0) === 0 && totalPaid > 0 && <span className="offer-subscriptions-action-hint">{isRTL ? "مدفوع" : "Paid"}</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* Edit subscription offer/notes in a separate dialog. */}
      {editingSubscription && (
        <div className="offer-subscriptions-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closeEditSubscription(); }}>
          <section className="offer-subscriptions-modal" role="dialog" aria-modal="true" aria-labelledby="edit-subscription-title">
            <header className="offer-subscriptions-modal-header">
              <div>
                <h2 id="edit-subscription-title">{isRTL ? "تعديل الاشتراك" : "Edit Subscription"}</h2>
                <p>{selectedPatient?.FullName} · {editingSubscription.OfferName}</p>
              </div>
              <button type="button" onClick={closeEditSubscription} disabled={savingEdit} aria-label={isRTL ? "إغلاق" : "Close"}>×</button>
            </header>
            {Number(editingSubscription.TotalPaid || 0) > 0 && <div className="offer-subscriptions-edit-note">{isRTL ? "لا يمكن تغيير العرض بعد تسجيل دفعة؛ يمكنك تعديل الملاحظات فقط." : "The offer cannot be changed after a payment is recorded. You can still edit the notes."}</div>}
            <form className="offer-subscriptions-payment-form" onSubmit={handleEditSubscription}>
              <div className="offer-subscriptions-field offer-subscriptions-field-wide">
                <label htmlFor="edit-subscription-offer">{isRTL ? "العرض" : "Offer"}</label>
                <select id="edit-subscription-offer" value={editOfferID} onChange={(event) => setEditOfferID(event.target.value)} disabled={Number(editingSubscription.TotalPaid || 0) > 0} required>
                  {offers.map((offer) => <option key={offer.OfferID} value={offer.OfferID} disabled={hasActiveSubscriptionForOffer(offer.OfferID, editingSubscription.OfferSubscriptionID)}>{offer.OfferName} · {offer.CategoryName || "-"} · {money(offer.ForPrice)} EGP{hasActiveSubscriptionForOffer(offer.OfferID, editingSubscription.OfferSubscriptionID) ? (isRTL ? " — اشتراك نشط آخر" : " — Another active subscription") : ""}</option>)}
                  {!offers.some((offer) => String(offer.OfferID) === String(editOfferID)) && <option value={editOfferID}>{editingSubscription.OfferName} · {isRTL ? "العرض الحالي" : "Current offer"}</option>}
                </select>
              </div>
              <div className="offer-subscriptions-field offer-subscriptions-field-wide">
                <label htmlFor="edit-subscription-notes">{isRTL ? "ملاحظات" : "Notes"}</label>
                <textarea id="edit-subscription-notes" value={editNotes} onChange={(event) => setEditNotes(event.target.value)} rows={3} maxLength={500} />
              </div>
              <footer className="offer-subscriptions-actions offer-subscriptions-field-wide">
                <button type="button" className="offer-subscriptions-cancel-button" onClick={closeEditSubscription} disabled={savingEdit}>{isRTL ? "إلغاء" : "Cancel"}</button>
                <button type="submit" disabled={savingEdit}>{savingEdit ? (isRTL ? "جارٍ الحفظ..." : "Saving...") : (isRTL ? "حفظ التغييرات" : "Save Changes")}</button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {/* Payment history and payment actions for the selected subscription only. */}
      {activeSubscription && (
        <div className="offer-subscriptions-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closePayment(); }}>
          <section className="offer-subscriptions-modal" role="dialog" aria-modal="true" aria-labelledby="subscription-payment-title">
            <header className="offer-subscriptions-modal-header">
              <div>
                <h2 id="subscription-payment-title">{isRTL ? "تسجيل دفعة" : "Register Payment"}</h2>
                <p>{activeSubscription.OfferName} · {selectedPatient?.FullName}</p>
              </div>
              <button type="button" onClick={closePayment} disabled={savingPayment} aria-label={isRTL ? "إغلاق" : "Close"}>×</button>
            </header>

            {/* Show the offer price, amount received, and remaining balance. */}
            <div className="offer-subscriptions-payment-summary">
              <span>{isRTL ? "سعر العرض" : "Offer price"}<strong>{money(activeSubscription.ForPrice)} EGP</strong></span>
              <span>{isRTL ? "المدفوع" : "Paid"}<strong>{money(Number(activeSubscription.ForPrice) - activeRemaining)} EGP</strong></span>
              <span>{isRTL ? "المتبقي" : "Balance due"}<strong>{money(activeRemaining)} EGP</strong></span>
            </div>
            {error && <div className="offer-subscriptions-alert error" role="alert">{error}</div>}

            {/* Payments shown here belong only to the selected subscription. */}
            <div className="offer-subscriptions-payment-history">
              <h3>{isRTL ? "سجل المدفوعات" : "Payment History"}</h3>

              {/* Usage locks existing payment edits/deletes; adding a payment can still be allowed. */}
              {Number(activeSubscription.UsageCount || 0) > 0 && (
                <p className="offer-subscriptions-usage-lock">
                  {isRTL
                    ? "تم استخدام هذا الاشتراك، لذلك لا يمكن تعديل الدفعات أو حذفها."
                    : "This subscription has usage, so its payments can no longer be edited or deleted."}
                </p>
              )}

              {/* Show the appropriate loading, empty, or payment-list state. */}
              {loadingPayments ? (
                <p>{isRTL ? "جارٍ تحميل المدفوعات..." : "Loading payments..."}</p>
              ) : payments.length === 0 ? (
                <p>{isRTL ? "لا توجد دفعات مسجلة." : "No payments recorded yet."}</p>
              ) : (
                <div className="offer-subscriptions-history-list">
{/* -------------*/}
                  {payments.map((payment) => (
                    <div className="offer-subscriptions-history-entry" key={payment.OfferSubscriptionPaymentID}>
                      
                      {/* Replace one history row with a form while that payment is being edited. */}
                      {editingPaymentID === payment.OfferSubscriptionPaymentID ? (
                        
                        <form className="offer-subscriptions-history-edit" onSubmit={handleUpdatePayment}>
                          
                          <div className="offer-subscriptions-field">
                            
                            <label htmlFor={`edit-payment-amount-${payment.OfferSubscriptionPaymentID}`}>
                              {isRTL ? "المبلغ" : "Amount"}
                            </label>

                            <input id={`edit-payment-amount-${payment.OfferSubscriptionPaymentID}`} type="number" 
                              min="0.01" step="0.01" value={editPaymentForm.AmountPaid} 
                              onChange=
                              {(event) => setEditPaymentForm((current) => ({ ...current, AmountPaid: event.target.value }))} 
                              required 
                            />

                          </div>
                          
                          <div className="offer-subscriptions-field">
                            <label htmlFor={`edit-payment-method-${payment.OfferSubscriptionPaymentID}`}>{isRTL ? "طريقة الدفع" : "Payment Method"}</label>
                            <select id={`edit-payment-method-${payment.OfferSubscriptionPaymentID}`} 
                              value={editPaymentForm.PaymentMethod} 
                              onChange={(event) => setEditPaymentForm((current) => 
                              ({ ...current, PaymentMethod: event.target.value }))}>
                              {PAYMENT_METHODS.map((method) => 
                                <option key={method} value={method}>
                                  {method}
                                </option>)}
                            </select>
                          </div>
                          
                          <div className="offer-subscriptions-field offer-subscriptions-field-wide">
                            
                            <label htmlFor={`edit-payment-notes-${payment.OfferSubscriptionPaymentID}`}>
                              {isRTL ? "ملاحظات" : "Notes"}
                            </label>
                            
                            <textarea   id={`edit-payment-notes-${payment.OfferSubscriptionPaymentID}`}
                              value={editPaymentForm.Notes}
                              onChange=
                              {(event) => setEditPaymentForm((current) => ({ ...current, Notes: event.target.value,}))}
                              rows={2}   maxLength={500}
                            />

                          </div>
                          
                          <div className="offer-subscriptions-history-edit-actions offer-subscriptions-field-wide">
                            
                            <button type="button" className="offer-subscriptions-cancel-button" 
                              onClick={cancelEditPayment} 
                              disabled={savingPayment}
                            >
                              {isRTL ? "إلغاء" : "Cancel"}
                            </button>
                            
                            <button type="submit" 
                              disabled={savingPayment}
                            >
                              {savingPayment ? (isRTL ? "جارٍ الحفظ..." : "Saving...") : (isRTL ? "حفظ" : "Save")}
                            </button>

                          </div>

                        </form>
                      ) : (
                        
                        <div className="offer-subscriptions-history-row">
                          <span>{dateOnly(payment.PaymentDate)}</span>
                          <span>{payment.PaymentMethod}</span>
                          <strong>{money(payment.AmountPaid)} EGP</strong>
                          
                          <div className="offer-subscriptions-history-actions">
                            
                            <button   type="button"  className="offer-subscriptions-edit-button"
                              onClick={() => beginEditPayment(payment)}
                              disabled={Number(activeSubscription.UsageCount || 0) > 0 || savingPayment}
                              title={Number(activeSubscription.UsageCount || 0) > 0
                                ? (isRTL ? "لا يمكن التعديل بعد الاستخدام" : "Cannot edit after usage")
                                : ""}
                            >
                              {isRTL ? "تعديل" : "Edit"}
                            </button>
                            
                            <button  type="button"   className="offer-subscriptions-delete-button"
                              onClick={() => handleDeletePayment(payment)}
                              disabled={Number(activeSubscription.UsageCount || 0) > 0 || savingPayment}
                              title={Number(activeSubscription.UsageCount || 0) > 0
                                ? (isRTL ? "لا يمكن الحذف بعد الاستخدام" : "Cannot delete after usage")
                                : ""}
                            >
                              {isRTL ? "حذف" : "Delete"}
                            </button>
                        
                          </div>

                        </div>

                      )
                  }
                    </div>
                  ))}

{/* -------------*/}
                </div>
              )}
              
            </div>

            {/* Only request another payment when the subscription still has a balance. */}
            {activeRemaining > 0 && (
              <form className="offer-subscriptions-payment-form" onSubmit={handleRegisterPayment}>
                <div className="offer-subscriptions-field">
                  <label htmlFor="payment-amount">{isRTL ? "المبلغ *" : "Amount *"}</label>
                  <input id="payment-amount" type="number" name="AmountPaid" min="0.01" max={activeRemaining} step="0.01" value={paymentForm.AmountPaid} onChange={handlePaymentChange} required />
                </div>
                <div className="offer-subscriptions-field">
                  <label htmlFor="payment-method">{isRTL ? "طريقة الدفع *" : "Payment Method *"}</label>
                  <select id="payment-method" name="PaymentMethod" value={paymentForm.PaymentMethod} onChange={handlePaymentChange} required>
                    {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
                  </select>
                </div>
                <div className="offer-subscriptions-field offer-subscriptions-field-wide">
                  <label htmlFor="payment-notes">{isRTL ? "ملاحظات" : "Notes"}</label>
                  <textarea id="payment-notes" name="Notes" value={paymentForm.Notes} onChange={handlePaymentChange} rows={2} maxLength={500} />
                </div>
                <footer className="offer-subscriptions-actions offer-subscriptions-field-wide">
                  <button type="submit" disabled={savingPayment || loadingPayments}>
                    {savingPayment ? (isRTL ? "جارٍ التسجيل..." : "Recording...") : (isRTL ? "حفظ الدفعة" : "Save Payment")}
                  </button>
                </footer>
              </form>
            )}
          </section>
        </div>
      )}
    </main>
  );
};

export default OfferSubscriptionsPage;
