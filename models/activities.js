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

    // A good improvement would be to validate the type of the new
    // value of the field (and if a string, the length.) In the
    // future Meteor will have a schema system to makes that easier.
    return true;
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
    if (typeof options.title === "string" && options.title.length > 100)
      throw new Meteor.Error(413, "Title too long");

    // If the title is empty / undefined then this is a short post
    if ( typeof options.title === "undefined" || ( typeof options.title === "string" && !options.title.length ) ) {
      options.type = "short";
      options.published = true;
    } else {
      options.type = "story";

      if ( typeof options.slug === "undefined" || options.slug == "" )
        options.slug = createLinkSlug(options.title);
    }

    if (typeof options.text === "string" && options.text.length > 10000)
      throw new Meteor.Error(413, "Text too long");

    if (! this.userId)
      throw new Meteor.Error(403, "You must be logged in");

    if (! options.groupId)
      throw new Meteor.Error(403, "Activity must below to a group");
    
    var group =  Groups.findOne(options.groupId);
    if (! userBelongsToGroup(this.userId, group._id))
      throw new Meteor.Error(403, "You must be a member of " + group.name);

    if ( typeof options.created === "undefined" )
      options.created = new Date();

    if ( typeof options.mapZoom === "undefined" )
      options.mapZoom = 12;

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
    if (Meteor.isServer) {
      var owner = Meteor.users.findOne(this.userId);
      var group = Groups.findOne(options.groupId);
      var members = Meteor.users.find({$or: [{_id: {$in: group.invited}},
                                      {_id: group.owner}]});

      var memberEmails = [];
      members.forEach( function (user) { 
        var email = userEmail(user);
        if(email)
          memberEmails.push(email);
      });

      if(memberEmails.length > 0) {
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
}