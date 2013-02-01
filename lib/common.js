var userBelongsToGroup = function(userId, groupId) {
  group = Groups.findOne(groupId);
  if (!group) {
    return false;
  } else if (_.contains(group.invited, userId) || group.owner === userId) {
    return true
  } else {
    return false;
  }
};