import { useState } from "react";

// INITIAL FORM
const emptyForm = {
  DeviceName: "",
  Manufacturer: "",
  DeviceType: "",
  IsActive: true,
};

const Devices = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // FORM / MODAL
  const [showForm, setShowForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // SEARCH DEVICES
  const searchDevices = async () => {
    const searchValue = search.trim();

    if (!searchValue) {
      setDevices([]);
      setHasSearched(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/devices?search=${encodeURIComponent(searchValue)}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to search devices"
        );
      }

      setDevices(data);
      setHasSearched(true);

    } catch (error) {

      console.error("Search devices error:", error);
      setError(error.message || "Failed to search devices");

    } finally {

      setLoading(false);

    }
  };

  // OPEN ADD DEVICE FORM
  const handleAddDevice = () => {
    setEditingDevice(null);
    setFormData({ ...emptyForm });
    setShowForm(true);
  };

  // OPEN EDIT DEVICE FORM
  const handleEditDevice = (device) => {
    setEditingDevice(device);

    setFormData({
      DeviceName: device.DeviceName || "",
      Manufacturer: device.Manufacturer || "",
      DeviceType: device.DeviceType || "",
      IsActive: device.IsActive ?? true,
    });

    setShowForm(true);
  };

  // CLOSE FORM
  const handleCloseForm = () => {
    if (saving) {
      return;
    }

    setShowForm(false);
    setEditingDevice(null);
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

  // SAVE / UPDATE DEVICE
  const handleSubmit = async (event) => {
    event.preventDefault();

    // BASIC VALIDATION
    if (!formData.DeviceName || !formData.DeviceName.trim()) {
      alert("Please enter the device name.");
      return;
    }

    try {
      setSaving(true);

      const deviceData = {
        ...formData,
        DeviceName: formData.DeviceName.trim(),
        Manufacturer: formData.Manufacturer.trim(),
        DeviceType: formData.DeviceType.trim(),
        IsActive: Boolean(formData.IsActive),
      };

      // UPDATE EXISTING DEVICE
      if (editingDevice) {
        const response = await fetch(
          `/api/devices/${editingDevice.DeviceID}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(deviceData),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to update device"
          );
        }

        // UPDATE DEVICE IN CURRENT LIST
        setDevices((currentDevices) =>
          currentDevices.map((device) =>
            device.DeviceID === data.DeviceID
              ? data
              : device
          )
        );

        // CLOSE FORM
        handleCloseForm();
      }

      // CREATE NEW DEVICE
      else {
        const response = await fetch("/api/devices", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(deviceData),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to create device"
          );
        }

        // ADD NEW DEVICE TO TOP OF LIST
        setDevices((currentDevices) => [
          data,
          ...currentDevices,
        ]);

        // CLOSE FORM
        handleCloseForm();
      }

    } catch (error) {

      console.error("Error saving device:", error);
      alert(error.message || "Unable to save device.");

    } finally {

      setSaving(false);

    }
  };

  // DELETE DEVICE
  const handleDeleteDevice = async (device) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${device.DeviceName}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `/api/devices/${device.DeviceID}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to delete device"
        );
      }

      // REMOVE FROM CURRENT LIST
      setDevices((currentDevices) =>
        currentDevices.filter(
          (item) => item.DeviceID !== device.DeviceID
        )
      );

    } catch (error) {

      console.error("Error deleting device:", error);
      alert(error.message || "Unable to delete device.");

    }
  };

  // FILTER DEVICES
  const filteredDevices = devices.filter((device) => {
    const searchText = search.toLowerCase().trim();

    // Show everything if search is empty
    if (!searchText) {
      return true;
    }

    return (
      String(device.DeviceID)
        .toLowerCase()
        .includes(searchText) ||

      (device.DeviceName || "")
        .toLowerCase()
        .includes(searchText) ||

      (device.Manufacturer || "")
        .toLowerCase()
        .includes(searchText) ||

      (device.DeviceType || "")
        .toLowerCase()
        .includes(searchText)
    );
  });

  return (
    <div className="subject-page">

      {/* PAGE HEADER ================================================== */}
      <div className="subject-header">

        <h1 className="subject-title">
          Devices
        </h1>

        <button
          type="button"
          className="subject-add-button"
          onClick={handleAddDevice}
        >
          <span className="subject-add-icon">+</span>

          Add Device

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
            placeholder="Search by device name, manufacturer or type..."
            onChange={(event) =>
              setSearch(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                searchDevices();
              }
            }}
          />

          <button
            type="button"
            onClick={searchDevices}
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
            : `${filteredDevices.length} device${
                filteredDevices.length === 1
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


      {/* DEVICES RESULTS ================================================== */}
      {loading ? (

        <div className="subject-loading">
          Searching devices...
        </div>

      ) : !hasSearched ? (

        <div className="subject-search-message">
          Search for a device to display results.
        </div>

      ) : filteredDevices.length === 0 ? (

        <div className="subject-search-message">
          No devices found.
        </div>

      ) : (

        <div className="subject-table-wrapper">

          <table className="subject-table">

            <thead>

              <tr>
                <th>ID</th>
                <th>Device Name</th>
                <th>Manufacturer</th>
                <th>Device Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>

            </thead>

            <tbody>

              {filteredDevices.map((device) => (

                <tr key={device.DeviceID}>

                  <td>
                    {device.DeviceID}
                  </td>

                  <td>
                    <div className="subject-name">
                      {device.DeviceName || "-"}
                    </div>
                  </td>

                  <td>
                    {device.Manufacturer || "-"}
                  </td>

                  <td>
                    {device.DeviceType || "-"}
                  </td>

                  <td>
                    {device.IsActive
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
                          handleEditDevice(device)
                        }
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="subject-delete-button"
                        onClick={() =>
                          handleDeleteDevice(device)
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
                  {editingDevice
                    ? "Edit Device"
                    : "Add New Device"
                  }
                </h2>

                <p>
                  {editingDevice
                    ? "Update device information"
                    : "Enter device information"
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

                {/* DEVICE NAME -------------------------------------- */}
                <div className="subject-form-group subject-full-width">

                  <label>
                    Device Name *
                  </label>

                  <input
                    type="text"
                    name="DeviceName"
                    value={formData.DeviceName}
                    onChange={handleChange}
                    placeholder="Enter device name"
                    required
                  />

                </div>


                {/* MANUFACTURER -------------------------------------- */}
                <div className="subject-form-group">

                  <label>
                    Manufacturer
                  </label>

                  <input
                    type="text"
                    name="Manufacturer"
                    value={formData.Manufacturer}
                    onChange={handleChange}
                    placeholder="Manufacturer"
                  />

                </div>


                {/* DEVICE TYPE -------------------------------------- */}
                <div className="subject-form-group">

                  <label>
                    Device Type
                  </label>

                  <input
                    type="text"
                    name="DeviceType"
                    value={formData.DeviceType}
                    onChange={handleChange}
                    placeholder="Device type"
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
                    : editingDevice
                    ? "Update Device"
                    : "Save Device"
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

export default Devices;