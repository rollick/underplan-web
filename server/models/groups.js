this.trackCreateGroup = function () {
  // TODO: do some server side logging here!
};

this.canUpdateGroup = function(userId, group, fields) {
  var sysAdmin = isSystemAdmin(userId);
  
  if ( !(sysAdmin || userId === group.owner))
    return false; // not the owner or admin

  var allowed = ["name", "description", "trovebox", "picasaUsername", "picasaAlbum", "picasaKey"];

  if (sysAdmin)
    allowed.push("approved", "owner");

  if (_.difference(fields, allowed).length)
    return false; // tried to write to forbidden field

  return true;
}

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