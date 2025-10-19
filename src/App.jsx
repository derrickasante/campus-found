import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db, auth, googleProvider, storage } from "./firebaseConfig";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// --- Email Auth Panel ---
function EmailAuthPanel({ onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const signup = async (e) => {
    e.preventDefault();
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Sign up error: " + err.message);
    }
  };

  const signin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Sign in error: " + err.message);
    }
  };

  return (
    <div className="absolute top-16 right-4 z-50 bg-white p-6 rounded-lg shadow-lg w-80">
      <h2 className="text-lg font-bold mb-4">Email Sign-In</h2>
      <form className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <div className="flex justify-between gap-2">
          <button
            onClick={signup}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md transition"
          >
            Sign Up
          </button>
          <button
            onClick={signin}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition"
          >
            Sign In
          </button>
        </div>
      </form>
    </div>
  );
}


function FloatingToolbar({ user, signInWithGoogle, signOutUser, setShowEmailAuth, setSearchResult }) {
  const [q, setQ] = useState("");
  const map = useMap();

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!q) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const place = data[0];
        const lat = parseFloat(place.lat);
        const lon = parseFloat(place.lon);
        map.setView([lat, lon], 16);
        setSearchResult([lat, lon]);
      } else {
        alert("Location not found");
      }
    } catch (err) {
      console.error(err);
      alert("Search failed");
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 10,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1400,
        background: "rgba(255,255,255,0.95)",
        padding: "8px 12px",
        borderRadius: 8,
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <strong>Campus Lost & Found</strong>

      {!user ? (
        <>
          <button onClick={signInWithGoogle} className="bg-red-500 text-white px-3 py-1 rounded-md">Google Sign In</button>
          <button onClick={() => setShowEmailAuth((s) => !s)} className="bg-blue-500 text-white px-3 py-1 rounded-md">Email Sign In</button>
        </>
      ) : (
        <>
          <span>Hi, {user.displayName || user.email}</span>
          <button onClick={signOutUser} className="bg-gray-500 text-white px-3 py-1 rounded-md">Sign Out</button>
        </>
      )}

      <form
        onSubmit={handleSearch}
        style={{
          display: "flex",
          gap: 6,
          alignItems: "center",
          background: "#fff",
          padding: 4,
          borderRadius: 6,
          boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search location"
          style={{ padding: "4px 8px", width: 180 }}
        />
        <button type="submit" style={{ padding: "4px 8px" }}>
          Search
        </button>
      </form>
    </div>
  );
}


function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

// --- Report Panel ---
function ReportPanel({ isOpen, onClose, onSubmit, description, setDescription, imageFile, setImageFile, isEditing }) {
  if (!isOpen) return null;
  return (
    <div
      style={{
        position: "absolute",
        bottom: 18,
        left: 18,
        zIndex: 1200,
        background: "white",
        padding: 12,
        borderRadius: 8,
        width: 300,
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
      }}
    >
      <h3 style={{ marginTop: 0 }}>{isEditing ? "Edit Report" : "Report Lost Item"}</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (required)"
          required
          style={{ width: "100%", padding: 6, marginBottom: 8 }}
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files[0])}
          style={{ marginBottom: 8 }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit">{isEditing ? "Update" : "Submit"}</button>
        </div>
      </form>
    </div>
  );
}

// Main App 
export default function App() {
  const campusCenter = [44.5649, -69.6625];

  const [items, setItems] = useState([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [newItemPosition, setNewItemPosition] = useState(null);
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState(null);

  const [user, setUser] = useState(null);
  const [showEmailAuth, setShowEmailAuth] = useState(false);

  const [searchResult, setSearchResult] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "lostItems"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const arr = [];
      snap.forEach((d) => {
        const data = d.data();
        arr.push({
          id: d.id,
          description: data.description,
          location: data.location,
          timestamp: data.timestamp,
          imageUrl: data.imageUrl || null,
          userId: data.userId || null,
          userDisplayName: data.userDisplayName || null,
        });
      });
      setItems(arr);
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error(err);
      alert("Google sign-in failed: " + err.message);
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMapClick = (latlng) => {
    setNewItemPosition(latlng);
    setDescription("");
    setImageFile(null);
    setEditingItem(null);
    setIsPanelOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!description) {
      alert("Description is required.");
      return;
    }

    const position = newItemPosition
      ? newItemPosition
      : editingItem
      ? { lat: editingItem.location.latitude, lng: editingItem.location.longitude }
      : null;

    if (!position) {
      alert("Location is required.");
      return;
    }

    if (!user) {
      alert("You must be signed in to submit a report.");
      return;
    }

    try {
      let imageUrl = editingItem ? editingItem.imageUrl : null;

      if (imageFile) {
        const sRef = storageRef(storage, `lostItems/${Date.now()}_${imageFile.name}`);
        await uploadBytes(sRef, imageFile);
        imageUrl = await getDownloadURL(sRef);
      }

      if (editingItem) {
        const docRef = doc(db, "lostItems", editingItem.id);
        await updateDoc(docRef, {
          description,
          imageUrl: imageUrl || null,
        });
      } else {
        await addDoc(collection(db, "lostItems"), {
          description,
          location: { latitude: position.lat, longitude: position.lng },
          timestamp: serverTimestamp(),
          imageUrl: imageUrl || null,
          userId: user.uid,
          userDisplayName: user.displayName || user.email || null,
        });
      }

      setDescription("");
      setImageFile(null);
      setIsPanelOpen(false);
      setNewItemPosition(null);
      setEditingItem(null);
    } catch (err) {
      console.error(err);
      alert("Error saving report: " + err.message);
    }
  };

  const startEdit = (item) => {
    if (item.userId && user && item.userId !== user.uid) {
      alert("You can only edit your own reports.");
      return;
    }
    setEditingItem(item);
    setDescription(item.description || "");
    setImageFile(null);
    setNewItemPosition({ lat: item.location.latitude, lng: item.location.longitude });
    setIsPanelOpen(true);
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh" }}>
      <MapContainer center={campusCenter} zoom={14} style={{ width: "100%", height: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <FloatingToolbar
          user={user}
          signInWithGoogle={signInWithGoogle}
          signOutUser={signOutUser}
          setShowEmailAuth={setShowEmailAuth}
          setSearchResult={setSearchResult}
        />

        {showEmailAuth && <EmailAuthPanel onClose={() => setShowEmailAuth(false)} />}

        <MapClickHandler onMapClick={handleMapClick} />

        {items.map((it) => (
          <Marker key={it.id} position={[it.location.latitude, it.location.longitude]}>
            <Popup>
              <div style={{ maxWidth: 220 }}>
                <strong>{it.description}</strong>
                <div style={{ fontSize: 12, color: "#666" }}>
                  {it.userDisplayName ? `Reported by: ${it.userDisplayName}` : null}
                </div>
                {it.imageUrl && (
                  <img
                    src={it.imageUrl}
                    alt="reported"
                    style={{ marginTop: 8, maxWidth: 140, maxHeight: 120, objectFit: "cover", borderRadius: 6 }}
                  />
                )}
                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <a
                    href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${it.location.latitude},${it.location.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Street view
                  </a>
                  <button onClick={() => startEdit(it)}>Edit</button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {searchResult && (
          <Marker position={searchResult}>
            <Popup>Searched location</Popup>
          </Marker>
        )}
      </MapContainer>

      <ReportPanel
        isOpen={isPanelOpen}
        onClose={() => {
          setIsPanelOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleFormSubmit}
        description={description}
        setDescription={setDescription}
        imageFile={imageFile}
        setImageFile={setImageFile}
        isEditing={!!editingItem}
      />
    </div>
  );
}
