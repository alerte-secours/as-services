const { ctx } = require("@modjo/core")
const { reqCtx } = require("@modjo/express/ctx")

const { v4: uuidv4 } = require("uuid")

module.exports = function () {
  // const config = ctx.require("config")
  // const {  } = config
  const sql = ctx.require("postgres")
  const minio = ctx.require("minio")

  const bucket = "audio"

  async function addOneAudioUpload(req) {
    const logger = reqCtx.require("logger")
    const [file] = req.files
    const {
      data: { alertId },
    } = req.body

    const session = reqCtx.require("session")

    const { userId, deviceId } = session

    const audioFileUuid = uuidv4()

    const messages = {
      contentType: "audio",
      audioFileUuid,
      userId,
      deviceId,
      alertId,
    }

    const [{ id: messageId }] = await sql`
      INSERT INTO "message" ${sql(messages)}
      RETURNING
        "id"
      `

    const incomingType = (file?.mimetype || "").toLowerCase()
    const nameFromClient = (file?.originalname || "").toLowerCase()
    const mappedType =
      incomingType === "audio/m4a"
        ? "audio/mp4"
        : incomingType && incomingType.startsWith("audio/")
        ? incomingType
        : ""
    const guessedFromName = nameFromClient.endsWith(".m4a") ? "audio/mp4" : ""
    const contentType = mappedType || guessedFromName || "audio/mp4"

    const metaData = {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${audioFileUuid}.m4a"`,
      "Cache-Control": "public, max-age=31536000, immutable",
      "x-amz-meta-encoding": file.encoding,
      "x-amz-meta-originalname": file.originalname,
      "x-amz-meta-userid": String(userId),
      "x-amz-meta-deviceid": String(deviceId),
    }

    await minio.ensureBucketExists(bucket)

    try {
      const res = await minio.putObject(
        bucket,
        `${audioFileUuid}.m4a`,
        file.buffer,
        file.size,
        metaData
      )
      logger.debug(
        { res, bucket, audioFileUuid, userId, deviceId },
        "Successfully uploaded audio file"
      )
    } catch (err) {
      logger.error(
        { error: err, bucket, audioFileUuid, userId, deviceId },
        "Error uploading audio file"
      )
    }

    return { audioFileUuid, messageId }
  }

  return [addOneAudioUpload]
}
