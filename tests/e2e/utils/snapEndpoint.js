require("jest-specific-snapshot")

const yaml = require("js-yaml")
const axios = require("axios")
const defaultsDeep = require("lodash.defaultsdeep")

const defaultAxiosParams = { headers: { "Access-Control-Allow-Origin": "*" } }
module.exports = async ({ name, ...axiosParams }) => {
  let response
  try {
    response = await axios(defaultsDeep(axiosParams, defaultAxiosParams))
  } catch (err) {
    console.error(err)
    throw err
  }
  expect(yaml.dump(response.data)).toMatchSpecificSnapshot(
    `./__snapshots__/${name}.yaml`
  )
}
