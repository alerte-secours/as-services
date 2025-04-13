const path = require("path")
const { Eta } = require("eta")

const eta = new Eta({ views: path.join(__dirname, "..", "templates") })

module.exports = async (template, variables = {}, meta = {}) => {
  const res = await eta.render(template, variables, meta)
  return res
}
