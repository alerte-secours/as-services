// Alert level colors
exports.LEVEL_COLORS = {
  red: "#d9534f",
  yellow: "#dfaf2c",
  green: "#4caf50",
}

// Alert level descriptions
exports.LEVEL_DESCRIPTIONS = {
  red: "urgence",
  yellow: "danger",
  green: "petit coup de main",
}

// Common notification defaults
exports.NOTIFICATION_DEFAULTS = {
  android: {
    notification: {
      icon: "notif_icon",
      priority: "high",
      visibility: "public",
    },
  },
  apns: {
    payload: {
      aps: {
        sound: {
          critical: 1,
          name: "default",
          volume: 1.0,
        },
        "content-available": 1,
        "mutable-content": 1,
      },
    },
    headers: {
      "apns-priority": "10",
      "apns-push-type": "alert",
    },
  },
}
