module.exports = () => {
  return {
    // geography: {
    //   // The pg_types oid to pass to the db along with the serialized value.
    //   to: 19211, // SELECT oid FROM pg_type WHERE typname = 'geography';
    //   // An array of pg_types oids to handle when parsing values coming from the db.
    //   from: [19211],
    //   // Function that transform values before sending them to the db.
    //   serialize: ({ latitude, longitude }) => {
    //     return `ST_GeomFromGeoJSON(${JSON.stringify({
    //       type: "Point",
    //       coordinates: [longitude, latitude],
    //     })})`
    //   },
    //   // Function that transforms values coming from the db.
    //   // parse: ([x, y, width, height]) => {
    //   //   x, y, width, height
    //   // },
    // },
  }
}
