// Underplan -- client
Meteor.subscribe("activities");
Meteor.subscribe("allComments");
Meteor.subscribe("allGroups");
Meteor.subscribe("directory");

Meteor.startup(function () {
  Backbone.history.start({ pushState: true });

  Meteor.autorun(function () {
    // if (! Session.get("groupName")) {  
    //   Session.set("groupName", "A Trip");
    // }
    // if (! Session.get("selectedActivity")) {  
    //   var activity = Activities.findOne();
    //   if (activity)
    //     Session.set("selectedActivity", activity._id);
    // }
  });
});

var getCurrentActivityId = function () {
  if (Session.get("activitySlug")) {
    activity = Activities.findOne({slug: Session.get("activitySlug")});
    if (!activity) { // activity hasn't loaded!
      return null;
    } else {
      Session.set("activityId", activity._id);
      return Session.get("activityId");      
    }
  } else {
    return null;
  }
};

var getCurrentGroup = function () {
  if (Session.get("groupId")) {
    return Groups.findOne(Session.get("groupId"));
  } else {
    return null;
  }
};

var getCurrentGroupId = function () {
  group = getCurrentGroup();
  return !!group ? group._id : null;
};

var userBelongsToCurrentGroup = function (userId) {
  group = getCurrentGroup();
  if (!group) {
    return false;
  } else {
   return userBelongsToGroup(userId, group._id);
  }
};

var currentUserBelongsToCurrentGroup = function () {
  return userBelongsToCurrentGroup(Meteor.userId());
};