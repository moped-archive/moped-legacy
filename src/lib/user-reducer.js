module.exports = function (user, action) {
  if (action.type === 'MOPED_LOG_IN') {
    return action.user || null;
  } else if (action.type === 'MOPED_LOG_OUT') {
    return null;
  } else {
    return user || null;
  }
}