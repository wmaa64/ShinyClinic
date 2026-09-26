import { useState } from "react";

// INITIAL FORM
const emptyForm = {
  LaserTypeName: "",
  IsActive: true,
  SortOrder: 0,
};

const LaserTypes = () => {
  const [laserTypes, setLaserTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // FORM / MODAL
  const [showForm, setShowForm] = useState(false);
  const [editingLaserType, setEditingLaserType] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);


  // =====================================================
  // SEARCH LASER TYPES
  // =====================================================

  const searchLaserTypes = async () => {

    const searchValue = search.trim();

    if (!searchValue) {
      setLaserTypes([]);
      setHasSearched(false);
      return;
    }

    try {

      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/laserTypes?search=${encodeURIComponent(searchValue)}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to search laser types"
        );
      }

      setLaserTypes(data);
      setHasSearched(true);

    } catch (error) {

      console.error(
        "Search laser types error:",
        error
      );

      setError(
        error.message || "Failed to search laser types"
      );

    } finally {

      setLoading(false);

    }
  };


  // =====================================================
  // OPEN ADD LASER TYPE FORM
  // =====================================================

  const handleAddLaserType = () => {

    setEditingLaserType(null);

    setFormData({
      ...emptyForm,
    });

    setShowForm(true);
  };


  // =====================================================
  // OPEN EDIT LASER TYPE FORM
  // =====================================================

  const handleEditLaserType = (laserType) => {

    setEditingLaserType(laserType);

    setFormData({
      LaserTypeName: laserType.LaserTypeName || "",
      IsActive: laserType.IsActive ?? true,
      SortOrder: laserType.SortOrder ?? 0,
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

    setEditingLaserType(null);

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
  // SAVE / UPDATE LASER TYPE
  // =====================================================

  const handleSubmit = async (event) => {

    event.preventDefault();

    // BASIC VALIDATION
    if (
      !formData.LaserTypeName ||
      !formData.LaserTypeName.trim()
    ) {

      alert("Please enter the laser type name.");

      return;
    }


    try {

      setSaving(true);

      const laserTypeData = {
        ...formData,

        LaserTypeName:
          formData.LaserTypeName.trim(),

        SortOrder:
          formData.SortOrder === ""
            ? 0
            : Number(formData.SortOrder),

        IsActive:
          Boolean(formData.IsActive),
      };


      // =================================================
      // UPDATE EXISTING LASER TYPE
      // =================================================

      if (editingLaserType) {

        const response = await fetch(
          `/api/laserTypes/${editingLaserType.LaserTypeID}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              laserTypeData
            ),
          }
        );


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data.message ||
            "Failed to update laser type"
          );
        }


        // UPDATE LASER TYPE IN CURRENT LIST

        setLaserTypes(
          (currentLaserTypes) =>
            currentLaserTypes.map(
              (laserType) =>
                laserType.LaserTypeID ===
                data.LaserTypeID
                  ? data
                  : laserType
            )
        );


        // CLOSE FORM

        handleCloseForm();

      }


      // =================================================
      // CREATE NEW LASER TYPE
      // =================================================

      else {

        const response = await fetch(
          "/api/laserTypes",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              laserTypeData
            ),
          }
        );


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data.message ||
            "Failed to create laser type"
          );
        }


        // ADD NEW LASER TYPE TO TOP OF LIST

        setLaserTypes(
          (currentLaserTypes) => [
            data,
            ...currentLaserTypes,
          ]
        );


        // CLOSE FORM

        handleCloseForm();
      }

    } catch (error) {

      console.error(
        "Error saving laser type:",
        error
      );

      alert(
        error.message ||
        "Unable to save laser type."
      );

    } finally {

      setSaving(false);

    }
  };


  // =====================================================
  // DELETE LASER TYPE
  // =====================================================

  const handleDeleteLaserType = async (
    laserType
  ) => {

    const confirmed =
      window.confirm(
        `Are you sure you want to delete ${laserType.LaserTypeName}?`
      );


    if (!confirmed) {
      return;
    }


    try {

      const response = await fetch(
        `/api/laserTypes/${laserType.LaserTypeID}`,
        {
          method: "DELETE",
        }
      );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.message ||
          "Failed to delete laser type"
        );
      }


      // REMOVE FROM CURRENT LIST

      setLaserTypes(
        (currentLaserTypes) =>
          currentLaserTypes.filter(
            (item) =>
              item.LaserTypeID !==
              laserType.LaserTypeID
          )
      );

    } catch (error) {

      console.error(
        "Error deleting laser type:",
        error
      );

      alert(
        error.message ||
        "Unable to delete laser type."
      );
    }
  };


  // =====================================================
  // FILTER LASER TYPES
  // =====================================================

  const filteredLaserTypes =
    laserTypes.filter(
      (laserType) => {

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
            laserType.LaserTypeID
          )
            .toLowerCase()
            .includes(searchText)

          ||

          (
            laserType.LaserTypeName ||
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
          Laser Types
        </h1>


        <button
          type="button"
          className="subject-add-button"
          onClick={
            handleAddLaserType
          }
        >

          <span className="subject-add-icon">
            +
          </span>

          Add Laser Type

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
            placeholder="Search by laser type name..."
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            onKeyDown={(event) => {

              if (
                event.key === "Enter"
              ) {

                searchLaserTypes();

              }

            }}
          />


          <button
            type="button"
            onClick={
              searchLaserTypes
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
            : `${filteredLaserTypes.length} laser type${
                filteredLaserTypes.length === 1
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
          LASER TYPES RESULTS
      ================================================== */}

      {loading ? (

        <div className="subject-loading">
          Searching laser types...
        </div>

      ) : !hasSearched ? (

        <div className="subject-search-message">
          Search for a laser type to display results.
        </div>

      ) : filteredLaserTypes.length === 0 ? (

        <div className="subject-search-message">
          No laser types found.
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
                  Laser Type Name
                </th>

                <th>
                  Sort Order
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

              {filteredLaserTypes.map(
                (laserType) => (

                  <tr
                    key={
                      laserType.LaserTypeID
                    }
                  >

                    <td>
                      {
                        laserType.LaserTypeID
                      }
                    </td>


                    <td>

                      <div className="subject-name">

                        {
                          laserType.LaserTypeName ||
                          "-"
                        }

                      </div>

                    </td>


                    <td>
                      {
                        laserType.SortOrder
                      }
                    </td>


                    <td>

                      {
                        laserType.IsActive
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
                            handleEditLaserType(
                              laserType
                            )
                          }
                        >
                          Edit
                        </button>


                        <button
                          type="button"
                          className="subject-delete-button"
                          onClick={() =>
                            handleDeleteLaserType(
                              laserType
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

                  {editingLaserType
                    ? "Edit Laser Type"
                    : "Add New Laser Type"
                  }

                </h2>


                <p>

                  {editingLaserType
                    ? "Update laser type information"
                    : "Enter laser type information"
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
                    LASER TYPE NAME
                ================================================== */}

                <div className="subject-form-group subject-full-width">

                  <label>
                    Laser Type Name *
                  </label>


                  <input
                    type="text"
                    name="LaserTypeName"
                    value={
                      formData.LaserTypeName
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Enter laser type name"
                    required
                  />

                </div>


                {/* ==================================================
                    SORT ORDER
                ================================================== */}

                <div className="subject-form-group">

                  <label>
                    Sort Order
                  </label>


                  <input
                    type="number"
                    name="SortOrder"
                    value={
                      formData.SortOrder
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Sort order"
                    min="0"
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
                    : editingLaserType
                    ? "Update Laser Type"
                    : "Save Laser Type"
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


export default LaserTypes;