module.exports = function () {
  const rolesByLevel = {
    admin: 1,
    user: 100,
  }

  return function sortRolesByLevel(roles) {
    return roles.sort((a, b) => rolesByLevel[a] - rolesByLevel[b])
  }
}
