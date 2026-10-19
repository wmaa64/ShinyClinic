import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";

const EMPTY_FORM = { UnitName: "" };

const SupplyUnitsPage = () => {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const text = (english, arabic) => isRTL ? arabic : english;

  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingStatusID, setChangingStatusID] = useState(null);
  const [search, setSearch] = useState("");
  const [editingUnit, setEditingUnit] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // Load active and inactive units so staff can reactivate a previously disabled unit.
  const loadUnits = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/supplyUnits?includeInactive=true");
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to load supply units.");
      setUnits(Array.isArray(data.units) ? data.units : []);
    } catch (error) {
      toast.error(error.message || "Failed to load supply units.");
      setUnits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  // Filter the loaded list locally while the user types.
  const filteredUnits = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return units;
    return units.filter((unit) => String(unit.UnitName || "").toLocaleLowerCase().includes(query));
  }, [units, search]);

  // Start a clean form for creating a new unit.
  const startCreate = () => {
    setEditingUnit(null);
    setForm(EMPTY_FORM);
  };

  // Load a selected unit into the shared create/edit form.
  const startEdit = (unit) => {
    setEditingUnit(unit);
    setForm({ UnitName: unit.UnitName || "" });
  };

  // Submit a new unit or update the selected unit's name.
  const saveUnit = async (event) => {
    event.preventDefault();
    const UnitName = form.UnitName.trim();
    if (!UnitName) return toast.error(text("Enter a unit name.", "أدخل اسم الوحدة."));

    try {
      setSaving(true);
      const isEditing = Boolean(editingUnit);
      const response = await fetch(isEditing ? `/api/supplyUnits/${editingUnit.UnitID}` : "/api/supplyUnits", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ UnitName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to save supply unit.");
      toast.success(data.message || text("Supply unit saved.", "تم حفظ الوحدة."));
      startCreate();
      await loadUnits();
    } catch (error) {
      toast.error(error.message || "Failed to save supply unit.");
    } finally {
      setSaving(false);
    }
  };

  // Activate an inactive unit or deactivate an active unit without deleting its history.
  const changeActiveStatus = async (unit) => {
    const nextIsActive = !Boolean(unit.IsActive);
    const confirmMessage = nextIsActive
      ? text(`Activate ${unit.UnitName}?`, `هل تريد تفعيل ${unit.UnitName}؟`)
      : text(`Deactivate ${unit.UnitName}? It will remain available in historical records.`, `هل تريد إيقاف ${unit.UnitName}؟ ستظل موجودة في السجلات السابقة.`);
    if (!window.confirm(confirmMessage)) return;

    try {
      setChangingStatusID(unit.UnitID);
      const response = await fetch(`/api/supplyUnits/${unit.UnitID}`, {
        method: nextIsActive ? "PUT" : "DELETE",
        headers: { "Content-Type": "application/json" },
        ...(nextIsActive && {
          body: JSON.stringify({ UnitName: unit.UnitName, IsActive: true }),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to change unit status.");
      toast.success(nextIsActive ? text("Unit activated.", "تم تفعيل الوحدة.") : text("Unit deactivated.", "تم إيقاف الوحدة."));
      await loadUnits();
    } catch (error) {
      toast.error(error.message || "Failed to change unit status.");
    } finally {
      setChangingStatusID(null);
    }
  };

  const formatDate = (value) => {
    if (!value) return "—";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString();
  };

  return (
    <main className="supply-units-page" dir={isRTL ? "rtl" : "ltr"}>
      <header className="supply-units-header">
        <div>
          <h1>{text("Supply Units", "وحدات المستلزمات")}</h1>
          <p>{text("Manage the measurement units used for clinic supplies.", "إدارة وحدات القياس المستخدمة لمستلزمات العيادة.")}</p>
        </div>
        <button type="button" className="supply-units-button secondary" onClick={loadUnits} disabled={loading}>
          {loading ? text("Refreshing…", "جارٍ التحديث…") : text("Refresh", "تحديث")}
        </button>
      </header>

      <section className="supply-units-panel">
        <div className="supply-units-panel-heading">
          <div>
            <h2>{editingUnit ? text("Edit unit", "تعديل الوحدة") : text("Add a unit", "إضافة وحدة")}</h2>
            <p>{text("Examples: piece, box, pack, or milliliter.", "أمثلة: قطعة، صندوق، عبوة، أو ملليلتر.")}</p>
          </div>
          {editingUnit && <button type="button" className="supply-units-button secondary" onClick={startCreate}>{text("Cancel edit", "إلغاء التعديل")}</button>}
        </div>
        <form className="supply-units-form" onSubmit={saveUnit}>
          <label className="supply-units-field">
            <span>{text("Unit name", "اسم الوحدة")}</span>
            <input
              type="text"
              value={form.UnitName}
              onChange={(event) => setForm({ UnitName: event.target.value })}
              maxLength={50}
              placeholder={text("For example: Box", "مثال: صندوق")}
              required
            />
          </label>
          <button type="submit" className="supply-units-button primary" disabled={saving}>
            {saving ? text("Saving…", "جارٍ الحفظ…") : editingUnit ? text("Save changes", "حفظ التغييرات") : text("Add unit", "إضافة الوحدة")}
          </button>
        </form>
      </section>

      <section className="supply-units-panel">
        <div className="supply-units-panel-heading supply-units-list-heading">
          <div>
            <h2>{text("Units list", "قائمة الوحدات")}</h2>
            <p>{text("Inactive units remain in existing supply records.", "تظل الوحدات غير النشطة مرتبطة بالسجلات السابقة.")}</p>
          </div>
          <input
            className="supply-units-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={text("Search units…", "ابحث عن وحدة…")}
            aria-label={text("Search supply units", "البحث عن وحدات المستلزمات")}
          />
        </div>

        {loading ? (
          <div className="supply-units-empty">{text("Loading units…", "جارٍ تحميل الوحدات…")}</div>
        ) : filteredUnits.length === 0 ? (
          <div className="supply-units-empty">{search ? text("No matching units.", "لا توجد وحدات مطابقة.") : text("No units have been added yet.", "لم تتم إضافة وحدات بعد.")}</div>
        ) : (
          <div className="supply-units-table-wrap">
            <table className="supply-units-table">
              <thead><tr>
                <th>#</th>
                <th>{text("Unit name", "اسم الوحدة")}</th>
                <th>{text("Created", "تاريخ الإضافة")}</th>
                <th>{text("Status", "الحالة")}</th>
                <th>{text("Actions", "الإجراءات")}</th>
              </tr></thead>
              <tbody>{filteredUnits.map((unit, index) => (
                <tr key={unit.UnitID}>
                  <td>{index + 1}</td>
                  <td><strong>{unit.UnitName}</strong></td>
                  <td>{formatDate(unit.CreatedAt)}</td>
                  <td><span className={`supply-units-status ${unit.IsActive ? "active" : "inactive"}`}>{unit.IsActive ? text("Active", "نشطة") : text("Inactive", "غير نشطة")}</span></td>
                  <td>
                    <div className="supply-units-actions">
                      <button type="button" className="supply-units-button small secondary" onClick={() => startEdit(unit)}>{text("Edit", "تعديل")}</button>
                      <button
                        type="button"
                        className={`supply-units-button small ${unit.IsActive ? "danger" : "primary"}`}
                        onClick={() => changeActiveStatus(unit)}
                        disabled={changingStatusID === unit.UnitID}
                      >
                        {changingStatusID === unit.UnitID ? text("Saving…", "جارٍ الحفظ…") : unit.IsActive ? text("Deactivate", "إيقاف") : text("Activate", "تفعيل")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
};

export default SupplyUnitsPage;
