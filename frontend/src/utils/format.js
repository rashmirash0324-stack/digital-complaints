export const STATUSES = ["Pending", "In Progress", "Resolved", "Failed", "Rejected"];

export function homePathForRole(role) {
  if (role === "admin") return "/admin";
  if (role === "staff") return "/staff";
  return "/dashboard";
}

export const CATEGORIES = [
  "Water",
  "Electricity",
  "Road",
  "Sanitation",
  "Public Services",
  "Other",
];

export function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function statusKey(status) {
  return String(status || "").toLowerCase().replace(/\s+/g, "-");
}

export function shortId(id) {
  return id ? `#${String(id).slice(-6).toUpperCase()}` : "";
}

export function initials(name) {
  return String(name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export function countByStatus(complaints) {
  const counts = { total: complaints.length };
  STATUSES.forEach((status) => {
    counts[status] = complaints.filter((c) => c.status === status).length;
  });
  return counts;
}

export function getErrorMessage(err, fallback) {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.request && !err.response) {
    return "Cannot reach the server. Make sure the backend is running on port 5000.";
  }
  return fallback;
}

// ---------- WhatsApp ----------
export const WHATSAPP_NUMBER = "919611377970";
export const WHATSAPP_DISPLAY = "+91 96113 77970";

export function whatsappLink(message = "", number = WHATSAPP_NUMBER) {
  const digits = String(number || "").replace(/\D/g, "");
  const full = digits.length === 10 ? `91${digits}` : digits;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${full}${text}`;
}

// ---------- GPS photo helpers ----------
export function mapsLink(latitude, longitude) {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

export function formatCoords(latitude, longitude) {
  return `${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`;
}

// Read an image file, shrink it and return a JPEG data URL (keeps uploads small)
export function compressImage(file, maxSize = 1280, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this image."));
    };

    img.src = url;
  });
}

// Ask the browser for the current position
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("This device does not support GPS location."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => {
        const messages = {
          1: "Location permission was denied. Allow location access and try again.",
          2: "Could not determine your location. Move to an open area and try again.",
          3: "Getting your location timed out. Please try again.",
        };
        reject(new Error(messages[err.code] || "Could not get your location."));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}
