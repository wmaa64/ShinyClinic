import { useState } from "react";

// INITIAL FORM
const emptyForm = {
  AreaName: "",
  IsActive: true,
};

const TreatmentAreas = () => {
  const [treatmentAreas, setTreatmentAreas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // FORM / MODAL
  const [showForm, setShowForm] = useState(false);
  const [editingTreatmentArea, setEditingTreatmentArea] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);


  // =====================================================
  // SEARCH TREATMENT AREAS
  // =====================================================

  const searchTreatmentAreas = async () => {

    const searchValue = search.trim();

    if (!searchValue) {
      setTreatmentAreas([]);
      setHasSearched(false);
      return;
    }

    try {

      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/treatmentAreas?search=${encodeURIComponent(searchValue)}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to search treatment areas"
        );
      }

      setTreatmentAreas(data);
      setHasSearched(true);

    } catch (error) {

      console.error(
        "Search treatment areas error:",
        error
      );

      setError(
        error.message || "Failed to search treatment areas"
      );

    } finally {

      setLoading(false);

    }
  };


  // =====================================================
  // OPEN ADD TREATMENT AREA FORM
  // =====================================================

  const handleAddTreatmentArea = () => {

    setEditingTreatmentArea(null);

    setFormData({
      ...emptyForm,
    });

    setShowForm(true);
  };


  // =====================================================
  // OPEN EDIT TREATMENT AREA FORM
  // =====================================================

  const handleEditTreatmentArea = (treatmentArea) => {

    setEditingTreatmentArea(treatmentArea);

    setFormData({
      AreaName: treatmentArea.AreaName || "",
      IsActive: treatmentArea.IsActive ?? true,
    });

    setShowForm(true);
  };


  // =====================================================
  // CLOSE FORM
  // =====================================================

  const handleCloseForm = () => {

    if (saving) {
      return;
    }

    setShowForm(false);

    setEditingTreatmentArea(null);

    setFormData({
      ...emptyForm,
    });
  };


  // =====================================================
  // HANDLE FORM INPUT
  // =====================================================

  const handleChange = (event) => {

    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setFormData((current) => ({
      ...current,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };


  // =====================================================
  // SAVE / UPDATE TREATMENT AREA
  // =====================================================

  const handleSubmit = async (event) => {

    event.preventDefault();

    // BASIC VALIDATION
    if (
      !formData.AreaName ||
      !formData.AreaName.trim()
    ) {

      alert("Please enter the treatment area name.");

      return;
    }


    try {

      setSaving(true);

      const treatmentAreaData = {
        ...formData,

        AreaName: formData.AreaName.trim(),

        IsActive: Boolean(
          formData.IsActive
        ),
      };


      // =================================================
      // UPDATE EXISTING TREATMENT AREA
      // =================================================

      if (editingTreatmentArea) {

        const response = await fetch(
          `/api/treatmentAreas/${editingTreatmentArea.AreaID}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              treatmentAreaData
            ),
          }
        );


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data.message ||
            "Failed to update treatment area"
          );
        }


        // UPDATE TREATMENT AREA IN CURRENT LIST

        setTreatmentAreas(
          (currentTreatmentAreas) =>
            currentTreatmentAreas.map(
              (treatmentArea) =>
                treatmentArea.AreaID ===
                data.AreaID
                  ? data
                  : treatmentArea
            )
        );


        // CLOSE FORM

        handleCloseForm();

      }


      // =================================================
      // CREATE NEW TREATMENT AREA
      // =================================================

      else {

        const response = await fetch(
          "/api/treatmentAreas",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              treatmentAreaData
            ),
          }
        );


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data.message ||
            "Failed to create treatment area"
          );
        }


        // ADD NEW TREATMENT AREA TO TOP OF LIST

        setTreatmentAreas(
          (currentTreatmentAreas) => [
            data,
            ...currentTreatmentAreas,
          ]
        );


        // CLOSE FORM

        handleCloseForm();
      }

    } catch (error) {

      console.error(
        "Error saving treatment area:",
        error
      );

      alert(
        error.message ||
        "Unable to save treatment area."
      );

    } finally {

      setSaving(false);

    }
  };


  // =====================================================
  // DELETE TREATMENT AREA
  // =====================================================

  const handleDeleteTreatmentArea = async (
    treatmentArea
  ) => {

    const confirmed =
      window.confirm(
        `Are you sure you want to delete ${treatmentArea.AreaName}?`
      );


    if (!confirmed) {
      return;
    }


    try {

      const response = await fetch(
        `/api/treatmentAreas/${treatmentArea.AreaID}`,
        {
          method: "DELETE",
        }
      );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.message ||
          "Failed to delete treatment area"
        );
      }


      // REMOVE FROM CURRENT LIST

      setTreatmentAreas(
        (currentTreatmentAreas) =>
          currentTreatmentAreas.filter(
            (item) =>
              item.AreaID !==
              treatmentArea.AreaID
          )
      );

    } catch (error) {

      console.error(
        "Error deleting treatment area:",
        error
      );

      alert(
        error.message ||
        "Unable to delete treatment area."
      );
    }
  };


  // =====================================================
  // FILTER TREATMENT AREAS
  // =====================================================

  const filteredTreatmentAreas =
    treatmentAreas.filter(
      (treatmentArea) => {

        const searchText =
          search
            .toLowerCase()
            .trim();


        // Show everything if search is empty

        if (!searchText) {
          return true;
        }


        return (
          String(
            treatmentArea.AreaID
          )
            .toLowerCase()
            .includes(searchText)

          ||

          (
            treatmentArea.AreaName ||
            ""
          )
            .toLowerCase()
            .includes(searchText)
        );
      }
    );


  return (

    <div className="subject-page">


      {/* ==================================================
          PAGE HEADER
      ================================================== */}

      <div className="subject-header">

        <h1 className="subject-title">
          Treatment Areas
        </h1>


        <button
          type="button"
          className="subject-add-button"
          onClick={
            handleAddTreatmentArea
          }
        >

          <span className="subject-add-icon">
            +
          </span>

          Add Treatment Area

        </button>

      </div>


      {/* ==================================================
          SEARCH BAR
      ================================================== */}

      <div className="subject-toolbar">

        <div className="subject-search">

          <span className="subject-search-icon">
            🔍
          </span>


          <input
            type="text"
            value={search}
            placeholder="Search by treatment area name..."
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            onKeyDown={(event) => {

              if (
                event.key === "Enter"
              ) {

                searchTreatmentAreas();

              }

            }}
          />


          <button
            type="button"
            onClick={
              searchTreatmentAreas
            }
            disabled={loading}
          >

            {loading
              ? "Searching..."
              : "Search"
            }

          </button>

        </div>


        <div className="subject-count">

          {!hasSearched
            ? ""
            : loading
            ? "Searching..."
            : `${filteredTreatmentAreas.length} treatment area${
                filteredTreatmentAreas.length === 1
                  ? ""
                  : "s"
              }`
          }

        </div>

      </div>


      {/* ==================================================
          ERROR
      ================================================== */}

      {error && (

        <div className="subject-error">
          {error}
        </div>

      )}


      {/* ==================================================
          TREATMENT AREAS RESULTS
      ================================================== */}

      {loading ? (

        <div className="subject-loading">
          Searching treatment areas...
        </div>

      ) : !hasSearched ? (

        <div className="subject-search-message">
          Search for a treatment area to display results.
        </div>

      ) : filteredTreatmentAreas.length === 0 ? (

        <div className="subject-search-message">
          No treatment areas found.
        </div>

      ) : (

        <div className="subject-table-wrapper">

          <table className="subject-table">

            <thead>

              <tr>

                <th>
                  ID
                </th>

                <th>
                  Area Name
                </th>

                <th>
                  Status
                </th>

                <th>
                  Actions
                </th>

              </tr>

            </thead>


            <tbody>

              {filteredTreatmentAreas.map(
                (treatmentArea) => (

                  <tr
                    key={
                      treatmentArea.AreaID
                    }
                  >

                    <td>
                      {
                        treatmentArea.AreaID
                      }
                    </td>


                    <td>

                      <div className="subject-name">

                        {
                          treatmentArea.AreaName ||
                          "-"
                        }

                      </div>

                    </td>


                    <td>

                      {
                        treatmentArea.IsActive
                          ? "Active"
                          : "Inactive"
                      }

                    </td>


                    <td>

                      <div className="subject-actions">

                        <button
                          type="button"
                          className="subject-edit-button"
                          onClick={() =>
                            handleEditTreatmentArea(
                              treatmentArea
                            )
                          }
                        >
                          Edit
                        </button>


                        <button
                          type="button"
                          className="subject-delete-button"
                          onClick={() =>
                            handleDeleteTreatmentArea(
                              treatmentArea
                            )
                          }
                        >
                          Delete
                        </button>

                      </div>

                    </td>

                  </tr>

                )
              )}

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
              event.target ===
              event.currentTarget
            ) {

              handleCloseForm();

            }

          }}
        >

          <div className="subject-modal">


            {/* ==================================================
                MODAL HEADER
            ================================================== */}

            <div className="subject-modal-header">

              <div>

                <h2>

                  {editingTreatmentArea
                    ? "Edit Treatment Area"
                    : "Add New Treatment Area"
                  }

                </h2>


                <p>

                  {editingTreatmentArea
                    ? "Update treatment area information"
                    : "Enter treatment area information"
                  }

                </p>

              </div>


              <button
                type="button"
                className="subject-close-button"
                onClick={
                  handleCloseForm
                }
                disabled={saving}
              >
                ×
              </button>

            </div>


            {/* ==================================================
                FORM
            ================================================== */}

            <form
              className="subject-form"
              onSubmit={handleSubmit}
            >

              <div className="subject-form-grid">


                {/* ==================================================
                    AREA NAME
                ================================================== */}

                <div className="subject-form-group subject-full-width">

                  <label>
                    Area Name *
                  </label>


                  <input
                    type="text"
                    name="AreaName"
                    value={
                      formData.AreaName
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Enter treatment area name"
                    required
                  />

                </div>


                {/* ==================================================
                    ACTIVE STATUS
                ================================================== */}

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
                      checked={
                        formData.IsActive
                      }
                      onChange={
                        handleChange
                      }
                    />

                    Active

                  </label>

                </div>

              </div>


              {/* ==================================================
                  FORM BUTTONS
              ================================================== */}

              <div className="subject-form-actions">


                <button
                  type="button"
                  className="subject-cancel-button"
                  onClick={
                    handleCloseForm
                  }
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
                    : editingTreatmentArea
                    ? "Update Treatment Area"
                    : "Save Treatment Area"
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


export default TreatmentAreas;