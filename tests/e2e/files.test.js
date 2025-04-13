const snapEndoint = require("./utils/snapEndpoint")

const ENDPOINT = "http://0.0.0.0:4292/api/v1"

it(`Expose OpenApi Spec of Files Service`, async () => {
  await snapEndoint({
    name: "files.spec",
    url: `${ENDPOINT}/spec`,
  })
})
