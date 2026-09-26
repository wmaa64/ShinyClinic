import React, { useEffect, useMemo, useState } from "react";
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

const Revenue = () => {
  const [fromDate, setFromDate] = useState(getMonthStart());
  const [toDate, setToDate] = useState(getTodayDate());

  const [revenue, setRevenue] = useState([]);

  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const { i18n } = useTranslation();
  
  const isRTL = i18n.language === "ar" ;

  const loadRevenue = async () => {
    if (!fromDate) {
      toast.error("Please select the start date");
      return;
    }

    if (!toDate) {
      toast.error("Please select the end date");
      return;
    }

    if (fromDate > toDate) {
      toast.error("From date cannot be after To date");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`/api/revenue?fromDate=${fromDate}&toDate=${toDate}`   );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load revenue"
        );
      }

      setRevenue(Array.isArray(data) ? data : []);
      setSearched(true);

    } catch (error) {
      console.error("Load revenue error:", error);

      toast.error(
        error.message || "Failed to load revenue"
      );

      setRevenue([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRevenue();
  }, []);

  /*
   * Overall totals
   */
  const totals = useMemo(() => {
    return revenue.reduce( (total, row) => {
        total.servicesNet += Number(row.ServicesNet || 0);
        total.consumablesTotal += Number(row.ConsumablesTotal || 0  );
        total.totalPaid += Number(row.TotalPaid || 0);
        total.remaining += Number(row.Remaining || 0);

        return total;
      },
      {
        servicesNet: 0,
        consumablesTotal: 0,
        totalPaid: 0,
        remaining: 0,
      }
    );
  }, [revenue]);

  /*
   * Doctor summary
   */
  const doctorSummary = useMemo(() => {
    const grouped = {};

    revenue.forEach((row) => {
      const doctorName =  row.DoctorName || "Unknown Doctor";

      if (!grouped[doctorName]) {
        grouped[doctorName] = {
          DoctorName: doctorName,
          Sessions: 0,
          ServicesNet: 0,
          ConsumablesTotal: 0,
          TotalPaid: 0,
          Remaining: 0,
        };
      }

      grouped[doctorName].Sessions += 1;

      grouped[doctorName].ServicesNet += Number(
        row.ServicesNet || 0
      );

      grouped[doctorName].ConsumablesTotal += Number(
        row.ConsumablesTotal || 0
      );

      grouped[doctorName].TotalPaid += Number(
        row.TotalPaid || 0
      );

      grouped[doctorName].Remaining += Number(
        row.Remaining || 0
      );
    });

    return Object.values(grouped).sort((a, b) =>
      a.DoctorName.localeCompare(b.DoctorName)
    );
  }, [revenue]);

  const formatMoney = (value) => {
    return Number(value || 0).toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );
  };

  return (
    <div className="revenue-page">

      {/* =========================================
          HEADER
      ========================================= */}

      <div className="revenue-header">
        <h1>{isRTL ? "تقرير الإيرادات" : "Revenue Report"}</h1>
      </div>


      {/* =========================================
          FILTERS
      ========================================= */}

      <div className="revenue-filter-card">

        <div className="revenue-filter">

          <div className="revenue-field">
            <label>{isRTL ? "من التاريخ" : "From Date"}</label>

            <input
              type="date"
              value={fromDate}
              onChange={(e) =>
                setFromDate(e.target.value)
              }
            />
          </div>

          <div className="revenue-field">
            <label>{isRTL ? "إلى التاريخ" : "To Date"}</label>

            <input
              type="date"
              value={toDate}
              onChange={(e) =>
                setToDate(e.target.value)
              }
            />
          </div>

          <div className="revenue-search-container">
            <button
              type="button"
              className="revenue-search-button"
              onClick={loadRevenue}
              disabled={loading}
            >
              {loading ? (isRTL ? "جارٍ التحميل..." : "Loading...") : (isRTL ? "بحث" : "Search")}
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

          {/* =========================================
              OVERALL SUMMARY
          ========================================= */}

          <div className="revenue-summary">

            <div className="revenue-summary-card">
              <span>{isRTL ? "إيرادات الخدمات" : "Services Revenue"}</span>

              <strong>
                {formatMoney(totals.servicesNet)}
              </strong>
            </div>

            <div className="revenue-summary-card">
              <span>{isRTL ? "المواد الاستهلاكية" : "Consumables"}</span>

              <strong>
                {formatMoney(
                  totals.consumablesTotal
                )}
              </strong>
            </div>

            <div className="revenue-summary-card">
              <span>{isRTL ? "المدفوع إجماليًا" : "Total Paid"}</span>

              <strong>
                {formatMoney(totals.totalPaid)}
              </strong>
            </div>

            <div className="revenue-summary-card">
              <span>{isRTL ? "المتبقي" : "Remaining"}</span>

              <strong>
                {formatMoney(totals.remaining)}
              </strong>
            </div>

          </div>


          {/* =========================================
              DOCTOR SUMMARY
          ========================================= */}

          <div className="revenue-section">

            <h2>{isRTL ? " الإيرادات حسب الطبيب" : "Revenue by Doctor"}</h2>

            {doctorSummary.length === 0 ? (
              <div className="revenue-empty">
                {isRTL ? "لم يتم العثور على سجلات إيرادات لهذه الفترة." : "No revenue records found for this period."}
              </div>
            ) : (
              <div className="revenue-table-wrapper">

                <table className="revenue-table">

                  <thead>
                    <tr>
                      <th>{isRTL ? "الطبيب" : "Doctor"}</th>
                      <th>{isRTL ? "الجلسات" : "Sessions"}</th>
                      <th>{isRTL ? "إيرادات الخدمات" : "Services Revenue"}</th>
                      <th>{isRTL ? "المواد الاستهلاكية" : "Consumables"}</th>
                      <th>{isRTL ? "المدفوع إجماليًا" : "Total Paid"}</th>
                      <th>{isRTL ? "المتبقي" : "Remaining"}</th>
                    </tr>
                  </thead>

                  <tbody>

                    {doctorSummary.map((doctor) => (
                      <tr key={doctor.DoctorName}>

                        <td>
                          {doctor.DoctorName}
                        </td>

                        <td>
                          {doctor.Sessions}
                        </td>

                        <td>
                          {formatMoney(
                            doctor.ServicesNet
                          )}
                        </td>

                        <td>
                          {formatMoney(
                            doctor.ConsumablesTotal
                          )}
                        </td>

                        <td>
                          {formatMoney(
                            doctor.TotalPaid
                          )}
                        </td>

                        <td>
                          {formatMoney(
                            doctor.Remaining
                          )}
                        </td>

                      </tr>
                    ))}

                  </tbody>

                </table>

              </div>
            )}

          </div>


          {/* =========================================
              SESSION DETAILS
          ========================================= */}

          <div className="revenue-section">

            <h2>{isRTL ? "تفاصيل الجلسة" : "Session Details"}</h2>

            {revenue.length === 0 ? (
              <div className="revenue-empty">
                {isRTL ? "لم يتم العثور على جلسات لهذه الفترة." : "No sessions found for this period."}
              </div>
            ) : (
              <div className="revenue-table-wrapper">

                <table className="revenue-table">

                  <thead>
                    <tr>
                      <th>{isRTL ? "الطبيب" : "Doctor"}</th>
                      <th>{isRTL ? "رقم الملف" : "File No"}</th>
                      <th>{isRTL ? "المريض" : "Patient"}</th>
                      <th>{isRTL ? "معرف الجلسة" : "Session ID"}</th>
                      <th>{isRTL ? "التاريخ" : "Date"}</th>
                      <th>{isRTL ? "إيرادات الخدمات" : "Services Revenue"}</th>
                      <th>{isRTL ? "المواد الاستهلاكية" : "Consumables"}</th>
                      <th>{isRTL ? "المدفوع إجماليًا" : "Total Paid"}</th>
                      <th>{isRTL ? "المتبقي" : "Remaining"}</th>
                    </tr>
                  </thead>

                  <tbody>

                    {revenue.map((row) => (
                      <tr key={row.SessionID}>

                        <td>
                          {row.DoctorName}
                        </td>

                        <td>
                          {row.FileNo}
                        </td>

                        <td>
                          {row.PatientName}
                        </td>

                        <td>
                          {row.SessionID}
                        </td>

                        <td>
                          {String(
                            row.SessionDate
                          ).substring(0, 10)}
                        </td>

                        <td>
                          {formatMoney(
                            row.ServicesNet
                          )}
                        </td>

                        <td>
                          {formatMoney(
                            row.ConsumablesTotal
                          )}
                        </td>

                        <td>
                          {formatMoney(
                            row.TotalPaid
                          )}
                        </td>

                        <td>
                          {formatMoney(
                            row.Remaining
                          )}
                        </td>

                      </tr>
                    ))}

                  </tbody>

                  <tfoot>

                    <tr>

                      <td
                        colSpan="5"
                        className="revenue-total-label"
                      >
                        {isRTL ? "الإجمالي" : "Total"}
                      </td>

                      <td>
                        {formatMoney(
                          totals.servicesNet
                        )}
                      </td>

                      <td>
                        {formatMoney(
                          totals.consumablesTotal
                        )}
                      </td>

                      <td>
                        {formatMoney(
                          totals.totalPaid
                        )}
                      </td>

                      <td>
                        {formatMoney(
                          totals.remaining
                        )}
                      </td>

                    </tr>

                  </tfoot>

                </table>

              </div>
            )}

          </div>

        </>
      ) : null}

    </div>
  );
};

export default Revenue;