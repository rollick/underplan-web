///////////////////////////////////////////////////////////////////////////////
// Activities

/*
  This is an abstract model to represent travel activities, eg geo location, story post,
  photos added. At its most basic the event can have a title, text or 
  geo location. For example, a new destination would just have a geo location 
  (and possibly a title), a story would have text (and possibly a geo location), a photo
  would be a url to a publically accessible image.
*/

Activities = new Meteor.Collection("activities")

Activities.allow({
  insert: function (userId, activity) {
    return false; // use createActivity method
  },
  update: function (userId, activity, fields, modifier) {
    return false; // use updateActivity method
  },
  remove: function (userId, activity) {
    return false; // use removeActivity method
  }
});

Meteor.methods({
  notifyActivityCreated: function(activityId) {
    check(activityId, String);

    var activity = Activities.findOne(activityId);

    if(!!activity && this.userId === activity.owner) {
      notifyActivityEvent(this.userId, activity, "created");
    }
  },

  updateActivity: function (options) {
    check(options, Object);
    check(options["activityId"], String);
    check(options["values"], Object);
    
    options["values"].updated = new Date();
    App.Utils.checkUpdateActivity(this.userId, options["activityId"], options["values"]);

    if(Meteor.isServer) {
      Activities.update(options["activityId"], {$set: options["values"]}, {multi: false});
      
      var activity = Activities.findOne(options["activityId"]);

      // Notify group members and followers about updated activity
      if(options["notify"] && this.userId === activity.owner) {
        notifyActivityEvent(this.userId, activity, "updated");
      }
    }
    return true;
  },

  // options should include: title, description, x, y, public
  createActivity: function (options) {
    check(options, Object);

    // If the title is empty / undefined then this is a short post
    if (_.isEmpty(options.type) || _.indexOf(["short", "story"], options.type) === -1)
      throw new Meteor.Error(403, "Activity must have valid type");

    if ( options.type == "short" || _.isEmpty(options.title) ) {
      options.type = "short";
      options.published = true;
    } else {
      options.type = "story";

      if ( typeof options.slug === "undefined" || options.slug == "" )
        options.slug = createLinkSlug(options.title);

      var testSlug = true;
      var count = 1;
      var originalSlug = options.slug;
      
      while(testSlug) {
        var matchingSlugs = Activities.find({slug: options.slug, group: options.groupId}, { _id: 1, slug: 1 });
        // Creating the activity in this method so there shouldn't be any matching slugs
        // Also prevent slugs which match standard routes - settings, new
        if (matchingSlugs.count() > 0 || !!options.slug.match(/^(settings|new)$/)) {
          options.slug = originalSlug + "-" + count;
          count += 1;
        } else {
          testSlug = false;
        }
      }
    }

    if ( typeof options.created === "undefined" )
      options.created = new Date();

    if ( typeof options.updated === "undefined" )
      options.updated = new Date();

    if ( typeof options.mapZoom === "undefined" )
      options.mapZoom = 12;

    // If lat or lng is not a float then reset both
    var latLngRegex = /^([+-]?(((\d+(\.)?)|(\d*\.\d+))([eE][+-]?\d+)?))$/;

    
    if (! latLngRegex.test(options.lat) || ! latLngRegex.test(options.lng))
      options.lat = null;
    if (! latLngRegex.test(options.lng))
      options.lng = null;

    // run check before saving. check will throw exceptions on invalid data
    App.Utils.checkCreateActivity(this.userId, options);

    var activityId;

    if(Meteor.isServer) {
      activityId = Activities.insert({
        owner:            this.userId,
        group:            options.groupId,
        lat:              options.lat,
        lng:              options.lng,
        city:             options.city,
        region:           options.region,
        country:          options.country,
        title:            options.title,
        text:             options.text,
        url:              options.url,
        urlType:          options.urlType,
        picasaTags:       options.picasaTags,
        wikipediaSearch:  options.wikipediaSearch,
        wikipediaId:      options.wikipediaId,
        tags:             [],
        created:          options.created,
        updated:          options.updated,
        mapZoom:          options.mapZoom,
        location:         options.location,
        slug:             options.slug,
        type:             options.type,
        published:        !! options.published
      });

      options._id = activityId;
      
      // Notify group members and followers about new activity
      App.Utils.notifyActivityEvent(this.userId, options, "created");
    }

    var groupName = Groups.findOne(options.groupId, {$fields: {name: 1}});
    App.Utils.trackCreateActivity({"Group ID": options.groupId, "Group Name": groupName});

    return activityId;
  },

  removeActivity: function (activityId) {
    check(activityId, String);
    
    var activity = Activities.findOne({_id: activityId});
    var groupId = activity.group;

    // deny if not the owner, a system admin or the group admin
    if (isGroupAdmin(this.userId, groupId) || isSystemAdmin(this.userId) || activity.owner === this.userId) {
      var result = Activities.remove({_id: activity._id});

      // remove associated comments
      var comments = Comments.find({activityId: activity._id});
      if (comments.count() > 0) {
        Comments.remove({activityId: activity._id});
      }
    } else {
      throw new Meteor.Error(403, "You don't have permission to remove this activity");
    }
  }
});

////////////////////////////////////
// Client Methods
App.Utils.activityBasicCheck = function (activity) {
  if (activity.type == "story" && _.isEmpty(activity.title))
    throw new Meteor.Error(403, "Story needs a title");

  if (! activity.groupId && !activity.group)
    throw new Meteor.Error(403, "Activity must belong to a group");

  if (typeof activity.title === "string" && activity.title.length > 100)
    throw new Meteor.Error(413, "Title too long");

  if (typeof activity.text === "string" && activity.text.length > 10000)
    throw new Meteor.Error(413, "Text too long");

  if (_.isEmpty(activity.text) && _.isEmpty(activity.wikipediaId))
    throw new Meteor.Error(413, "Story or Wikipedia page required");
}

if(Meteor.isClient) {
  _.extend(App.Utils, {
    checkUpdateActivity: function(userId, activityId, fields) {
      var activity = Activities.findOne(activityId);

      if (!activity)
        throw new Meteor.Error(404, "Activity could not be found");

      App.Utils.activityBasicCheck(fields);
    },

    checkCreateActivity: function(userId, options) {
      if (options.type == "story" && Activities.find({slug: options.slug, group: options.groupId}).count() > 0)
        throw new Meteor.Error(403, "Slug is already taken.");

      App.Utils.activityBasicCheck(options);
    },

    // Just a stub for the client. See isServer section for actual code.
    notifyActivityEvent: function(userId, activity, action) {
      return true;
    },

    trackUpdateActivity: function(properties) {
      App.trackEvent("Activity Updated", properties);
    },

    trackCreateActivity: function(properties) {
      App.trackEvent("Activity Created", properties);
    }
  });
}