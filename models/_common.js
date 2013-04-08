if(Meteor.isServer) {
  groupMemberEmails = function (groupId) {
    var group = Groups.findOne(groupId);

    if(!group)
      return [];

    var members = Meteor.users.find({$or: [{_id: {$in: group.invited}},
                                    {_id: group.owner}]});

    var memberEmails = [];
    members.forEach( function (user) { 
      var email = userEmail(user);
      if(email)
        memberEmails.push(email);
    });

    return memberEmails;
  }
}

userBelongsToGroup = function(userId, groupId) {
  group = Groups.findOne(groupId);
  if (!group) {
    return false;
  } else if (_.contains(group.invited, userId) || group.owner === userId) {
    return true
  } else {
    return false;
  }
};

createLinkSlug = function (str) {
  return str.replace(/!|'|"|,/g, "").replace(/\s/g, "-").toLowerCase();
}

displayName = function (user) {
  if (user.profile && user.profile.name)
    return user.profile.name;
  
  var email = userEmail(user);
  if(!!email) {
    return email;
  } else {
    return "Anonymous!"
  }
};

isGroupAdmin = function (userId, groupId) {
  var group = Groups.findOne({_id: groupId});

  if(!!group && group.owner === userId) {
    return true;
  } else {
    return false;
  }
};

isSystemAdmin = function (userId) {
  var user = Meteor.users.findOne({_id: userId});

  if(!!user && user.admin) {
    return true;
  } else {
    return false;
  }
};

userEmail = function (user) {
  if(!user)
    return null;

  var profile = user.profile;
  if(!!profile && profile.email)
    return profile.email;

  return null;
};

userPicture = function (user, width) {
  if(!user)
    return null;

  var profile = user.profile;
  if(!!profile && profile.picture) {
    var url = profile.picture;
    if(typeof width !== "undefined") {
      if(!!user.services && !!user.services.google)
        // FIXME: handle url params here!
        url = url + "?sz=" + width;        
    }

    return url;
  }
  return null;
};