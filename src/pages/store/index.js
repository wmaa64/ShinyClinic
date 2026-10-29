import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStateContext } from "../../../context/StateContext";


const MOVEMENT_TYPES = [
  "PURCHASE_IN",
  "SESSION_OUT",
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT",
  "RETURN_IN",
];

const PAYMENT_METHODS = [
  "Cash",
  "Visa",
  "Bank Transfer",
  "Instapay",
  "Vodafone Cash",
];

const EMPTY_PURCHASE = {
  SupplyID: "",
  Qty: "",
  UnitCost: "",
  PaymentMethod: "Cash",
  Notes: "",
};

const EMPTY_ADJUSTMENT = {
  SupplyID: "",
  ActualQuantity: "",
  Notes: "",
};

const money = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const quantity = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    maximumFractionDigits: 3,
  });

const dateTime = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString();
};

const movementLabel = (type, isRTL) => {
  const labels = {
    PURCHASE_IN: isRTL ? "شراء وإضافة للمخزن" : "Purchase In",
    SESSION_OUT: isRTL ? "استهلاك في جلسة" : "Session Usage",
    ADJUSTMENT_IN: isRTL ? "تسوية بالزيادة" : "Adjustment In",
    ADJUSTMENT_OUT: isRTL ? "تسوية بالنقص" : "Adjustment Out",
    RETURN_IN: isRTL ? "مرتجع للمخزن" : "Return In",
  };

  return labels[type] || type || "-";
};

const StorePage = () => {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  const { userInfo } = useStateContext();

  const [supplies, setSupplies] = useState([]);
  const [loadingSupplies, setLoadingSupplies] = useState(true);

  const [purchaseForm, setPurchaseForm] = useState(EMPTY_PURCHASE);
  const [adjustmentForm, setAdjustmentForm] = useState(EMPTY_ADJUSTMENT);

  const [savingPurchase, setSavingPurchase] = useState(false);
  const [savingAdjustment, setSavingAdjustment] = useState(false);

  const [movements, setMovements] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  const [stockSearch, setStockSearch] = useState("");

  const [movementFilters, setMovementFilters] = useState({
    SupplyID: "",
    FromDate: "",
    ToDate: "",
    MovementType: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const text = useMemo(
    () =>
      isRTL
        ? {
            title: "إدارة المخزن",
            subtitle: "متابعة أرصدة المستلزمات والمشتريات وحركات المخزن",
            refresh: "تحديث البيانات",
            stock: "أرصدة المخزن",
            searchStock: "ابحث عن مستلزم...",
            supply: "المستلزم",
            unit: "الوحدة",
            balance: "الرصيد الحالي",
            minimum: "حد إعادة الطلب",
            cost: "آخر تكلفة للوحدة",
            status: "الحالة",
            low: "مخزون منخفض",
            available: "متوفر",
            noSupplies: "لا توجد مستلزمات مطابقة.",
            loading: "جارٍ تحميل البيانات...",
            purchase: "تسجيل شراء",
            purchaseHelp: "أدخل كمية الشراء وتكلفة الوحدة لزيادة رصيد المخزن.",
            selectSupply: "اختر المستلزم",
            qty: "الكمية",
            unitCost: "تكلفة الوحدة",
            paymentMethod: "طريقة الدفع",
            selectPaymentMethod: "اختر طريقة الدفع",
            totalCost: "إجمالي تكلفة الشراء",
            notes: "ملاحظات",
            notesPurchase: "ملاحظات اختيارية عن الشراء",
            savePurchase: "تسجيل الشراء",
            saving: "جارٍ الحفظ...",
            adjustment: "تسوية المخزون",
            adjustmentHelp:
              "أدخل الكمية الفعلية بعد الجرد. سيُسجل النظام الفرق تلقائياً.",
            actualQty: "الكمية الفعلية بعد الجرد",
            adjustmentReason: "سبب التسوية (مطلوب)",
            saveAdjustment: "حفظ التسوية",
            history: "حركة المخزن",
            fromDate: "من تاريخ",
            toDate: "إلى تاريخ",
            movementType: "نوع الحركة",
            allTypes: "كل الحركات",
            allSupplies: "كل المستلزمات",
            filter: "بحث في الحركات",
            date: "التاريخ",
            movement: "الحركة",
            quantity: "الكمية",
            unitCostShort: "تكلفة الوحدة",
            total: "التكلفة الإجمالية",
            user: "المستخدم",
            reference: "رقم الجلسة",
            noMovements: "لا توجد حركات مخزن لهذه الفلاتر.",
            purchaseSuccess: "تم تسجيل الشراء وتحديث رصيد المخزن.",
            adjustmentSuccess: "تم تحديث رصيد المخزن وتسجيل التسوية.",
            unchanged: "الرصيد الفعلي يطابق الرصيد الحالي؛ لم يلزم إجراء تسوية.",
            confirmAdjustment: "هل تريد حفظ تسوية المخزون بهذه الكمية الفعلية؟",
            costNote:
              "تُحفظ تكلفة الشراء لأغراض تقارير التكلفة، ولا تُضاف كرسوم منفصلة على المريض.",
            noUser: "غير محدد",
          }
        : {
            title: "Store Management",
            subtitle: "Manage supply balances, purchases, and stock movements",
            refresh: "Refresh Data",
            stock: "Stock Balances",
            searchStock: "Search supplies...",
            supply: "Supply",
            unit: "Unit",
            balance: "Quantity on Hand",
            minimum: "Minimum Stock",
            cost: "Latest Unit Cost",
            status: "Status",
            low: "Low Stock",
            available: "Available",
            noSupplies: "No matching supplies found.",
            loading: "Loading data...",
            purchase: "Record Purchase",
            purchaseHelp:
              "Enter the purchased quantity and unit cost to increase stock.",
            selectSupply: "Select a supply",
            qty: "Quantity",
            unitCost: "Unit Cost",
            paymentMethod: "Payment Method",
            selectPaymentMethod: "Select a payment method",
            totalCost: "Total Purchase Cost",
            notes: "Notes",
            notesPurchase: "Optional purchase notes",
            savePurchase: "Record Purchase",
            saving: "Saving...",
            adjustment: "Stock Adjustment",
            adjustmentHelp:
              "Enter the actual quantity after counting. The system records the difference automatically.",
            actualQty: "Actual Quantity After Count",
            adjustmentReason: "Adjustment Reason (Required)",
            saveAdjustment: "Save Adjustment",
            history: "Stock Movements",
            fromDate: "From Date",
            toDate: "To Date",
            movementType: "Movement Type",
            allTypes: "All Movements",
            allSupplies: "All Supplies",
            filter: "Filter Movements",
            date: "Date",
            movement: "Movement",
            quantity: "Quantity",
            unitCostShort: "Unit Cost",
            total: "Total Cost",
            user: "User",
            reference: "Session ID",
            noMovements: "No stock movements match these filters.",
            purchaseSuccess: "Purchase recorded and stock balance updated.",
            adjustmentSuccess: "Stock balance updated and adjustment recorded.",
            unchanged:
              "The physical quantity matches the current balance; no adjustment was needed.",
            confirmAdjustment:
              "Save the stock adjustment using this physical quantity?",
            costNote:
              "Purchase costs are recorded for cost reporting and are not charged separately to patients.",
            noUser: "Not specified",
          },
    [isRTL]
  );

  const loadSupplies = useCallback(async () => {
    try {
      setLoadingSupplies(true);

      const response = await fetch("/api/supplies");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load supplies.");
      }

      setSupplies(Array.isArray(data.supplies) ? data.supplies : []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load supplies.");
    } finally {
      setLoadingSupplies(false);
    }
  }, []);

  const loadMovements = useCallback(async (filters = movementFilters) => {
    try {
      setLoadingMovements(true);

      const params = new URLSearchParams();

      if (filters.SupplyID) {
        params.set("supplyID", filters.SupplyID);
      }

      if (filters.FromDate) {
        params.set("fromDate", filters.FromDate);
      }

      if (filters.ToDate) {
        params.set("toDate", filters.ToDate);
      }

      if (filters.MovementType) {
        params.set("movementType", filters.MovementType);
      }

      const query = params.toString();
      const url = query
        ? `/api/store/movements?${query}`
        : "/api/store/movements";

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load stock movements.");
      }

      setMovements(Array.isArray(data.movements) ? data.movements : []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load stock movements.");
    } finally {
      setLoadingMovements(false);
    }
  }, [movementFilters]);

  useEffect(() => {
    loadSupplies();
    loadMovements();
  }, [loadSupplies, loadMovements]);

  const filteredSupplies = useMemo(() => {
    const search = stockSearch.trim().toLocaleLowerCase();

    if (!search) return supplies;

    return supplies.filter((supply) =>
      [
        supply.SupplyName,
        supply.UnitName,
      ].some((value) =>
        String(value || "").toLocaleLowerCase().includes(search)
      )
    );
  }, [supplies, stockSearch]);

  const selectedPurchaseSupply = supplies.find(
    (supply) => String(supply.SupplyID) === String(purchaseForm.SupplyID)
  );

  const purchaseTotal =
    Number(purchaseForm.Qty || 0) * Number(purchaseForm.UnitCost || 0);

  const setPurchaseField = (field, value) => {
    setPurchaseForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const setAdjustmentField = (field, value) => {
    setAdjustmentForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const setMovementFilter = (field, value) => {
    setMovementFilters((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handlePurchaseSupplyChange = (value) => {
    const supply = supplies.find(
      (item) => String(item.SupplyID) === String(value)
    );

    setPurchaseForm((previous) => ({
      ...previous,
      SupplyID: value,
      UnitCost:
        supply && supply.CostPrice !== undefined
          ? String(supply.CostPrice)
          : "",
    }));
  };

  const handleRecordPurchase = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const supplyID = Number(purchaseForm.SupplyID);
    const qty = Number(purchaseForm.Qty);
    const unitCost = Number(purchaseForm.UnitCost);

    if (!Number.isInteger(supplyID) || supplyID <= 0) {
      setError(isRTL ? "اختر مستلزمًا صحيحًا." : "Please select a valid supply.");
      return;
    }

    if (!Number.isFinite(qty) || qty <= 0) {
      setError(isRTL ? "أدخل كمية أكبر من صفر." : "Quantity must be greater than zero.");
      return;
    }

    if (!Number.isFinite(unitCost) || unitCost < 0) {
      setError(isRTL ? "أدخل تكلفة وحدة صحيحة." : "Enter a valid unit cost.");
      return;
    }

    try {
      setSavingPurchase(true);

      const response = await fetch("/api/store/purchases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          SupplyID: supplyID,
          Qty: qty,
          UnitCost: unitCost,
          PaymentMethod: purchaseForm.PaymentMethod,
          UserID: userInfo?.UserID ?? null,
          Notes: purchaseForm.Notes.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to record purchase.");
      }

      setPurchaseForm(EMPTY_PURCHASE);
      setSuccess(text.purchaseSuccess);

      await loadSupplies();
      await loadMovements();
    } catch (saveError) {
      setError(saveError.message || "Failed to record purchase.");
    } finally {
      setSavingPurchase(false);
    }
  };

  const handleStockAdjustment = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const supplyID = Number(adjustmentForm.SupplyID);
    const actualQuantity = Number(adjustmentForm.ActualQuantity);
    const notes = adjustmentForm.Notes.trim();

    if (!Number.isInteger(supplyID) || supplyID <= 0) {
      setError(isRTL ? "اختر مستلزمًا صحيحًا." : "Please select a valid supply.");
      return;
    }

    if (
      adjustmentForm.ActualQuantity.trim() === "" ||
      !Number.isFinite(actualQuantity) ||
      actualQuantity < 0
    ) {
      setError(
        isRTL
          ? "أدخل الكمية الفعلية، ويجب ألا تكون سالبة."
          : "Enter a valid physical quantity. It cannot be negative."
      );
      return;
    }

    if (!notes) {
      setError(
        isRTL
          ? "يجب إدخال سبب التسوية."
          : "Please enter a reason for the adjustment."
      );
      return;
    }

    if (!window.confirm(text.confirmAdjustment)) return;

    try {
      setSavingAdjustment(true);

      const response = await fetch("/api/store/adjustments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          SupplyID: supplyID,
          ActualQuantity: actualQuantity,
          UserID: userInfo?.UserID ?? null,
          Notes: notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to adjust stock.");
      }

      setAdjustmentForm(EMPTY_ADJUSTMENT);

      setSuccess(
        data.adjustment?.AdjustmentRecorded
          ? text.adjustmentSuccess
          : text.unchanged
      );

      await loadSupplies();
      await loadMovements();
    } catch (saveError) {
      setError(saveError.message || "Failed to adjust stock.");
    } finally {
      setSavingAdjustment(false);
    }
  };

  const handleApplyMovementFilters = async (event) => {
    event.preventDefault();
    setError("");
    await loadMovements(movementFilters);
  };

  const handleResetMovementFilters = async () => {
    const emptyFilters = {
      SupplyID: "",
      FromDate: "",
      ToDate: "",
      MovementType: "",
    };

    setMovementFilters(emptyFilters);
    setError("");
    await loadMovements(emptyFilters);
  };

  const handleRefresh = async () => {
    setError("");
    setSuccess("");

    await Promise.all([
      loadSupplies(),
      loadMovements(movementFilters),
    ]);
  };

  return (
    <main className="store-page" dir={isRTL ? "rtl" : "ltr"}>
      <header className="store-header">
        <div>
          <h1>{text.title}</h1>
          <p>{text.subtitle}</p>
        </div>

        <button
          type="button"
          className="store-button secondary"
          onClick={handleRefresh}
          disabled={loadingSupplies || loadingMovements}
        >
          {text.refresh}
        </button>
      </header>

      {error && (
        <div className="store-alert error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="store-alert success" role="status">
          {success}
        </div>
      )}

      {/* Current stock balances */}
      <section className="store-panel">
        <div className="store-panel-heading">
          <div>
            <h2>{text.stock}</h2>
            <p>
              {isRTL
                ? `عدد المستلزمات: ${supplies.length}`
                : `Total supplies: ${supplies.length}`}
            </p>
          </div>

          <input
            type="search"
            className="store-search"
            value={stockSearch}
            onChange={(event) => setStockSearch(event.target.value)}
            placeholder={text.searchStock}
            aria-label={text.searchStock}
          />
        </div>

        {loadingSupplies ? (
          <div className="store-message">{text.loading}</div>
        ) : filteredSupplies.length === 0 ? (
          <div className="store-message">{text.noSupplies}</div>
        ) : (
          <div className="store-table-wrapper">
            <table className="store-table">
              <thead>
                <tr>
                  <th>{text.supply}</th>
                  <th>{text.unit}</th>
                  <th>{text.balance}</th>
                  <th>{text.minimum}</th>
                  <th>{text.cost}</th>
                  <th>{text.status}</th>
                </tr>
              </thead>

              <tbody>
                {filteredSupplies.map((supply) => {
                  const isLowStock =
                    supply.IsLowStock === true ||
                    supply.IsLowStock === 1 ||
                    String(supply.IsLowStock).toLowerCase() === "true";

                  return (
                    <tr key={supply.SupplyID}>
                      <td className="store-supply-name">
                        {supply.SupplyName}
                      </td>
                      <td>{supply.UnitName || "-"}</td>
                      <td>{quantity(supply.QuantityOnHand)}</td>
                      <td>{quantity(supply.MinimumStock)}</td>
                      <td>{money(supply.CostPrice)}</td>
                      <td>
                        <span
                          className={`store-status ${
                            isLowStock ? "low" : "available"
                          }`}
                        >
                          {isLowStock ? text.low : text.available}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Purchase and adjustment forms */}
      <div className="store-form-grid">
        <section className="store-panel">
          <div className="store-panel-heading">
            <div>
              <h2>{text.purchase}</h2>
              <p>{text.purchaseHelp}</p>
            </div>
          </div>

          <form className="store-form" onSubmit={handleRecordPurchase}>
            <div className="store-field">
              <label htmlFor="purchase-supply">{text.supply} *</label>
              <select
                id="purchase-supply"
                value={purchaseForm.SupplyID}
                onChange={(event) =>
                  handlePurchaseSupplyChange(event.target.value)
                }
                required
                disabled={supplies.length === 0 || savingPurchase}
              >
                <option value="">{text.selectSupply}</option>
                {supplies.map((supply) => (
                  <option key={supply.SupplyID} value={supply.SupplyID}>
                    {supply.SupplyName} ({supply.UnitName || "-"})
                  </option>
                ))}
              </select>
            </div>

            <div className="store-field-row">
              <div className="store-field">
                <label htmlFor="purchase-qty">{text.qty} *</label>
                <input
                  id="purchase-qty"
                  type="number"
                  min="1"
                  step="1"
                  value={purchaseForm.Qty}
                  onChange={(event) =>
                    setPurchaseField("Qty", event.target.value)
                  }
                  required
                  disabled={savingPurchase}
                />
              </div>

              <div className="store-field">
                <label htmlFor="purchase-unit-cost">
                  {text.unitCost} *
                </label>
                <input
                  id="purchase-unit-cost"
                  type="number"
                  min="0"
                  step="1"
                  value={purchaseForm.UnitCost}
                  onChange={(event) =>
                    setPurchaseField("UnitCost", event.target.value)
                  }
                  required
                  disabled={savingPurchase}
                />
              </div>
            </div>

            <div className="store-purchase-total">
              <span>{text.totalCost}</span>
              <strong>{money(purchaseTotal)} EGP</strong>
            </div>

            <div className="store-field">
              <label htmlFor="purchase-payment-method">
                {text.paymentMethod} *
              </label>
              <select
                id="purchase-payment-method"
                value={purchaseForm.PaymentMethod}
                onChange={(event) =>
                  setPurchaseField("PaymentMethod", event.target.value)
                }
                required
                disabled={savingPurchase}
              >
                <option value="">{text.selectPaymentMethod}</option>
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>

            <div className="store-field">
              <label htmlFor="purchase-notes">{text.notes}</label>
              <textarea
                id="purchase-notes"
                rows={3}
                value={purchaseForm.Notes}
                onChange={(event) =>
                  setPurchaseField("Notes", event.target.value)
                }
                placeholder={text.notesPurchase}
                disabled={savingPurchase}
              />
            </div>

            <p className="store-help-text">{text.costNote}</p>

            <button
              type="submit"
              className="store-button primary"
              disabled={savingPurchase || supplies.length === 0 || userInfo?.RoleID == 11}
            >
              {savingPurchase ? text.saving : text.savePurchase}
            </button>
          </form>
        </section>

        <section className="store-panel">
          <div className="store-panel-heading">
            <div>
              <h2>{text.adjustment}</h2>
              <p>{text.adjustmentHelp}</p>
            </div>
          </div>

          <form className="store-form" onSubmit={handleStockAdjustment}>
            <div className="store-field">
              <label htmlFor="adjustment-supply">{text.supply} *</label>
              <select
                id="adjustment-supply"
                value={adjustmentForm.SupplyID}
                onChange={(event) => {
                  const supplyID = event.target.value;
                  const supply = supplies.find(
                    (item) => String(item.SupplyID) === String(supplyID)
                  );

                  setAdjustmentForm((previous) => ({
                    ...previous,
                    SupplyID: supplyID,
                    ActualQuantity:
                      supply && supply.QuantityOnHand !== undefined
                        ? String(supply.QuantityOnHand)
                        : "",
                  }));
                }}
                required
                disabled={supplies.length === 0 || savingAdjustment}
              >
                <option value="">{text.selectSupply}</option>
                {supplies.map((supply) => (
                  <option key={supply.SupplyID} value={supply.SupplyID}>
                    {supply.SupplyName} ({supply.UnitName || "-"})
                  </option>
                ))}
              </select>
            </div>

            <div className="store-field">
              <label htmlFor="actual-quantity">{text.actualQty} *</label>
              <input
                id="actual-quantity"
                type="number"
                min="0"
                step="1"
                value={adjustmentForm.ActualQuantity}
                onChange={(event) =>
                  setAdjustmentField("ActualQuantity", event.target.value)
                }
                required
                disabled={savingAdjustment}
              />
            </div>

            <div className="store-field">
              <label htmlFor="adjustment-notes">
                {text.adjustmentReason} *
              </label>
              <textarea
                id="adjustment-notes"
                rows={4}
                value={adjustmentForm.Notes}
                onChange={(event) =>
                  setAdjustmentField("Notes", event.target.value)
                }
                required
                placeholder={
                  isRTL
                    ? "مثال: فرق جرد، تلف، فقد..."
                    : "e.g. Stock count difference, damage, loss..."
                }
                disabled={savingAdjustment}
              />
            </div>

            <button
              type="submit"
              className="store-button primary"
              disabled={savingAdjustment || supplies.length === 0 || userInfo?.RoleID !== 11}
            >
              {savingAdjustment ? text.saving : text.saveAdjustment}
            </button>
          </form>
        </section>
      </div>

      {/* Stock movement history */}
      <section className="store-panel">
        <div className="store-panel-heading">
          <div>
            <h2>{text.history}</h2>
          </div>
        </div>

        <form
          className="store-filter-form"
          onSubmit={handleApplyMovementFilters}
        >
          <div className="store-field">
            <label htmlFor="filter-supply">{text.supply}</label>
            <select
              id="filter-supply"
              value={movementFilters.SupplyID}
              onChange={(event) =>
                setMovementFilter("SupplyID", event.target.value)
              }
            >
              <option value="">{text.allSupplies}</option>
              {supplies.map((supply) => (
                <option key={supply.SupplyID} value={supply.SupplyID}>
                  {supply.SupplyName}
                </option>
              ))}
            </select>
          </div>

          <div className="store-field">
            <label htmlFor="filter-from-date">{text.fromDate}</label>
            <input
              id="filter-from-date"
              type="date"
              value={movementFilters.FromDate}
              onChange={(event) =>
                setMovementFilter("FromDate", event.target.value)
              }
            />
          </div>

          <div className="store-field">
            <label htmlFor="filter-to-date">{text.toDate}</label>
            <input
              id="filter-to-date"
              type="date"
              value={movementFilters.ToDate}
              onChange={(event) =>
                setMovementFilter("ToDate", event.target.value)
              }
            />
          </div>

          <div className="store-field">
            <label htmlFor="filter-movement-type">{text.movementType}</label>
            <select
              id="filter-movement-type"
              value={movementFilters.MovementType}
              onChange={(event) =>
                setMovementFilter("MovementType", event.target.value)
              }
            >
              <option value="">{text.allTypes}</option>
              {MOVEMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {movementLabel(type, isRTL)}
                </option>
              ))}
            </select>
          </div>

          <div className="store-filter-actions">
            <button
              type="submit"
              className="store-button primary"
              disabled={loadingMovements}
            >
              {text.filter}
            </button>

            <button
              type="button"
              className="store-button secondary"
              onClick={handleResetMovementFilters}
              disabled={loadingMovements}
            >
              {isRTL ? "إعادة تعيين" : "Reset"}
            </button>
          </div>
        </form>

        {loadingMovements ? (
          <div className="store-message">{text.loading}</div>
        ) : movements.length === 0 ? (
          <div className="store-message">{text.noMovements}</div>
        ) : (
          <div className="store-table-wrapper">
            <table className="store-table">
              <thead>
                <tr>
                  <th>{text.date}</th>
                  <th>{text.supply}</th>
                  <th>{text.movement}</th>
                  <th>{text.quantity}</th>
                  <th>{text.unitCostShort}</th>
                  <th>{text.total}</th>
                  <th>{text.reference}</th>
                  <th>{text.user}</th>
                  <th>{text.notes}</th>
                </tr>
              </thead>

              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.StockMovementID}>
                    <td>{dateTime(movement.CreatedAt)}</td>
                    <td>{movement.SupplyName || "-"}</td>
                    <td>
                      <span
                        className={`store-movement-type ${
                          String(movement.MovementType || "").endsWith("_OUT")
                            ? "out"
                            : "in"
                        }`}
                      >
                        {movementLabel(movement.MovementType, isRTL)}
                      </span>
                    </td>
                    <td>{quantity(movement.Qty)}</td>
                    <td>{money(movement.UnitCost)}</td>
                    <td>
                      {money(
                        Number(movement.Qty || 0) *
                          Number(movement.UnitCost || 0)
                      )}
                    </td>
                    <td>{movement.SessionID || "-"}</td>
                    <td>
                      {movement.UserName ||
                        movement.UserFullName ||
                        text.noUser}
                    </td>
                    <td>{movement.Notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
};

export default StorePage;
