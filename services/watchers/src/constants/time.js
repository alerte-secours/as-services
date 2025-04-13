module.exports = {
  ALERT_SUGGEST_CLOSE_INTERVAL: "1 hour",
  ALERT_SUGGEST_KEEP_OPEN_INTERVAL: "23 hours",
  ALERT_AUTO_CLOSE_INTERVAL: "24 hours",
  ALERT_AUTO_ARCHIVE_INTERVAL: "7 days", // must be more than ALERT_NOTIFICATION_EXPIRATION_INTERVAL
  SCAN_SUGGEST_CLOSE_CRON: "*/10 * * * *", // At every 10th minute
  SCAN_SUGGEST_KEEP_OPEN_CRON: "5 * * * *", // At minute 5
  SCAN_AUTO_CLOSE_CRON: "15 * * * *", // At minute 15
  SCAN_AUTO_ARCHIVE_CRON: "0 4 * * *", // At 4:00
  RELATIVE_UNREGISTERED_RECONCILIATION_CRON: "0 4 * * *", // At 4:00
  DEVICE_GEODATA_MAX_AGE: "48 hours", // Maximum age before removal from hot storage
}

// cheat on https://crontab.guru/
