import { useState } from "react";

// INITIAL FORM
const emptyForm = {
  ServiceName: "",
  CategoryID: "",
  DefaultPrice: "",
  IsActive: true,
  Notes: "",
};

const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // FORM / MODAL
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // SEARCH SERVICES
  const searchServices = async () => {
    const searchValue = search.trim();

    if (!searchValue) {
      setServices([]);
      setHasSearched(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/services?search=${encodeURIComponent(searchValue)}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to search services"
        );
      }

      setServices(data);
      setHasSearched(true);

    } catch (error) {

      console.error("Search services error:", error);
      setError(error.message || "Failed to search services");

    } finally {

      setLoading(false);

    }
  };

  // OPEN ADD SERVICE FORM
  const handleAddService = () => {
    setEditingService(null);
    setFormData({ ...emptyForm });
    setShowForm(true);
  };

  // OPEN EDIT SERVICE FORM
  const handleEditService = (service) => {
    setEditingService(service);

    setFormData({
      ServiceName: service.ServiceName || "",
      CategoryID: service.CategoryID ?? "",
      DefaultPrice: service.DefaultPrice ?? "",
      IsActive: service.IsActive ?? true,
      Notes: service.Notes || "",
    });

    setShowForm(true);
  };

  // CLOSE FORM
  const handleCloseForm = () => {
    if (saving) {
      return;
    }

    setShowForm(false);
    setEditingService(null);
    setFormData({ ...emptyForm });
  };

  // HANDLE FORM INPUT
  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // SAVE / UPDATE SERVICE
  const handleSubmit = async (event) => {
    event.preventDefault();

    // BASIC VALIDATION
    if (!formData.ServiceName || !formData.ServiceName.trim()) {
      alert("Please enter the service name.");
      return;
    }

    try {
      setSaving(true);

      const serviceData = {
        ...formData,

        CategoryID:
          formData.CategoryID === ""
            ? null
            : Number(formData.CategoryID),

        DefaultPrice:
          formData.DefaultPrice === ""
            ? 0
            : Number(formData.DefaultPrice),

        IsActive: Boolean(formData.IsActive),
      };

      // UPDATE EXISTING SERVICE
      if (editingService) {
        const response = await fetch(
          `/api/services/${editingService.ServiceID}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(serviceData),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to update service"
          );
        }

        // UPDATE SERVICE IN CURRENT LIST
        setServices((currentServices) =>
          currentServices.map((service) =>
            service.ServiceID === data.ServiceID
              ? data
              : service
          )
        );

        // CLOSE FORM
        handleCloseForm();
      }

      // CREATE NEW SERVICE
      else {
        const response = await fetch("/api/services", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(serviceData),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to create service"
          );
        }

        // ADD NEW SERVICE TO TOP OF LIST
        setServices((currentServices) => [
          data,
          ...currentServices,
        ]);

        // CLOSE FORM
        handleCloseForm();
      }

    } catch (error) {

      console.error("Error saving service:", error);
      alert(error.message || "Unable to save service.");

    } finally {

      setSaving(false);

    }
  };

  // DELETE SERVICE
  const handleDeleteService = async (service) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${service.ServiceName}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `/api/services/${service.ServiceID}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to delete service"
        );
      }

      // REMOVE FROM CURRENT LIST
      setServices((currentServices) =>
        currentServices.filter(
          (item) => item.ServiceID !== service.ServiceID
        )
      );

    } catch (error) {

      console.error("Error deleting service:", error);
      alert(error.message || "Unable to delete service.");

    }
  };

  // FILTER SERVICES
  const filteredServices = services.filter((service) => {
    const searchText = search.toLowerCase().trim();

    // Show everything if search is empty
    if (!searchText) {
      return true;
    }

    return (
      String(service.ServiceID)
        .toLowerCase()
        .includes(searchText) ||

      (service.ServiceName || "")
        .toLowerCase()
        .includes(searchText) ||

      (service.CategoryName || "")
        .toLowerCase()
        .includes(searchText)
    );
  });

  return (
    <div className="subject-page">

      {/* PAGE HEADER ================================================== */}
      <div className="subject-header">

        <h1 className="subject-title">
          Services
        </h1>

        <button
          type="button"
          className="subject-add-button"
          onClick={handleAddService}
        >
          <span className="subject-add-icon">+</span>

          Add Service

        </button>

      </div>


      {/* SEARCH BAR ================================================== */}
      <div className="subject-toolbar">

        <div className="subject-search">

          <span className="subject-search-icon">
            🔍
          </span>

          <input
            type="text"
            value={search}
            placeholder="Search by service name or category..."
            onChange={(event) =>
              setSearch(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                searchServices();
              }
            }}
          />

          <button
            type="button"
            onClick={searchServices}
            disabled={loading}
          >
            {loading ? "Searching..." : "Search"}
          </button>

        </div>

        <div className="subject-count">

          {!hasSearched
            ? ""
            : loading
            ? "Searching..."
            : `${filteredServices.length} service${
                filteredServices.length === 1
                  ? ""
                  : "s"
              }`
          }

        </div>

      </div>


      {/* ERROR ================================================== */}
      {error && (
        <div className="subject-error">
          {error}
        </div>
      )}


      {/* SERVICES RESULTS ================================================== */}
      {loading ? (

        <div className="subject-loading">
          Searching services...
        </div>

      ) : !hasSearched ? (

        <div className="subject-search-message">
          Search for a service to display results.
        </div>

      ) : filteredServices.length === 0 ? (

        <div className="subject-search-message">
          No services found.
        </div>

      ) : (

        <div className="subject-table-wrapper">

          <table className="subject-table">

            <thead>

              <tr>
                <th>ID</th>
                <th>Service Name</th>
                <th>Category</th>
                <th>Default Price</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>

            </thead>

            <tbody>

              {filteredServices.map((service) => (

                <tr key={service.ServiceID}>

                  <td>
                    {service.ServiceID}
                  </td>

                  <td>
                    <div className="subject-name">
                      {service.ServiceName || "-"}
                    </div>
                  </td>

                  <td>
                    {service.CategoryName || "-"}
                  </td>

                  <td>
                    {service.DefaultPrice ?? "-"}
                  </td>

                  <td>
                    {service.IsActive ? "Active" : "Inactive"}
                  </td>

                  <td>
                    {service.CreatedAt
                      ? new Date(
                          service.CreatedAt
                        ).toLocaleDateString()
                      : "-"
                    }
                  </td>

                  <td>

                    <div className="subject-actions">

                      <button
                        type="button"
                        className="subject-edit-button"
                        onClick={() =>
                          handleEditService(service)
                        }
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="subject-delete-button"
                        onClick={() =>
                          handleDeleteService(service)
                        }
                      >
                        Delete
                      </button>

                    </div>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      )}


      {/* ==================================================
          ADD / EDIT MODAL
      ================================================== */}

      {showForm && (

        <div
          className="subject-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              handleCloseForm();
            }
          }}
        >

          <div className="subject-modal">

            {/* MODAL HEADER */}
            <div className="subject-modal-header">

              <div>

                <h2>
                  {editingService
                    ? "Edit Service"
                    : "Add New Service"
                  }
                </h2>

                <p>
                  {editingService
                    ? "Update service information"
                    : "Enter service information"
                  }
                </p>

              </div>

              <button
                type="button"
                className="subject-close-button"
                onClick={handleCloseForm}
                disabled={saving}
              >
                ×
              </button>

            </div>


            {/* FORM ========================================== */}
            <form
              className="subject-form"
              onSubmit={handleSubmit}
            >

              <div className="subject-form-grid">

                {/* SERVICE NAME -------------------------------------- */}
                <div className="subject-form-group subject-full-width">

                  <label>
                    Service Name *
                  </label>

                  <input
                    type="text"
                    name="ServiceName"
                    value={formData.ServiceName}
                    onChange={handleChange}
                    placeholder="Enter service name"
                    required
                  />

                </div>


                {/* CATEGORY -------------------------------------- */}
                <div className="subject-form-group">

                  <label>
                    Category ID
                  </label>

                  <input
                    type="number"
                    name="CategoryID"
                    value={formData.CategoryID}
                    onChange={handleChange}
                    placeholder="Category ID"
                    min="1"
                  />

                </div>


                {/* DEFAULT PRICE -------------------------------------- */}
                <div className="subject-form-group">

                  <label>
                    Default Price
                  </label>

                  <input
                    type="number"
                    name="DefaultPrice"
                    value={formData.DefaultPrice}
                    onChange={handleChange}
                    placeholder="Service price"
                    min="0"
                    step="0.01"
                  />

                </div>


                {/* ACTIVE STATUS -------------------------------------- */}
                <div className="subject-form-group">

                  <label>
                    Status
                  </label>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                    }}
                  >

                    <input
                      type="checkbox"
                      name="IsActive"
                      checked={formData.IsActive}
                      onChange={handleChange}
                    />

                    Active

                  </label>

                </div>


                {/* NOTES -------------------------------------- */}
                <div className="subject-form-group subject-full-width">

                  <label>
                    Notes
                  </label>

                  <textarea
                    name="Notes"
                    value={formData.Notes}
                    onChange={handleChange}
                    placeholder="Additional notes"
                    rows="4"
                  />

                </div>

              </div>


              {/* FORM BUTTONS */}
              <div className="subject-form-actions">

                <button
                  type="button"
                  className="subject-cancel-button"
                  onClick={handleCloseForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="subject-save-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingService
                    ? "Update Service"
                    : "Save Service"
                  }
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
};

export default Services;