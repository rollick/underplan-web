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
  };

  // Find all users in the system who are following this group
  groupFollowerEmails = function(groupId) {
    var emails = [];
    Meteor.users.find({}).forEach( function (user) {
      var following = user.profile.followedGroups;
      if(!!following && following[groupId]) {
        emails.push(userEmail(user));
      }
    });

    return emails;
  };
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
  var url = null;

  if(! _.isEmpty(user.services)) {
    if(user.services.google) {
      url = "https://profiles.google.com/s2/photos/profile/" + user.services.google.id;
      if(typeof width !== "undefined") {
        // FIXME: handle url params here!
        url = url + "?sz=" + width;        
      }
    } else if(user.services.facebook) {
      url = "https://graph.facebook.com/" + user.services.facebook.id + "/picture";
      if(typeof width !== "undefined") {
        // FIXME: handle url params here!
        url = url + "?width=" + width;
      }
    }
  } else if(!!profile && !!profile.picture) {
    if(!!profile && profile.picture) {
      var url = profile.picture;
    }    
  } else {
    url = Meteor.absoluteUrl() + "images/torso.png";
  }

  return url;
};