// Underplan -- server

isDev = function () {
  return !!process.env["ROOT_URL"].match(/localhost/);
}

logIfDev = function (message) {
  if (isDev)
    console.log("Underplan: " + message);
}

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
  logIfDev("Publishing 'directory'");

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

Meteor.publish("userDetails", function () {
  logIfDev("Publishing 'userDetails'");

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

// All group activity data for generating feed map and country filter
Meteor.publish("basicActivityData", function (groupId) {
  check(groupId, String);

  logIfDev("Publishing 'basicActivityData': " + groupId);

  var activityConds = getActivityConditons(groupId, this.userId);

  var activityFields = { 
    fields: {
      _id: 1,
      group: 1,
      city: 1,
      country: 1,
      slug: 1,
      lat: 1,
      lng: 1,
      type: 1
    }
  };

  return Activities.find(activityConds, activityFields);
});

// Feed activities with only the necessary fields included and
// limited by the feed items count
Meteor.publish("feedActivities", function (options) {
  check(options, Object);
  check(options["limit"], Match.Integer);
  check(options["groupId"], String);

  logIfDev("Publishing 'feedActivities': " + JSON.stringify(options));

  var activityConds = getActivityConditons(options.groupId, this.userId);

  if (options.country)
    activityConds.$and.push( {country: options.country} );

  var activityOptions = { 
    fields: {
      _id: 1,
      group: 1,
      lat: 1,
      lng: 1,
      title: 1,
      text: 1,
      owner: 1,
      created: 1,
      updated: 1,
      type: 1,
      city: 1,
      country: 1,
      published: 1
    }, 
    sort: {created: -1}
  };

  if (options.limit)
    activityOptions.limit = options.limit;

  return Activities.find(activityConds, activityOptions);
});

Meteor.publish("feedCommentCounts", function (options) {
  check(options, Object);
  check(options["groupId"], String);

  logIfDev("Publishing 'feedCommentCounts': " + JSON.stringify(options));

  // don't return any comments without a groupId
  if (_.isNull(options.groupId))
    return [];

  var activityConds = getActivityConditons(options.groupId, this.userId);
  if (options.country)
    activityConds.$and.push( {country: options.country} );

  var activityOptions = {fields: {_id: 1}, sort: {created: -1}};
  if (options.limit)
    activityOptions.limit = options.limit;

  var activityIds = [];
  Activities.find(activityConds, activityOptions).forEach( function (activity) { 
    activityIds.push(activity._id);
  });
  
  // only return the comment _id for use in counts
  return Comments.find({activityId: {$in: activityIds}}, {fields: {activityId: 1}});
});

// Options requires a groupId and an optional list of 
// activity ids
Meteor.publish("openFeedComments", function (options) {
  check(options, Object);
  check(options["groupId"], String);

  logIfDev("Publishing 'openFeedComments': " + JSON.stringify(options));

  var activityConds = getActivityConditons(options.groupId, this.userId);
  if (options.country)
    activityConds.$and.push( {country: options.country} );

  if (options.activityIds)
    activityConds["_id"] = {$in: options.activityIds};

  var activityOptions = {fields: {_id: 1}, sort: {created: -1}};
  if (options.limit)
    activityOptions.limit = options.limit;

  var activityIds = [];
  Activities.find(activityConds, activityOptions).forEach( function (activity) { 
    activityIds.push(activity._id);
  });

  return Comments.find({activityId: {$in: activityIds}});
});

// Activities with all fields included
Meteor.publish("activities", function (groupId) {
  check(groupId, String);
  logIfDev("Publishing 'activities': " + groupId);

  var activityConds = getActivityConditons(groupId, this.userId);
  var activities = Activities.find(activityConds);
  
  return activities;
});

Meteor.publish("groups", function () {
  logIfDev("Publishing 'groups'");

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

  return Groups.find(conditions, {sort: {created: -1}});
});

// Activities with all fields included
Meteor.publish("activityShow", function (activityId) {
  check(activityId, String);

  logIfDev("Publishing 'activityShow': " + activityId);

  if (!activityId)
    return null;

  var activity = Activities.findOne(activityId);

  var activityConds = getActivityConditons(activity.group, this.userId);
  activityConds._id = activityId;
  
  activity = Activities.find(activityConds);
  
  return activity;
});

Meteor.publish("activityComments", function (activityId) {
  check(activityId, String);

  logIfDev("Publishing 'activityComments': " + activityId);

  // don't return any comments without an activityId
  if (_.isNull(activityId) || !_.isString(activityId))
    return [];

  return Comments.find({activityId: activityId});
});

Meteor.publish("activityCommentsCount", function (activityId) {
  check(activityId, String);

  logIfDev("Publishing 'activityCommentsCount': " + activityId);

  // don't return any comments without an activityId
  if (_.isNull(activityId) || !_.isString(activityId))
    return [];

  return Comments.find({activityId: activityId}, {fields: {_id: 1}});
});