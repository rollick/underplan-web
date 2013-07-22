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
    return canUpdateActivity(userId, activity, fields);
  },
  remove: function (userId, activity) {
    return false; // use removeActivity method
  }
});

Meteor.methods({
  notifyActivityUpdated: function(activityId) {
    var activity = Activities.findOne(activityId);

    // only notify if the activity owner updates, eg not if it is the group admin
    if(!!activity && this.userId === activity.owner) {
      notifyActivityEvent(this.userId, activity, "updated");
    }
  },

  notifyActivityCreated: function(activityId) {
    var activity = Activities.findOne(activityId);

    if(!!activity && this.userId === activity.owner) {
      notifyActivityEvent(this.userId, activity, "created");
    }
  },

  // options should include: title, description, x, y, public
  createActivity: function (options) {
    options = options || {};

    // If the title is empty / undefined then this is a short post
    if ( typeof options.title === "undefined" || ( typeof options.title === "string" && !options.title.length ) ) {
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

    if ( typeof options.mapZoom === "undefined" )
      options.mapZoom = 12;

    // run check before saving. check will throw exceptions on invalid data
    checkCreateActivity(this.userId, options);

    var activityId;

    if(Meteor.isServer) {
      activityId = Activities.insert({
        owner:      this.userId,
        group:      options.groupId,
        lat:        options.lat,
        lng:        options.lng,
        city:       options.city,
        region:     options.region,
        country:    options.country,
        title:      options.title,
        text:       options.text,
        url:        options.url,
        urlType:    options.urlType,
        picasaTags: options.picasaTags,
        tags:       [],
        created:    options.created,
        mapZoom:    options.mapZoom,
        location:   options.location,
        slug:       options.slug,
        type:       options.type,
        published:  !! options.published
      });

      options._id = activityId;
      
      // Notify group members and followers about new activity
      notifyActivityEvent(this.userId, options, "created");
    }

    trackCreateActivity({"Group ID": options.groupId});

    return activityId;
  },

  removeActivity: function (activityId) {
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

var activityType = function (activity) {
  if (typeof activity.urlType === "string" && activity.urlType.length) {
    return activity.urlType;
  } else if ( typeof activity.title === "string" && activity.title.length && typeof activity.text === "string" && activity.text.length ) {
    return "story";
  } else if ( typeof activity.lat === "float" && typeof activity.lng === "float" && typeof activity.description === "undefined" ) {
    return "location";
  } else {
    return "undefined";
  }
};

var checkCreateActivity = function(userId, options) {
  if (! userId)
    throw new Meteor.Error(403, "You must be logged in");

  if (options.type == "story" && Activities.find({slug: options.slug, group: options.groupId}).count() > 0)
    throw new Meteor.Error(403, "Slug is already taken.");

  if (typeof options.title === "string" && options.title.length > 100)
    throw new Meteor.Error(413, "Title too long");

  if (typeof options.text === "string" && options.text.length > 10000)
    throw new Meteor.Error(413, "Text too long");

  if (! options.groupId)
    throw new Meteor.Error(403, "Activity must belong to a group");
  
  var group =  Groups.findOne(options.groupId);
  if (! userBelongsToGroup(userId, group._id))
    throw new Meteor.Error(403, "You must be a member of " + group.name);
}

/////////////////////////////////////
// Server and Client Methods

this.canUserRemoveActivity = function (userId, activityId) {
  var activity = Activities.findOne(activityId);
  var groupId = activity.group;

  return (isGroupAdmin(userId, groupId) || isSystemAdmin(userId) || activity.owner === userId);
};

if(Meteor.isClient) {
  // Just a stub for the client. See isServer section for actual code.
  var notifyActivityEvent = function(userId, activity, action) {
    return true;
  }

  var trackCreateActivity = function(properties) {
    trackEvent("Activity Created", properties);
  };
}

if(Meteor.isServer) {
  var trackCreateActivity = function () {
    // TODO: do some server side logging here!
  };

  var notifyActivityEvent = function(userId, activity, action) {
    var owner = Meteor.users.findOne(userId);
    var group = Groups.findOne(activity.groupId);

    var followerEmails = [];
    // Only notify followers if the activity is published
    if(activity.published) {
      followerEmails = groupFollowerEmails(activity.groupId);
    }
    
    var allEmails = _.union(groupMemberEmails(activity.group), followerEmails);

    if(allEmails.length > 0) {
      // TODO: replace this with a handlebars template!
      // var text = Handlebars.templates["notifyActivityUpdate"];
      // console.log(text);

      var text  =  "Hey, " + displayName(owner) + " just " + action + " a " + activity.type;
      if(activity.type == "story") {
        var url = Meteor.absoluteUrl() + [group.slug, activity.slug].join("/");

        text += " titled '" + activity.title + "'. ";
        text += "Check it out here: " + url + "\n\n"
      } else if(activity.type == "short") {
        var url = Meteor.absoluteUrl() + [group.slug, "pl", activity._id].join("/");

        text += " for the group '" + group.name + "': " + url + "\n\n"
        text += "They wrote:\n\n" + activity.text + "\n\n";
      }

      text += "Yours faithfully, Underplan"

      Email.send({
        from: "noreply@underplan.it",
        bcc: allEmails,
        replyTo: undefined,
        subject: "Underplan: " + (action == "created" ? "New" : "Updated") + " Activity for '" + group.name + "'",
        text: text
      });
    }
  };

  var canUpdateActivity = function(userId, activity, fields) {
    var admin = isGroupAdmin(userId, activity.group);

    if (userId !== activity.owner && !admin)
      return false; // not the owner or the group admin

    var allowed = [
      "title", 
      "text", 
      "groupId", 
      "type", 
      "location", 
      "lat", 
      "lng", 
      "city",
      "region",
      "country",
      "mapZoom", 
      "picasaTags", 
      "published", 
      "slug", 
      "url", 
      "urlType", 
      "created"
    ];

    // Admin can also change ownership
    if (admin)
      allowed.push("owner");

    if (_.difference(fields, allowed).length)
      return false; // tried to write to forbidden field

    return true;
  };

  var groupMemberEmails = function (groupId) {
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