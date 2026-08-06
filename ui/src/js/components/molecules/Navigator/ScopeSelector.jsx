import React, { useState } from "react";
import "./scopeSelector.css";

export default function ScopeSelector({ scopeData, onSubmitScope }) {
  const [selectedThreats, setSelectedThreats] = useState([]);
  const [selectedAssets, setSelectedAssets] = useState([]);

  const [customThreats, setCustomThreats] = useState([]);
  const [customAssets, setCustomAssets] = useState([]);

  const [isAddingThreat, setIsAddingThreat] = useState(false);
  const [isAddingAsset, setIsAddingAsset] = useState(false);

  const [newThreat, setNewThreat] = useState({
    title: "",
    type: "",
    description: "",
  });
  const [newAsset, setNewAsset] = useState({ title: "", description: "" });

  const initialThreats = scopeData?.threats_source || [];
  const initialAssets = scopeData?.assets || [];

  const allThreats = [...initialThreats, ...customThreats];
  const allAssets = [...initialAssets, ...customAssets];

  const handleToggleThreat = (id) => {
    setSelectedThreats((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const handleToggleAsset = (id) => {
    setSelectedAssets((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const handleSaveThreat = () => {
    if (!newThreat.title.trim() || !newThreat.type) {
      alert("Fill the title and the type.");
      return;
    }

    const threatToAdd = {
      id: `custom-threat-${Date.now()}`,
      title: newThreat.title,
      type: newThreat.type,
      description: newThreat.description,
    };

    setCustomThreats((prev) => [...prev, threatToAdd]);
    setSelectedThreats((prev) => [...prev, threatToAdd.id]);
    setIsAddingThreat(false);
    setNewThreat({ title: "", type: "", description: "" });
  };

  const handleSaveAsset = () => {
    if (!newAsset.title.trim()) return;

    const assetToAdd = {
      id: `custom-asset-${Date.now()}`,
      title: newAsset.title,
      description: newAsset.description,
    };

    setCustomAssets((prev) => [...prev, assetToAdd]);
    setSelectedAssets((prev) => [...prev, assetToAdd.id]);
    setIsAddingAsset(false);
    setNewAsset({ title: "", description: "" });
  };

  const handleValidate = () => {
    if (selectedThreats.length === 0 && selectedAssets.length === 0) {
      alert("Please select at least 1 Threat Source or 1 Asset to proceed.");
      return;
    }

    const finalThreats = allThreats.filter((t) =>
      selectedThreats.includes(t.id),
    );
    const finalAssets = allAssets.filter((a) => selectedAssets.includes(a.id));

    onSubmitScope({ threats_source: finalThreats, assets: finalAssets });
  };

  if (!scopeData || (!scopeData.threats_source && !scopeData.assets)) {
    return <p>No scope data found.</p>;
  }

  return (
    <div id="selector">
      <h2>Define the Scope</h2>
      <p id="desc">
        Select the threat sources you want to simulate (Left) and/or the
        critical assets you want to protect (Right).
      </p>

      <div className="selector-container">
        <div className="threats-container">
          <h3 className="threats-title">1. Threat Sources</h3>
          <div id="container">
            {allThreats.map((threat) => {
              const isSelected = selectedThreats.includes(threat.id);
              return (
                <div
                  className={`card ${isSelected ? "selected-threats" : ""}`}
                  key={threat.id}
                  onClick={() => handleToggleThreat(threat.id)}
                >
                  <input
                    className="checkbox-selection"
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleThreat(threat.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="information">
                    <h4 className="item-id">{threat.title}</h4>
                    <span className="severity">{threat.type}</span>
                    <p className="summary">{threat.description}</p>
                  </div>
                </div>
              );
            })}

            {isAddingThreat ? (
              <div
                className="add-form-card"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  className="form-input"
                  placeholder="Name of the threat"
                  value={newThreat.title}
                  onChange={(e) =>
                    setNewThreat({ ...newThreat, title: e.target.value })
                  }
                />

                <select
                  className="form-input"
                  value={newThreat.type}
                  onChange={(e) =>
                    setNewThreat({ ...newThreat, type: e.target.value })
                  }
                >
                  <option value="" disabled>
                    -- Select a type * --
                  </option>
                  <option value="human_threat_malicious">
                    Human Threat Malicious
                  </option>
                  <option value="human_threat_non_malicious">
                    Human Threat Non-Malicious
                  </option>
                  <option value="non_human_threat">Non-Human Threat</option>
                </select>

                <textarea
                  className="form-input"
                  placeholder="Description"
                  rows="2"
                  value={newThreat.description}
                  onChange={(e) =>
                    setNewThreat({ ...newThreat, description: e.target.value })
                  }
                />
                <div className="form-actions">
                  <button
                    className="btn-cancel"
                    onClick={() => setIsAddingThreat(false)}
                  >
                    Cancel
                  </button>
                  <button className="btn-save" onClick={handleSaveThreat}>
                    Add
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="add-custom-btn"
                onClick={() => setIsAddingThreat(true)}
              >
                + Add a threat source
              </button>
            )}
          </div>
        </div>

        <div className="assets-container">
          <h3 className="assets-title">2. Assets to protect</h3>
          <div id="container">
            {allAssets.map((asset) => {
              const isSelected = selectedAssets.includes(asset.id);
              return (
                <div
                  className={`card ${isSelected ? "selected-assets" : ""}`}
                  key={asset.id}
                  onClick={() => handleToggleAsset(asset.id)}
                >
                  <input
                    className="checkbox-selection"
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleAsset(asset.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="information">
                    <h4 className="item-id">{asset.title}</h4>
                    <p className="summary">{asset.description}</p>
                  </div>
                </div>
              );
            })}

            {isAddingAsset ? (
              <div
                className="add-form-card"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  className="form-input"
                  placeholder="Name of the asset *"
                  value={newAsset.title}
                  onChange={(e) =>
                    setNewAsset({ ...newAsset, title: e.target.value })
                  }
                />
                <textarea
                  className="form-input"
                  placeholder="Description"
                  rows="2"
                  value={newAsset.description}
                  onChange={(e) =>
                    setNewAsset({ ...newAsset, description: e.target.value })
                  }
                />
                <div className="form-actions">
                  <button
                    className="btn-cancel"
                    onClick={() => setIsAddingAsset(false)}
                  >
                    Cancel
                  </button>
                  <button className="btn-save" onClick={handleSaveAsset}>
                    Add
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="add-custom-btn"
                onClick={() => setIsAddingAsset(true)}
              >
                + Add an asset
              </button>
            )}
          </div>
        </div>
      </div>

      <button className="valid-selection" onClick={handleValidate}>
        Run analysis
      </button>
    </div>
  );
}
