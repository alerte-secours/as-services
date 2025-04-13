const { ctx } = require("@modjo/core")
const { reqCtx } = require("@modjo/express/ctx")

module.exports = function () {
  const sql = ctx.require("postgres")
  const minio = ctx.require("minio")

  // async function deleteFolder(bucketName, folderPath) {
  //   const logger = reqCtx.require("logger")
  //   await minio.ensureBucketExists(bucketName)

  //   const stream = minio.listObjectsV2(bucketName, folderPath, true)

  //   const objectsToDelete = []
  //   for await (const obj of stream) {
  //     objectsToDelete.push(obj.name)
  //   }

  //   if (objectsToDelete.length > 0) {
  //     const deleteResults = await minio.removeObjects(
  //       bucketName,
  //       objectsToDelete
  //     )
  //     logger.debug("deleted objects:", deleteResults)
  //   } else {
  //     logger.debug("no objects found to delete.")
  //   }
  // }

  async function deleteFile(bucketName, filePath) {
    const logger = reqCtx.require("logger")
    await minio.ensureBucketExists(bucketName)

    const deleteResults = await minio.removeObject(bucketName, filePath)
    logger.debug({ deleteResults, filePath, bucketName }, "Deleted objects")
  }

  const bucket = "avatar"

  async function delOneAvatar() {
    const logger = reqCtx.require("logger")

    const session = reqCtx.require("session")

    const { userId } = session

    try {
      const [userAvatar] = await sql`
        SELECT
          "image_file_uuid" as "imageFileUuid"
        FROM
          "user_avatar"
        WHERE
          "user_id" = ${userId}
        `
      await sql`
        UPDATE
          "user_avatar"
        SET
          "image_file_uuid" = NULL
        WHERE
          "user_id" = ${userId}
        `
      if (userAvatar) {
        await deleteFile(bucket, `${userAvatar.imageFileUuid}`)
      }
    } catch (err) {
      logger.error({ error: err, userId }, "Error deleting avatar")
    }

    return {}
  }

  return [delOneAvatar]
}
