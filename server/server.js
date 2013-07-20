// Underplan -- server

var getActivityConditons = function (groupId, userId) {
  // don't return any activities without a groupId
  if (_.isNull(groupId))
    return [];

  // TODO: The code below to get the groups for matching the activities is 
  //       reduntant now because we only pass a single groupId but will leave the 
  //       code here for use in the future
  var groupConds = {
    $and: [
      {$or: [
        {"approved": {$exists: false}}, 
        {"approved": true},
        {"owner": userId},
        {"invited": userId}
      ]}
    ]
  };

  if (_.isString(groupId)) {
    groupConds.$and.push({_id: groupId});
  }

  var groupIds = Groups.find(groupConds, {fields: {_id: 1}}).map(function(group) {
    return group._id;
  });

  // Get a list of groups to which the current user belongs or is the owner
  var memberGroupIds = Groups.find({$or: [{invited: userId}, {owner: userId}]}).map(function(group) {
    return group._id;
  });

  var activityConds = {
    $and: [ 
      {$or: [
        {"published": true},
        {"owner": userId},
        {"group": {$in: memberGroupIds}}
      ]},
      {"group": {$in: groupIds}},
    ]
  };

  return activityConds;
}

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
      "profile.url": 1,
      "services.google.id": 1,
      "services.github.id": 1,
      "services.twitter.id": 1,
      "services.facebook.id": 1
    }
  });
});

Meteor.publish(null, function () {
  // If logged in, autopublish the current user's settings
  // to the client (which isn't published by default).
  return this.userId &&
    Meteor.users.find(this.userId,
                      {
                        fields: {
                          "profile.email": 1,
                          "profile.followedGroups": 1,
                        }
                      }
                    );
});

// Activities with limited fields included
Meteor.publish("feedStories", function (groupId) {
  var activityConds = getActivityConditons(groupId, this.userId);
  activityConds.type = 'story';

  var activityFields = { 
    fields: {
      _id: 1,
      group: 1,
      lat: 1,
      lng: 1,
      title: 1,
      slug: 1,
      owner: 1,
      created: 1,
      type: 1,
      city: 1,
      country: 1
    }
  };

  return Activities.find(activityConds, activityFields);
});

// Activities with limited fields included
Meteor.publish("feedShorties", function (groupId) {
  var activityConds = getActivityConditons(groupId, this.userId);
  activityConds.type = 'short';

  var activityFields = { 
    fields: {
      _id: 1,
      group: 1,
      lat: 1,
      lng: 1,
      title: 1,
      text: 1,
      owner: 1,
      created: 1,
      type: 1,
      city: 1,
      country: 1
    }
  };

  return Activities.find(activityConds, activityFields);
});

// Activities with all fields included
Meteor.publish("activities", function (groupId) {
  var activityConds = getActivityConditons(groupId, this.userId);
  var activities = Activities.find(activityConds);
  
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

// Activities with all fields included
Meteor.publish("activityShow", function (activityId) {
  if (!activityId)
    return null;

  var activity = Activities.findOne(activityId);
  var activityConds = getActivityConditons(activity.group, this.userId);
  activityConds._id = activityId;
  activity = Activities.find(activityConds);
  
  return activity;
});

Meteor.publish("activityComments", function (activityId) {
  // don't return any comments without an activityId
  if (_.isNull(activityId))
    return [];

  var conditions = {};

  if (_.isString(activityId)) {
    conditions.activityId = activityId;
  }

  return Comments.find(conditions);
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