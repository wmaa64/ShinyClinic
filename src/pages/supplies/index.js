import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStateContext } from "../../../context/StateContext";


const EMPTY_FORM = {
  SupplyName: "",
  UnitID: "",
  CostPrice: "0",
  MinimumStock: "0",
  Notes: "",
};

const SuppliesPage = () => {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { userInfo } = useStateContext();

  const [supplies, setSupplies] = useState([]);
  const [units, setUnits] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const [editingSupplyID, setEditingSupplyID] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showForm, setShowForm] = useState(false);

  const t = (en, ar) => (isRTL ? ar : en);

  const money = (value) =>
    Number(value || 0).toLocaleString(isRTL ? "ar-EG" : "en-EG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // LOAD SUPPLIES AND UNITS
  useEffect(() => {
    loadUnits();
    loadSupplies();
  }, []);

  // LOAD SUPPLIES
  const loadSupplies = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/supplies?includeInactive=${showInactive ? "true" : "false"}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load supplies.");
      }

      setSupplies(Array.isArray(data.supplies) ? data.supplies : []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load supplies.");
    } finally {
      setLoading(false);
    }
  };

  // LOAD ACTIVE SUPPLY UNITS
  const loadUnits = async () => {
    try {
      const response = await fetch("/api/supplyUnits");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load supply units.");
      }

      setUnits(Array.isArray(data.units) ? data.units : []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load supply units.");
    }
  };

  // RELOAD WHEN THE INACTIVE FILTER CHANGES
  useEffect(() => {
    loadSupplies();
  }, [showInactive]);

  // SEARCH LOCALLY
  const filteredSupplies = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();

    if (!normalizedSearch) return supplies;

    return supplies.filter((supply) =>
      [
        supply.SupplyName,
        supply.UnitName,
        supply.Notes,
      ].some((value) =>
        String(value || "")
          .toLocaleLowerCase()
          .includes(normalizedSearch)
      )
    );
  }, [supplies, search]);

  // RESET FORM
  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setEditingSupplyID(null);
    setShowForm(false);
  };

  // OPEN FORM FOR A NEW SUPPLY
  const handleAddNew = () => {
    setForm({ ...EMPTY_FORM });
    setEditingSupplyID(null);
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  // OPEN FORM FOR EDITING
  const handleEdit = (supply) => {
    setForm({
      SupplyName: supply.SupplyName || "",
      UnitID: String(supply.UnitID || ""),
      CostPrice: String(supply.CostPrice ?? 0),
      MinimumStock: String(supply.MinimumStock ?? 0),
      Notes: supply.Notes || "",
    });

    setEditingSupplyID(supply.SupplyID);
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  // UPDATE FORM FIELDS
  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // SAVE NEW OR UPDATED SUPPLY
  const handleSubmit = async (event) => {
    event.preventDefault();

    const supplyName = form.SupplyName.trim();
    const unitID = Number(form.UnitID);
    const costPrice = Number(form.CostPrice);
    const minimumStock = Number(form.MinimumStock);

    if (!supplyName) {
      setError(t("Please enter the supply name.", "من فضلك أدخل اسم المستلزم."));
      return;
    }

    if (!unitID) {
      setError(t("Please select a unit.", "من فضلك اختر وحدة القياس."));
      return;
    }

    if (!Number.isFinite(costPrice) || costPrice < 0) {
      setError(t("Enter a valid cost price.", "أدخل سعر تكلفة صحيحاً."));
      return;
    }

    if (!Number.isFinite(minimumStock) || minimumStock < 0) {
      setError(t("Enter a valid minimum stock.", "أدخل حد إعادة طلب صحيحاً."));
      return;
    }

    const requestData = {
      SupplyName: supplyName,
      UnitID: unitID,
      CostPrice: costPrice,
      MinimumStock: minimumStock,
      Notes: form.Notes.trim() || null,
    };

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const isEditing = Boolean(editingSupplyID);

      const response = await fetch(
        isEditing
          ? `/api/supplies/${editingSupplyID}`
          : "/api/supplies",
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...requestData,
            UserID: userInfo?.UserID
              ? Number(userInfo.UserID)
              : null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            (isEditing
              ? "Failed to update supply."
              : "Failed to create supply.")
        );
      }

      resetForm();
      await loadSupplies();

      setSuccess(
        isEditing
          ? t("Supply updated successfully.", "تم تحديث المستلزم بنجاح.")
          : t("Supply added successfully.", "تمت إضافة المستلزم بنجاح.")
      );
    } catch (saveError) {
      setError(saveError.message || "Failed to save supply.");
    } finally {
      setSaving(false);
    }
  };

  // DEACTIVATE SUPPLY
  const handleDeactivate = async (supply) => {
    const confirmed = window.confirm(
      t(
        `Deactivate "${supply.SupplyName}"?`,
        `هل تريد إيقاف تفعيل "${supply.SupplyName}"؟`
      )
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/supplies/${supply.SupplyID}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to deactivate supply.");
      }

      setSuccess(
        t("Supply deactivated successfully.", "تم إيقاف تفعيل المستلزم.")
      );

      await loadSupplies();
    } catch (deactivateError) {
      setError(
        deactivateError.message || "Failed to deactivate supply."
      );
    }
  };

  return (
    <main className="supplies-page" dir={isRTL ? "rtl" : "ltr"}>
      {/* PAGE HEADER */}
      <header className="supplies-header">
        <div>
          <h1>{t("Supplies", "المستلزمات")}</h1>
          <p>
            {t(
              "Manage clinic supplies, units, and minimum stock levels.",
              "إدارة مستلزمات العيادة ووحدات القياس والحد الأدنى للمخزون."
            )}
          </p>
        </div>

        <button
          type="button"
          className="supplies-btn supplies-btn-primary"
          onClick={handleAddNew}
        >
          + {t("Add New Supply", "إضافة مستلزم جديد")}
        </button>
      </header>

      {/* ALERTS */}
      {error && (
        <div className="supplies-alert supplies-alert-error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="supplies-alert supplies-alert-success" role="status">
          {success}
        </div>
      )}

      {/* ADD / EDIT FORM */}
      {showForm && (
        <section className="supplies-panel">
          <div className="supplies-panel-heading">
            <h2>
              {editingSupplyID
                ? t("Edit Supply", "تعديل المستلزم")
                : t("Add New Supply", "إضافة مستلزم جديد")}
            </h2>
          </div>

          <form className="supplies-form" onSubmit={handleSubmit}>
            <div className="supplies-form-grid">
              <div className="supplies-field">
                <label htmlFor="SupplyName">
                  {t("Supply Name", "اسم المستلزم")} *
                </label>
                <input
                  id="SupplyName"
                  name="SupplyName"
                  type="text"
                  value={form.SupplyName}
                  onChange={handleFormChange}
                  maxLength={150}
                  required
                  placeholder={t(
                    "e.g. Disposable Gloves",
                    "مثال: جوانتي طبي"
                  )}
                />
              </div>

              <div className="supplies-field">
                <label htmlFor="UnitID">
                  {t("Unit", "وحدة القياس")} *
                </label>
                <select
                  id="UnitID"
                  name="UnitID"
                  value={form.UnitID}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">
                    {t("Select a unit", "اختر وحدة القياس")}
                  </option>

                  {units.map((unit) => (
                    <option key={unit.UnitID} value={unit.UnitID}>
                      {unit.UnitName}
                    </option>
                  ))}
                </select>

                {units.length === 0 && (
                  <small className="supplies-field-hint">
                    {t(
                      "No active units found. Add a unit first.",
                      "لا توجد وحدات قياس مفعلة. أضف وحدة قياس أولاً."
                    )}
                  </small>
                )}
              </div>

              <div className="supplies-field">
                <label htmlFor="CostPrice">
                  {t("Latest Unit Cost (EGP)", "آخر تكلفة للوحدة (جنيه)")} *
                </label>
                <input
                  id="CostPrice"
                  name="CostPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.CostPrice}
                  onChange={handleFormChange}
                  required
                />
                <small className="supplies-field-hint">
                  {t(
                    "This is the reference cost. Actual purchase costs are recorded in Store.",
                    "هذه تكلفة مرجعية، ويتم تسجيل تكلفة الشراء الفعلية من صفحة المخزن."
                  )}
                </small>
              </div>

              <div className="supplies-field">
                <label htmlFor="MinimumStock">
                  {t("Minimum Stock", "الحد الأدنى للمخزون")} *
                </label>
                <input
                  id="MinimumStock"
                  name="MinimumStock"
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.MinimumStock}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="supplies-field supplies-field-full">
                <label htmlFor="Notes">
                  {t("Notes", "ملاحظات")}
                </label>
                <textarea
                  id="Notes"
                  name="Notes"
                  value={form.Notes}
                  onChange={handleFormChange}
                  maxLength={500}
                  rows={3}
                  placeholder={t(
                    "Optional notes about this supply",
                    "ملاحظات اختيارية عن المستلزم"
                  )}
                />
              </div>
            </div>

            <div className="supplies-form-actions">
              <button
                type="submit"
                className="supplies-btn supplies-btn-primary"
                disabled={saving || units.length === 0}
              >
                {saving
                  ? t("Saving...", "جارٍ الحفظ...")
                  : editingSupplyID
                    ? t("Update Supply", "تحديث المستلزم")
                    : t("Save Supply", "حفظ المستلزم")}
              </button>

              <button
                type="button"
                className="supplies-btn supplies-btn-secondary"
                onClick={resetForm}
                disabled={saving}
              >
                {t("Cancel", "إلغاء")}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* SUPPLIES LIST */}
      <section className="supplies-panel">
        <div className="supplies-panel-heading supplies-list-heading">
          <div>
            <h2>{t("Supplies List", "قائمة المستلزمات")}</h2>
            <p>
              {t("Total shown:", "عدد المستلزمات المعروضة:")}{" "}
              <strong>{filteredSupplies.length}</strong>
            </p>
          </div>

          <button
            type="button"
            className="supplies-btn supplies-btn-secondary"
            onClick={loadSupplies}
            disabled={loading}
          >
            {t("Refresh", "تحديث")}
          </button>
        </div>

        <div className="supplies-toolbar">
          <div className="supplies-search">
            <label htmlFor="suppliesSearch">
              {t("Search", "بحث")}
            </label>
            <input
              id="suppliesSearch"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t(
                "Search by supply name or unit...",
                "ابحث باسم المستلزم أو وحدة القياس..."
              )}
            />
          </div>

          <label className="supplies-checkbox">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(event) => setShowInactive(event.target.checked)}
            />
            <span>{t("Show inactive supplies", "عرض المستلزمات غير المفعلة")}</span>
          </label>
        </div>

        {loading ? (
          <div className="supplies-state">
            {t("Loading supplies...", "جارٍ تحميل المستلزمات...")}
          </div>
        ) : filteredSupplies.length === 0 ? (
          <div className="supplies-state">
            {search.trim()
              ? t("No supplies match your search.", "لا توجد مستلزمات تطابق البحث.")
              : t(
                  "No supplies found. Click Add New Supply to create one.",
                  "لا توجد مستلزمات. اضغط على إضافة مستلزم جديد لإنشاء مستلزم."
                )}
          </div>
        ) : (
          <div className="supplies-table-wrapper">
            <table className="supplies-table">
              <thead>
                <tr>
                  <th>{t("Supply Name", "اسم المستلزم")}</th>
                  <th>{t("Unit", "الوحدة")}</th>
                  <th>{t("Unit Cost (EGP)", "تكلفة الوحدة (جنيه)")}</th>
                  <th>{t("Quantity on Hand", "الكمية الحالية")}</th>
                  <th>{t("Minimum Stock", "الحد الأدنى")}</th>
                  <th>{t("Stock Status", "حالة المخزون")}</th>
                  <th>{t("Status", "الحالة")}</th>
                  <th>{t("Actions", "الإجراءات")}</th>
                </tr>
              </thead>

              <tbody>
                {filteredSupplies.map((supply) => {
                  const quantity = Number(supply.QuantityOnHand || 0);
                  const minimum = Number(supply.MinimumStock || 0);
                  const isInactive = Number(supply.IsActive) === 0;
                  const isLowStock =
                    Boolean(supply.IsLowStock) || quantity <= minimum;

                  return (
                    <tr key={supply.SupplyID}>
                      <td>
                        <div className="supplies-name">
                          <strong>{supply.SupplyName}</strong>
                          {supply.Notes && (
                            <small title={supply.Notes}>
                              {supply.Notes}
                            </small>
                          )}
                        </div>
                      </td>

                      <td>{supply.UnitName || "—"}</td>
                      <td className="supplies-number">
                        {money(supply.CostPrice)}
                      </td>
                      <td className="supplies-number">
                        {quantity.toLocaleString(isRTL ? "ar-EG" : "en-EG", {
                          maximumFractionDigits: 3,
                        })}
                      </td>
                      <td className="supplies-number">
                        {minimum.toLocaleString(isRTL ? "ar-EG" : "en-EG", {
                          maximumFractionDigits: 3,
                        })}
                      </td>

                      <td>
                        {isInactive ? (
                          <span className="supplies-status supplies-status-neutral">
                            {t("Unavailable", "غير متاح")}
                          </span>
                        ) : isLowStock ? (
                          <span className="supplies-status supplies-status-low">
                            {t("Low Stock", "مخزون منخفض")}
                          </span>
                        ) : (
                          <span className="supplies-status supplies-status-good">
                            {t("In Stock", "متوفر")}
                          </span>
                        )}
                      </td>

                      <td>
                        <span
                          className={`supplies-status ${
                            isInactive
                              ? "supplies-status-neutral"
                              : "supplies-status-good"
                          }`}
                        >
                          {isInactive
                            ? t("Inactive", "غير مفعل")
                            : t("Active", "مفعل")}
                        </span>
                      </td>

                      <td>
                        <div className="supplies-row-actions">
                          <button
                            type="button"
                            className="supplies-btn supplies-btn-small supplies-btn-edit"
                            onClick={() => handleEdit(supply)}
                          >
                            {t("Edit", "تعديل")}
                          </button>

                          {!isInactive && (
                            <button
                              type="button"
                              className="supplies-btn supplies-btn-small supplies-btn-danger"
                              onClick={() => handleDeactivate(supply)}
                            >
                              {t("Deactivate", "إيقاف")}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="supplies-footer-note">
          {t(
            "Creating a supply starts its stock quantity at zero. Use the Store page to record purchases and increase stock.",
            "يبدأ رصيد المستلزم بصفر عند إنشائه. استخدم صفحة المخزن لتسجيل المشتريات وزيادة الرصيد."
          )}
        </p>
      </section>
    </main>
  );
};

export default SuppliesPage;