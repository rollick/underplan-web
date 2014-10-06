Meteor.publish("directory", function () {
  logIfDev("Publishing 'directory'");

  return Meteor.users.find({}, {
    fields: standardUserFields()
  });
});

Meteor.publish("userDetails", function () {
  logIfDev("Publishing 'userDetails'");

  // If logged in, autopublish the current user's settings
  // to the client (which isn't published by default).
  return this.userId &&
    Meteor.users.find(this.userId,
                      {
                        fields: _.extend(standardUserFields(), {
                          "profile.email": 1,
                          "profile.followedGroups": 1,
                        })
                      }
                    );
});

// All group activity data for generating country filter
Meteor.publish("currentGroupInfo", function (groupId) {
  check(groupId, String);

  var self = this,
      activityConds = getActivityConditons(groupId, this.userId),
      counts = {}, 
      initializing = true;

  var handle = Activities.find(activityConds, {_id: 1, country: 1}).observe({
    added: function (newActivity) {
      logIfDev("Adding record to GroupInfo: id-" + newActivity._id + ", country-" + newActivity.country);
 
      var country = newActivity.country;

      if (_.isEmpty(country))
        return;

      if (_.isUndefined(counts[country]))
        counts[country] = 1;
      else
        counts[country]++;

      if (!initializing) {
        logIfDev("Calling changed on GroupInfo: " + counts[country]);

        self.changed("groupInfo", groupId, {counts: counts});
      }
    },
    changed: function (oldActivity, newActivity) {
      logIfDev("Changing record in GroupInfo: " + oldActivity._id);

      this.removed(oldActivity);
      this.added(newActivity);
    },
    removed: function (oldActivity) {
      logIfDev("Removing record from GroupInfo: " + oldActivity._id + ", country-" + oldActivity.country);

      var country = oldActivity.country;

      if (_.isEmpty(country))
        return;

      if (!_.isUndefined(counts[country])) {
        counts[country]--;
        self.changed("groupInfo", groupId, {counts: counts});
      }
    }
    // don't care about moved or changed
  });

  // Observe only returns after the initial added callbacks have
  // run.  Now return an initial value and mark the subscription
  // as ready.
  initializing = false;
  self.added("groupInfo", groupId, {counts: counts});
  self.ready();

  // Stop observing the cursor when client unsubs.
  // Stopping a subscription automatically takes
  // care of sending the client any removed messages.
  self.onStop(function () {
    handle.stop();
  });
});

Meteor.publish("basicActivityData", function (groupId) {
  check(groupId, String);

  logIfDev("Publishing 'basicActivityData': " + groupId);

  var activityConds = getActivityConditons(groupId, this.userId);

  var activityFields = { 
    fields: {
      _id: 1,
      group: 1,
      owner: 1,
      city: 1,
      country: 1,
      type: 1,
      created: 1
    }
  };

  return Activities.find(activityConds, activityFields);
});

// limited by the feed items count
Meteor.publish("recentActivities", function () {
  logIfDev("Publishing 'recentActivities'");

  var activityOptions = { 
    fields: {
      _id: 1,
      group: 1,
      lat: 1,
      lng: 1,
      title: 1,
      owner: 1,
      created: 1,
      updated: 1,
      type: 1,
      published: 1,
      slug: 1
    }, 
    sort: {created: -1}
  };

  activityOptions.limit = 25;

  var activityConds = {
    "published": true
  };

  return Activities.find(activityConds, activityOptions);
});

// Feed activities with limited fields included and
// restricted to feed items count
Meteor.publish("feedActivities", function (options) {
  check(options, Object);
  check(options["limit"], Match.Integer);
  check(options["groupId"], String);

  logIfDev("Publishing 'feedActivities': " + JSON.stringify(options));
  logIfDev("Current User Id: " + this.userId);

  var activityConds = getActivityConditons(options.groupId, this.userId);

  if (options.country) {
    // Do a case insensitive search. This won't use the index but hopefully
    // not too big an issue for a single group query
    var term = new RegExp('^' + options.country + '$', 'i');
    activityConds.$and.push( {country: term} );
  }

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
      location: 1,
      city: 1,
      country: 1,
      published: 1,
      picasaTags: 1,
      slug: 1
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
  if (options.country) {
    // See comment above about case insensitive query
    var term = new RegExp('^' + options.country + '$', 'i');
    activityConds.$and.push( {country: term} );
  }

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
  if (options.country) {
    // See comment above about case insensitive query
    var term = new RegExp('^' + options.country + '$', 'i');
    activityConds.$and.push( {country: options.country} );
  }

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
  var approvedConditions = {
    $and: [
      {
        $or: [
          {approved: true},
          {approved: {$exists: false}}, 
          {invited: this.userId},
          {owner: this.userId}
        ]
      }
    ]
  };

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
// activityId is the _id or the slug
Meteor.publish("activityShow", function (activityId, groupId) {
  check(activityId, String);
  check(groupId, String);

  logIfDev("Publishing 'activityShow': " + activityId);

  var activityConds = getActivityConditons(groupId, this.userId);
  activityConds.$and.push({
    $or: [{_id: activityId}, {slug: activityId}]
  });

  var activityOptions = { 
    _id: 1,
    group: 1,
    lat: 1,
    lng: 1,
    title: 1,
    location: 1,
    text: 1,
    owner: 1,
    created: 1,
    updated: 1,
    picasaTags: 1,
    wikipediaSearch: 1,
    wikipediaId: 1,
    type: 1,
    location: 1,
    city: 1,
    region: 1,
    country: 1,
    published: 1,
    mapZoom: 1,
    slug: 1
  };

  var activity = Activities.findOne(activityConds, activityOptions);
  
  return Activities.find(activityConds, activityOptions);;
});

Meteor.publish("activityComments", function (activityId, groupId) {
  check(activityId, String);
  check(groupId, String);

  logIfDev("Publishing 'activityComments': " + activityId);

  // Check permissions on the activity as this determines access to the comments
  var activityConds = getActivityConditons(groupId, this.userId);
  activityConds.$and.push({
    $or: [{_id: activityId}, {slug: activityId}]
  });

  var activityOptions = { 
    fields: {
      _id: 1
    }
  };

  var activity = Activities.findOne(activityConds, activityOptions);

  if (!activity)
    return [];

  return Comments.find({activityId: activity._id});
});

Meteor.publish("activityCommentsCount", function (activityId) {
  check(activityId, String);

  logIfDev("Publishing 'activityCommentsCount': " + activityId);

  // don't return any comments without an activityId
  if (_.isNull(activityId) || !_.isString(activityId))
    return [];

  return Comments.find({activityId: activityId}, {fields: {_id: 1, activityId: 1}});
});