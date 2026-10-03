import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";

const getTodayDate = () => {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getMonthStart = () => {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}-01`;
};

const EMPTY_TOTALS = {
  TotalDue: 0,
  TotalPaid: 0,
  Remaining: 0,
};

const Revenue = () => {
  const [fromDate, setFromDate] = useState(getMonthStart());
  const [toDate, setToDate] = useState(getTodayDate());
  const [sessionTotals, setSessionTotals] = useState(EMPTY_TOTALS);
  const [offerTotals, setOfferTotals] = useState(EMPTY_TOTALS);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  // Fetch only aggregate totals for the selected date range.
  const loadRevenue = async () => {
    if (!fromDate) {
      toast.error(isRTL ? "يرجى اختيار تاريخ البداية" : "Please select the start date");
      return;
    }

    if (!toDate) {
      toast.error(isRTL ? "يرجى اختيار تاريخ النهاية" : "Please select the end date");
      return;
    }

    if (fromDate > toDate) {
      toast.error(isRTL ? "تاريخ البداية لا يمكن أن يتجاوز تاريخ النهاية" : "From date cannot be after To date");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `/api/revenue?fromDate=${fromDate}&toDate=${toDate}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load revenue");
      }

      setSessionTotals(data.sessions || EMPTY_TOTALS);
      setOfferTotals(data.offers || EMPTY_TOTALS);
      setSearched(true);
    } catch (error) {
      console.error("Load revenue error:", error);
      toast.error(error.message || "Failed to load revenue");
      setSessionTotals(EMPTY_TOTALS);
      setOfferTotals(EMPTY_TOTALS);
    } finally {
      setLoading(false);
    }
  };

  // Load the current month's totals when the page first opens.
  useEffect(() => {
    loadRevenue();
  }, []);

  const formatMoney = (value) => Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const renderTotals = (totals) => (
    <div className="revenue-summary">
      <div className="revenue-summary-card">
        <span>{isRTL ? "إجمالي المستحق" : "Total Due"}</span>
        <strong>{formatMoney(totals.TotalDue)}</strong>
      </div>

      <div className="revenue-summary-card">
        <span>{isRTL ? "إجمالي المدفوع" : "Total Paid"}</span>
        <strong>{formatMoney(totals.TotalPaid)}</strong>
      </div>

      <div className="revenue-summary-card">
        <span>{isRTL ? "إجمالي المتبقي" : "Total Remaining"}</span>
        <strong>{formatMoney(totals.Remaining)}</strong>
      </div>
    </div>
  );

  return (
    <div className="revenue-page">
      <div className="revenue-header">
        <h1>{isRTL ? "تقرير الإيرادات" : "Revenue Report"}</h1>
      </div>

      {/* The same period is used for session dates and offer subscription dates. */}
      <div className="revenue-filter-card">
        <div className="revenue-filter">
          <div className="revenue-field">
            <label>{isRTL ? "من التاريخ" : "From Date"}</label>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </div>

          <div className="revenue-field">
            <label>{isRTL ? "إلى التاريخ" : "To Date"}</label>
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </div>

          <div className="revenue-search-container">
            <button
              type="button"
              className="revenue-search-button"
              onClick={loadRevenue}
              disabled={loading}
            >
              {loading
                ? (isRTL ? "جارٍ التحميل..." : "Loading...")
                : (isRTL ? "بحث" : "Search")}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="revenue-loading">
          {isRTL ? "جارٍ التحميل..." : "Loading revenue..."}
        </div>
      ) : searched ? (
        <>
          {/* Session totals include all service line totals and session payments. */}
          <section className="revenue-section">
            <h2>{isRTL ? "إيرادات خدمات الجلسات" : "Session Services Revenue"}</h2>
            {renderTotals(sessionTotals)}
          </section>

          {/* Offer totals use subscription prices and payments attached to those subscriptions. */}
          <section className="revenue-section">
            <h2>{isRTL ? "إيرادات اشتراكات العروض" : "Offer Subscription Revenue"}</h2>
            {renderTotals(offerTotals)}
          </section>
        </>
      ) : null}
    </div>
  );
};

export default Revenue;
