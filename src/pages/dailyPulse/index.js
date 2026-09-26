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

const DailyPulse = () => {
    const { i18n } = useTranslation();
    const isRTL = i18n.language === "ar";

    const [pulseDate, setPulseDate] = useState(getTodayDate());
    const isToday = pulseDate === getTodayDate();

    const [pulseDetails, setPulseDetails] = useState([]);

    const [startingPulses, setStartingPulses] = useState("");
    const [endingPulses, setEndingPulses] = useState("");

    const [consumedPulses, setConsumedPulses] = useState(0);
    const [expectedEnding, setExpectedEnding] = useState(null);
    const [difference, setDifference] = useState(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

  const loadDailyPulse = async () => {
    try {
      setLoading(true);

      const response = await fetch(`/api/dailyPulseReadings?date=${pulseDate}` );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load daily pulse");
      }

      setStartingPulses(data.StartingPulses !== null &&  data.StartingPulses !== undefined
                        ? data.StartingPulses
                        : ""
      );

      setEndingPulses(data.EndingPulses !== null &&  data.EndingPulses !== undefined
                        ? data.EndingPulses
                        : ""
      );

      setConsumedPulses(Number(data.ConsumedPulses || 0));

      setExpectedEnding(data.ExpectedEnding !== null &&  data.ExpectedEnding !== undefined
                        ? Number(data.ExpectedEnding)
                        : null
      );

      setDifference(data.Difference !== null &&   data.Difference !== undefined
                    ? Number(data.Difference)
                    : null
      );

      setPulseDetails(Array.isArray(data.PulseDetails) ? data.PulseDetails : []  );

    } catch (error) {
      console.error("Load daily pulse error:", error);
      toast.error(error.message || "Failed to load daily pulse");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDailyPulse();
  }, [pulseDate]);

  const handleStartingPulsesChange = (e) => {
    const value = e.target.value;

    if (value === "") {
      setStartingPulses("");
      return;
    }

    const number = parseInt(value, 10);

    if (isNaN(number) || number < 0) {
      setStartingPulses(0);
      return;
    }

    setStartingPulses(number);

    const expected = number + consumedPulses;
    setExpectedEnding(expected);

    if (endingPulses !== "") {
      setDifference(Number(endingPulses) - expected);
    } else {
      setDifference(null);
    }
  };

  const handleEndingPulsesChange = (e) => {
    const value = e.target.value;

    if (value === "") {
      setEndingPulses("");
      setDifference(null);
      return;
    }

    const number = parseInt(value, 10);

    if (isNaN(number) || number < 0) {
      setEndingPulses(0);
      return;
    }

    setEndingPulses(number);

    if (startingPulses !== "") {
      const expected = Number(startingPulses) + consumedPulses;

      setExpectedEnding(expected);
      setDifference(number - expected);
    }
  };

  const handleSave = async () => {
  if (startingPulses === "") {
    toast.error("Please enter starting pulses");
    return;
  }

  if (endingPulses !== "" &&  Number(endingPulses) < Number(startingPulses)  ) {
    toast.error("Ending pulses cannot be less than starting pulses");
    return;
  }

  try {
    setSaving(true);

    // Check whether a reading already exists for this date
    const res = await fetch(`/api/dailyPulseReadings?date=${pulseDate}`  );

    const pulsedata = await res.json();

    if (!res.ok) {
      throw new Error(
        pulsedata.message || "Failed to get daily pulse"
      );
    }

    const readingExists =  pulsedata.StartingPulses !== null &&   pulsedata.StartingPulses !== undefined;

    if (!readingExists) {
      // -----------------------------------------
      // CREATE NEW DAILY READING
      // -----------------------------------------

      const response = await fetch("/api/dailyPulseReadings",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            PulseDate: pulseDate,
            StartingPulses: Number(startingPulses),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to save daily pulse"
        );
      }

      toast.success(
        "Daily pulse reading saved for the first time"
      );

      // If user entered ending pulses at the same time,
      // update the newly created record with PUT.
      if (endingPulses !== "") {
        const updateResponse = await fetch("/api/dailyPulseReadings",
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              PulseDate: pulseDate,
              StartingPulses: Number(startingPulses),
              EndingPulses: Number(endingPulses),
            }),
          }
        );

        const updateData = await updateResponse.json();

        if (!updateResponse.ok) {
          throw new Error(
            updateData.message ||
              "Failed to save ending pulses"
          );
        }
      }
    } else {
      // -----------------------------------------
      // UPDATE EXISTING DAILY READING
      // -----------------------------------------

      const response = await fetch("/api/dailyPulseReadings",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            PulseDate: pulseDate,
            StartingPulses: Number(startingPulses),
            EndingPulses:
              endingPulses === ""
                ? null
                : Number(endingPulses),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to save daily pulse"
        );
      }

      toast.success("Daily pulse reading saved");
    }

    await loadDailyPulse();

  } catch (error) {
    console.error("Save daily pulse error:", error);

    toast.error(
      error.message || "Failed to save daily pulse"
    );
  } finally {
    setSaving(false);
  }
};

  const getStatus = () => {
    if (endingPulses === "") {
      return {
        text: isRTL ? "في انتظار القراءة النهائية" : "Waiting for ending reading",
        className: "pulse-status pending",
      };
    }

    if (difference === 0) {
      return {
        text: isRTL ? "متوازن" : "Balanced",
        className: "pulse-status balanced",
      };
    }

    return {
      text: isRTL ? "تم الكشف عن الفرق" : "Difference detected",
      className: "pulse-status difference",
    };
  };

  const status = getStatus();

  return (
    <div className="daily-pulse-page">

      <div className="daily-pulse-header">
        <h1>{isRTL ? "مراقبة النبض اليومي" : "Daily Pulse Control"}</h1>
      </div>

      {loading ? (
        <div className="daily-pulse-loading">
          {isRTL ? "جارٍ التحميل..." : "Loading..."}
        </div>
      ) : (
        <>
          <div className="daily-pulse-card">

            <div className="daily-pulse-form">

              <div className="daily-pulse-field">
                <label>{isRTL ? "التاريخ" : "Date"}</label>

                <input
                  type="date"
                  value={pulseDate}
                  onChange={(e) => setPulseDate(e.target.value)}
                />
              </div>

              <div className="daily-pulse-field">
                <label>{isRTL ? "النبضات البداية" : "Starting Pulses"}</label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={startingPulses}
                  onChange={handleStartingPulsesChange}
                  placeholder={isRTL ? "أدخل النبضات البداية" : "Enter starting pulses"}
                  disabled={saving}
                />
              </div>

              <div className="daily-pulse-field">
                <label>{isRTL ? "النبضات المستهلكة" : "Consumed Pulses"}</label>

                <input
                  type="number"
                  value={consumedPulses}
                  readOnly
                  className="daily-pulse-readonly"
                />
              </div>

              <div className="daily-pulse-field">
                <label>{isRTL ? "النهاية المتوقعة" : "Expected Ending"}</label>

                <input
                  type="number"
                  value={expectedEnding !== null  ? expectedEnding   : ""  }
                  readOnly
                  className="daily-pulse-readonly"
                />
              </div>

              <div className="daily-pulse-field">
                <label>{isRTL ? "النبضات النهائية" : "Ending Pulses"}</label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={endingPulses}
                  onChange={handleEndingPulsesChange}
                  placeholder={isRTL ? "أدخل النبضات النهائية" : "Enter ending pulses"}
                  disabled={saving}
                />
              </div>

              <div className="daily-pulse-field">
                <label>{isRTL ? "الفرق" : "Difference"}</label>

                <input
                  type="number"
                  value={difference !== null  ? difference : ""  }
                  readOnly
                  className="daily-pulse-readonly"
                />
              </div>

            </div>

            <div className="daily-pulse-status-row">
              <span className={status.className}>
                {status.text}
              </span>
            </div>

            <div className="daily-pulse-actions">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !isToday}
                className="daily-pulse-save-button"
              >
                 {saving ? (isRTL ? "جارٍ الحفظ..." : "Saving...") 
                 : isToday ? (isRTL ? "حفظ القراءة" : "Save Reading") : (isRTL ? "قراءة فقط" : "Read Only")}
              </button>
            </div>

          </div>

          <div className="daily-pulse-info">

            <h2>{isRTL ? "الحساب اليومي" : "Daily Calculation"}</h2>

            <div className="daily-pulse-calculation">
              <div>
                <span>{isRTL ? "النبضات البداية" : "Starting Pulses"}</span>
                <strong>
                  {startingPulses === ""
                    ? "-"
                    : startingPulses}
                </strong>
              </div>

              <div>
                <span>{isRTL ? "النبضات المستهلكة" : "Consumed Pulses"}</span>
                <strong>{consumedPulses}</strong>
              </div>

              <div>
                <span>{isRTL ? "النهاية المتوقعة" : "Expected Ending"}</span>
                <strong>
                  {expectedEnding === null
                    ? "-"
                    : expectedEnding}
                </strong>
              </div>

              <div>
                <span>{isRTL ? "النهاية الفعلية" : "Actual Ending"}</span>
                <strong>
                  {endingPulses === ""
                    ? "-"
                    : endingPulses}
                </strong>
              </div>

              <div>
                <span>{isRTL ? "الفرق" : "Difference"}</span>
                <strong>
                  {difference === null
                    ? "-"
                    : difference}
                </strong>
              </div>
            </div>

          </div>

            <div className="daily-pulse-details">

                <h2>{isRTL ? "جلسات وخدمات اليوم" : "Today's Sessions & Services"}</h2>

                {pulseDetails.length === 0 ? (
                    <div className="daily-pulse-empty">
                    {isRTL ? "لم يتم تسجيل أي نبضات لهذا التاريخ." : "No pulses have been recorded for this date."}
                    </div>
                ) : (
                    <div className="daily-pulse-table-wrapper">

                    <table className="daily-pulse-table">

                        <thead>
                        <tr>
                            <th>{isRTL ? "الجلسة" : "Session"}</th>
                            <th>{isRTL ? "المريض" : "Patient"}</th>
                            <th>{isRTL ? "الخدمة" : "Service"}</th>
                            <th>{isRTL ? "الكمية" : "Qty"}</th>
                            <th>{isRTL ? "النبضات" : "Pulses"}</th>
                        </tr>
                        </thead>

                        <tbody>
                        {pulseDetails.map((item) => (
                            <tr
                            key={item.SessionServiceID}
                            >
                            <td>
                                {item.SessionID}
                            </td>

                            <td>
                                {item.PatientName}
                            </td>

                            <td>
                                {item.ServiceName}
                            </td>

                            <td>
                                {item.Qty}
                            </td>

                            <td className="pulse-value">
                                {item.PulsesNo}
                            </td>
                            </tr>
                        ))}
                        </tbody>

                        <tfoot>
                        <tr>
                            <td
                            colSpan="4"
                            className="pulse-total-label"
                            >
                            {isRTL ? "إجمالي النبضات المستهلكة" : "Total Consumed Pulses"}
                            </td>

                            <td className="pulse-total-value">
                            {consumedPulses}
                            </td>
                        </tr>
                        </tfoot>

                    </table>

                    </div>
                )}

            </div>

        </>
      )}

    </div>
  );
};

export default DailyPulse;