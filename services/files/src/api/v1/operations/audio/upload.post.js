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

    const metaData = {
      "Content-Type": file.mimetype,
      encoding: file.encoding,
      originalname: file.originalname,
      userId,
      deviceId,
    }

    await minio.ensureBucketExists(bucket)

    try {
      const res = await minio.putObject(
        "audio",
        audioFileUuid,
        file.buffer,
        file.size,
        metaData
      )
      // logger.trace(res)
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
