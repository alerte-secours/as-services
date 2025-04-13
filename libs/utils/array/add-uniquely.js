module.exports = function addUniquely(target, expand) {
  for (let i = 0, l = expand.length; i < l; i++) {
    if (target.indexOf(expand[i]) === -1) {
      target.push(expand[i])
    }
  }
  return target
}
