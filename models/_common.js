/////////////////////////////////////
// Server and Client Methods

this.canUserRemoveActivity = function (userId, activityId) {
  var activity = Activities.findOne(activityId);

  if (!activity || !activity.group)
    return false

  if (!activity.group)
    return false;

  var groupId = activity.group;

  return (isGroupAdmin(userId, groupId) || isSystemAdmin(userId) || activity.owner === userId);
};

this.userBelongsToGroup = function(userId, groupId) {
  group = Groups.findOne(groupId);
  if (!group) {
    return false;
  } else if (_.contains(group.invited, userId) || group.owner === userId) {
    return true
  } else {
    return false;
  }
};

this.createLinkSlug = function (str) {
  return str.replace(/!|'|"|,/g, "").replace(/\s/g, "-").toLowerCase();
}

this.displayName = function (user) {
  if (user.profile && user.profile.name)
    return user.profile.name;
  
  var email = userEmail(user);
  if(!!email) {
    return email;
  } else {
    return "Anonymous!"
  }
};

this.isGroupAdmin = function (userId, groupId) {
  var group = Groups.findOne({_id: groupId});

  if(!!group && group.owner === userId) {
    return true;
  } else {
    return false;
  }
};

this.isSystemAdmin = function (userId) {
  var user = Meteor.users.findOne({_id: userId});

  if(!!user && user.admin) {
    return true;
  } else {
    return false;
  }
};

this.userEmail = function (user) {
  if(!user)
    return null;

  var profile = user.profile;
  if(!!profile && profile.email)
    return profile.email;

  return null;
};
