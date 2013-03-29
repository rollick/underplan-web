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
    return false; // no cowboy inserts -- use createActivity method
  },
  update: function (userId, activity, fields, modifier) {
    return canUpdateActivity(userId, activity, fields);
  },
  remove: function (userId, activity) {
    return false; // TODO: need to add logic for removing associated comments etc before removing the activity

    // deny if not the owner
    return activity.owner !== userId;
  }
});

Meteor.methods({
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

    var activity = Activities.insert({
      owner:      this.userId,
      group:      options.groupId,
      lat:        options.lat,
      lng:        options.lng,
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

    // Notify group members about new activity
    if(Meteor.isServer) {
      notifyActivityCreated(this.userId, options);
    }

    return activity;
  },
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

  if (Activities.find({slug: options.slug, group: options.groupId}).count() > 0)
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

if(Meteor.isServer) {
  var notifyActivityCreated = function(userId, options) {
    var owner = Meteor.users.findOne(userId);
    var group = Groups.findOne(options.groupId);
    var memberEmails = _.union(groupMemberEmails(options.groupId), groupWatcherEmails(options.groupId));

    if(memberEmails.length > 0) {
      // TODO: replace this with a handlebars template!
      var text  =  "Hey, " + displayName(owner) + " just created a new " + options.type;
      if(options.type == "story") {
        text += " titled '" + options.title + "'. ";
        text += "Check it out here: " + Meteor.absoluteUrl() + [group.slug, options.slug].join("/") + "\n\n"
      } else if(options.type == "short") {
        text += " for the group '" + group.name + "'. ";
        text += "Check it out here: " + Meteor.absoluteUrl() + group.slug + ". "
        text += "They wrote:\n\n" + options.text + "\n\n";
      }

      text += "Yours faithfully, Underplan"

      Email.send({
        from: "noreply@underplan.it",
        bcc: memberEmails,
        replyTo: undefined,
        subject: "Underplan: New Activity for '" + group.name + "'",
        text: text
      });
    }
  };

  var canUpdateActivity = function(userId, activity, fields) {
    if (userId !== activity.owner)
      return false; // not the owner

    var allowed = [
      "title", 
      "text", 
      "groupId", 
      "type", 
      "location", 
      "lat", 
      "lng", 
      "mapZoom", 
      "picasaTags", 
      "published", 
      "slug", 
      "url", 
      "urlType", 
      "created"
    ];
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