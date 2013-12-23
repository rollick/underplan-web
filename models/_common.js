if(Meteor.isServer) {
  this.groupMemberEmails = function (groupId) {
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
  this.groupFollowerEmails = function(groupId) {
    var emails = [];
    Meteor.users.find({}).forEach( function (user) {
      if (user.profile && user.profile.followedGroups) {
        var following = user.profile.followedGroups;
        if(!!following && following[groupId]) {
          emails.push(userEmail(user));
        }        
      }
    });

    return emails;
  };
}

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

this.userPicture = function (user, width) {
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
        url = url + "?width=" + width + "&height=" + width;
      }
    } else if(user.services.github) {
      url = user.profile.picture;
      if(typeof width !== "undefined") {
        var sep = url.match(/\?/) ? "&" : "?";
        url = url + sep + "s=" + width;
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