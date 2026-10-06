import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";

// Format a SQL date or ISO timestamp as a local date without shifting the day.
const formatDate = (value) => {
  if (!value) return "—";
  const datePart = String(value).slice(0, 10);
  const [year, month, day] = datePart.split("-");
  return year && month && day ? `${day}/${month}/${year}` : datePart;
};

// Keep quantity and currency columns consistent across the report.
const formatNumber = (value, decimals = 2) => Number(value || 0).toLocaleString("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: decimals,
});

const OfferSubscriptionReport = () => {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  
  const [patientSearch, setPatientSearch] = useState("");
  const [patients, setPatients] = useState([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [subscriptions, setSubscriptions] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);

  // Search by any patient fields supported by the existing patients API.
  const searchPatients = async (event) => {
    event.preventDefault();
    const search = patientSearch.trim();
    if (!search) {
      setPatients([]);
      return;
    }

    try {
      setSearchingPatients(true);
      const response = await fetch(`/api/patients?search=${encodeURIComponent(search)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to search patients");
      // The patients endpoint returns the array directly, not { patients: [...] }.
      setPatients(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error.message || "Failed to search patients");
      setPatients([]);
    } finally {
      setSearchingPatients(false);
    }
  };

  // Select one search result and prepare the date-range report form.
  const selectPatient = (patient) => {
    setSelectedPatient(patient);
    setPatients([]);
    setPatientSearch("");
    setSubscriptions([]);
    setHasSearched(false);
  };

  // Allow changing the patient without keeping results from the prior search.
  const clearPatient = () => {
    setSelectedPatient(null);
    setSubscriptions([]);
    setPatients([]);
    setPatientSearch("");
    setHasSearched(false);
  };

  // Request subscriptions for the selected patient and inclusive date range.
  const searchReport = async (event) => {
    event.preventDefault();
    if (!selectedPatient) return toast.error(isRTL ? "يرجى اختيار مريض" : "Please select a patient");
    if (!fromDate || !toDate) return toast.error(isRTL ? "يرجى اختيار الفترة" : "Please select both dates");
    if (fromDate > toDate) return toast.error(isRTL ? "تاريخ البداية بعد تاريخ النهاية" : "From date cannot be after To date");

    try {
      setLoadingReport(true);
      const query = new URLSearchParams({
        patientID: String(selectedPatient.PatientID),
        fromDate,
        toDate,
      });
      const response = await fetch(`/api/offerSubscriptionReport?${query.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to load offer subscription report");
      setSubscriptions(Array.isArray(data.subscriptions) ? data.subscriptions : []);
      setHasSearched(true);
      if (!data.subscriptions?.length) toast(isRTL ? "لا توجد اشتراكات خلال هذه الفترة" : "No offer subscriptions found for this period");
    } catch (error) {
      toast.error(error.message || "Failed to load offer subscription report");
      setSubscriptions([]);
      setHasSearched(false);
    } finally {
      setLoadingReport(false);
    }
  };

  // Clear the result set while keeping the chosen patient for another period.
  const clearReport = () => {
    setSubscriptions([]);
    setFromDate("");
    setToDate("");
    setHasSearched(false);
  };

  const money = (value) => formatNumber(value, 2);
  const label = (english, arabic) => isRTL ? arabic : english;

  return (
    <main className="offer-subscription-report-page" dir={isRTL ? "rtl" : "ltr"}>
      <div className="offer-subscription-report-container">
        <header className="offer-subscription-report-header">
          <h1>{label("Offer Subscription Report", "تقرير اشتراكات العروض")}</h1>
          <p>{label("View a patient’s offer subscriptions, usage, and remaining balance for a selected period.", "عرض اشتراكات المريض واستهلاكها والمتبقي خلال فترة محددة.")}</p>
        </header>

        <section className="offer-subscription-report-section">
          <h2>{label("Find Patient", "بحث عن مريض")}</h2>
          {!selectedPatient ? (
            <>
              <form className="offer-report-patient-search" onSubmit={searchPatients}>
                <input
                  type="search"
                  value={patientSearch}
                  onChange={(event) => setPatientSearch(event.target.value)}
                  placeholder={label("Search by name, phone, file number, or national ID", "ابحث بالاسم أو الهاتف أو رقم الملف أو الرقم القومي")}
                  aria-label={label("Search patients", "بحث عن مريض")}
                />
                <button type="submit" disabled={searchingPatients}>
                  {searchingPatients ? label("Searching…", "جارٍ البحث…") : label("Search", "بحث")}
                </button>
              </form>

              {patients.length > 0 && (
                <div className="offer-report-patient-results">
                  {patients.map((patient) => (
                    <button className="offer-report-patient-result" type="button" key={patient.PatientID} onClick={() => selectPatient(patient)}>
                      <strong>{patient.FullName}</strong>
                      <span>{label("File No.", "رقم الملف")}: {patient.FileNo || "—"}</span>
                      <span>{label("Phone", "الهاتف")}: {patient.Phone || "—"}</span>
                      <span>{label("National ID", "الرقم القومي")}: {patient.NationalID || "—"}</span>
                    </button>
                  ))}
                </div>
              )}
              {!searchingPatients && patientSearch.trim() && patients.length === 0 && (
                <div className="offer-report-empty">{label("No patients found. Search by another detail.", "لم يتم العثور على مريض. جرّب البحث ببيانات أخرى.")}</div>
              )}
            </>
          ) : (
            <div className="offer-report-selected-patient">
              <div>
                <strong>{selectedPatient.FullName}</strong>
                <span>{label("File No.", "رقم الملف")}: {selectedPatient.FileNo || "—"}</span>
                <span>{label("Phone", "الهاتف")}: {selectedPatient.Phone || "—"}</span>
                <span>{label("National ID", "الرقم القومي")}: {selectedPatient.NationalID || "—"}</span>
              </div>
              <button type="button" className="offer-report-secondary-button" onClick={clearPatient}>{label("Change patient", "تغيير المريض")}</button>
            </div>
          )}
        </section>

        {selectedPatient && (
          <>
            <section className="offer-subscription-report-section">
              <h2>{label("Report Period", "فترة التقرير")}</h2>
              <form className="offer-report-date-form" onSubmit={searchReport}>
                <label>
                  <span>{label("From date", "من تاريخ")}</span>
                  <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} required />
                </label>
                <label>
                  <span>{label("To date", "إلى تاريخ")}</span>
                  <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} required />
                </label>
                <button type="submit" disabled={loadingReport}>
                  {loadingReport ? label("Loading…", "جارٍ التحميل…") : label("View subscriptions", "عرض الاشتراكات")}
                </button>
                <button type="button" className="offer-report-secondary-button" onClick={clearReport} disabled={loadingReport}>{label("Clear", "مسح")}</button>
              </form>
            </section>

            <section className="offer-subscription-report-section offer-report-results">
              <div className="offer-report-results-heading">
                <div>
                  <h2>{label("Offer Subscriptions", "اشتراكات العروض")}</h2>
                  {hasSearched && <p>{formatDate(fromDate)} – {formatDate(toDate)}</p>}
                </div>
                {hasSearched && <span>{subscriptions.length} {label("subscriptions", "اشتراك")}</span>}
              </div>

              {loadingReport ? (
                <div className="offer-report-empty">{label("Loading subscriptions…", "جارٍ تحميل الاشتراكات…")}</div>
              ) : !hasSearched ? (
                <div className="offer-report-empty">{label("Choose a date range and view subscriptions.", "اختر الفترة ثم اعرض الاشتراكات.")}</div>
              ) : subscriptions.length === 0 ? (
                <div className="offer-report-empty">{label("No offer subscriptions found for this patient and period.", "لا توجد اشتراكات عروض لهذا المريض خلال الفترة المحددة.")}</div>
              ) : (
                <div className="offer-report-table-wrap">
                  <table className="offer-report-table">
                    <thead><tr>
                      <th>#</th><th>{label("Subscription date", "تاريخ الاشتراك")}</th><th>{label("Offer", "العرض")}</th>
                      <th>{label("Category", "الفئة")}</th><th>{label("Given", "الكمية الممنوحة")}</th>
                      <th>{label("Consumed", "المستهلك")}</th><th>{label("Remaining", "المتبقي")}</th>
                      <th>{label("Price", "السعر")}</th><th>{label("Paid", "المدفوع")}</th>
                      <th>{label("Remaining to pay", "المتبقي للدفع")}</th><th>{label("Status", "الحالة")}</th>
                    </tr></thead>
                    <tbody>{subscriptions.map((subscription, index) => (
                      <tr key={subscription.OfferSubscriptionID}>
                        <td>{index + 1}</td><td>{formatDate(subscription.SubscriptionDate)}</td>
                        <td><strong>{subscription.OfferName}</strong></td><td>{subscription.CategoryName || "—"}</td>
                        <td>{formatNumber(subscription.GivenQuantity)}</td><td>{formatNumber(subscription.ConsumedQuantity)}</td>
                        <td><strong>{formatNumber(subscription.RemainingQuantity)}</strong></td><td>{money(subscription.ForPrice)} EGP</td>
                        <td>{money(subscription.TotalPaid)} EGP</td><td>{money(subscription.RemainingToPay)} EGP</td>
                        <td><span className={`offer-report-status offer-report-status-${String(subscription.Status || "").toLowerCase()}`}>{subscription.Status || "—"}</span></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
};

export default OfferSubscriptionReport;
