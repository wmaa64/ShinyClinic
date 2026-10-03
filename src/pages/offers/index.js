import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const emptyForm = {
  OfferName: "",
  GivenQuantity: "",
  ForPrice: "",
  CategoryID: "",
  IsActive: true,
  Notes: "",
};

const OffersPage = () => {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  const [offers, setOffers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoriesLoading(true);
        const response = await fetch("/api/offers?categories=true");
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to load offer categories.");
        setCategories(data);
      } catch (loadError) {
        setError(loadError.message || "Failed to load offer categories.");
      } finally {
        setCategoriesLoading(false);
      }
    };
    loadCategories();
  }, []);

  const searchOffers = async (query = search) => {
    const searchValue = query.trim();
    if (!searchValue) {
      setOffers([]);
      setHasSearched(false);
      setError("");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await fetch(`/api/offers/search?search=${encodeURIComponent(searchValue)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to search offers.");
      setOffers(data);
      setHasSearched(true);
    } catch (searchError) {
      setError(searchError.message || "Failed to search offers.");
    } finally {
      setLoading(false);
    }
  };

  const openAddForm = () => {
    setEditingOffer(null);
    setFormData({ ...emptyForm });
    setError("");
    setShowForm(true);
  };

  const openEditForm = (offer) => {
    setEditingOffer(offer);
    setFormData({
      OfferName: offer.OfferName || "",
      GivenQuantity: offer.GivenQuantity ?? "",
      ForPrice: offer.ForPrice ?? "",
      CategoryID: offer.CategoryID ? String(offer.CategoryID) : "",
      IsActive: Boolean(offer.IsActive),
      Notes: offer.Notes || "",
    });
    setError("");
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setEditingOffer(null);
    setFormData({ ...emptyForm });
    setError("");
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.OfferName.trim()) {
      setError(isRTL ? "يرجى إدخال اسم العرض." : "Please enter an offer name.");
      return;
    }
    if (!Number.isFinite(Number(formData.GivenQuantity)) || Number(formData.GivenQuantity) <= 0) {
      setError(isRTL ? "يجب أن تكون الكمية أكبر من صفر." : "Quantity must be greater than zero.");
      return;
    }
    if (formData.ForPrice === "" || !Number.isFinite(Number(formData.ForPrice)) || Number(formData.ForPrice) < 0) {
      setError(isRTL ? "يرجى إدخال سعر صالح." : "Please enter a valid offer price.");
      return;
    }
    if (!formData.CategoryID) {
      setError(isRTL ? "يرجى اختيار فئة العرض." : "Please select an offer category.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const response = await fetch(editingOffer ? `/api/offers/${editingOffer.OfferID}` : "/api/offers", {
        method: editingOffer ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          GivenQuantity: Number(formData.GivenQuantity),
          ForPrice: Number(formData.ForPrice),
          CategoryID: Number(formData.CategoryID),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || (editingOffer ? "Failed to update offer." : "Failed to create offer."));

      setOffers((current) => editingOffer
        ? current.map((item) => item.OfferID === data.OfferID ? data : item)
        : [data, ...current]);
      setHasSearched(true);
      setShowForm(false);
      setEditingOffer(null);
      setFormData({ ...emptyForm });
    } catch (saveError) {
      setError(saveError.message || "Unable to save offer.");
    } finally {
      setSaving(false);
    }
  };

  const unitPrice = Number(formData.GivenQuantity) > 0 && Number(formData.ForPrice) >= 0
    ? Number(formData.ForPrice) / Number(formData.GivenQuantity)
    : null;

  return (
    <main className="offers-page" dir={isRTL ? "rtl" : "ltr"}>
      <header className="offers-header">
        <div>
          <h1>{isRTL ? "العروض" : "Offers"}</h1>
          <p>{isRTL ? "إدارة عروض العيادة" : "Manage clinic offers"}</p>
        </div>
        <button type="button" className="offers-add-button" onClick={openAddForm}>
          <span aria-hidden="true">+</span> {isRTL ? "إضافة عرض" : "Add Offer"}
        </button>
      </header>

      <section className="offers-section">
        <div className="offers-toolbar">
          <form className="offers-search" onSubmit={(event) => { event.preventDefault(); searchOffers(); }}>
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={isRTL ? "ابحث باسم العرض أو الفئة..." : "Search offers by name or category..."}
              aria-label={isRTL ? "البحث عن العروض" : "Search offers"}
            />
            <button type="submit" disabled={loading}>
              {loading ? (isRTL ? "جارٍ البحث..." : "Searching...") : (isRTL ? "بحث" : "Search")}
            </button>
          </form>
          <span className="offers-count">
            {hasSearched ? (isRTL ? `${offers.length} عرض` : `${offers.length} offer${offers.length === 1 ? "" : "s"}`) : ""}
          </span>
        </div>

        {error && <div className="offers-error" role="alert">{error}</div>}
        {loading ? (
          <div className="offers-message">{isRTL ? "جارٍ تحميل العروض..." : "Loading offers..."}</div>
        ) : !hasSearched ? (
          <div className="offers-message">{isRTL ? "ابحث عن عرض لعرض النتائج." : "Search for an offer to display results."}</div>
        ) : offers.length === 0 ? (
          <div className="offers-message">{isRTL ? "لم يتم العثور على عروض." : "No offers found."}</div>
        ) : (
          <div className="offers-table-wrap">
            <table className="offers-table">
              <thead>
                <tr>
                  <th>{isRTL ? "المعرف" : "ID"}</th>
                  <th>{isRTL ? "اسم العرض" : "Offer Name"}</th>
                  <th>{isRTL ? "الفئة" : "Category"}</th>
                  <th>{isRTL ? "الكمية" : "Quantity"}</th>
                  <th>{isRTL ? "السعر" : "Offer Price"}</th>
                  <th>{isRTL ? "سعر الوحدة" : "Unit Price"}</th>
                  <th>{isRTL ? "الحالة" : "Status"}</th>
                  <th>{isRTL ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((offer) => (
                  <tr key={offer.OfferID}>
                    <td>{offer.OfferID}</td>
                    <td className="offers-name-cell">{offer.OfferName || "-"}</td>
                    <td>{offer.CategoryName || "-"}</td>
                    <td>{Number(offer.GivenQuantity || 0).toLocaleString()}</td>
                    <td>{Number(offer.ForPrice || 0).toFixed(2)} EGP</td>
                    <td>{Number(offer.ForUnitPrice || 0).toFixed(2)} EGP</td>
                    <td><span className={offer.IsActive ? "offers-status-active" : "offers-status-inactive"}>
                      {offer.IsActive ? (isRTL ? "نشط" : "Active") : (isRTL ? "غير نشط" : "Inactive")}
                    </span></td>
                    <td><button type="button" className="offers-edit-button" onClick={() => openEditForm(offer)}>
                      {isRTL ? "تعديل" : "Edit"}
                    </button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showForm && (
        <div className="offers-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}>
          <section className="offers-modal" role="dialog" aria-modal="true" aria-labelledby="offers-form-title" dir={isRTL ? "rtl" : "ltr"}>
            <header className="offers-modal-header">
              <div>
                <h2 id="offers-form-title">{editingOffer ? (isRTL ? "تعديل العرض" : "Edit Offer") : (isRTL ? "إضافة عرض جديد" : "Add New Offer")}</h2>
                <p>{isRTL ? "أدخل تفاصيل العرض" : "Enter the offer details"}</p>
              </div>
              <button type="button" className="offers-close-button" onClick={closeForm} disabled={saving} aria-label={isRTL ? "إغلاق" : "Close"}>×</button>
            </header>

            {error && <div className="offers-error offers-modal-error" role="alert">{error}</div>}
            <form className="offers-form" onSubmit={handleSubmit}>
              <div className="offers-form-grid">
                <div className="offers-form-group offers-form-full">
                  <label htmlFor="offer-name">{isRTL ? "اسم العرض *" : "Offer Name *"}</label>
                  <input id="offer-name" name="OfferName" value={formData.OfferName} onChange={handleChange} maxLength={150} required />
                </div>
                <div className="offers-form-group">
                  <label htmlFor="offer-category">{isRTL ? "الفئة *" : "Category *"}</label>
                  <select id="offer-category" name="CategoryID" value={formData.CategoryID} onChange={handleChange} disabled={categoriesLoading || categories.length === 0} required>
                    <option value="">{categoriesLoading ? (isRTL ? "جارٍ تحميل الفئات..." : "Loading categories...") : (isRTL ? "اختر الفئة" : "Select a category")}</option>
                    {categories.map((category) => <option key={category.CategoryID} value={category.CategoryID}>{category.CategoryName}</option>)}
                  </select>
                </div>
                <div className="offers-form-group">
                  <label htmlFor="offer-quantity">{isRTL ? "الكمية المشمولة *" : "Included Quantity *"}</label>
                  <input id="offer-quantity" type="number" name="GivenQuantity" min="0.01" step="0.01" value={formData.GivenQuantity} onChange={handleChange} required />
                </div>
                <div className="offers-form-group">
                  <label htmlFor="offer-price">{isRTL ? "سعر العرض (جنيه) *" : "Offer Price (EGP) *"}</label>
                  <input id="offer-price" type="number" name="ForPrice" min="0" step="0.01" value={formData.ForPrice} onChange={handleChange} required />
                </div>
                <div className="offers-form-group">
                  <label>{isRTL ? "سعر الوحدة المحسوب" : "Calculated Unit Price"}</label>
                  <output className="offers-unit-price">{unitPrice === null ? "—" : `${unitPrice.toFixed(2)} EGP`}</output>
                </div>
                <label className="offers-active-toggle">
                  <input type="checkbox" name="IsActive" checked={formData.IsActive} onChange={handleChange} />
                  <span>{isRTL ? "العرض نشط" : "Offer is active"}</span>
                </label>
                <div className="offers-form-group offers-form-full">
                  <label htmlFor="offer-notes">{isRTL ? "ملاحظات" : "Notes"}</label>
                  <textarea id="offer-notes" name="Notes" value={formData.Notes} onChange={handleChange} maxLength={500} rows={3} />
                </div>
              </div>
              <footer className="offers-form-actions">
                <button type="button" className="offers-cancel-button" onClick={closeForm} disabled={saving}>{isRTL ? "إلغاء" : "Cancel"}</button>
                <button type="submit" className="offers-save-button" disabled={saving || categoriesLoading || categories.length === 0}>
                  {saving ? (isRTL ? "جارٍ الحفظ..." : "Saving...") : editingOffer ? (isRTL ? "تحديث العرض" : "Update Offer") : (isRTL ? "حفظ العرض" : "Save Offer")}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
};

export default OffersPage;
