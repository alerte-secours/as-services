const { InMemoryCache } = require("@apollo/client/core")

const { loadErrorMessages, loadDevMessages } = require("@apollo/client/dev")

loadDevMessages()
loadErrorMessages()

// see https://www.apollographql.com/docs/react/caching/cache-field-behavior/

module.exports = function createCache() {
  return new InMemoryCache({
    typePolicies: {
      Query: {
        // selectManyViewAlertingDeviceByAlert: {
        //   merge: false,
        // },
      },
      Subscription: {
        fields: {
          selectManyAlert: {
            merge: false,
          },
          selectManyAlerting: {
            merge: false,
          },
          selectManyRelativeAllow: {
            merge: false,
          },
        },
      },
    },
  })
}
