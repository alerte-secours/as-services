const { ctx } = require("@modjo/core")
const { reqCtx } = require("@modjo/express/ctx")

const { v4: uuidv4 } = require("uuid")

module.exports = function () {
  const sql = ctx.require("postgres")
  const minio = ctx.require("minio")

  const bucket = "avatar"

  async function addOneAvatar(req) {
    const logger = reqCtx.require("logger")
    const [file] = req.files

    const session = reqCtx.require("session")

    const { userId } = session

    const imageFileUuid = uuidv4()

    const [oldUserAvatar] = await sql`
      SELECT
        "image_file_uuid" as "imageFileUuid"
      FROM
        "user_avatar"
      WHERE
        "user_id" = ${userId}
      `

    await sql`
      INSERT INTO "user_avatar" (user_id, image_file_uuid)
        VALUES (${userId}, ${imageFileUuid})
      ON CONFLICT ("user_id")
        DO UPDATE SET
          "image_file_uuid" = ${imageFileUuid}
      `

    const metaData = {
      "Content-Type": file.mimetype,
      encoding: file.encoding,
      originalname: file.originalname,
      userId,
    }

    await minio.ensureBucketExists(bucket)

    try {
      const res = await minio.putObject(
        bucket,
        `${imageFileUuid}.png`,
        file.buffer,
        file.size,
        metaData
      )
      // logger.trace(res)
      logger.debug(
        { res, bucket, imageFileUuid },
        "Successfully uploaded avatar"
      )
    } catch (err) {
      logger.error(
        { error: err, bucket, imageFileUuid, userId },
        "Error uploading avatar"
      )
    }

    if (oldUserAvatar) {
      await minio.removeObject(bucket, `${oldUserAvatar.imageFileUuid}`)
    }

    return { imageFileUuid }
  }

  return [addOneAvatar]
}
