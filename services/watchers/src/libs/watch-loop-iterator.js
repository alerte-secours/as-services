// deprecated, replaced by redis qdedup

module.exports = () => {
  const localCacheIds = new Set()

  return async function (iteratee, callback, getKey = ({ id }) => id) {
    const iterationIds = new Set()

    for (const row of iteratee) {
      const key = getKey(row)
      iterationIds.add(key)

      // skip already sent tasks
      if (localCacheIds.has(key)) {
        continue
      }

      // send task
      await callback(row)
      localCacheIds.add(key)
    }

    // cleanup
    for (const key of localCacheIds.values()) {
      if (!iterationIds.has(key)) {
        localCacheIds.delete(key)
      }
    }
  }
}
