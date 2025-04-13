const DAY_IN_MS = 86400000
const ALERT_NOTIFICATION_EXPIRATION_INTERVAL = 6 * DAY_IN_MS // must be less than ALERT_AUTO_ARCHIVE_INTERVAL

function getAlertNotificationExpirationInSeconds(date = Date.now()) {
  return Math.round(
    new Date(date + ALERT_NOTIFICATION_EXPIRATION_INTERVAL) / 1000
  )
}

module.exports = {
  DAY_IN_MS,
  ALERT_NOTIFICATION_EXPIRATION_INTERVAL,
  getAlertNotificationExpirationInSeconds,
}
