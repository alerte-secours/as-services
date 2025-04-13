const { setTimeout: sleep } = require("timers/promises")
const murmurhash = require("murmurhash").v3

const deepmerge = require("@modjo/core/utils/object/deepmerge")
const { ctx } = require("@modjo/core")

/*
Goals:
- allow watchers to scale
- allow worker retry while interrupted without duplication

TODO:
- add logging
*/

function hashJsonObjectForRedisKey(jsonObject) {
  const serialized = JSON.stringify(jsonObject)
  const hash = murmurhash(serialized).toString(36)
  return hash
}

function getTimestamp() {
  return Math.ceil(Date.now() / 1000)
}

async function recurseDedup(
  queueName,
  data,
  handler,
  factoryOptions,
  hash,
  retryCount = 0
) {
  const defaultOptions = {
    enabled: false,
    okTTL: 900,
    waitTTL: 600,
    delayMargin: 5,
    retryLoop: false,
    retryLimit: 10,
  }
  const handlerOptions = handler.dedupOptions || {}
  const options = deepmerge(defaultOptions, factoryOptions, handlerOptions)

  const { enabled, okTTL, waitTTL, delayMargin, retryLoop, retryLimit } =
    options

  if (!enabled) {
    return handler(data)
  }

  const baseKey = `qd:${queueName}:${hash}`
  const keyGo = `${baseKey}:go`
  const keyOK = `${baseKey}:ok`

  // console.log("baseKey", baseKey)

  const redis = ctx.require("redisQueueDedup")

  const keyOKExists = await redis.exists(keyOK)
  if (keyOKExists) {
    return null
  }

  const inserted = await redis.set(keyGo, getTimestamp(), "EX", waitTTL, "NX")
  if (!inserted) {
    const startedTime = await redis.get(keyGo)
    const expires = parseInt(startedTime, 10) + waitTTL
    const delay = expires * 1000 - Date.now()
    await sleep(delay + delayMargin * 1000)
    if (retryLoop && retryCount <= retryLimit) {
      return recurseDedup(
        queueName,
        data,
        handler,
        options,
        hash,
        retryCount + 1
      )
    }
    return false
  }

  const res = await handler(data)

  await redis
    .pipeline()
    .set(keyOK, getTimestamp(), "EX", okTTL)
    .del(keyGo)
    .exec()

  return res
}

async function runWithDedup(queueName, data, handler, options = {}) {
  const hash = hashJsonObjectForRedisKey(data)
  return recurseDedup(queueName, data, handler, options, hash)
}

module.exports = function redisQueueDedupFactory(handler, q, options) {
  return async (data) => {
    return runWithDedup(q, data, handler, options)
  }
}
