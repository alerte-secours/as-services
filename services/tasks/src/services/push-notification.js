const { ctx } = require("@modjo/core")
const yaRetry = require("ya-retry")
const Sentry = require("@sentry/node")
const murmurhash = require("murmurhash").v3
const { snakeCase } = require("lodash")

async function deleteOldFcmToken(deviceId) {
  const sql = ctx.require("postgres")
  const logger = ctx.require("logger")

  try {
    await sql`
      UPDATE
        "device"
      SET
        "fcm_token" = NULL
      WHERE
        "id" = ${deviceId}
      `
    logger.info({ deviceId }, "Deleted old FCM token")
  } catch (error) {
    logger.error({ deviceId, error }, "Failed to delete old FCM token")
    Sentry.withScope((scope) => {
      scope.setExtra("deviceId", deviceId)
      scope.setExtra("error", { message: error.message, stack: error.stack })
      Sentry.captureException(new Error("Failed to delete old FCM token"))
    })
    throw error
  }
}

function generateNotificationUid({ data }) {
  const serialized = JSON.stringify(data)
  return murmurhash(serialized).toString(36)
}

function deriveNotificationConfig({
  title,
  body,
  // icon,
  // imageUrl,
  channel,
  ttl,
  priority = "normal",
  actionId,
  color,
  // Platform overrides
  android = {},
  apns = {},
  uid,
  silent = false,
}) {
  const isVisible = !silent
  const notification = {
    // https://firebase.google.com/docs/reference/admin/node/firebase-admin.messaging.notification.md#notification_interface
    title,
    body,
    // imageUrl:
    //   imageUrl ||
    //   (icon
    //     ? `https://app.alertesecours.fr/images/notifications/${icon}.png`
    //     : undefined),
  }

  // https://firebase.google.com/docs/reference/admin/node/firebase-admin.messaging.androidconfig.md#androidconfig_interface
  const androidConfig = {
    priority,
    ttl,
    directBootOk: true,
    collapseKey: uid,
    ...android,
    notification: {
      channelId: channel,
      icon: "ic_notification",
      color,
      priority: "high",
      visibility: "public",
      defaultSound: true,
      // Only include clickAction for visible notifications (not silent ones)
      ...(actionId && isVisible
        ? {
            clickAction: `com.alertesecours.${snakeCase(
              actionId
            ).toUpperCase()}`,
          }
        : {}),
      ...(android.notification || {}),
    },
    restrictedPackageName: "com.alertesecours",
  }

  // APNs-specific configuration
  const apnsConfig = {
    // https://firebase.google.com/docs/reference/admin/node/firebase-admin.messaging.apnsconfig.md#apnsconfig_interface
    headers: {
      "apns-priority": priority === "high" ? "10" : "5",
      "apns-push-type": isVisible ? "alert" : "background", // Use background for silent pushes
      "apns-collapse-id": uid, // https://firebase.google.com/docs/cloud-messaging/concept-options
      ...(apns.headers || {}),
    },
    payload: {
      aps: {
        category: channel,
        threadId: channel, // Thread ID for grouping notifications
        // Content available flag for background processing
        contentAvailable: true,
        // Support for modification of notification content
        mutableContent: true,
        // Only include sound for non-silent notifications
        ...(isVisible
          ? {
              sound: {
                critical: priority === "high",
                name: "default",
                volume: 1.0,
              },
            }
          : {}),

        // alert: {
        //   // https://firebase.google.com/docs/reference/admin/node/firebase-admin.messaging.apsalert.md#apsalert_interface
        //   // https://developer.apple.com/library/archive/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/PayloadKeyReference.html
        // },

        ...(apns.aps || {}),
      },
    },
  }

  return {
    notification,
    android: androidConfig,
    apns: apnsConfig,
  }
}

async function pushNotification({
  fcmToken,
  deviceId,
  notification,
  data = {},
}) {
  const admin = ctx.require("firebaseAdmin")
  const logger = ctx.require("logger")

  logger.info(
    {
      deviceId,
      dataType: data?.action,
      fcmTokenLength: fcmToken?.length,
    },
    "Sending push notification to device"
  )

  if (!fcmToken) {
    const error = new Error("No FCM token provided")
    logger.error({ deviceId, error }, error.message)
    throw error
  }

  const uid = generateNotificationUid({ data })

  const derivedNotification = notification
    ? deriveNotificationConfig({ ...notification, uid })
    : {
        notification: {
          title: "Alerte Secours",
          body: "Nouvelle notification",
        },
      }

  // Construct message according to Firebase Admin SDK format
  // https://firebase.google.com/docs/reference/admin/node/firebase-admin.messaging.basemessage
  const message = {
    token: fcmToken,
    data: { json: JSON.stringify(data), uid, actionId: notification?.actionId },
    // Platform specific configurations
    android: derivedNotification.android,
    apns: derivedNotification.apns,
  }

  // Only include notification for non-silent pushes
  if (
    notification &&
    !notification.silent &&
    (notification.title || notification.body)
  ) {
    message.notification = derivedNotification.notification
  }

  try {
    const res = await admin.messaging().send(message)
    logger.info(
      {
        deviceId,
        messageId: res,
        dataType: data?.action,
      },
      "Push notification sent successfully"
    )
    return { success: true, messageId: res }
  } catch (error) {
    // Handle specific Firebase error codes
    if (error.code === "messaging/registration-token-not-registered") {
      logger.warn({ deviceId }, "FCM token not registered, deleting token")
      await deleteOldFcmToken(deviceId)
      return { success: false, reason: "token-not-registered" }
    }

    if (error.code === "messaging/invalid-argument") {
      logger.error(
        {
          deviceId,
          error,
          messageData: message,
        },
        "Invalid FCM message format"
      )
      Sentry.withScope((scope) => {
        scope.setExtra("deviceId", deviceId)
        scope.setExtra("messageData", message)
        scope.setExtra("error", { message: error.message, stack: error.stack })
        Sentry.captureException(new Error("Invalid FCM message format"))
      })
      return { success: false, reason: "invalid-message" }
    }

    // Log and report other errors
    logger.error(
      {
        deviceId,
        error,
        errorCode: error.code,
        messageData: message,
      },
      "Failed to send FCM push notification"
    )

    Sentry.withScope((scope) => {
      scope.setExtra("deviceId", deviceId)
      scope.setExtra("messageData", message)
      scope.setExtra("error", {
        message: error.message,
        stack: error.stack,
        code: error.code,
      })
      Sentry.captureException(new Error("Failed to send FCM push notification"))
    })

    throw error
  }
}

module.exports = async function pushNotificationWithRetry(params) {
  const logger = ctx.require("logger")

  try {
    const res = await yaRetry(
      async (_bail) => {
        return pushNotification(params)
      },
      {
        retries: 2,
        minTimeout: 10000,
        onRetry: (error, attempt) => {
          logger.warn(
            {
              deviceId: params.deviceId,
              attempt,
              error,
            },
            "Retrying push notification"
          )
        },
      }
    )
    return res
  } catch (error) {
    logger.error(
      {
        deviceId: params.deviceId,
        error,
      },
      "All push notification retries failed"
    )

    Sentry.withScope((scope) => {
      scope.setExtra("deviceId", params.deviceId)
      scope.setExtra("error", { message: error.message, stack: error.stack })
      scope.setTag("notification_type", params.data?.action || "unknown")
      Sentry.captureException(new Error("Push notification retries exhausted"))
    })

    throw error
  }
}
