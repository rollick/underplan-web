// Underplan -- server

Meteor.publish("directory", function () {
  return Meteor.users.find({}, {
    fields: {
      "createdAt": 1, 
      "admin": 1,
      // The profile fields below will be published for all 
      // users but only the logged in user will receive email, locale etc
      "profile.name": 1,
      "profile.picture": 1,
      "profile.link": 1,
      "services.google.id": 1,
      "services.twitter.id": 1,
      "services.facebook.id": 1
    }
  });
});

// Meteor.publish(null, function () {
//   // If logged in, autopublish the current user's settings
//   // to the client (which isn't published by default).
//   return this.userId &&
//     Meteor.users.find(this.userId,
//                       {
//                         fields: {
//                           "profile.email": 1,
//                           "profile.followedGroups": 1,
//                         }
//                       }
//                     );
// });

Meteor.publish("activities", function (groupId) {
  // don't return any activities without a groupId
  if (_.isNull(groupId))
    return [];

  // TODO:  need to also publish activities if the activity is unpublished
  //        but is linked to a group to which the current user belongs.
  var groupConds = {
    $and: [
      {$or: [
        {"approved": {$exists: false}}, 
        {"approved": true},
        {"owner": this.userId},
        {"invited": this.userId}
      ]}
    ]
  };

  if (_.isString(groupId)) {
    groupConds.$and.push({_id: groupId});
  }

  console.log("Group conditions for activity feed :" + JSON.stringify(groupConds));

  var groups = Groups.find(groupConds, {fields: {_id: 1}}).map(function(group) {
    return group._id;
  });

  var activityConds = {
    $and: [ 
      {$or: [
        {"published": true},
        {"owner": this.userId}
      ]},
      {"group": {$in: groups}},
    ]
  }

  var activities = Activities.find(activityConds);
  
  console.log("Found " + activities.count() + " activities with conditions: " + JSON.stringify(activityConds));
  return activities;
});

Meteor.publish("groups", function () {
  var conditions = {};
  var settings = Meteor.settings;
  var user = Meteor.users.findOne(this.userId);
  var approvedConditions = {$or: [{"approved": {$exists: false}}, {"approved": true}]};

  if(!!settings && user) {
    if((user.services.twitter && _.contains(settings.admins, user.services.twitter.email)) ||
       (user.services.github && _.contains(settings.admins, user.services.github.email)) ||
       (user.services.google && _.contains(settings.admins, user.services.google.email))) {
      conditions = {}; // all groups
    } else {
      conditions = approvedConditions;
    }
  } else {
    conditions = approvedConditions
  }

  return Groups.find(conditions);
});

Meteor.publish("comments", function (groupId) {
  // don't return any comments without a groupId
  if (_.isNull(groupId))
    return [];

  var conditions = {};

  if (_.isString(groupId)) {
    conditions.groupId = groupId;
  }

  return Comments.find(conditions);
});